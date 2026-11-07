import { Router, type IRouter } from "express";
import { db, appointmentsTable, usersTable, servicesTable, pool } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";

const router: IRouter = Router();

function getDateRange(period: string, month?: string): { from: Date; to: Date } {
  const now = new Date();
  if (month) {
    const [year, m] = month.split('-').map(Number);
    return { from: new Date(year, m - 1, 1), to: new Date(year, m, 0, 23, 59, 59) };
  }
  switch (period) {
    case "day":   return { from: startOfDay(now), to: endOfDay(now) };
    case "week":  return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month": return { from: startOfMonth(now), to: endOfMonth(now) };
    default:      return { from: startOfDay(now), to: endOfDay(now) };
  }
}

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const month = req.query.month as string | undefined;
  const monthStr = month || format(new Date(), "yyyy-MM");
  const now = new Date();

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const { from: monthStart, to: monthEnd } = month
    ? getDateRange("month", month)
    : { from: startOfMonth(now), to: endOfMonth(now) };

  const completed = eq(appointmentsTable.status, "COMPLETED");

  const [todayStats] = await db.select({
    revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(appointmentsTable).where(and(eq(appointmentsTable.salonId, salonId), completed, gte(appointmentsTable.date, todayStart), lte(appointmentsTable.date, todayEnd)));

  const [weekStats] = await db.select({
    revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(appointmentsTable).where(and(eq(appointmentsTable.salonId, salonId), completed, gte(appointmentsTable.date, weekStart), lte(appointmentsTable.date, weekEnd)));

  const [monthStats] = await db.select({
    revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(appointmentsTable).where(and(eq(appointmentsTable.salonId, salonId), completed, gte(appointmentsTable.date, monthStart), lte(appointmentsTable.date, monthEnd)));

  // NOUVEAU : Calcul du CA Produits
  const productSalesRes = await pool.query(
    `SELECT COALESCE(SUM(total), 0) as total_products FROM product_sales WHERE salon_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2`,
    [salonId, monthStr]
  );
  const revenueProducts = parseFloat(productSalesRes.rows[0].total_products);

  const [totalMonth] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(appointmentsTable).where(and(eq(appointmentsTable.salonId, salonId), gte(appointmentsTable.date, monthStart), lte(appointmentsTable.date, monthEnd)));

  const [activeEmployees] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(usersTable).where(and(eq(usersTable.salonId, salonId), eq(usersTable.active, true), eq(usersTable.role, "EMPLOYEE")));

  const completionRate = Number(totalMonth.count) > 0
    ? (Number(monthStats.count) / Number(totalMonth.count)) * 100 : 0;

  res.json({
    revenueToday: parseFloat(todayStats.revenue),
    revenueWeek: parseFloat(weekStats.revenue),
    revenueMonth: parseFloat(monthStats.revenue),
    revenueProducts: revenueProducts,
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
  const month = req.query.month as string | undefined;
  const { from, to } = getDateRange(period, month);

  const rows = await db.select({
    date: sql<string>`DATE(${appointmentsTable.date})`,
    revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(appointmentsTable).where(and(
    eq(appointmentsTable.salonId, salonId),
    eq(appointmentsTable.status, "COMPLETED"),
    gte(appointmentsTable.date, from),
    lte(appointmentsTable.date, to)
  )).groupBy(sql`DATE(${appointmentsTable.date})`).orderBy(sql`DATE(${appointmentsTable.date})`);

  res.json(rows.filter(r => parseFloat(r.revenue) > 0).map(r => ({
    label: format(new Date(r.date), period === "month" || month ? "dd/MM" : "EEE dd"),
    date: r.date,
    revenue: parseFloat(r.revenue),
    appointments: Number(r.count),
  })));
});

router.get("/dashboard/employee-ranking", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const period = (req.query.period as string) || "month";
  const month = req.query.month as string | undefined;
  const { from, to } = getDateRange(period, month);

  const rows = await db.select({
    employeeId: appointmentsTable.employeeId,
    name: usersTable.name,
    revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(appointmentsTable)
    .leftJoin(usersTable, eq(appointmentsTable.employeeId, usersTable.id))
    .where(and(eq(appointmentsTable.salonId, salonId), eq(appointmentsTable.status, "COMPLETED"), gte(appointmentsTable.date, from), lte(appointmentsTable.date, to)))
    .groupBy(appointmentsTable.employeeId, usersTable.name)
    .orderBy(sql`SUM(${appointmentsTable.price}) DESC`);

  const maxRevenue = rows.length > 0 ? parseFloat(rows[0].revenue) : 0;
  res.json(rows.map(r => ({
    employeeId: r.employeeId,
    name: r.name || "Unknown",
    revenue: parseFloat(r.revenue),
    appointments: Number(r.count),
    progressPercent: maxRevenue > 0 ? Math.round((parseFloat(r.revenue) / maxRevenue) * 100) : 0,
  })));
});

router.get("/dashboard/top-services", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const period = (req.query.period as string) || "month";
  const month = req.query.month as string | undefined;
  const { from, to } = getDateRange(period, month);

  const rows = await db.select({
    serviceId: appointmentsTable.serviceId,
    name: servicesTable.name,
    count: sql<number>`COUNT(*)`,
    revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`,
  }).from(appointmentsTable)
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .where(and(eq(appointmentsTable.salonId, salonId), eq(appointmentsTable.status, "COMPLETED"), gte(appointmentsTable.date, from), lte(appointmentsTable.date, to)))
    .groupBy(appointmentsTable.serviceId, servicesTable.name)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(10);

  res.json(rows.map(r => ({
    serviceId: r.serviceId,
    name: r.name || "Inconnu",
    count: Number(r.count),
    revenue: parseFloat(r.revenue),
  })));
});

router.get("/dashboard/my-stats", requireAuth, async (req, res): Promise<void> => {
  const { userId, salonId } = req.user!;
  const now = new Date();
  const completed = eq(appointmentsTable.status, "COMPLETED");
  const mine = eq(appointmentsTable.employeeId, userId);
  const salon = eq(appointmentsTable.salonId, salonId);

  const [todayStats] = await db.select({ revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`, count: sql<number>`COUNT(*)` })
    .from(appointmentsTable).where(and(salon, mine, completed, gte(appointmentsTable.date, startOfDay(now)), lte(appointmentsTable.date, endOfDay(now))));
  const [weekStats] = await db.select({ revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`, count: sql<number>`COUNT(*)` })
    .from(appointmentsTable).where(and(salon, mine, completed, gte(appointmentsTable.date, startOfWeek(now, { weekStartsOn: 1 })), lte(appointmentsTable.date, endOfWeek(now, { weekStartsOn: 1 }))));
  const [monthStats] = await db.select({ revenue: sql<string>`COALESCE(SUM(${appointmentsTable.price}), 0)`, count: sql<number>`COUNT(*)` })
    .from(appointmentsTable).where(and(salon, mine, completed, gte(appointmentsTable.date, startOfMonth(now)), lte(appointmentsTable.date, endOfMonth(now))));

  res.json({
    revenueToday: parseFloat(todayStats.revenue),
    revenueWeek: parseFloat(weekStats.revenue),
    revenueMonth: parseFloat(monthStats.revenue),
    revenueProducts: revenueProducts,
    appointmentsToday: Number(todayStats.count),
    appointmentsWeek: Number(weekStats.count),
    appointmentsMonth: Number(monthStats.count),
  });
});

router.get("/dashboard/my-schedule", requireAuth, async (req, res): Promise<void> => {
  const { userId, salonId } = req.user!;
  const view = (req.query.view as string) || "day";
  const { from, to } = getDateRange(view === "week" ? "week" : "day");

  const rows = await db.select({
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
  }).from(appointmentsTable)
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .leftJoin(usersTable, eq(appointmentsTable.employeeId, usersTable.id))
    .where(and(eq(appointmentsTable.salonId, salonId), eq(appointmentsTable.employeeId, userId), gte(appointmentsTable.date, from), lte(appointmentsTable.date, to)))
    .orderBy(appointmentsTable.date);

  res.json(rows.map(r => ({
    id: r.id, clientName: r.clientName, date: r.date, price: parseFloat(r.price),
    status: r.status, rating: r.rating, comment: r.comment, salonId: r.salonId,
    serviceId: r.serviceId, employeeId: r.employeeId,
    service: { id: r.serviceId, name: r.serviceName!, price: parseFloat(r.servicePrice!), duration: r.serviceDuration!, active: r.serviceActive!, salonId: r.serviceSalonId! },
    employee: { id: r.employeeId, name: r.employeeName!, email: r.employeeEmail!, role: r.employeeRole!, active: r.employeeActive!, salonId: r.employeeSalonId! },
  })));
});

// GET /dashboard/my-stats-period — Stats employée par période personnalisée
router.get("/dashboard/my-stats-period", requireAuth, async (req, res): Promise<void> => {
  const { userId, salonId } = req.user!;
  const { month, from, to } = req.query as { month?: string; from?: string; to?: string };

  let dateFrom: Date;
  let dateTo: Date;

  if (month) {
    const [year, m] = month.split("-").map(Number);
    dateFrom = new Date(year, m - 1, 1);
    dateTo = new Date(year, m, 0, 23, 59, 59);
  } else if (from && to) {
    dateFrom = new Date(from + "T00:00:00");
    dateTo = new Date(to + "T23:59:59");
  } else {
    res.status(400).json({ error: "month ou from+to requis" });
    return;
  }

  const result = await pool.query(
    `SELECT 
      COALESCE(SUM(price), 0) as revenue,
      COUNT(*) as appointments
     FROM appointments
     WHERE employee_id = $1 AND salon_id = $2
       AND status = 'COMPLETED'
       AND date >= $3 AND date <= $4`,
    [userId, salonId, dateFrom, dateTo]
  );

  res.json({
    revenue: parseFloat(result.rows[0].revenue),
    appointments: parseInt(result.rows[0].appointments),
  });
});

export default router;
