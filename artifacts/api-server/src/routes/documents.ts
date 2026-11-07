import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// GET /documents — Historique des documents générés
router.get("/documents", requireAuth, async (req, res): Promise<void> => {
  const result = await pool.query(
    `SELECT d.id, d.document_type, d.title, d.created_at, u.name as employee_name
     FROM employee_documents d
     LEFT JOIN users u ON d.employee_id = u.id
     WHERE d.salon_id = $1
     ORDER BY d.created_at DESC`,
    [req.user!.salonId]
  );

  res.json(result.rows.map(r => ({
    id: r.id,
    documentType: r.document_type,
    title: r.title,
    employeeName: r.employee_name,
    createdAt: r.created_at,
  })));
});

// POST /documents — Enregistrer qu'un document a été généré
router.post("/documents", requireAuth, async (req, res): Promise<void> => {
  const { employeeId, documentType, title } = req.body;
  
  if (!employeeId || !documentType || !title) {
    res.status(400).json({ error: "employeeId, documentType et title sont requis" });
    return;
  }

  await pool.query(
    `INSERT INTO employee_documents (salon_id, employee_id, document_type, title, created_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [req.user!.salonId, employeeId, documentType, title, req.user!.userId]
  );

  res.status(201).json({ success: true });
});

export default router;
