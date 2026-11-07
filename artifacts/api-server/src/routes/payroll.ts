import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

function formatRow(r: any) {
  return {
    id: r.id,
    employeeId: r.employee_id,
    employeeName: r.employee_name,
    month: r.month,
    netSalary: parseFloat(r.net_salary),
    absenceDays: parseFloat(r.absence_days),
    dailyRate: parseFloat(r.daily_rate),
    deductions: parseFloat(r.deductions),
    advance: parseFloat(r.advance),
    toPay: parseFloat(r.to_pay),
    status: r.status,
    notes: r.notes,
  };
}

router.get("/payroll", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const salonId = req.user!.salonId;

  const employees = await pool.query(
    `SELECT id, name FROM users WHERE salon_id = $1 AND role = 'EMPLOYEE' AND active = true ORDER BY name`,
    [salonId]
  );
  for (const emp of employees.rows) {
    await pool.query(
      `INSERT INTO payroll (employee_id, salon_id, month, net_salary, daily_rate, to_pay, status)
       VALUES ($1, $2, $3, 0, 0, 0, 'PENDING')
       ON CONFLICT (employee_id, month) DO NOTHING`,
      [emp.id, salonId, month]
    );
  }

  const result = await pool.query(
    `SELECT p.id, p.employee_id, u.name as employee_name, p.month,
            p.net_salary, p.absence_days, p.daily_rate, p.deductions,
            p.advance, p.to_pay, p.status, p.notes
     FROM payroll p
     JOIN users u ON p.employee_id = u.id
     WHERE p.salon_id = $1 AND p.month = $2
     ORDER BY u.name`,
    [salonId, month]
  );

  res.json(result.rows.map(formatRow));
});

router.patch("/payroll/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  const id = parseInt(req.params.id, 10);
  const { netSalary, absenceDays, advance, notes } = req.body;

  const salary = netSalary !== undefined ? parseFloat(netSalary) : null;
  const absDays = absenceDays !== undefined ? parseFloat(absenceDays) : null;
  const adv = advance !== undefined ? parseFloat(advance) : null;

  const current = await pool.query(`SELECT * FROM payroll WHERE id = $1`, [id]);
  if (current.rows.length === 0) {
    res.status(404).json({ error: "Ligne de paie introuvable" });
    return;
  }
  const row = current.rows[0];

  const finalSalary = salary ?? parseFloat(row.net_salary);
  const finalAbsDays = absDays ?? parseFloat(row.absence_days);
  const finalAdvance = adv ?? parseFloat(row.advance);

  const dailyRate = finalSalary / 26;
  const deductions = dailyRate * finalAbsDays;
  const toPay = Math.round((finalSalary - deductions - finalAdvance) * 100) / 100;

  const result = await pool.query(
    `UPDATE payroll SET 
       net_salary = $1, absence_days = $2, daily_rate = $3, 
       deductions = $4, advance = $5, to_pay = $6, notes = $7
     WHERE id = $8 RETURNING *`,
    [finalSalary, finalAbsDays, dailyRate, deductions, finalAdvance, toPay, notes ?? row.notes, id]
  );

  res.json(formatRow(result.rows[0]));
});

router.patch("/payroll/:id/pay", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  await pool.query(
    `UPDATE payroll SET status = 'PAID', paid_at = NOW() WHERE id = $1`,
    [req.params.id]
  );
  res.json({ success: true });
});

router.get("/payroll/my-payslips", requireAuth, async (req, res): Promise<void> => {
  const result = await pool.query(
    `SELECT id, month, net_salary, absence_days, deductions, advance, to_pay, status
     FROM payroll WHERE employee_id = $1 ORDER BY month DESC`,
    [req.user!.userId]
  );
  res.json(result.rows.map(formatRow));
});

router.get("/absences", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const isManager = req.user!.role === "MANAGER";

  const query = isManager
    ? `SELECT a.id, a.employee_id, u.name as employee_name, a.type, a.date_start, a.date_end,
              a.days_count, a.status, a.reason, a.created_at
       FROM absences a JOIN users u ON a.employee_id = u.id
       WHERE a.salon_id = $1 ORDER BY a.created_at DESC`
    : `SELECT a.id, a.employee_id, u.name as employee_name, a.type, a.date_start, a.date_end,
              a.days_count, a.status, a.reason, a.created_at
       FROM absences a JOIN users u ON a.employee_id = u.id
       WHERE a.salon_id = $1 AND a.employee_id = $2 ORDER BY a.created_at DESC`;

  const params = isManager ? [salonId] : [salonId, req.user!.userId];
  const result = await pool.query(query, params);

  res.json(result.rows.map(r => ({
    id: r.id,
    employeeId: r.employee_id,
    employeeName: r.employee_name,
    type: r.type,
    dateStart: r.date_start,
    dateEnd: r.date_end,
    daysCount: parseFloat(r.days_count),
    status: r.status,
    reason: r.reason,
    createdAt: r.created_at,
  })));
});

router.post("/absences", requireAuth, async (req, res): Promise<void> => {
  const { type, dateStart, dateEnd, reason, employeeId } = req.body;
  if (!type || !dateStart || !dateEnd) {
    res.status(400).json({ error: "type, dateStart et dateEnd requis" });
    return;
  }

  // Le manager peut créer une demande pour une employée précise
  let targetEmployeeId = req.user!.userId;
  if (req.user!.role === "MANAGER" && employeeId) {
    targetEmployeeId = employeeId;
  }

  const days = (new Date(dateEnd).getTime() - new Date(dateStart).getTime()) / 86400000 + 1;

  const result = await pool.query(
    `INSERT INTO absences (employee_id, salon_id, type, date_start, date_end, days_count, reason, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING') RETURNING id, created_at`,
    [targetEmployeeId, req.user!.salonId, type, dateStart, dateEnd, days, reason || null]
  );

  res.status(201).json({ id: result.rows[0].id, createdAt: result.rows[0].created_at });
});

router.patch("/absences/:id/status", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  const { status } = req.body;
  if (!["APPROVED", "REJECTED"].includes(status)) {
    res.status(400).json({ error: "status invalide" });
    return;
  }

  await pool.query(
    `UPDATE absences SET status = $1, approved_by = $2 WHERE id = $3`,
    [status, req.user!.userId, req.params.id]
  );

  const absence = await pool.query(`SELECT employee_id, days_count, type FROM absences WHERE id = $1`, [req.params.id]);
  if (absence.rows.length > 0) {
    const msg = status === "APPROVED"
      ? `Votre demande de congé a été approuvée ✅`
      : `Votre demande de congé a été refusée`;
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, 'absence_status', $2, '/my-absences')`,
      [absence.rows[0].employee_id, msg]
    );
  }

  res.json({ success: true });
});

// GET /leave-balances — Liste des soldes de congés (manager)
router.get("/leave-balances", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const salonId = req.user!.salonId;

  // Auto-créer les soldes pour les employées actives qui n'en ont pas
  const employees = await pool.query(
    `SELECT id, name FROM users WHERE salon_id = $1 AND role = 'EMPLOYEE' AND active = true`,
    [salonId]
  );
  for (const emp of employees.rows) {
    await pool.query(
      `INSERT INTO leave_balances (employee_id, salon_id, year, total_days, used_days)
       VALUES ($1, $2, $3, 18, 0) ON CONFLICT (employee_id, year) DO NOTHING`,
      [emp.id, salonId, year]
    );
  }

  // Calculer used_days dynamiquement depuis les congés approuvés (type CONGE uniquement)
  const result = await pool.query(
    `SELECT lb.id, lb.employee_id, u.name as employee_name, lb.year, lb.total_days,
            COALESCE((
              SELECT SUM(a.days_count) FROM absences a
              WHERE a.employee_id = lb.employee_id AND a.type = 'CONGE' AND a.status = 'APPROVED'
                AND EXTRACT(YEAR FROM a.date_start) = lb.year
            ), 0) as used_days
     FROM leave_balances lb
     JOIN users u ON lb.employee_id = u.id
     WHERE lb.salon_id = $1 AND lb.year = $2
     ORDER BY u.name`,
    [salonId, year]
  );

  res.json(result.rows.map(r => ({
    id: r.id,
    employeeId: r.employee_id,
    employeeName: r.employee_name,
    year: r.year,
    totalDays: parseFloat(r.total_days),
    usedDays: parseFloat(r.used_days),
    remainingDays: parseFloat(r.total_days) - parseFloat(r.used_days),
  })));
});

// PATCH /leave-balances/:id — Modifier le total de jours alloués (manager)
router.patch("/leave-balances/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  const { totalDays } = req.body;
  if (totalDays === undefined) {
    res.status(400).json({ error: "totalDays requis" });
    return;
  }
  await pool.query(`UPDATE leave_balances SET total_days = $1 WHERE id = $2`, [totalDays, req.params.id]);
  res.json({ success: true });
});

// GET /leave-balances/my-balance — Mon solde (employée)
router.get("/leave-balances/my-balance", requireAuth, async (req, res): Promise<void> => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const userId = req.user!.userId;

  await pool.query(
    `INSERT INTO leave_balances (employee_id, salon_id, year, total_days, used_days)
     VALUES ($1, $2, $3, 18, 0) ON CONFLICT (employee_id, year) DO NOTHING`,
    [userId, req.user!.salonId, year]
  );

  const result = await pool.query(
    `SELECT lb.total_days,
            COALESCE((
              SELECT SUM(a.days_count) FROM absences a
              WHERE a.employee_id = $1 AND a.type = 'CONGE' AND a.status = 'APPROVED'
                AND EXTRACT(YEAR FROM a.date_start) = $2
            ), 0) as used_days
     FROM leave_balances lb
     WHERE lb.employee_id = $1 AND lb.year = $2`,
    [userId, year]
  );

  const row = result.rows[0];
  res.json({
    year,
    totalDays: parseFloat(row.total_days),
    usedDays: parseFloat(row.used_days),
    remainingDays: parseFloat(row.total_days) - parseFloat(row.used_days),
  });
});

// PATCH /users/:id/bank-info — Mettre à jour les infos bancaires (manager)
router.patch("/users/:id/bank-info", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  const { bankName, bankRib } = req.body;
  await pool.query(
    `UPDATE users SET bank_name = $1, bank_rib = $2 WHERE id = $3 AND salon_id = $4`,
    [bankName || null, bankRib || null, req.params.id, req.user!.salonId]
  );
  res.json({ success: true });
});

// GET /payroll/virement?month=2026-07 — Données pour ordre de virement
router.get("/payroll/virement", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const salonId = req.user!.salonId;

  const result = await pool.query(
    `SELECT u.name, u.bank_name, u.bank_rib, p.to_pay, p.net_salary, p.deductions, p.advance
     FROM payroll p
     JOIN users u ON p.employee_id = u.id
     WHERE p.salon_id = $1 AND p.month = $2 AND p.to_pay > 0
     ORDER BY u.name`,
    [salonId, month]
  );

  res.json(result.rows.map(r => ({
    name: r.name,
    bankName: r.bank_name || "Non renseigné",
    bankRib: r.bank_rib || "Non renseigné",
    netSalary: parseFloat(r.net_salary),
    deductions: parseFloat(r.deductions),
    advance: parseFloat(r.advance),
    toPay: parseFloat(r.to_pay),
  })));
});

export default router;
