import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// GET /clients — Liste des clients (avec recherche)
router.get("/clients", requireAuth, async (req, res): Promise<void> => {
  const { search } = req.query;
  let query = `SELECT * FROM clients WHERE salon_id = $1`;
  const params: any[] = [req.user!.salonId];

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (name ILIKE $${params.length} OR phone ILIKE $${params.length})`;
  }

  query += ` ORDER BY name ASC`;
  const result = await pool.query(query, params);
  res.json(result.rows);
});

// GET /clients/:id — Détail d'un client (avec historique des visites)
router.get("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const client = await pool.query(`SELECT * FROM clients WHERE id = $1 AND salon_id = $2`, [req.params.id, req.user!.salonId]);
  if (client.rows.length === 0) { res.status(404).json({ error: "Client introuvable" }); return; }

  // On pourrait aussi chercher l'historique des rendez-vous et ventes ici plus tard
  res.json(client.rows[0]);
});

// POST /clients — Créer un client
router.post("/clients", requireAuth, async (req, res): Promise<void> => {
  const { name, phone, email, birthDate, notes } = req.body;
  if (!name) { res.status(400).json({ error: "Le nom est requis" }); return; }

  const result = await pool.query(
    `INSERT INTO clients (salon_id, name, phone, email, birth_date, notes) 
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [req.user!.salonId, name, phone || null, email || null, birthDate || null, notes || null]
  );
  res.status(201).json({ id: result.rows[0].id });
});

// PATCH /clients/:id — Modifier un client
router.patch("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  const { name, phone, email, birthDate, notes } = req.body;
  await pool.query(
    `UPDATE clients SET name = COALESCE($1, name), phone = COALESCE($2, phone), 
     email = COALESCE($3, email), birth_date = COALESCE($4, birth_date), notes = COALESCE($5, notes)
     WHERE id = $6 AND salon_id = $7`,
    [name, phone, email, birthDate, notes, req.params.id, req.user!.salonId]
  );
  res.json({ success: true });
});

// DELETE /clients/:id — Supprimer un client
router.delete("/clients/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") { res.status(403).json({ error: "Manager uniquement" }); return; }
  await pool.query(`DELETE FROM clients WHERE id = $1 AND salon_id = $2`, [req.params.id, req.user!.salonId]);
  res.json({ success: true });
});

export default router;
