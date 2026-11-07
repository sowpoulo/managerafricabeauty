const { Pool } = require('pg');

// ==========================================
// ⚙️ PARAMÈTRES FINANCIERS À MODIFIER
// ==========================================
const SALON_ID = 2; // 2 = Casablanca, 4 = Marrakech
const EXCHANGE_RATE_USD_TO_MAD = 10.0; // 1 USD = 10 MAD (à ajuster selon le taux actuel)
const TRANSPORT_COST_PER_ITEM = 50; // 50 DH de frais de port par perruque
const MARGIN_PERCENT = 60; // 60% de marge bénéficiaire

// ==========================================
// 📦 DONNÉES EXACTES DE LA FACTURE
// ==========================================
// Format : ["Catégorie", "Texture", "Taille", Prix_USD, Quantité]
const productsData = [
  // --- 13/4 hd normal wig 12a 210% (QTY 3) ---
  ["13/4 hd normal wig 12a 210%", "straight", "12\"", 84, 3],
  ["13/4 hd normal wig 12a 210%", "straight", "14\"", 94, 3],
  ["13/4 hd normal wig 12a 210%", "straight", "16\"", 100, 3],
  ["13/4 hd normal wig 12a 210%", "straight", "18\"", 138, 3],
  ["13/4 hd normal wig 12a 210%", "straight", "20\"", 149, 3],
  ["13/4 hd normal wig 12a 210%", "straight", "22\"", 173, 3],
  ["13/4 hd normal wig 12a 210%", "straight", "24\"", 202, 3],
  ["13/4 hd normal wig 12a 210%", "straight", "26\"", 225, 3],
  ["13/4 hd normal wig 12a 210%", "straight", "28\"", 248, 3],
  ["13/4 hd normal wig 12a 210%", "straight", "30\"", 269, 3],
  ["13/4 hd normal wig 12a 210%", "water wave", "12\"", 94, 3],
  ["13/4 hd normal wig 12a 210%", "water wave", "14\"", 104, 3],
  ["13/4 hd normal wig 12a 210%", "water wave", "16\"", 110, 3],
  ["13/4 hd normal wig 12a 210%", "water wave", "18\"", 148, 3],
  ["13/4 hd normal wig 12a 210%", "water wave", "20\"", 159, 3],
  ["13/4 hd normal wig 12a 210%", "water wave", "22\"", 183, 3],
  ["13/4 hd normal wig 12a 210%", "water wave", "24\"", 212, 3],
  ["13/4 hd normal wig 12a 210%", "water wave", "26\"", 235, 3],
  ["13/4 hd normal wig 12a 210%", "water wave", "28\"", 258, 3],
  ["13/4 hd normal wig 12a 210%", "water wave", "30\"", 279, 3],
  ["13/4 hd normal wig 12a 210%", "deep wave", "12\"", 94, 3],
  ["13/4 hd normal wig 12a 210%", "deep wave", "14\"", 104, 3],
  ["13/4 hd normal wig 12a 210%", "deep wave", "16\"", 110, 3],
  ["13/4 hd normal wig 12a 210%", "deep wave", "18\"", 148, 3],
  ["13/4 hd normal wig 12a 210%", "deep wave", "20\"", 159, 3],
  ["13/4 hd normal wig 12a 210%", "deep wave", "22\"", 183, 3],
  ["13/4 hd normal wig 12a 210%", "deep wave", "24\"", 212, 3],
  ["13/4 hd normal wig 12a 210%", "deep wave", "26\"", 235, 3],
  ["13/4 hd normal wig 12a 210%", "deep wave", "28\"", 258, 3],
  ["13/4 hd normal wig 12a 210%", "deep wave", "30\"", 279, 3],
  ["13/4 hd normal wig 12a 210%", "loose curly", "12\"", 94, 3],
  ["13/4 hd normal wig 12a 210%", "loose curly", "14\"", 104, 3],
  ["13/4 hd normal wig 12a 210%", "loose curly", "16\"", 110, 3],
  ["13/4 hd normal wig 12a 210%", "loose curly", "18\"", 148, 3],
  ["13/4 hd normal wig 12a 210%", "loose curly", "20\"", 159, 3],
  ["13/4 hd normal wig 12a 210%", "loose curly", "22\"", 183, 3],
  ["13/4 hd normal wig 12a 210%", "loose curly", "24\"", 212, 3],
  ["13/4 hd normal wig 12a 210%", "loose curly", "26\"", 235, 3],
  ["13/4 hd normal wig 12a 210%", "loose curly", "28\"", 258, 3],
  ["13/4 hd normal wig 12a 210%", "loose curly", "30\"", 279, 3],
  ["13/4 hd normal wig 12a 210%", "yaki straight", "12\"", 94, 3],
  ["13/4 hd normal wig 12a 210%", "yaki straight", "14\"", 104, 3],
  ["13/4 hd normal wig 12a 210%", "yaki straight", "16\"", 110, 3],
  ["13/4 hd normal wig 12a 210%", "yaki straight", "18\"", 148, 3],
  ["13/4 hd normal wig 12a 210%", "yaki straight", "20\"", 159, 3],
  ["13/4 hd normal wig 12a 210%", "yaki straight", "22\"", 183, 3],
  ["13/4 hd normal wig 12a 210%", "yaki straight", "24\"", 212, 3],
  ["13/4 hd normal wig 12a 210%", "yaki straight", "26\"", 235, 3],
  ["13/4 hd normal wig 12a 210%", "yaki straight", "28\"", 258, 3],
  ["13/4 hd normal wig 12a 210%", "yaki straight", "30\"", 279, 3],
  ["13/4 hd normal wig 12a 210%", "burmese curly", "16\"", 110, 3],
  ["13/4 hd normal wig 12a 210%", "burmese curly", "18\"", 148, 3],
  ["13/4 hd normal wig 12a 210%", "burmese curly", "20\"", 159, 3],
  ["13/4 hd normal wig 12a 210%", "burmese curly", "22\"", 183, 3],
  ["13/4 hd normal wig 12a 210%", "afro kinky curly", "12\"", 94, 3],
  ["13/4 hd normal wig 12a 210%", "afro kinky curly", "14\"", 104, 3],
  ["13/4 hd normal wig 12a 210%", "afro kinky curly", "16\"", 110, 3],
  ["13/4 hd normal wig 12a 210%", "afro kinky curly", "18\"", 148, 3],
  ["13/4 hd normal wig 12a 210%", "afro kinky curly", "20\"", 159, 3],
  ["13/4 hd normal wig 12a 210%", "straight finger curly", "12\"", 94, 3],
  ["13/4 hd normal wig 12a 210%", "straight finger curly", "14\"", 104, 3],
  ["13/4 hd normal wig 12a 210%", "straight finger curly", "16\"", 110, 3],
  ["13/4 hd normal wig 12a 210%", "straight finger curly", "18\"", 148, 3],
  ["13/4 hd normal wig 12a 210%", "straight finger curly", "20\"", 159, 3],
  ["13/4 hd normal wig 12a 210%", "straight finger curly", "22\"", 183, 3],
  ["13/4 hd normal wig 12a 210%", "straight finger curly", "24\"", 212, 3],
  ["13/4 hd normal wig 12a 210%", "straight finger curly", "26\"", 235, 3],
  ["13/4 hd normal wig 12a 210%", "straight finger curly", "28\"", 258, 3],
  ["13/4 hd normal wig 12a 210%", "straight finger curly", "30\"", 279, 3],

  // --- 13/4 transparent normal wig 12a 210% (QTY 2) ---
  ["13/4 transparent wig", "straight", "12\"", 77, 2],
  ["13/4 transparent wig", "straight", "14\"", 81, 2],
  ["13/4 transparent wig", "straight", "16\"", 91, 2],
  ["13/4 transparent wig", "straight", "18\"", 126, 2],
  ["13/4 transparent wig", "straight", "20\"", 138, 2],
  ["13/4 transparent wig", "straight", "22\"", 161, 2],
  ["13/4 transparent wig", "straight", "24\"", 190, 2],
  ["13/4 transparent wig", "straight", "26\"", 213, 2],
  ["13/4 transparent wig", "straight", "28\"", 236, 2],
  ["13/4 transparent wig", "straight", "30\"", 258, 2],
  ["13/4 transparent wig", "water wave", "12\"", 87, 2],
  ["13/4 transparent wig", "water wave", "14\"", 91, 2],
  ["13/4 transparent wig", "water wave", "16\"", 101, 2],
  ["13/4 transparent wig", "water wave", "18\"", 136, 2],
  ["13/4 transparent wig", "water wave", "20\"", 148, 2],
  ["13/4 transparent wig", "water wave", "22\"", 171, 2],
  ["13/4 transparent wig", "water wave", "24\"", 200, 2],
  ["13/4 transparent wig", "water wave", "26\"", 223, 2],
  ["13/4 transparent wig", "water wave", "28\"", 246, 2],
  ["13/4 transparent wig", "water wave", "30\"", 268, 2],
  ["13/4 transparent wig", "deep wave", "12\"", 87, 2],
  ["13/4 transparent wig", "deep wave", "14\"", 91, 2],
  ["13/4 transparent wig", "deep wave", "16\"", 101, 2],
  ["13/4 transparent wig", "deep wave", "18\"", 136, 2],
  ["13/4 transparent wig", "deep wave", "20\"", 148, 2],
  ["13/4 transparent wig", "deep wave", "22\"", 171, 2],
  ["13/4 transparent wig", "deep wave", "24\"", 200, 2],
  ["13/4 transparent wig", "deep wave", "26\"", 223, 2],
  ["13/4 transparent wig", "deep wave", "28\"", 246, 2],
  ["13/4 transparent wig", "deep wave", "30\"", 268, 2],
  ["13/4 transparent wig", "loose curly", "12\"", 87, 2],
  ["13/4 transparent wig", "loose curly", "14\"", 91, 2],
  ["13/4 transparent wig", "loose curly", "16\"", 101, 2],
  ["13/4 transparent wig", "loose curly", "18\"", 136, 2],
  ["13/4 transparent wig", "loose curly", "20\"", 148, 2],
  ["13/4 transparent wig", "loose curly", "22\"", 171, 2],
  ["13/4 transparent wig", "loose curly", "24\"", 200, 2],
  ["13/4 transparent wig", "loose curly", "26\"", 223, 2],
  ["13/4 transparent wig", "loose curly", "28\"", 246, 2],
  ["13/4 transparent wig", "loose curly", "30\"", 268, 2],
  ["13/4 transparent wig", "yaki straight", "12\"", 87, 2],
  ["13/4 transparent wig", "yaki straight", "14\"", 91, 2],
  ["13/4 transparent wig", "yaki straight", "16\"", 101, 2],
  ["13/4 transparent wig", "yaki straight", "18\"", 136, 2],
  ["13/4 transparent wig", "yaki straight", "20\"", 148, 2],
  ["13/4 transparent wig", "yaki straight", "22\"", 171, 2],
  ["13/4 transparent wig", "yaki straight", "24\"", 200, 2],
  ["13/4 transparent wig", "yaki straight", "26\"", 223, 2],
  ["13/4 transparent wig", "yaki straight", "28\"", 246, 2],
  ["13/4 transparent wig", "yaki straight", "30\"", 268, 2],
  ["13/4 transparent wig", "burmese curly", "16\"", 101, 2],
  ["13/4 transparent wig", "burmese curly", "18\"", 136, 2],
  ["13/4 transparent wig", "burmese curly", "20\"", 148, 2],
  ["13/4 transparent wig", "burmese curly", "22\"", 171, 2],
  ["13/4 transparent wig", "afro kinky curly", "12\"", 87, 2],
  ["13/4 transparent wig", "afro kinky curly", "14\"", 91, 2],
  ["13/4 transparent wig", "afro kinky curly", "16\"", 101, 2],
  ["13/4 transparent wig", "afro kinky curly", "18\"", 136, 2],
  ["13/4 transparent wig", "afro kinky curly", "20\"", 148, 2],
  ["13/4 transparent wig", "straight finger curly", "12\"", 87, 2],
  ["13/4 transparent wig", "straight finger curly", "14\"", 91, 2],
  ["13/4 transparent wig", "straight finger curly", "16\"", 101, 2],
  ["13/4 transparent wig", "straight finger curly", "18\"", 136, 2],
  ["13/4 transparent wig", "straight finger curly", "20\"", 148, 2],
  ["13/4 transparent wig", "straight finger curly", "22\"", 171, 2],
  ["13/4 transparent wig", "straight finger curly", "24\"", 200, 2],
  ["13/4 transparent wig", "straight finger curly", "26\"", 223, 2],
  ["13/4 transparent wig", "straight finger curly", "28\"", 246, 2],
  ["13/4 transparent wig", "straight finger curly", "30\"", 268, 2],

  // --- 12a bundles (QTY 5) ---
  ["12a bundles", "straight", "10\"", 18, 5],
  ["12a bundles", "straight", "12\"", 21, 5],
  ["12a bundles", "straight", "14\"", 23, 5],
  ["12a bundles", "straight", "16\"", 28, 5],
  ["12a bundles", "straight", "18\"", 33, 5],
  ["12a bundles", "straight", "20\"", 39, 5],
  ["12a bundles", "straight", "22\"", 45, 5],
  ["12a bundles", "straight", "24\"", 55, 5],
  ["12a bundles", "straight", "26\"", 61, 5],

  // --- 13/6 hd frontal (QTY 5) ---
  ["13/6 hd frontal", "straight", "12\"", 60, 5],
  ["13/6 hd frontal", "straight", "14\"", 66, 5],
  ["13/6 hd frontal", "straight", "16\"", 70, 5],
  ["13/6 hd frontal", "straight", "18\"", 78, 5],
  ["13/6 hd frontal", "straight", "20\"", 85, 5],
  ["13/6 hd frontal", "straight", "22\"", 93, 5],

  // --- 5/5 hd closure (QTY 5) ---
  ["5/5 hd closure", "straight", "12\"", 32, 5],
  ["5/5 hd closure", "straight", "14\"", 34, 5],
  ["5/5 hd closure", "straight", "16\"", 36, 5],
  ["5/5 hd closure", "straight", "18\"", 41, 5],
  ["5/5 hd closure", "straight", "20\"", 45, 5],
  ["5/5 hd closure", "straight", "22\"", 51, 5],

  // --- hd full lace glules wig 200% (QTY 5) ---
  ["hd full lace glules wig 200%", "straight", "22\"", 133, 5],
  ["hd full lace glules wig 200%", "straight", "24\"", 162, 5],
  ["hd full lace glules wig 200%", "straight", "26\"", 199, 5],
  ["hd full lace glules wig 200%", "straight", "28\"", 241, 5],
  ["hd full lace glules wig 200%", "straight", "30\"", 300, 5]
];

// ==========================================
// 🚀 SCRIPT D'INSERTION
// ==========================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://africabeauty:africabeauty2024@localhost:5432/africabeautydb'
});

async function run() {
  try {
    console.log("🧹 Nettoyage des anciens produits...");
    // Optionnel : On supprime les anciens produits ajoutés par erreur pour ce salon
    // pour éviter les doublons. (Attention : ne supprime que les produits nommés avec 'straight' ou 'wave' pour ne pas toucher à vos vrais produits).
    await pool.query(`DELETE FROM products WHERE salon_id = $1 AND name ILIKE '%straight%' OR name ILIKE '%wave%'`, [SALON_ID]);

    console.log("⏳ Démarrage de l'importation...");

    // 1. Récupérer ou créer la catégorie "Perruques"
    let catRes = await pool.query(`SELECT id FROM product_categories WHERE salon_id = $1 AND name = 'Perruques'`, [SALON_ID]);
    let categoryId;
    if (catRes.rows.length === 0) {
      const newCat = await pool.query(`INSERT INTO product_categories (salon_id, name) VALUES ($1, 'Perruques') RETURNING id`, [SALON_ID]);
      categoryId = newCat.rows[0].id;
    } else {
      categoryId = catRes.rows[0].id;
    }

    let count = 0;

    // 2. Boucler sur les produits
    for (const item of productsData) {
      const [category, texture, size, priceUSD, qty] = item;
      
      const name = `${category} - ${texture} ${size}`;
      
      // 💰 CALCULS FINANCIERS
      const priceBuyMAD = priceUSD * EXCHANGE_RATE_USD_TO_MAD;
      const costPrice = priceBuyMAD + TRANSPORT_COST_PER_ITEM;
      const priceSell = costPrice * (1 + (MARGIN_PERCENT / 100));

      const finalBuyPrice = Math.round(priceBuyMAD * 100) / 100;
      const finalSellPrice = Math.round(priceSell * 100) / 100;

      // 3. Insérer dans la table `products`
      await pool.query(
        `INSERT INTO products (salon_id, category_id, name, price_buy, price_sell, stock_current, stock_alert, unit, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
        [SALON_ID, categoryId, name, finalBuyPrice, finalSellPrice, qty, 2, "pièce"]
      );
      
      console.log(`✅ Ajouté : ${name} | Achat: ${finalBuyPrice} DH | Vente: ${finalSellPrice} DH | Stock: ${qty}`);
      count++;
    }

    console.log(`\n🎉 SUCCÈS : ${count} produits ont été importés dans le stock !`);

  } catch (error) {
    console.error("❌ Erreur lors de l'importation :", error);
  } finally {
    await pool.end();
  }
}

run();
