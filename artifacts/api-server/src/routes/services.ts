import { Router, type IRouter } from "express";
import { db, servicesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateServiceBody,
  UpdateServiceBody,
  GetServiceParams,
  UpdateServiceParams,
  DeleteServiceParams,
  ListServicesQueryParams,
} from "@workspace/api-zod";
import { requireAuth, requireManager } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/services", requireAuth, async (req, res): Promise<void> => {
  const query = ListServicesQueryParams.safeParse(req.query);
  const conditions = [eq(servicesTable.salonId, req.user!.salonId)];

  if (query.success && query.data.active !== undefined) {
    conditions.push(eq(servicesTable.active, query.data.active));
  }

  const services = await db.select().from(servicesTable).where(and(...conditions));
  res.json(services.map(s => ({ ...s, price: parseFloat(s.price) })));
});

router.post("/services", requireAuth, requireManager, async (req, res): Promise<void> => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [service] = await db
    .insert(servicesTable)
    .values({ ...parsed.data, price: String(parsed.data.price), salonId: req.user!.salonId })
    .returning();

  res.status(201).json({ ...service, price: parseFloat(service.price) });
});

router.get("/services/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetServiceParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [service] = await db
    .select()
    .from(servicesTable)
    .where(and(eq(servicesTable.id, params.data.id), eq(servicesTable.salonId, req.user!.salonId)));

  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json({ ...service, price: parseFloat(service.price) });
});

router.patch("/services/:id", requireAuth, requireManager, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateServiceParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.price !== undefined) updates.price = String(parsed.data.price);

  const [service] = await db
    .update(servicesTable)
    .set(updates)
    .where(and(eq(servicesTable.id, params.data.id), eq(servicesTable.salonId, req.user!.salonId)))
    .returning();

  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json({ ...service, price: parseFloat(service.price) });
});

router.delete("/services/:id", requireAuth, requireManager, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteServiceParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(servicesTable)
    .where(and(eq(servicesTable.id, params.data.id), eq(servicesTable.salonId, req.user!.salonId)));

  res.sendStatus(204);
});

export default router;
