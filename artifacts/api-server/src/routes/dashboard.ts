import { Router, type IRouter } from "express";
import { db, appointmentsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, eachDayOfInterval } from "date-fns";

const router: IRouter = Router();

function getDateRange(period: string): { from: Date; to: Date } {
  const now = new Date();
  switch (period) {
    case "day":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    default:
      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const now = new Date();

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const completedCondition = eq(appointmentsTable.status, "COMPLETED");

  const [todayStats] = await db
    .select({
      revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(appointmentsTable)
    .where(and(eq(appointmentsTable.salonId, salonId), completedCondition, gte(appointmentsTable.date, todayStart), lte(appointmentsTable.date, todayEnd)));

  const [weekStats] = await db
    .select({
      revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(appointmentsTable)
    .where(and(eq(appointmentsTable.salonId, salonId), completedCondition, gte(appointmentsTable.date, weekStart), lte(appointmentsTable.date, weekEnd)));

  const [monthStats] = await db
    .select({
      revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(appointmentsTable)
    .where(and(eq(appointmentsTable.salonId, salonId), completedCondition, gte(appointmentsTable.date, monthStart), lte(appointmentsTable.date, monthEnd)));

  const [totalMonth] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(appointmentsTable)
    .where(and(eq(appointmentsTable.salonId, salonId), gte(appointmentsTable.date, monthStart), lte(appointmentsTable.date, monthEnd)));

  const [activeEmployees] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(usersTable)
    .where(and(eq(usersTable.salonId, salonId), eq(usersTable.active, true), eq(usersTable.role, "EMPLOYEE")));

  const completionRate = Number(totalMonth.count) > 0
    ? (Number(monthStats.count) / Number(totalMonth.count)) * 100
    : 0;

  res.json({
    revenueToday: parseFloat(todayStats.revenue),
    revenueWeek: parseFloat(weekStats.revenue),
    revenueMonth: parseFloat(monthStats.revenue),
    appointmentsToday: Number(todayStats.count),
    appointmentsWeek: Number(weekStats.count),
    appointmentsMonth: Number(monthStats.count),
    activeEmployees: Number(activeEmployees.count),
    completionRate: Math.round(completionRate),
  });
});

router.get("/dashboard/revenue-chart", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const period = (req.query.period as string) || "week";
  const { from, to } = getDateRange(period);

  const rows = await db
    .select({
      date: sql<string>`DATE(${appointmentsTable.date})`,
      revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(appointmentsTable)
    .where(
      and(
        eq(appointmentsTable.salonId, salonId),
        eq(appointmentsTable.status, "COMPLETED"),
        gte(appointmentsTable.date, from),
        lte(appointmentsTable.date, to)
      )
    )
    .groupBy(sql`DATE(${appointmentsTable.date})`)
    .orderBy(sql`DATE(${appointmentsTable.date})`);

  const data = rows
    .filter(r => parseFloat(r.revenue) > 0)
    .map(r => ({
      label: format(new Date(r.date), period === "month" ? "dd/MM" : "EEE dd"),
      date: r.date,
      revenue: parseFloat(r.revenue),
      appointments: Number(r.count),
    }));

  res.json(data);
});

router.get("/dashboard/employee-ranking", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const period = (req.query.period as string) || "month";
  const { from, to } = getDateRange(period);

  const rows = await db
    .select({
      employeeId: appointmentsTable.employeeId,
      name: usersTable.name,
      revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(appointmentsTable)
    .leftJoin(usersTable, eq(appointmentsTable.employeeId, usersTable.id))
    .where(
      and(
        eq(appointmentsTable.salonId, salonId),
        eq(appointmentsTable.status, "COMPLETED"),
        gte(appointmentsTable.date, from),
        lte(appointmentsTable.date, to)
      )
    )
    .groupBy(appointmentsTable.employeeId, usersTable.name)
    .orderBy(sql`SUM(${appointmentsTable.price}) DESC`);

  const maxRevenue = rows.length > 0 ? parseFloat(rows[0].revenue) : 0;
  const ranking = rows.map(r => ({
    employeeId: r.employeeId,
    name: r.name || "Unknown",
    revenue: parseFloat(r.revenue),
    appointments: Number(r.count),
    progressPercent: maxRevenue > 0 ? Math.round((parseFloat(r.revenue) / maxRevenue) * 100) : 0,
  }));

  res.json(ranking);
});

router.get("/dashboard/my-stats", requireAuth, async (req, res): Promise<void> => {
  const { userId, salonId } = req.user!;
  const now = new Date();

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const completed = eq(appointmentsTable.status, "COMPLETED");
  const mine = eq(appointmentsTable.employeeId, userId);
  const salon = eq(appointmentsTable.salonId, salonId);

  const [todayStats] = await db
    .select({ revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`, count: sql<number>`COUNT(*)` })
    .from(appointmentsTable)
    .where(and(salon, mine, completed, gte(appointmentsTable.date, todayStart), lte(appointmentsTable.date, todayEnd)));

  const [weekStats] = await db
    .select({ revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`, count: sql<number>`COUNT(*)` })
    .from(appointmentsTable)
    .where(and(salon, mine, completed, gte(appointmentsTable.date, weekStart), lte(appointmentsTable.date, weekEnd)));

  const [monthStats] = await db
    .select({ revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`, count: sql<number>`COUNT(*)` })
    .from(appointmentsTable)
    .where(and(salon, mine, completed, gte(appointmentsTable.date, monthStart), lte(appointmentsTable.date, monthEnd)));

  res.json({
    revenueToday: parseFloat(todayStats.revenue),
    revenueWeek: parseFloat(weekStats.revenue),
    revenueMonth: parseFloat(monthStats.revenue),
    appointmentsToday: Number(todayStats.count),
    appointmentsWeek: Number(weekStats.count),
    appointmentsMonth: Number(monthStats.count),
  });
});

router.get("/dashboard/my-schedule", requireAuth, async (req, res): Promise<void> => {
  const { userId, salonId } = req.user!;
  const view = (req.query.view as string) || "day";
  const { from, to } = getDateRange(view === "week" ? "week" : "day");

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
    .where(
      and(
        eq(appointmentsTable.salonId, salonId),
        eq(appointmentsTable.employeeId, userId),
        gte(appointmentsTable.date, from),
        lte(appointmentsTable.date, to)
      )
    )
    .orderBy(appointmentsTable.date);

  const appointments = rows.map(r => ({
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
    service: { id: r.serviceId, name: r.serviceName!, price: parseFloat(r.servicePrice!), duration: r.serviceDuration!, active: r.serviceActive!, salonId: r.serviceSalonId! },
    employee: { id: r.employeeId, name: r.employeeName!, email: r.employeeEmail!, role: r.employeeRole!, active: r.employeeActive!, salonId: r.employeeSalonId! },
  }));

  res.json(appointments);
});

export default router;
