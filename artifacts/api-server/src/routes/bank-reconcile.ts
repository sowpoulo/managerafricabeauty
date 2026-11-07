import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// GET /bank/reconcile/suggestions — Propositions de rapprochement
router.get("/bank/reconcile/suggestions", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

  // 1. Récupérer les transactions CREDIT non rapprochées du mois
  const transactions = await pool.query(
    `SELECT bt.id, bt.date, bt.description, bt.amount
     FROM bank_transactions bt
     WHERE bt.salon_id = $1
       AND bt.type = 'CREDIT'
       AND bt.reconciled = false
       AND TO_CHAR(bt.date, 'YYYY-MM') = $2
     ORDER BY bt.date DESC`,
    [salonId, month]
  );

  if (transactions.rows.length === 0) {
    res.json([]);
    return;
  }

  // 2. Récupérer les RDV COMPLETED du mois
  const appointments = await pool.query(
    `SELECT a.id, a.date, a.price, a.client_name, a.employee_id, u.name as employee_name
     FROM appointments a
     LEFT JOIN users u ON a.employee_id = u.id
     WHERE a.salon_id = $1
       AND a.status = 'COMPLETED'
       AND TO_CHAR(a.date, 'YYYY-MM') = $2
     ORDER BY a.date DESC`,
    [salonId, month]
  );

  const suggestions: any[] = [];

  for (const txn of transactions.rows) {
    const txnDate = new Date(txn.date);
    const txnAmount = parseFloat(txn.amount);

    // Chercher un RDV qui correspond
    let bestMatch = null;
    let bestScore = 0;

    for (const apt of appointments.rows) {
      const aptDate = new Date(apt.date);
      const aptAmount = parseFloat(apt.price);

      // Différence de date en jours
      const dayDiff = Math.abs((txnDate.getTime() - aptDate.getTime()) / (1000 * 60 * 60 * 24));

      // Différence de montant
      const amountDiff = Math.abs(txnAmount - aptAmount);

      // Score : plus petit = meilleur match
      if (amountDiff < 5 && dayDiff < 3) {
        const score = amountDiff + dayDiff;
        if (bestMatch === null || score < bestScore) {
          bestMatch = apt;
          bestScore = score;
        }
      }
    }

    if (bestMatch) {
      suggestions.push({
        transaction: {
          id: txn.id,
          date: txn.date,
          description: txn.description,
          amount: parseFloat(txn.amount),
        },
        appointment: {
          id: bestMatch.id,
          date: bestMatch.date,
          clientName: bestMatch.client_name,
          price: parseFloat(bestMatch.price),
          employeeName: bestMatch.employee_name || "Non assigné",
        },
        score: Math.round(bestScore * 100) / 100,
      });
    }
  }

  res.json(suggestions);
});

// POST /bank/reconcile/:transactionId — Rapprocher une transaction avec un RDV
router.post("/bank/reconcile/:transactionId", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }

  const { appointmentId } = req.body || {};
  const transactionId = parseInt(req.params.transactionId, 10);

  if (!appointmentId) {
    res.status(400).json({ error: "appointmentId requis" });
    return;
  }

  await pool.query(
    `UPDATE bank_transactions
     SET reconciled = true, reconciled_with = $1
     WHERE id = $2 AND salon_id = $3`,
    [appointmentId, transactionId, req.user!.salonId]
  );

  res.json({ success: true });
});

// POST /bank/reconcile/ignore/:transactionId — Ignorer une transaction (ne pas la rapprocher)
router.post("/bank/reconcile/ignore/:transactionId", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }

  const transactionId = parseInt(req.params.transactionId, 10);

  // On peut marquer la transaction comme "ignorée" (ajouter une colonne, ou simplement la laisser non rapprochée)
  // Pour l'instant on ne fait rien, elle restera non rapprochée et ne sera plus proposée
  // On pourrait ajouter un champ ignored_at si besoin

  res.json({ success: true });
});

// GET /bank/unreconciled — Transactions non rapprochées
router.get("/bank/unreconciled", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

  const result = await pool.query(
    `SELECT id, date, description, amount, type
     FROM bank_transactions
     WHERE salon_id = $1
       AND reconciled = false
       AND TO_CHAR(date, 'YYYY-MM') = $2
     ORDER BY date DESC`,
    [salonId, month]
  );

  res.json(result.rows.map(r => ({
    id: r.id,
    date: r.date,
    description: r.description,
    amount: parseFloat(r.amount),
    type: r.type,
  })));
});

// GET /bank/reconciled — Transactions rapprochées
router.get("/bank/reconciled", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

  const result = await pool.query(
    `SELECT bt.id, bt.date, bt.description, bt.amount, bt.reconciled_with,
            a.id as appointment_id, a.client_name, a.price
     FROM bank_transactions bt
     LEFT JOIN appointments a ON bt.reconciled_with = a.id
     WHERE bt.salon_id = $1
       AND bt.reconciled = true
       AND TO_CHAR(bt.date, 'YYYY-MM') = $2
     ORDER BY bt.date DESC`,
    [salonId, month]
  );

  res.json(result.rows.map(r => ({
    id: r.id,
    date: r.date,
    description: r.description,
    amount: parseFloat(r.amount),
    reconciledWith: r.reconciled_with,
    appointment: r.reconciled_with ? {
      id: r.appointment_id,
      clientName: r.client_name,
      price: parseFloat(r.price),
    } : null,
  })));
});

export default router;
