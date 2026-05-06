import { Router, type IRouter } from "express";
import { db, appointmentsTable, servicesTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, SQL } from "drizzle-orm";
import {
  CreateAppointmentBody,
  UpdateAppointmentBody,
  GetAppointmentParams,
  UpdateAppointmentParams,
  DeleteAppointmentParams,
  ListAppointmentsQueryParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function getAppointmentWithRelations(id: number, salonId: number) {
  const rows = await db
    .select({
      id: appointmentsTable.id,
      clientName: appointmentsTable.clientName,
      date: appointmentsTable.date,
      price: appointmentsTable.price,
      status: appointmentsTable.status,
      rating: appointmentsTable.rating,
      comment: appointmentsTable.comment,
      salonId: appointmentsTable.salonId,
      serviceId: appointmentsTable.serviceId,
      employeeId: appointmentsTable.employeeId,
      serviceName: servicesTable.name,
      servicePrice: servicesTable.price,
      serviceDuration: servicesTable.duration,
      serviceActive: servicesTable.active,
      serviceSalonId: servicesTable.salonId,
      employeeName: usersTable.name,
      employeeEmail: usersTable.email,
      employeeRole: usersTable.role,
      employeeActive: usersTable.active,
      employeeSalonId: usersTable.salonId,
    })
    .from(appointmentsTable)
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .leftJoin(usersTable, eq(appointmentsTable.employeeId, usersTable.id))
    .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.salonId, salonId)));

  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    clientName: r.clientName,
    date: r.date,
    price: parseFloat(r.price),
    status: r.status,
    rating: r.rating,
    comment: r.comment,
    salonId: r.salonId,
    serviceId: r.serviceId,
    employeeId: r.employeeId,
    service: {
      id: r.serviceId,
      name: r.serviceName!,
      price: parseFloat(r.servicePrice!),
      duration: r.serviceDuration!,
      active: r.serviceActive!,
      salonId: r.serviceSalonId!,
    },
    employee: {
      id: r.employeeId,
      name: r.employeeName!,
      email: r.employeeEmail!,
      role: r.employeeRole!,
      active: r.employeeActive!,
      salonId: r.employeeSalonId!,
    },
  };
}

router.get("/appointments", requireAuth, async (req, res): Promise<void> => {
  const query = ListAppointmentsQueryParams.safeParse(req.query);
  const conditions: SQL[] = [eq(appointmentsTable.salonId, req.user!.salonId)];

  if (req.user!.role === "EMPLOYEE") {
    conditions.push(eq(appointmentsTable.employeeId, req.user!.userId));
  }

  if (query.success) {
    if (query.data.status) conditions.push(eq(appointmentsTable.status, query.data.status));
    if (query.data.employeeId) conditions.push(eq(appointmentsTable.employeeId, query.data.employeeId));
    if (query.data.dateFrom) conditions.push(gte(appointmentsTable.date, new Date(query.data.dateFrom)));
    if (query.data.dateTo) conditions.push(lte(appointmentsTable.date, new Date(query.data.dateTo)));
  }

  const rows = await db
    .select({
      id: appointmentsTable.id,
      clientName: appointmentsTable.clientName,
      date: appointmentsTable.date,
      price: appointmentsTable.price,
      status: appointmentsTable.status,
      rating: appointmentsTable.rating,
      comment: appointmentsTable.comment,
      salonId: appointmentsTable.salonId,
      serviceId: appointmentsTable.serviceId,
      employeeId: appointmentsTable.employeeId,
      serviceName: servicesTable.name,
      servicePrice: servicesTable.price,
      serviceDuration: servicesTable.duration,
      serviceActive: servicesTable.active,
      serviceSalonId: servicesTable.salonId,
      employeeName: usersTable.name,
      employeeEmail: usersTable.email,
      employeeRole: usersTable.role,
      employeeActive: usersTable.active,
      employeeSalonId: usersTable.salonId,
    })
    .from(appointmentsTable)
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .leftJoin(usersTable, eq(appointmentsTable.employeeId, usersTable.id))
    .where(and(...conditions));

  const appointments = rows.map((r) => ({
    id: r.id,
    clientName: r.clientName,
    date: r.date,
    price: parseFloat(r.price),
    status: r.status,
    rating: r.rating,
    comment: r.comment,
    salonId: r.salonId,
    serviceId: r.serviceId,
    employeeId: r.employeeId,
    service: {
      id: r.serviceId,
      name: r.serviceName!,
      price: parseFloat(r.servicePrice!),
      duration: r.serviceDuration!,
      active: r.serviceActive!,
      salonId: r.serviceSalonId!,
    },
    employee: {
      id: r.employeeId,
      name: r.employeeName!,
      email: r.employeeEmail!,
      role: r.employeeRole!,
      active: r.employeeActive!,
      salonId: r.employeeSalonId!,
    },
  }));

  res.json(appointments);
});

router.post("/appointments", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [appt] = await db
    .insert(appointmentsTable)
    .values({
      ...parsed.data,
      price: String(parsed.data.price),
      salonId: req.user!.salonId,
    })
    .returning();

  const full = await getAppointmentWithRelations(appt.id, req.user!.salonId);
  res.status(201).json(full);
});

router.get("/appointments/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetAppointmentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const appt = await getAppointmentWithRelations(params.data.id, req.user!.salonId);
  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.json(appt);
});

router.patch("/appointments/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateAppointmentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.price !== undefined) updates.price = String(parsed.data.price);

  const [appt] = await db
    .update(appointmentsTable)
    .set(updates)
    .where(and(eq(appointmentsTable.id, params.data.id), eq(appointmentsTable.salonId, req.user!.salonId)))
    .returning();

  if (!appt) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }

  const full = await getAppointmentWithRelations(appt.id, req.user!.salonId);
  res.json(full);
});

router.delete("/appointments/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteAppointmentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(appointmentsTable)
    .where(and(eq(appointmentsTable.id, params.data.id), eq(appointmentsTable.salonId, req.user!.salonId)));

  res.sendStatus(204);
});

export default router;
