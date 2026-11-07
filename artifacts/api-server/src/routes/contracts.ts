import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

function formatContract(r: any) {
  return {
    id: r.id,
    employeeId: r.employee_id,
    employeeName: r.employee_name,
    contractType: r.contract_type,
    jobTitle: r.job_title,
    startDate: r.start_date,
    endDate: r.end_date,
    trialPeriodMonths: r.trial_period_months,
    baseSalary: parseFloat(r.base_salary),
    workingHours: r.working_hours,
    birthDate: r.birth_date,
    nationality: r.nationality,
    passportNumber: r.passport_number,
    idType: r.id_type,
    idNumber: r.id_number,
    gender: r.gender,
    status: r.status,
    terminationReason: r.termination_reason,
    terminatedAt: r.terminated_at,
    createdAt: r.created_at,
    daysUntilExpiry: r.end_date
      ? Math.ceil((new Date(r.end_date).getTime() - Date.now()) / 86400000)
      : null,
  };
}

// GET /contracts — Liste des contrats
router.get("/contracts", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Manager uniquement" });
    return;
  }
  const { status } = req.query;
  let query = `
    SELECT c.*, u.name as employee_name
    FROM employee_contracts c
    JOIN users u ON c.employee_id = u.id
    WHERE c.salon_id = $1`;
  const params: any[] = [req.user!.salonId];

  if (status) {
    params.push(status);
    query += ` AND c.status = $${params.length}`;
  }
  query += ` ORDER BY c.created_at DESC`;

  // Auto-expirer les CDD dont la date est passée
  await pool.query(
    `UPDATE employee_contracts SET status = 'EXPIRED'
     WHERE salon_id = $1 AND status = 'ACTIVE' AND end_date IS NOT NULL AND end_date < CURRENT_DATE`,
    [req.user!.salonId]
  );

  const result = await pool.query(query, params);
  res.json(result.rows.map(formatContract));
});

// GET /contracts/alerts — Contrats expirant dans 30 jours
router.get("/contracts/alerts", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Manager uniquement" });
    return;
  }
  const result = await pool.query(
    `SELECT c.*, u.name as employee_name
     FROM employee_contracts c
     JOIN users u ON c.employee_id = u.id
     WHERE c.salon_id = $1 AND c.status = 'ACTIVE'
       AND c.end_date IS NOT NULL
       AND c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
     ORDER BY c.end_date ASC`,
    [req.user!.salonId]
  );
  res.json(result.rows.map(formatContract));
});

// GET /contracts/my-contract — Contrat de l'employée connectée
router.get("/contracts/my-contract", requireAuth, async (req, res): Promise<void> => {
  const result = await pool.query(
    `SELECT c.*, u.name as employee_name
     FROM employee_contracts c
     JOIN users u ON c.employee_id = u.id
     WHERE c.employee_id = $1 AND c.status = 'ACTIVE'
     ORDER BY c.created_at DESC LIMIT 1`,
    [req.user!.userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Aucun contrat actif" });
    return;
  }
  res.json(formatContract(result.rows[0]));
});

// POST /contracts — Créer un contrat
router.post("/contracts", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Manager uniquement" });
    return;
  }
  const { employeeId, contractType, jobTitle, startDate, endDate, trialPeriodMonths, baseSalary, workingHours, birthDate, nationality, passportNumber, gender, idType, idNumber } = req.body;
  if (!employeeId || !contractType || !jobTitle || !startDate || !baseSalary) {
    res.status(400).json({ error: "employeeId, contractType, jobTitle, startDate et baseSalary requis" });
    return;
  }

  const result = await pool.query(
    `INSERT INTO employee_contracts
     (employee_id, salon_id, contract_type, job_title, start_date, end_date, trial_period_months, base_salary, working_hours, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [employeeId, req.user!.salonId, contractType, jobTitle, startDate, endDate || null,
     trialPeriodMonths || 1, baseSalary, workingHours || 44, req.user!.userId]
  );

  // Notification à l'employée
  await pool.query(
    `INSERT INTO notifications (user_id, type, message, link)
     VALUES ($1, 'contract', 'Un nouveau contrat vous a été assigné 📄', '/my-contract')`,
    [employeeId]
  );

  res.status(201).json({ id: result.rows[0].id });
});

// PATCH /contracts/:id — Modifier un contrat
router.patch("/contracts/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Manager uniquement" });
    return;
  }
  
  const { 
    contractType, jobTitle, startDate, endDate, trialPeriodMonths, 
    baseSalary, workingHours, status, birthDate, nationality, 
    passportNumber, gender, idType, idNumber 
  } = req.body;
  
  try {
    await pool.query(
      `UPDATE employee_contracts SET 
        contract_type = COALESCE($1, contract_type), 
        job_title = COALESCE($2, job_title), 
        start_date = COALESCE($3, start_date), 
        end_date = COALESCE($4, end_date), 
        trial_period_months = COALESCE($5, trial_period_months), 
        base_salary = COALESCE($6, base_salary), 
        working_hours = COALESCE($7, working_hours), 
        status = COALESCE($8, status),
        birth_date = COALESCE($9, birth_date),
        nationality = COALESCE($10, nationality),
        passport_number = COALESCE($11, passport_number),
        gender = COALESCE($12, gender),
        id_type = COALESCE($13, id_type),
        id_number = COALESCE($14, id_number)
       WHERE id = $15 AND salon_id = $16`,
      [
        contractType, jobTitle, startDate, endDate, trialPeriodMonths, 
        baseSalary, workingHours, status, 
        birthDate || null, nationality || null, passportNumber || null, gender || null, 
        idType || null, idNumber || null, 
        req.params.id, req.user!.salonId
      ]
    );
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Erreur PATCH contrat:", error);
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  }
});

// PATCH /contracts/:id/terminate — Résilier un contrat
router.patch("/contracts/:id/terminate", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Manager uniquement" });
    return;
  }
  const { reason } = req.body;
  await pool.query(
    `UPDATE employee_contracts SET status = 'TERMINATED', termination_reason = $1, terminated_at = CURRENT_DATE
     WHERE id = $2 AND salon_id = $3`,
    [reason || null, req.params.id, req.user!.salonId]
  );
  res.json({ success: true });
});


// DELETE /contracts/:id — Supprimer un contrat
router.delete("/contracts/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Manager uniquement" });
    return;
  }
  await pool.query(
    `DELETE FROM employee_contracts WHERE id = $1 AND salon_id = $2`,
    [req.params.id, req.user!.salonId]
  );
  res.json({ success: true });
});

export default router;

