import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateUserBody, UpdateUserBody, GetUserParams, UpdateUserParams, DeleteUserParams, ListUsersQueryParams } from "@workspace/api-zod";
import { requireAuth, requireManager } from "../middlewares/auth";

const router: IRouter = Router();

const userFields = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  role: usersTable.role,
  active: usersTable.active,
  salonId: usersTable.salonId,
};

router.get("/users", requireAuth, requireManager, async (req, res): Promise<void> => {
  const query = ListUsersQueryParams.safeParse(req.query);
  const conditions = [eq(usersTable.salonId, req.user!.salonId)];

  if (query.success) {
    if (query.data.role) conditions.push(eq(usersTable.role, query.data.role));
    if (query.data.active !== undefined) conditions.push(eq(usersTable.active, query.data.active));
  }

  const users = await db.select(userFields).from(usersTable).where(and(...conditions));
  res.json(users);
});

router.post("/users", requireAuth, requireManager, async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({
      ...parsed.data,
      password: hashedPassword,
      salonId: req.user!.salonId,
    })
    .returning(userFields);

  res.status(201).json(user);
});

router.get("/users/:id", requireAuth, requireManager, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetUserParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db
    .select(userFields)
    .from(usersTable)
    .where(and(eq(usersTable.id, params.data.id), eq(usersTable.salonId, req.user!.salonId)));

  if (!user) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json(user);
});

router.patch("/users/:id", requireAuth, requireManager, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateUserParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.password) {
    updates.password = await bcrypt.hash(parsed.data.password, 10);
  } else {
    delete updates.password;
  }

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(and(eq(usersTable.id, params.data.id), eq(usersTable.salonId, req.user!.salonId)))
    .returning(userFields);

  if (!user) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json(user);
});

router.delete("/users/:id", requireAuth, requireManager, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteUserParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(usersTable)
    .where(and(eq(usersTable.id, params.data.id), eq(usersTable.salonId, req.user!.salonId)));

  res.sendStatus(204);
});

export default router;
