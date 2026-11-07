import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// ===== CATÉGORIES =====

router.get("/stock/categories", requireAuth, async (req, res): Promise<void> => {
  const result = await pool.query(
    `SELECT id, name FROM product_categories WHERE salon_id = $1 ORDER BY name`,
    [req.user!.salonId]
  );
  res.json(result.rows);
});

router.post("/stock/categories", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") { res.status(403).json({ error: "Manager uniquement" }); return; }
  const { name } = req.body;
  const result = await pool.query(
    `INSERT INTO product_categories (salon_id, name) VALUES ($1, $2) RETURNING id, name`,
    [req.user!.salonId, name]
  );
  res.status(201).json(result.rows[0]);
});

// ===== PRODUITS =====

router.get("/stock/products", requireAuth, async (req, res): Promise<void> => {
  const { categoryId, lowStock } = req.query;
  let query = `
    SELECT p.id, p.name, p.description, p.price_buy, p.price_sell,
           p.stock_current, p.stock_alert, p.unit, p.active,
           c.name as category_name, p.category_id
    FROM products p
    LEFT JOIN product_categories c ON p.category_id = c.id
    WHERE p.salon_id = $1 AND p.active = true AND p.active = true`;
  const params: any[] = [req.user!.salonId];

  if (categoryId) {
    params.push(categoryId);
    query += ` AND p.category_id = $${params.length}`;
  }
  if (lowStock === "true") {
    query += ` AND p.stock_current <= p.stock_alert`;
  }
  query += ` ORDER BY p.name`;

  const result = await pool.query(query, params);
  res.json(result.rows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    priceBuy: parseFloat(r.price_buy),
    priceSell: parseFloat(r.price_sell),
    stockCurrent: r.stock_current,
    stockAlert: r.stock_alert,
    unit: r.unit,
    active: r.active,
    categoryId: r.category_id,
    categoryName: r.category_name,
  })));
});

router.post("/stock/products", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") { res.status(403).json({ error: "Manager uniquement" }); return; }
  const { name, description, priceBuy, priceSell, stockCurrent, stockAlert, unit, categoryId } = req.body;
  if (!name) { res.status(400).json({ error: "name requis" }); return; }

  const result = await pool.query(
    `INSERT INTO products (salon_id, category_id, name, description, price_buy, price_sell, stock_current, stock_alert, unit)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [req.user!.salonId, categoryId || null, name, description || null,
     priceBuy || 0, priceSell || 0, stockCurrent || 0, stockAlert || 5, unit || "unité"]
  );

  // Enregistrer mouvement initial si stock > 0
  if (stockCurrent > 0) {
    await pool.query(
      `INSERT INTO stock_movements (product_id, salon_id, type, quantity, reason, price_unit, total, created_by)
       VALUES ($1, $2, 'IN', $3, 'INVENTAIRE', $4, $5, $6)`,
      [result.rows[0].id, req.user!.salonId, stockCurrent, priceBuy || 0, (stockCurrent * (priceBuy || 0)), req.user!.userId]
    );
  }

  res.status(201).json({ id: result.rows[0].id });
});

router.patch("/stock/products/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") { res.status(403).json({ error: "Manager uniquement" }); return; }
  const { name, description, priceBuy, priceSell, stockAlert, unit, categoryId, active } = req.body;
  await pool.query(
    `UPDATE products SET name = COALESCE($1, name), description = COALESCE($2, description),
     price_buy = COALESCE($3, price_buy), price_sell = COALESCE($4, price_sell),
     stock_alert = COALESCE($5, stock_alert), unit = COALESCE($6, unit),
     category_id = COALESCE($7, category_id), active = COALESCE($8, active)
     WHERE id = $9 AND salon_id = $10`,
    [name, description, priceBuy, priceSell, stockAlert, unit, categoryId, active, req.params.id, req.user!.salonId]
  );
  res.json({ success: true });
});

router.delete("/stock/products/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") { res.status(403).json({ error: "Manager uniquement" }); return; }
  await pool.query(`UPDATE products SET active = false WHERE id = $1 AND salon_id = $2`, [req.params.id, req.user!.salonId]);
  res.json({ success: true });
});

// ===== MOUVEMENTS DE STOCK =====

router.post("/stock/movements", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") { res.status(403).json({ error: "Manager uniquement" }); return; }
  const { productId, type, quantity, reason, priceUnit, note } = req.body;
  if (!productId || !type || !quantity) {
    res.status(400).json({ error: "productId, type et quantity requis" });
    return;
  }

  const total = (priceUnit || 0) * quantity;
  await pool.query(
    `INSERT INTO stock_movements (product_id, salon_id, type, quantity, reason, price_unit, total, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [productId, req.user!.salonId, type, quantity, reason || null, priceUnit || 0, total, note || null, req.user!.userId]
  );

  // Mettre à jour le stock
  const delta = type === "IN" ? quantity : type === "OUT" ? -quantity : 0;
  if (delta !== 0) {
    await pool.query(
      `UPDATE products SET stock_current = GREATEST(0, stock_current + $1) WHERE id = $2`,
      [delta, productId]
    );
  } else if (type === "ADJUST") {
    await pool.query(
      `UPDATE products SET stock_current = $1 WHERE id = $2`,
      [quantity, productId]
    );
  }

  res.status(201).json({ success: true });
});

router.get("/stock/movements/:productId", requireAuth, async (req, res): Promise<void> => {
  const result = await pool.query(
    `SELECT m.id, m.type, m.quantity, m.reason, m.price_unit, m.total, m.note, m.created_at,
            u.name as created_by_name
     FROM stock_movements m
     LEFT JOIN users u ON m.created_by = u.id
     WHERE m.product_id = $1 AND m.salon_id = $2
     ORDER BY m.created_at DESC LIMIT 50`,
    [req.params.productId, req.user!.salonId]
  );
  res.json(result.rows.map(r => ({
    id: r.id,
    type: r.type,
    quantity: r.quantity,
    reason: r.reason,
    priceUnit: parseFloat(r.price_unit),
    total: parseFloat(r.total),
    note: r.note,
    createdAt: r.created_at,
    createdBy: r.created_by_name,
  })));
});

// ===== DASHBOARD STOCK =====

router.get("/stock/dashboard", requireAuth, async (req, res): Promise<void> => {
  const salonId = req.user!.salonId;

  const [total, lowStock, value, movements] = await Promise.all([
    pool.query(`SELECT COUNT(*) as cnt FROM products WHERE salon_id = $1 AND active = true`, [salonId]),
    pool.query(`SELECT COUNT(*) as cnt FROM products WHERE salon_id = $1 AND active = true AND stock_current <= stock_alert`, [salonId]),
    pool.query(`SELECT COALESCE(SUM(stock_current * price_sell), 0) as val FROM products WHERE salon_id = $1 AND active = true`, [salonId]),
    pool.query(
      `SELECT m.type, m.quantity, m.reason, m.created_at, p.name as product_name
       FROM stock_movements m JOIN products p ON m.product_id = p.id
       WHERE m.salon_id = $1 ORDER BY m.created_at DESC LIMIT 10`,
      [salonId]
    ),
  ]);

  res.json({
    totalProducts: parseInt(total.rows[0].cnt),
    lowStockCount: parseInt(lowStock.rows[0].cnt),
    stockValue: parseFloat(value.rows[0].val),
    recentMovements: movements.rows.map(r => ({
      type: r.type,
      quantity: r.quantity,
      reason: r.reason,
      createdAt: r.created_at,
      productName: r.product_name,
    })),
  });
});

// ===== VENTES DE PRODUITS =====

// POST /stock/sales — Enregistrer une vente
router.post("/stock/sales", requireAuth, async (req, res): Promise<void> => {
  const { productId, quantity, priceUnit, clientName, paymentMethod, note } = req.body;
  if (!productId || !quantity || !priceUnit) {
    res.status(400).json({ error: "productId, quantity et priceUnit requis" });
    return;
  }
  const qty = parseInt(quantity, 10);
  const unitPrice = parseFloat(priceUnit);
  const total = qty * unitPrice;

  // Vérifier le stock
  const product = await pool.query(
    `SELECT stock_current, name FROM products WHERE id = $1 AND salon_id = $2`,
    [productId, req.user!.salonId]
  );
  if (product.rows.length === 0) {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }
  if (product.rows[0].stock_current < qty) {
    res.status(400).json({ error: `Stock insuffisant (${product.rows[0].stock_current} disponible)` });
    return;
  }

  // Créer la vente
  const sale = await pool.query(
    `INSERT INTO product_sales (salon_id, product_id, quantity, price_unit, total, client_name, employee_id, payment_method, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [req.user!.salonId, productId, qty, unitPrice, total, clientName || null, req.user!.userId, paymentMethod || "CASH", note || null]
  );

  // Décrémenter le stock
  await pool.query(
    `UPDATE products SET stock_current = stock_current - $1 WHERE id = $2`,
    [qty, productId]
  );

  // Enregistrer le mouvement de stock
  await pool.query(
    `INSERT INTO stock_movements (product_id, salon_id, type, quantity, reason, price_unit, total, note, created_by)
     VALUES ($1, $2, 'OUT', $3, 'VENTE', $4, $5, $6, $7)`,
    [productId, req.user!.salonId, qty, unitPrice, total, clientName ? `Client: ${clientName}` : null, req.user!.userId]
  );

  res.status(201).json({ id: sale.rows[0].id, total, remainingStock: product.rows[0].stock_current - qty });
});

// GET /stock/sales — Historique des ventes du mois
router.get("/stock/sales", requireAuth, async (req, res): Promise<void> => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const result = await pool.query(
    `SELECT s.id, s.quantity, s.price_unit, s.total, s.client_name, s.date,
            s.payment_method, s.note,
            p.name as product_name, p.unit,
            u.name as employee_name
     FROM product_sales s
     LEFT JOIN products p ON s.product_id = p.id
     LEFT JOIN users u ON s.employee_id = u.id
     WHERE s.salon_id = $1 AND TO_CHAR(s.date, 'YYYY-MM') = $2
     ORDER BY s.created_at DESC`,
    [req.user!.salonId, month]
  );
  res.json(result.rows.map(r => ({
    id: r.id,
    productName: r.product_name,
    unit: r.unit,
    quantity: r.quantity,
    priceUnit: parseFloat(r.price_unit),
    total: parseFloat(r.total),
    clientName: r.client_name,
    date: r.date,
    paymentMethod: r.payment_method,
    note: r.note,
    employeeName: r.employee_name,
  })));
});

// GET /stock/sales/stats — Statistiques des ventes
router.get("/stock/sales/stats", requireAuth, async (req, res): Promise<void> => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

  const [totals, topProducts, byDay] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue, COALESCE(SUM(quantity), 0) as qty
       FROM product_sales
       WHERE salon_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2`,
      [req.user!.salonId, month]
    ),
    pool.query(
      `SELECT p.name, SUM(s.quantity) as qty, SUM(s.total) as revenue
       FROM product_sales s JOIN products p ON s.product_id = p.id
       WHERE s.salon_id = $1 AND TO_CHAR(s.date, 'YYYY-MM') = $2
       GROUP BY p.name
       ORDER BY revenue DESC LIMIT 5`,
      [req.user!.salonId, month]
    ),
    pool.query(
      `SELECT date, SUM(total) as revenue, SUM(quantity) as qty
       FROM product_sales
       WHERE salon_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
       GROUP BY date ORDER BY date`,
      [req.user!.salonId, month]
    ),
  ]);

  res.json({
    totalSales: parseInt(totals.rows[0].count),
    totalRevenue: parseFloat(totals.rows[0].revenue),
    totalQuantity: parseInt(totals.rows[0].qty),
    topProducts: topProducts.rows.map(r => ({
      name: r.name,
      quantity: parseInt(r.qty),
      revenue: parseFloat(r.revenue),
    })),
    byDay: byDay.rows.map(r => ({
      date: r.date,
      revenue: parseFloat(r.revenue),
      quantity: parseInt(r.qty),
    })),
  });
});

// PATCH /stock/sales/:id — Modifier une vente
router.patch("/stock/sales/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Manager uniquement" });
    return;
  }
  const saleId = parseInt(req.params.id, 10);
  const { quantity, priceUnit, clientName, paymentMethod, note } = req.body;

  // Récupérer la vente actuelle
  const current = await pool.query(
    `SELECT * FROM product_sales WHERE id = $1 AND salon_id = $2`,
    [saleId, req.user!.salonId]
  );
  if (current.rows.length === 0) {
    res.status(404).json({ error: "Vente introuvable" });
    return;
  }
  const sale = current.rows[0];

  const newQty = quantity !== undefined ? parseInt(quantity, 10) : sale.quantity;
  const newPrice = priceUnit !== undefined ? parseFloat(priceUnit) : parseFloat(sale.price_unit);
  const newTotal = newQty * newPrice;

  // Calculer la différence de quantité (pour ajuster le stock)
  const qtyDiff = newQty - sale.quantity;

  // Vérifier le stock si on augmente la quantité
  if (qtyDiff > 0) {
    const product = await pool.query(
      `SELECT stock_current FROM products WHERE id = $1`,
      [sale.product_id]
    );
    if (product.rows[0].stock_current < qtyDiff) {
      res.status(400).json({ error: `Stock insuffisant (${product.rows[0].stock_current} disponible, ${qtyDiff} de plus demandé)` });
      return;
    }
  }

  // Mettre à jour la vente
  await pool.query(
    `UPDATE product_sales
     SET quantity = $1, price_unit = $2, total = $3,
         client_name = $4, payment_method = $5, note = $6
     WHERE id = $7`,
    [newQty, newPrice, newTotal,
     clientName !== undefined ? clientName : sale.client_name,
     paymentMethod || sale.payment_method,
     note !== undefined ? note : sale.note,
     saleId]
  );

  // Ajuster le stock : -qtyDiff (car on a vendu + ou -)
  if (qtyDiff !== 0) {
    await pool.query(
      `UPDATE products SET stock_current = stock_current - $1 WHERE id = $2`,
      [qtyDiff, sale.product_id]
    );

    // Enregistrer le mouvement
    await pool.query(
      `INSERT INTO stock_movements (product_id, salon_id, type, quantity, reason, price_unit, total, note, created_by)
       VALUES ($1, $2, $3, $4, 'AJUSTEMENT VENTE', $5, $6, $7, $8)`,
      [sale.product_id, req.user!.salonId,
       qtyDiff > 0 ? 'OUT' : 'IN',
       Math.abs(qtyDiff),
       newPrice, Math.abs(qtyDiff * newPrice),
       `Modification vente #${saleId}`, req.user!.userId]
    );
  }

  res.json({ success: true });
});

// DELETE /stock/sales/:id — Supprimer une vente
router.delete("/stock/sales/:id", requireAuth, async (req, res): Promise<void> => {
  if (req.user!.role !== "MANAGER") {
    res.status(403).json({ error: "Manager uniquement" });
    return;
  }
  const saleId = parseInt(req.params.id, 10);

  // Récupérer la vente
  const sale = await pool.query(
    `SELECT * FROM product_sales WHERE id = $1 AND salon_id = $2`,
    [saleId, req.user!.salonId]
  );
  if (sale.rows.length === 0) {
    res.status(404).json({ error: "Vente introuvable" });
    return;
  }
  const s = sale.rows[0];

  // Remettre le stock
  await pool.query(
    `UPDATE products SET stock_current = stock_current + $1 WHERE id = $2`,
    [s.quantity, s.product_id]
  );

  // Enregistrer le mouvement
  await pool.query(
    `INSERT INTO stock_movements (product_id, salon_id, type, quantity, reason, price_unit, total, note, created_by)
     VALUES ($1, $2, 'IN', $3, 'ANNULATION VENTE', $4, $5, $6, $7)`,
    [s.product_id, req.user!.salonId, s.quantity, parseFloat(s.price_unit),
     parseFloat(s.total), `Annulation vente #${saleId}`, req.user!.userId]
  );

  // Supprimer la vente
  await pool.query(`DELETE FROM product_sales WHERE id = $1`, [saleId]);

  res.json({ success: true });
});

export default router;
