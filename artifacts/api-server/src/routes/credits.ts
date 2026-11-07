import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

function formatCredit(r: any) {
  return {
    id: r.id,
    employeeId: r.employee_id,
    employeeName: r.employee_name,
    amount: parseFloat(r.amount),
    reason: r.reason,
    dateGiven: r.date_given,
    remainingAmount: parseFloat(r.remaining_amount),
    status: r.status,
    createdAt: r.created_at,
  };
}

// GET /credits — Liste des crédits (manager voit tout, employée voit les siens)
router.get("/credits", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const isManager = req.user!.role === "MANAGER";

  const query = isManager
    ? `SELECT c.id, c.employee_id, u.name as employee_name, c.amount, c.reason,
              c.date_given, c.remaining_amount, c.status, c.created_at
       FROM employee_credits c JOIN users u ON c.employee_id = u.id
       WHERE c.salon_id = $1 ORDER BY c.created_at DESC`
    : `SELECT c.id, c.employee_id, u.name as employee_name, c.amount, c.reason,
              c.date_given, c.remaining_amount, c.status, c.created_at
       FROM employee_credits c JOIN users u ON c.employee_id = u.id
       WHERE c.salon_id = $1 AND c.employee_id = $2 ORDER BY c.created_at DESC`;

  const params = isManager ? [salonId] : [salonId, req.user!.userId];
  const result = await pool.query(query, params);

  res.json(result.rows.map(formatCredit));
});

// POST /credits — Créer un crédit (manager only)
router.post("/credits", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  const { employeeId, amount, reason, dateGiven } = req.body;
  if (!employeeId || !amount) {
    res.status(400).json({ error: "employeeId et amount requis" });
    return;
  }

  const result = await pool.query(
    `INSERT INTO employee_credits (employee_id, salon_id, amount, reason, date_given, remaining_amount, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $3, 'ACTIVE', $6) RETURNING id, created_at`,
    [employeeId, req.user!.salonId, amount, reason || null, dateGiven || new Date().toISOString().slice(0, 10), req.user!.userId]
  );

  await pool.query(
    `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, 'credit_given', $2, '/credits')`,
    [employeeId, `Un crédit de ${amount} MAD vous a été accordé`]
  );

  res.status(201).json({ id: result.rows[0].id, createdAt: result.rows[0].created_at });
});

// POST /credits/:id/repay — Enregistrer un remboursement (manager only)
router.post("/credits/:id/repay", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  const creditId = parseInt(req.params.id, 10);
  const { amount, notes } = req.body;
  if (!amount || amount <= 0) {
    res.status(400).json({ error: "amount requis et positif" });
    return;
  }

  const credit = await pool.query(`SELECT * FROM employee_credits WHERE id = $1`, [creditId]);
  if (credit.rows.length === 0) {
    res.status(404).json({ error: "Crédit introuvable" });
    return;
  }

  const current = credit.rows[0];
  const newRemaining = Math.max(0, parseFloat(current.remaining_amount) - parseFloat(amount));
  const newStatus = newRemaining === 0 ? "PAID" : "ACTIVE";

  await pool.query(
    `INSERT INTO credit_repayments (credit_id, amount, notes) VALUES ($1, $2, $3)`,
    [creditId, amount, notes || null]
  );

  await pool.query(
    `UPDATE employee_credits SET remaining_amount = $1, status = $2 WHERE id = $3`,
    [newRemaining, newStatus, creditId]
  );

  res.json({ success: true, remainingAmount: newRemaining, status: newStatus });
});

// GET /credits/:id/repayments — Historique des remboursements
router.get("/credits/:id/repayments", requireAuth, async (req, res): Promise<void> => {
  const result = await pool.query(
    `SELECT id, amount, date_paid, notes FROM credit_repayments WHERE credit_id = $1 ORDER BY date_paid DESC`,
    [req.params.id]
  );
  res.json(result.rows.map(r => ({
    id: r.id,
    amount: parseFloat(r.amount),
    datePaid: r.date_paid,
    notes: r.notes,
  })));
});

// DELETE /credits/:id — Supprimer un crédit (manager only, par exemple en cas d'erreur)
router.delete("/credits/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  await pool.query(`DELETE FROM employee_credits WHERE id = $1`, [req.params.id]);
  res.sendStatus(204);
});

// PATCH /credits/:id — Modifier un crédit (manager only)
router.patch("/credits/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  const { amount, reason, dateGiven } = req.body;
  const id = parseInt(req.params.id, 10);

  const current = await pool.query(`SELECT * FROM employee_credits WHERE id = $1`, [id]);
  if (current.rows.length === 0) {
    res.status(404).json({ error: "Crédit introuvable" });
    return;
  }

  const totalRepaid = parseFloat(current.rows[0].amount) - parseFloat(current.rows[0].remaining_amount);
  const newAmount = amount ? parseFloat(amount) : parseFloat(current.rows[0].amount);
  const newRemaining = Math.max(0, newAmount - totalRepaid);
  const newStatus = newRemaining === 0 ? "PAID" : "ACTIVE";

  const result = await pool.query(
    `UPDATE employee_credits SET amount = $1, reason = $2, date_given = $3, remaining_amount = $4, status = $5
     WHERE id = $6 RETURNING *`,
    [newAmount, reason ?? current.rows[0].reason, dateGiven ?? current.rows[0].date_given, newRemaining, newStatus, id]
  );

  res.json(formatCredit(result.rows[0]));
});

// GET /credits/export?month=2026-06 — Export données du mois (manager only)
router.get("/credits/export", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const [year, m] = month.split("-").map(Number);
  const monthStart = new Date(year, m - 1, 1).toISOString().slice(0, 10);
  const monthEnd = new Date(year, m, 0).toISOString().slice(0, 10);

  const result = await pool.query(
    `SELECT c.id, u.name as employee_name, c.amount, c.reason, c.date_given,
            c.remaining_amount, c.status,
            COALESCE((
              SELECT SUM(r.amount) FROM credit_repayments r WHERE r.credit_id = c.id
              AND r.date_paid >= $2 AND r.date_paid <= $3
            ), 0) as repaid_this_month
     FROM employee_credits c
     JOIN users u ON c.employee_id = u.id
     WHERE c.salon_id = $1
       AND (c.date_given >= $2 AND c.date_given <= $3
            OR c.status = 'ACTIVE')
     ORDER BY u.name`,
    [req.user!.salonId, monthStart, monthEnd]
  );

  res.json(result.rows.map(r => ({
    employeeName: r.employee_name,
    amount: parseFloat(r.amount),
    reason: r.reason,
    dateGiven: r.date_given,
    remainingAmount: parseFloat(r.remaining_amount),
    repaidThisMonth: parseFloat(r.repaid_this_month),
    status: r.status,
  })));
});

export default router;
