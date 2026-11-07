import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";
import { subDays, startOfDay, endOfDay } from "date-fns";

const router: IRouter = Router();

// GET /reminders/today — Récupère les RDV à rappeler aujourd'hui (J-1)
router.get("/reminders/today", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = startOfDay(tomorrow);
  const end = endOfDay(tomorrow);

  const result = await pool.query(
    `SELECT a.id, a.client_name, a.client_phone, a.date, a.price, u.name as employee_name
     FROM appointments a
     JOIN users u ON a.employee_id = u.id
     WHERE a.salon_id = $1
       AND a.status = 'CONFIRMED'
       AND a.date BETWEEN $2 AND $3
       AND a.reminder_sent IS NULL
     ORDER BY a.date`,
    [salonId, start, end]
  );

  res.json(result.rows);
});

// POST /reminders/send — Marquer les rappels comme envoyés (simulation)
router.post("/reminders/send", requireAuth, async (req, res): Promise<void> => {
  const { appointmentIds } = req.body;
  if (!appointmentIds || !Array.isArray(appointmentIds)) {
    res.status(400).json({ error: "appointmentIds requis" });
    return;
  }

  await pool.query(
    `UPDATE appointments SET reminder_sent = NOW() WHERE id = ANY($1) AND salon_id = $2`,
    [appointmentIds, req.user!.salonId]
  );

  res.json({ success: true, sent: appointmentIds.length });
});

export default router;
