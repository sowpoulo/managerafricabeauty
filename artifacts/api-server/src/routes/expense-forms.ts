import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// GET /expense-forms — Liste des bons
router.get("/expense-forms", requireAuth, async (req, res): Promise<void> => {
  const { status, requester, dateFrom, dateTo } = req.query;
  let query = `SELECT * FROM expense_forms WHERE salon_id = $1`;
  const params: any[] = [req.user!.salonId];

  if (status && status !== "all") { params.push(status); query += ` AND status = $${params.length}`; }
  if (requester) { params.push(`%${requester}%`); query += ` AND requester_name ILIKE $${params.length}`; }
  if (dateFrom) { params.push(dateFrom); query += ` AND date >= $${params.length}`; }
  if (dateTo) { params.push(dateTo); query += ` AND date <= $${params.length}`; }

  query += ` ORDER BY created_at DESC`;
  const result = await pool.query(query, params);
  res.json(result.rows);
});

// GET /expense-forms/:id — Détail d'un bon
router.get("/expense-forms/:id", requireAuth, async (req, res): Promise<void> => {
  const form = await pool.query(`SELECT * FROM expense_forms WHERE id = $1 AND salon_id = $2`, [req.params.id, req.user!.salonId]);
  if (form.rows.length === 0) { res.status(404).json({ error: "Bon introuvable" }); return; }
  
  const items = await pool.query(`SELECT * FROM expense_form_items WHERE form_id = $1`, [req.params.id]);
  const history = await pool.query(`
    SELECT h.*, u.name as user_name FROM expense_form_history h 
    LEFT JOIN users u ON h.changed_by = u.id 
    WHERE h.form_id = $1 ORDER BY h.changed_at DESC`, [req.params.id]);

  res.json({ ...form.rows[0], items: items.rows, history: history.rows });
});

// POST /expense-forms — Créer un bon
router.post("/expense-forms", requireAuth, async (req, res): Promise<void> => {
  const { date, requesterName, beneficiary, reason, paymentMethod, observations, items } = req.body;
  
  // Générer le numéro (ex: BD-202310-001)
  const countRes = await pool.query(`SELECT COUNT(*) FROM expense_forms WHERE salon_id = $1`, [req.user!.salonId]);
  const count = parseInt(countRes.rows[0].count) + 1;
  const formNumber = `BD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count).padStart(4, '0')}`;

  const total = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);

  const formRes = await pool.query(
    `INSERT INTO expense_forms (salon_id, form_number, date, requester_name, beneficiary, reason, payment_method, observations, total_amount, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [req.user!.salonId, formNumber, date || new Date(), requesterName, beneficiary, reason, paymentMethod, observations, total, req.user!.userId]
  );
  const formId = formRes.rows[0].id;

  for (const item of items) {
    await pool.query(
      `INSERT INTO expense_form_items (form_id, description, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)`,
      [formId, item.description, item.quantity, item.unitPrice, item.quantity * item.unitPrice]
    );
  }

  await pool.query(`INSERT INTO expense_form_history (form_id, action, changed_by) VALUES ($1, 'Création du bon', $2)`, [formId, req.user!.userId]);

  res.status(201).json({ id: formId, formNumber });
});

// PATCH /expense-forms/:id/status — Changer le statut
router.patch("/expense-forms/:id/status", requireAuth, async (req, res): Promise<void> => {
  const { status } = req.body;
  const validStatuses = ["BROUILLON", "EN_ATTENTE", "VALIDE", "REFUSE", "PAYE"];
  
  if (!validStatuses.includes(status)) { res.status(400).json({ error: "Statut invalide" }); return; }
  if (req.user!.role !== "MANAGER" && status !== "EN_ATTENTE") {
    res.status(403).json({ error: "Seul un manager peut valider ou payer" }); return;
  }

  await pool.query(`UPDATE expense_forms SET status = $1, updated_at = NOW() WHERE id = $2 AND salon_id = $3`, [status, req.params.id, req.user!.salonId]);
  await pool.query(`INSERT INTO expense_form_history (form_id, action, details, changed_by) VALUES ($1, $2, $3, $4)`, [req.params.id, `Statut : ${status}`, `Nouveau statut : ${status}`, req.user!.userId]);

  res.json({ success: true });
});

export default router;
