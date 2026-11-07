import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/employees/:id/profile", requireAuth, async (req, res): Promise<void> => {
  const employeeId = parseInt(req.params.id, 10);
  const salonId = req.user!.salonId;

  try {
    // 1. Infos de base
    const userRes = await pool.query(
      `SELECT id, name, email, role, active, id_front_url, id_back_url, bank_name, bank_rib FROM users WHERE id = $1 AND salon_id = $2`,
      [employeeId, salonId]
    );
    if (userRes.rows.length === 0) { 
      res.status(404).json({ error: "Employé introuvable" }); 
      return; 
    }
    const employee = userRes.rows[0];

    // 2. Contrat actif
    const contractRes = await pool.query(
      `SELECT * FROM employee_contracts WHERE employee_id = $1 AND status = 'ACTIVE' LIMIT 1`,
      [employeeId]
    );
    const contract = contractRes.rows[0] || null;

    // 3. Documents générés
    const docsRes = await pool.query(
      `SELECT id, document_type, title, created_at FROM employee_documents WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [employeeId]
    );

    // 4. Performances (30 derniers jours)
    const perfRes = await pool.query(
      `SELECT 
        COALESCE(SUM(price), 0) as total_revenue,
        COUNT(*) as total_appointments
       FROM appointments 
       WHERE employee_id = $1 AND salon_id = $2 AND status = 'COMPLETED' AND date >= NOW() - INTERVAL '30 days'`,
      [employeeId, salonId]
    );

    // 5. Absences
    const absencesRes = await pool.query(
      `SELECT id, type, date_start, date_end, status, reason FROM absences WHERE employee_id = $1 ORDER BY date_start DESC LIMIT 10`,
      [employeeId]
    );

    res.json({
      employee,
      contract,
      documents: docsRes.rows,
      performance: {
        revenue30d: parseFloat(perfRes.rows[0].total_revenue),
        appointments30d: parseInt(perfRes.rows[0].total_appointments),
      },
      absences: absencesRes.rows,
    });
  } catch (error: any) {
    console.error("Erreur profil employé:", error);
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
});

export default router;
