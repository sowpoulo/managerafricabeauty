import { pool } from "@workspace/db";
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
  const { role, active } = req.query;
  let query = `SELECT id, name, email, role, active, bank_name, bank_rib FROM users WHERE salon_id = $1`;
  const params: any[] = [req.user!.salonId];

  if (role) {
    params.push(role);
    query += ` AND role = $${params.length}`;
  }
  if (active !== undefined) {
    params.push(active === "true");
    query += ` AND active = $${params.length}`;
  }

  query += ` ORDER BY name`;
  const result = await pool.query(query, params);
  
  res.json(result.rows.map(r => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    active: r.active,
    bank_name: r.bank_name,
    bank_rib: r.bank_rib
  })));
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
  const employeeId = parseInt(req.params.id, 10);
  const salonId = req.user!.salonId;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query('UPDATE appointments SET employee_id = NULL WHERE employee_id = $1 AND salon_id = $2', [employeeId, salonId]);
    await client.query('DELETE FROM employee_documents WHERE employee_id = $1', [employeeId]);
    await client.query('DELETE FROM payroll WHERE employee_id = $1', [employeeId]);
    await client.query('DELETE FROM absences WHERE employee_id = $1', [employeeId]);
    await client.query('DELETE FROM employee_contracts WHERE employee_id = $1', [employeeId]);
    await client.query('UPDATE product_sales SET employee_id = NULL WHERE employee_id = $1', [employeeId]);
    await client.query('DELETE FROM notifications WHERE user_id = $1', [employeeId]);
    await client.query('DELETE FROM users WHERE id = $1 AND salon_id = $2', [employeeId, salonId]);
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Erreur suppression employé:", error);
    res.status(500).json({ error: "Erreur lors de la suppression", details: error.message });
  } finally {
    client.release();
  }
});

export default router;
