import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// GET /executive/employees-overview — Radar de toutes les employées
router.get("/executive/employees-overview", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER" && req.user!.role !== "DIRECTION") {
    res.status(403).json({ error: "Accès réservé à la direction" });
    return;
  }

  // On récupère toutes les employées, leurs salons, et leurs stats du mois en cours
  const query = `
    SELECT 
      u.id, u.name, u.email, u.active,
      s.name as salon_name,
      c.job_title,
      COALESCE(SUM(a.price) FILTER (WHERE a.status = 'COMPLETED' AND a.date >= date_trunc('month', current_date)), 0) as revenue_month,
      COUNT(a.id) FILTER (WHERE a.status = 'COMPLETED' AND a.date >= date_trunc('month', current_date)) as appointments_month
    FROM users u
    JOIN salons s ON u.salon_id = s.id
    LEFT JOIN employee_contracts c ON c.employee_id = u.id AND c.status = 'ACTIVE'
    LEFT JOIN appointments a ON a.employee_id = u.id
    WHERE u.role = 'EMPLOYEE'
    GROUP BY u.id, s.name, c.job_title
    ORDER BY revenue_month DESC
  `;

  const result = await pool.query(query);
  
  res.json(result.rows.map(r => ({
    id: r.id,
    name: r.name,
    email: r.email,
    active: r.active,
    salonName: r.salon_name,
    jobTitle: r.job_title || "Poste non défini",
    revenueMonth: parseFloat(r.revenue_month),
    appointmentsMonth: parseInt(r.appointments_month),
  })));
});

export default router;
