import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.post("/payroll/:month/account", requireAuth, async (req, res): Promise<void> => {
  const { month } = req.params;
  const salonId = req.user!.salonId;

  try {
    // 1. Récupérer la paie du mois
    const payrolls = await pool.query(
      `SELECT p.*, u.name FROM payroll p JOIN users u ON p.employee_id = u.id WHERE p.salon_id = $1 AND p.month = $2 AND p.status = 'PAID'`,
      [salonId, month]
    );

    if (payrolls.rows.length === 0) {
      res.status(400).json({ error: "Aucune paie payée à comptabiliser pour ce mois." });
      return;
    }

    let totalBrut = 0;
    let totalNet = 0;
    let totalChargesPatronales = 0;

    for (const p of payrolls.rows) {
      const brut = parseFloat(p.net_salary); // Le brut de base (avant déduction d'absence)
      const cnssPat = brut * 0.0898; 
      const amoPat = brut * 0.0411;
      
      totalBrut += brut;
      totalNet += parseFloat(p.to_pay);
      totalChargesPatronales += (cnssPat + amoPat);
    }

    const totalCost = totalBrut + totalChargesPatronales;

    // 2. Créer une dépense "Masse Salariale" (avec les charges incluses)
    await pool.query(
      `INSERT INTO expenses (salon_id, category, description, amount, date) 
       VALUES ($1, 'Salaires', $2, $3, CURRENT_DATE)`,
      [salonId, `Masse salariale + charges ${month}`, totalCost]
    );

    res.json({ 
      success: true, 
      message: "Dépense de salaire enregistrée avec succès.",
      details: { totalBrut, totalChargesPatronales, totalCost }
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
