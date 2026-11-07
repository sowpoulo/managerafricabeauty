import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// ===== DÉPENSES =====

// GET /accounting/expenses — Liste des dépenses
router.get("/accounting/expenses", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  
  const result = await pool.query(
    `SELECT id, category, description, amount, date, receipt_url, tva_deductible, tva_amount, created_at
     FROM expenses
     WHERE salon_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
     ORDER BY date DESC`,
    [salonId, month]
  );
  
  res.json(result.rows.map(r => ({
    id: r.id,
    category: r.category,
    description: r.description,
    amount: parseFloat(r.amount),
    date: r.date,
    receiptUrl: r.receipt_url,
    tvaDeductible: r.tva_deductible,
    tvaAmount: parseFloat(r.tva_amount),
    createdAt: r.created_at,
  })));
});

// POST /accounting/expenses — Ajouter une dépense
router.post("/accounting/expenses", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  
  const { category, description, amount, date, tvaDeductible, tvaAmount } = req.body;
  
  if (!category || !amount) {
    res.status(400).json({ error: "Catégorie et montant requis" });
    return;
  }
  
  const result = await pool.query(
    `INSERT INTO expenses (salon_id, category, description, amount, date, tva_deductible, tva_amount, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [req.user!.salonId, category, description || null, amount, date || new Date(), tvaDeductible || false, tvaAmount || 0, req.user!.userId]
  );
  
  res.status(201).json({ id: result.rows[0].id });
});

// DELETE /accounting/expenses/:id — Supprimer une dépense
router.delete("/accounting/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  
  await pool.query(
    `DELETE FROM expenses WHERE id = $1 AND salon_id = $2`,
    [req.params.id, req.user!.salonId]
  );
  
  res.json({ success: true });
});

// ===== TABLEAU DE BORD COMPTABLE (P&L simplifié) =====

// GET /accounting/dashboard — Résumé P&L du mois
router.get("/accounting/dashboard", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  
  // 1. Chiffre d'affaires (ventes depuis RDV COMPLETED)
  const salesResult = await pool.query(
    `SELECT COALESCE(SUM(price), 0) as total
     FROM appointments
     WHERE salon_id = $1 AND status = 'COMPLETED' AND TO_CHAR(date, 'YYYY-MM') = $2`,
    [salonId, month]
  );
  const revenue = parseFloat(salesResult.rows[0].total);
  
  // 2. Total dépenses
  const expensesResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM expenses
     WHERE salon_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2`,
    [salonId, month]
  );
  const totalExpenses = parseFloat(expensesResult.rows[0].total);
  
  // 3. Masse salariale (depuis payroll)
  const salaryResult = await pool.query(
    `SELECT COALESCE(SUM(to_pay), 0) as total
     FROM payroll
     WHERE salon_id = $1 AND month = $2 AND status = 'PAID'`,
    [salonId, month]
  );
  const totalSalaries = parseFloat(salaryResult.rows[0].total);
  
  // 4. TVA collectée (20% du CA)
  const tvaCollected = revenue * 0.20;
  
  // 5. TVA déductible (sur dépenses avec tva_deductible=true)
  const tvaDeductibleResult = await pool.query(
    `SELECT COALESCE(SUM(tva_amount), 0) as total
     FROM expenses
     WHERE salon_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2 AND tva_deductible = true`,
    [salonId, month]
  );
  const tvaDeductible = parseFloat(tvaDeductibleResult.rows[0].total);
  
  const tvaNet = tvaCollected - tvaDeductible;
  
  res.json({
    month,
    revenue,
    totalExpenses,
    totalSalaries,
    tvaCollected,
    tvaDeductible,
    tvaNet,
    netProfit: revenue - totalExpenses - totalSalaries,
  });
});

// ===== RELEVÉ BANCAIRE =====

// POST /accounting/bank/import — Importer une transaction (saisie manuelle)
router.post("/accounting/bank/import", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }
  
  const { date, description, amount, type, category } = req.body;
  
  if (!date || !description || !amount || !type) {
    res.status(400).json({ error: "date, description, amount et type requis" });
    return;
  }
  
  const result = await pool.query(
    `INSERT INTO bank_transactions (salon_id, bank_account_id, date, description, amount, type, category)
     VALUES ($1, (SELECT id FROM bank_accounts WHERE salon_id = $1 AND is_default = true), $2, $3, $4, $5, $6)
     RETURNING id`,
    [req.user!.salonId, date, description, amount, type, category || null]
  );
  
  res.status(201).json({ id: result.rows[0].id });
});

// GET /accounting/bank — Liste des transactions bancaires
router.get("/accounting/bank", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  
  const result = await pool.query(
    `SELECT id, date, description, amount, type, category, reconciled, reconciled_with
     FROM bank_transactions
     WHERE salon_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
     ORDER BY date DESC`,
    [salonId, month]
  );
  
  res.json(result.rows.map(r => ({
    id: r.id,
    date: r.date,
    description: r.description,
    amount: parseFloat(r.amount),
    type: r.type,
    category: r.category,
    reconciled: r.reconciled,
    reconciledWith: r.reconciled_with,
  })));
});

export default router;

// ===== FIDÉLITÉ CLIENTS =====

// GET /loyalty/stats — Statistiques de fidélité
router.get("/loyalty/stats", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;

  // Top 10 clients par nombre de RDV
  const topClients = await pool.query(
    `SELECT client_name, COUNT(*) as visits, SUM(price) as total_spent
     FROM appointments
     WHERE salon_id = $1 AND status = 'COMPLETED'
     GROUP BY client_name
     HAVING COUNT(*) > 1
     ORDER BY COUNT(*) DESC
     LIMIT 10`,
    [salonId]
  );

  // Client avec le plus gros panier moyen
  const avgSpent = await pool.query(
    `SELECT client_name, AVG(price) as avg_spent
     FROM appointments
     WHERE salon_id = $1 AND status = 'COMPLETED'
     GROUP BY client_name
     ORDER BY AVG(price) DESC
     LIMIT 1`,
    [salonId]
  );

  res.json({
    topClients: topClients.rows,
    bestAvgClient: avgSpent.rows[0] || null,
  });
});
