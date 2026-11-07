import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// GET /recognition/posts — Liste du mur (feed)
router.get("/recognition/posts", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;

  const result = await pool.query(
    `SELECT 
      p.id, p.content, p.is_anonymous, p.created_at,
      p.author_id, au.name as author_name,
      p.recipient_id, ru.name as recipient_name,
      p.badge_id, b.name as badge_name, b.icon as badge_icon, b.color as badge_color,
      (SELECT COUNT(*) FROM recognition_likes WHERE post_id = p.id) as likes_count,
      (SELECT COUNT(*) FROM recognition_comments WHERE post_id = p.id) as comments_count,
      EXISTS(SELECT 1 FROM recognition_likes WHERE post_id = p.id AND user_id = $2) as liked_by_me
    FROM recognition_posts p
    LEFT JOIN users au ON p.author_id = au.id
    LEFT JOIN users ru ON p.recipient_id = ru.id
    LEFT JOIN badges b ON p.badge_id = b.id
    WHERE p.salon_id = $1
    ORDER BY p.created_at DESC
    LIMIT $3 OFFSET $4`,
    [salonId, req.user!.userId, limit, offset]
  );

  res.json(result.rows.map(r => ({
    id: r.id,
    content: r.content,
    isAnonymous: r.is_anonymous,
    createdAt: r.created_at,
    author: r.is_anonymous ? null : { id: r.author_id, name: r.author_name },
    recipient: r.recipient_id ? { id: r.recipient_id, name: r.recipient_name } : null,
    badge: r.badge_id ? { id: r.badge_id, name: r.badge_name, icon: r.badge_icon, color: r.badge_color } : null,
    likesCount: Number(r.likes_count),
    commentsCount: Number(r.comments_count),
    likedByMe: r.liked_by_me,
  })));
});

// POST /recognition/posts — Créer un post
router.post("/recognition/posts", requireAuth, async (req, res): Promise<void> => {
  const { content, recipientId, badgeId, isAnonymous } = req.body;
  if (!content) {
    res.status(400).json({ error: "Le contenu est requis" });
    return;
  }

  const result = await pool.query(
    `INSERT INTO recognition_posts (author_id, salon_id, recipient_id, content, badge_id, is_anonymous)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
    [req.user!.userId, req.user!.salonId, recipientId || null, content, badgeId || null, !!isAnonymous]
  );

  // Notifier le destinataire
  if (recipientId) {
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, 'recognition', $2, '/recognition')`,
      [recipientId, "Vous avez reçu une reconnaissance ! 🎉"]
    );
  }

  res.status(201).json({ id: result.rows[0].id, createdAt: result.rows[0].created_at });
});

// POST /recognition/posts/:id/like — Liker/unliker
router.post("/recognition/posts/:id/like", requireAuth, async (req, res): Promise<void> => {
  const postId = parseInt(req.params.id, 10);
  const userId = req.user!.userId;

  const existing = await pool.query(
    `SELECT id FROM recognition_likes WHERE post_id = $1 AND user_id = $2`,
    [postId, userId]
  );

  if (existing.rows.length > 0) {
    await pool.query(`DELETE FROM recognition_likes WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
    res.json({ liked: false });
  } else {
    await pool.query(`INSERT INTO recognition_likes (post_id, user_id) VALUES ($1, $2)`, [postId, userId]);
    res.json({ liked: true });
  }
});

// POST /recognition/posts/:id/comments — Commenter
router.post("/recognition/posts/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const postId = parseInt(req.params.id, 10);
  const { content } = req.body;
  if (!content) {
    res.status(400).json({ error: "Le contenu est requis" });
    return;
  }

  const result = await pool.query(
    `INSERT INTO recognition_comments (post_id, author_id, content) VALUES ($1, $2, $3) RETURNING id, created_at`,
    [postId, req.user!.userId, content]
  );

  res.status(201).json({ id: result.rows[0].id, createdAt: result.rows[0].created_at });
});

// GET /recognition/posts/:id/comments — Liste des commentaires
router.get("/recognition/posts/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const postId = parseInt(req.params.id, 10);
  const result = await pool.query(
    `SELECT c.id, c.content, c.created_at, c.author_id, u.name as author_name
     FROM recognition_comments c
     LEFT JOIN users u ON c.author_id = u.id
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC`,
    [postId]
  );
  res.json(result.rows.map(r => ({
    id: r.id, content: r.content, createdAt: r.created_at,
    author: { id: r.author_id, name: r.author_name },
  })));
});

// GET /badges — Liste des badges disponibles
router.get("/badges", requireAuth, async (req, res): Promise<void> => {
  const result = await pool.query(`SELECT id, name, description, icon, color FROM badges ORDER BY id`);
  res.json(result.rows);
});

// POST /badges/award — Attribuer un badge (manager only)
router.post("/badges/award", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Seul le manager peut attribuer un badge" });
    return;
  }
  const { userId, badgeId, reason } = req.body;
  if (!userId || !badgeId) {
    res.status(400).json({ error: "userId et badgeId requis" });
    return;
  }

  await pool.query(
    `INSERT INTO user_badges (user_id, badge_id, awarded_by, reason) VALUES ($1, $2, $3, $4)`,
    [userId, badgeId, req.user!.userId, reason || null]
  );

  await pool.query(
    `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, 'badge_awarded', 'Vous avez reçu un nouveau badge ! 🏆', '/recognition')`,
    [userId]
  );

  res.status(201).json({ success: true });
});

// GET /badges/my-badges — Mes badges
router.get("/badges/my-badges", requireAuth, async (req, res): Promise<void> => {
  const result = await pool.query(
    `SELECT ub.id, ub.awarded_at, ub.reason, b.id as badge_id, b.name, b.icon, b.color
     FROM user_badges ub
     LEFT JOIN badges b ON ub.badge_id = b.id
     WHERE ub.user_id = $1
     ORDER BY ub.awarded_at DESC`,
    [req.user!.userId]
  );
  res.json(result.rows.map(r => ({
    id: r.id, awardedAt: r.awarded_at, reason: r.reason,
    badge: { id: r.badge_id, name: r.name, icon: r.icon, color: r.color },
  })));
});

// POST /mood/checkin — Check-in humeur du jour
router.post("/mood/checkin", requireAuth, async (req, res): Promise<void> => {
  const { mood, score, note } = req.body;
  if (!mood) {
    res.status(400).json({ error: "mood requis" });
    return;
  }

  await pool.query(
    `INSERT INTO mood_checkins (user_id, salon_id, mood, score, note, date)
     VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
     ON CONFLICT (user_id, date) DO UPDATE SET mood = $3, score = $4, note = $5`,
    [req.user!.userId, req.user!.salonId, mood, score || 3, note || null]
  );

  res.json({ success: true });
});

// GET /mood/team-overview — Vue manager humeur équipe (manager only)
router.get("/mood/team-overview", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }

  const result = await pool.query(
    `SELECT mc.user_id, u.name, mc.mood, mc.score, mc.note, mc.date
     FROM mood_checkins mc
     LEFT JOIN users u ON mc.user_id = u.id
     WHERE mc.salon_id = $1 AND mc.date = CURRENT_DATE
     ORDER BY mc.score ASC`,
    [req.user!.salonId]
  );

  res.json(result.rows.map(r => ({
    userId: r.user_id, name: r.name, mood: r.mood, score: r.score, note: r.note, date: r.date,
  })));
});

// GET /notifications — Mes notifications
router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const result = await pool.query(
    `SELECT id, type, message, is_read, link, created_at
     FROM notifications WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 50`,
    [req.user!.userId]
  );
  res.json(result.rows.map(r => ({
    id: r.id, type: r.type, message: r.message, isRead: r.is_read, link: r.link, createdAt: r.created_at,
  })));
});

// PATCH /notifications/:id/read — Marquer comme lu
router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  await pool.query(`UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`, [req.params.id, req.user!.userId]);
  res.json({ success: true });
});

// POST /badges/auto-award — Attribution automatique des badges du mois (manager)
router.post("/badges/auto-award", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Accès manager uniquement" });
    return;
  }

  const salonId = req.user!.salonId;
  const month = (req.body.month as string) || new Date().toISOString().slice(0, 7);
  const [year, m] = month.split("-").map(Number);
  const monthStart = new Date(year, m - 1, 1).toISOString();
  const monthEnd = new Date(year, m, 0, 23, 59, 59).toISOString();

  const awarded: { employeeId: number; employeeName: string; badgeName: string }[] = [];

  // 1. Top Vendeuse du mois — CA le plus élevé
  const topSeller = await pool.query(
    `SELECT a.employee_id, u.name, SUM(a.price) as revenue
     FROM appointments a
     JOIN users u ON a.employee_id = u.id
     WHERE a.salon_id = $1 AND a.status = 'COMPLETED'
       AND a.date >= $2 AND a.date <= $3
     GROUP BY a.employee_id, u.name
     ORDER BY revenue DESC LIMIT 1`,
    [salonId, monthStart, monthEnd]
  );

  if (topSeller.rows.length > 0 && parseFloat(topSeller.rows[0].revenue) > 0) {
    const emp = topSeller.rows[0];
    const already = await pool.query(
      `SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = 1 AND auto_awarded = true
       AND awarded_at >= $2 AND awarded_at <= $3`,
      [emp.employee_id, monthStart, monthEnd]
    );
    if (already.rows.length === 0) {
      await pool.query(
        `INSERT INTO user_badges (user_id, badge_id, awarded_by, reason, auto_awarded)
         VALUES ($1, 1, $2, $3, true)`,
        [emp.employee_id, req.user!.userId, `CA du mois: ${parseFloat(emp.revenue).toFixed(0)} MAD`]
      );
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, 'badge_awarded', '🏆 Vous êtes Top Vendeuse du mois !', '/recognition')`,
        [emp.employee_id]
      );
      awarded.push({ employeeId: emp.employee_id, employeeName: emp.name, badgeName: "Top Vendeuse du mois" });
    }
  }

  // 2. Ponctualité parfaite — zéro absence ce mois
  const employees = await pool.query(
    `SELECT id, name FROM users WHERE salon_id = $1 AND role = 'EMPLOYEE' AND active = true`,
    [salonId]
  );

  for (const emp of employees.rows) {
    const absenceCheck = await pool.query(
      `SELECT COUNT(*) as cnt FROM absences
       WHERE employee_id = $1 AND status = 'APPROVED'
         AND date_start <= $3 AND date_end >= $2`,
      [emp.id, monthStart, monthEnd]
    );
    if (Number(absenceCheck.rows[0].cnt) === 0) {
      const already = await pool.query(
        `SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = 3 AND auto_awarded = true
         AND awarded_at >= $2 AND awarded_at <= $3`,
        [emp.id, monthStart, monthEnd]
      );
      if (already.rows.length === 0) {
        await pool.query(
          `INSERT INTO user_badges (user_id, badge_id, awarded_by, reason, auto_awarded)
           VALUES ($1, 3, $2, 'Aucune absence ce mois', true)`,
          [emp.id, req.user!.userId]
        );
        await pool.query(
          `INSERT INTO notifications (user_id, type, message, link) VALUES ($1, 'badge_awarded', '⏰ Ponctualité parfaite ce mois !', '/recognition')`,
          [emp.id]
        );
        awarded.push({ employeeId: emp.id, employeeName: emp.name, badgeName: "Ponctualité parfaite" });
      }
    }
  }

  res.json({ success: true, awarded, month });
});

export default router;
