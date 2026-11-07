const { Pool } = require('pg');

const SALON_ID = 2; 
const EXCHANGE_RATE_USD_TO_MAD = 10.0; 
const TRANSPORT_COST_PER_ITEM = 50; 
const MARGIN_PERCENT = 60; 

const productsData = [
  ["13/4 hd normal wig 12a 210%", "straight", "12\"", 84], ["13/4 hd normal wig 12a 210%", "straight", "14\"", 94], ["13/4 hd normal wig 12a 210%", "straight", "16\"", 100], ["13/4 hd normal wig 12a 210%", "straight", "18\"", 138], ["13/4 hd normal wig 12a 210%", "straight", "20\"", 149], ["13/4 hd normal wig 12a 210%", "straight", "22\"", 173], ["13/4 hd normal wig 12a 210%", "straight", "24\"", 202], ["13/4 hd normal wig 12a 210%", "straight", "26\"", 225], ["13/4 hd normal wig 12a 210%", "straight", "28\"", 248], ["13/4 hd normal wig 12a 210%", "straight", "30\"", 269],
  ["13/4 hd normal wig 12a 210%", "water wave", "12\"", 94], ["13/4 hd normal wig 12a 210%", "water wave", "14\"", 104], ["13/4 hd normal wig 12a 210%", "water wave", "16\"", 110], ["13/4 hd normal wig 12a 210%", "water wave", "18\"", 148], ["13/4 hd normal wig 12a 210%", "water wave", "20\"", 159], ["13/4 hd normal wig 12a 210%", "water wave", "22\"", 183], ["13/4 hd normal wig 12a 210%", "water wave", "24\"", 212], ["13/4 hd normal wig 12a 210%", "water wave", "26\"", 235], ["13/4 hd normal wig 12a 210%", "water wave", "28\"", 258], ["13/4 hd normal wig 12a 210%", "water wave", "30\"", 279],
  ["13/4 hd normal wig 12a 210%", "deep wave", "12\"", 94], ["13/4 hd normal wig 12a 210%", "deep wave", "14\"", 104], ["13/4 hd normal wig 12a 210%", "deep wave", "16\"", 110], ["13/4 hd normal wig 12a 210%", "deep wave", "18\"", 148], ["13/4 hd normal wig 12a 210%", "deep wave", "20\"", 159], ["13/4 hd normal wig 12a 210%", "deep wave", "22\"", 183], ["13/4 hd normal wig 12a 210%", "deep wave", "24\"", 212], ["13/4 hd normal wig 12a 210%", "deep wave", "26\"", 235], ["13/4 hd normal wig 12a 210%", "deep wave", "28\"", 258], ["13/4 hd normal wig 12a 210%", "deep wave", "30\"", 279],
  ["13/4 hd normal wig 12a 210%", "loose curly", "12\"", 94], ["13/4 hd normal wig 12a 210%", "loose curly", "14\"", 104], ["13/4 hd normal wig 12a 210%", "loose curly", "16\"", 110], ["13/4 hd normal wig 12a 210%", "loose curly", "18\"", 148], ["13/4 hd normal wig 12a 210%", "loose curly", "20\"", 159], ["13/4 hd normal wig 12a 210%", "loose curly", "22\"", 183], ["13/4 hd normal wig 12a 210%", "loose curly", "24\"", 212], ["13/4 hd normal wig 12a 210%", "loose curly", "26\"", 235], ["13/4 hd normal wig 12a 210%", "loose curly", "28\"", 258], ["13/4 hd normal wig 12a 210%", "loose curly", "30\"", 279],
  ["13/4 hd normal wig 12a 210%", "yaki straight", "12\"", 94], ["13/4 hd normal wig 12a 210%", "yaki straight", "14\"", 104], ["13/4 hd normal wig 12a 210%", "yaki straight", "16\"", 110], ["13/4 hd normal wig 12a 210%", "yaki straight", "18\"", 148], ["13/4 hd normal wig 12a 210%", "yaki straight", "20\"", 159], ["13/4 hd normal wig 12a 210%", "yaki straight", "22\"", 183], ["13/4 hd normal wig 12a 210%", "yaki straight", "24\"", 212], ["13/4 hd normal wig 12a 210%", "yaki straight", "26\"", 235], ["13/4 hd normal wig 12a 210%", "yaki straight", "28\"", 258], ["13/4 hd normal wig 12a 210%", "yaki straight", "30\"", 279],
  ["13/4 hd normal wig 12a 210%", "burmese curly", "16\"", 110], ["13/4 hd normal wig 12a 210%", "burmese curly", "18\"", 148], ["13/4 hd normal wig 12a 210%", "burmese curly", "20\"", 159], ["13/4 hd normal wig 12a 210%", "burmese curly", "22\"", 183],
  ["13/4 hd normal wig 12a 210%", "afro kinky curly", "12\"", 94], ["13/4 hd normal wig 12a 210%", "afro kinky curly", "14\"", 104], ["13/4 hd normal wig 12a 210%", "afro kinky curly", "16\"", 110], ["13/4 hd normal wig 12a 210%", "afro kinky curly", "18\"", 148], ["13/4 hd normal wig 12a 210%", "afro kinky curly", "20\"", 159],
  ["13/4 hd normal wig 12a 210%", "straight finger curly", "12\"", 94], ["13/4 hd normal wig 12a 210%", "straight finger curly", "14\"", 104], ["13/4 hd normal wig 12a 210%", "straight finger curly", "16\"", 110], ["13/4 hd normal wig 12a 210%", "straight finger curly", "18\"", 148], ["13/4 hd normal wig 12a 210%", "straight finger curly", "20\"", 159], ["13/4 hd normal wig 12a 210%", "straight finger curly", "22\"", 183], ["13/4 hd normal wig 12a 210%", "straight finger curly", "24\"", 212], ["13/4 hd normal wig 12a 210%", "straight finger curly", "26\"", 235], ["13/4 hd normal wig 12a 210%", "straight finger curly", "28\"", 258], ["13/4 hd normal wig 12a 210%", "straight finger curly", "30\"", 279],
  ["13/4 transparent wig", "straight", "12\"", 77], ["13/4 transparent wig", "straight", "14\"", 81], ["13/4 transparent wig", "straight", "16\"", 91], ["13/4 transparent wig", "straight", "18\"", 126], ["13/4 transparent wig", "straight", "20\"", 138], ["13/4 transparent wig", "straight", "22\"", 161], ["13/4 transparent wig", "straight", "24\"", 190], ["13/4 transparent wig", "straight", "26\"", 213], ["13/4 transparent wig", "straight", "28\"", 236], ["13/4 transparent wig", "straight", "30\"", 258],
  ["13/4 transparent wig", "water wave", "12\"", 87], ["13/4 transparent wig", "water wave", "14\"", 91], ["13/4 transparent wig", "water wave", "16\"", 101], ["13/4 transparent wig", "water wave", "18\"", 136], ["13/4 transparent wig", "water wave", "20\"", 148], ["13/4 transparent wig", "water wave", "22\"", 171], ["13/4 transparent wig", "water wave", "24\"", 200], ["13/4 transparent wig", "water wave", "26\"", 223], ["13/4 transparent wig", "water wave", "28\"", 246], ["13/4 transparent wig", "water wave", "30\"", 268],
  ["12a bundles", "straight", "10\"", 18], ["12a bundles", "straight", "12\"", 21], ["12a bundles", "straight", "14\"", 23], ["12a bundles", "straight", "16\"", 28], ["12a bundles", "straight", "18\"", 33], ["12a bundles", "straight", "20\"", 39], ["12a bundles", "straight", "22\"", 45], ["12a bundles", "straight", "24\"", 55], ["12a bundles", "straight", "26\"", 61],
  ["13/6 hd frontal", "straight", "12\"", 60], ["13/6 hd frontal", "straight", "14\"", 66], ["13/6 hd frontal", "straight", "16\"", 70], ["13/6 hd frontal", "straight", "18\"", 78], ["13/6 hd frontal", "straight", "20\"", 85], ["13/6 hd frontal", "straight", "22\"", 93],
  ["5/5 hd closure", "straight", "12\"", 32], ["5/5 hd closure", "straight", "14\"", 34], ["5/5 hd closure", "straight", "16\"", 36], ["5/5 hd closure", "straight", "18\"", 41], ["5/5 hd closure", "straight", "20\"", 45], ["5/5 hd closure", "straight", "22\"", 51],
  ["hd full lace glules wig 200%", "straight", "22\"", 133], ["hd full lace glules wig 200%", "straight", "24\"", 162], ["hd full lace glules wig 200%", "straight", "26\"", 199], ["hd full lace glules wig 200%", "straight", "28\"", 241], ["hd full lace glules wig 200%", "straight", "30\"", 300]
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://africabeauty:africabeauty2024@localhost:5432/africabeautydb'
});

async function run() {
  try {
    console.log("⏳ Démarrage de l'importation sécurisée...");

    let catRes = await pool.query(`SELECT id FROM product_categories WHERE salon_id = $1 AND name = 'Perruques'`, [SALON_ID]);
    let categoryId = catRes.rows.length === 0 
      ? (await pool.query(`INSERT INTO product_categories (salon_id, name) VALUES ($1, 'Perruques') RETURNING id`, [SALON_ID])).rows[0].id
      : catRes.rows[0].id;

    let count = 0;

    for (const item of productsData) {
      const [category, texture, size, priceUSD] = item;
      const name = `${category} - ${texture} ${size}`;
      
      const priceBuyMAD = priceUSD * EXCHANGE_RATE_USD_TO_MAD;
      const costPrice = priceBuyMAD + TRANSPORT_COST_PER_ITEM;
      const priceSell = costPrice * (1 + (MARGIN_PERCENT / 100));

      try {
        // On utilise ON CONFLICT DO NOTHING au cas où le produit existe déjà (pour éviter que le script plante)
        // On suppose que le nom du produit est unique par salon
        await pool.query(
          `INSERT INTO products (salon_id, category_id, name, price_buy, price_sell, stock_current, stock_alert, unit, active)
           VALUES ($1, $2, $3, $4, $5, 5, 2, 'pièce', true)
           ON CONFLICT DO NOTHING`,
          [SALON_ID, categoryId, name, Math.round(priceBuyMAD), Math.round(priceSell)]
        );
        count++;
      } catch (err) {
        console.log(`❌ Erreur sur ${name} :`, err.message);
      }
    }

    console.log(`\n🎉 TERMINÉ : ${count} produits traités !`);
  } catch (error) {
    console.error("❌ Erreur globale :", error);
  } finally {
    await pool.end();
  }
}

run();
