import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";
import multer from "multer";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

// Configuration du stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "/var/www/managerafricabeauty/artifacts/api-server/uploads/identities";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const employeeId = req.params.id;
    const side = req.params.side; // "front" ou "back"
    const ext = path.extname(file.originalname);
    cb(null, `emp_${employeeId}_${side}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Format non autorisé (JPG, PNG ou PDF uniquement)"));
  },
});

// POST /employees/:id/upload-id/:side — Uploader la pièce (front ou back)
router.post("/employees/:id/upload-id/:side", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  const { id, side } = req.params;
  if (!["front", "back"].includes(side)) {
    res.status(400).json({ error: "Side doit être 'front' ou 'back'" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "Aucun fichier fourni" });
    return;
  }

  const fileUrl = `/uploads/identities/${req.file.filename}`;
  const column = side === "front" ? "id_front_url" : "id_back_url";

  // Supprimer l'ancien fichier s'il existe
  const old = await pool.query(`SELECT ${column} as url FROM users WHERE id = $1 AND salon_id = $2`, [id, req.user!.salonId]);
  if (old.rows[0]?.url) {
    const oldPath = "/var/www/managerafricabeauty/artifacts/api-server" + old.rows[0].url;
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  await pool.query(`UPDATE users SET ${column} = $1 WHERE id = $2 AND salon_id = $3`, [fileUrl, id, req.user!.salonId]);

  res.json({ success: true, url: fileUrl });
});

// DELETE /employees/:id/upload-id/:side — Supprimer la pièce
router.delete("/employees/:id/upload-id/:side", requireAuth, async (req, res): Promise<void> => {
  const { id, side } = req.params;
  const column = side === "front" ? "id_front_url" : "id_back_url";

  const old = await pool.query(`SELECT ${column} as url FROM users WHERE id = $1 AND salon_id = $2`, [id, req.user!.salonId]);
  if (old.rows[0]?.url) {
    const oldPath = "/var/www/managerafricabeauty/artifacts/api-server" + old.rows[0].url;
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  await pool.query(`UPDATE users SET ${column} = NULL WHERE id = $1 AND salon_id = $2`, [id, req.user!.salonId]);
  res.json({ success: true });
});

export default router;
