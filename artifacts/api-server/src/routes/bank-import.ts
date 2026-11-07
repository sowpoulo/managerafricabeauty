import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";
import multer from "multer";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /bank/import/pdf — Importer un relevé PDF
router.post("/bank/import/pdf", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Aucun fichier fourni" });
    return;
  }

  // Récupérer le compte bancaire par défaut du salon
  const bankResult = await pool.query(
    `SELECT id FROM bank_accounts WHERE salon_id = $1 AND is_default = true`,
    [req.user!.salonId]
  );
  if (bankResult.rows.length === 0) {
    res.status(400).json({ error: "Aucun compte bancaire configuré pour ce salon" });
    return;
  }
  const bankAccountId = bankResult.rows[0].id;

  // Extraire le texte du PDF
  const pdfData = await pdfParse(req.file.buffer);
  const text = pdfData.text;

  const lines = text.split(/\n/).filter(line => line.trim().length > 0);
  let imported = 0;
  let totalCandidates = 0;

  const datePattern = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;
  const amountPattern = /([+-]?\s*[\d,\.]+)\s*MAD?/i;
  const amountPattern2 = /\b([\d,\.]+)\s*(?:D|C)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 10) continue;

    const dateMatch = line.match(datePattern);
    if (!dateMatch) continue;

    let amountMatch = line.match(amountPattern) || line.match(amountPattern2);
    if (!amountMatch) continue;

    const day = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]);
    const year = parseInt(dateMatch[3]);
    if (isNaN(day) || isNaN(month) || isNaN(year)) continue;
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) continue;

    let amountStr = amountMatch[1].replace(/\s/g, "").replace(",", ".");
    const isDebit = /[-\s]D\b/.test(line) || amountStr.startsWith("-");
    amountStr = amountStr.replace(/^-/, "");
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount === 0) continue;

    const type = isDebit ? "DEBIT" : "CREDIT";

    let description = line
      .replace(dateMatch[0], "")
      .replace(amountMatch[0], "")
      .replace(/[+-]\s*[\d,\.]+\s*MAD?/i, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!description || description.length < 3) {
      if (i > 0) description = lines[i - 1].trim() + " " + description;
    }

    await pool.query(
      `INSERT INTO bank_transactions (salon_id, bank_account_id, date, description, amount, type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user!.salonId, bankAccountId, date, description || "Transaction", Math.abs(amount), type]
    );
    imported++;
    totalCandidates++;
  }

  res.json({
    success: true,
    imported,
    total: totalCandidates,
    message: imported > 0 ? `Import réussi : ${imported} transactions` : "Aucune transaction reconnue dans le PDF"
  });
});

// GET /bank/account — Récupérer les comptes bancaires du salon
router.get("/bank/account", requireAuth, async (req, res): Promise<void> => {
  const result = await pool.query(
    `SELECT id, bank_name, account_name, rib, iban, is_default
     FROM bank_accounts WHERE salon_id = $1`,
    [req.user!.salonId]
  );
  res.json(result.rows);
});

export default router;
