const { Pool } = require('pg');
const axios = require('axios');

// Connexion PostgreSQL (à adapter selon votre config)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'africabeautydb',
    password: process.env.DB_PASSWORD,  // sécurisez via variable d'env
    port: 5432,
});

// Configuration CrossChex
const API_URL = 'https://api.us.crosschexcloud.com/';
const API_KEY = 'c59205bfeffa9bdb8de2329c7fbde34c';
const API_SECRET = '483de8165ca9781e85b7b38c929dd01c';

// Générer un UUID unique pour chaque requête
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Obtenir un token d'authentification
async function getToken() {
    const requestId = generateUUID();
    const timestamp = new Date().toISOString();
    const body = {
        header: {
            nameSpace: 'authorize.token',
            nameAction: 'token',
            version: '1.0',
            requestId: requestId,
            timestamp: timestamp,
        },
        payload: {
            api_key: API_KEY,
            api_secret: API_SECRET,
        },
    };
    try {
        const response = await axios.post(API_URL, body);
        if (response.data && response.data.payload && response.data.payload.token) {
            return response.data.payload.token;
        } else {
            throw new Error('Token non reçu');
        }
    } catch (err) {
        console.error('Erreur getToken:', err.message);
        throw err;
    }
}

// Récupérer les pointages entre deux dates
async function getRecords(token, beginTime, endTime, page = 1) {
    const requestId = generateUUID();
    const timestamp = new Date().toISOString();
    const body = {
        header: {
            nameSpace: 'attendance.record',
            nameAction: 'getrecord',
            version: '1.0',
            requestId: requestId,
            timestamp: timestamp,
        },
        authorize: {
            type: 'token',
            token: token,
        },
        payload: {
            begin_time: beginTime,
            end_time: endTime,
            page: page,
            per_page: 100,
        },
    };
    try {
        const response = await axios.post(API_URL, body);
        return response.data;
    } catch (err) {
        console.error('Erreur getRecords:', err.message);
        throw err;
    }
}

// Insérer ou mettre à jour un pointage dans timesheets
async function upsertTimesheet(record, salonId) {
    // record.checktime est au format ISO
    const checkTime = new Date(record.checktime);
    const date = checkTime.toISOString().slice(0, 10);
    const employeeWorkno = record.employee.workno;
    
    // Vous devez faire le lien entre workno (CrossChex) et votre user.id (employee_id)
    // Ici on suppose que vous avez une table employees avec colonne crosschex_workno
    // Ou bien vous créez une correspondance.
    // Exemple : on cherche l'employee_id à partir du workno
    const userResult = await pool.query(
        `SELECT id FROM users WHERE crosschex_workno = $1`,
        [employeeWorkno]
    );
    if (userResult.rows.length === 0) {
        console.log(`Employé workno ${employeeWorkno} non trouvé, ignoré`);
        return;
    }
    const employeeId = userResult.rows[0].id;
    
    // checktype : 0 = check-in, 1 = check-out ? À confirmer avec doc CrossChex
    // Pour l'instant on insère les heures dans arrived_at ou left_at selon le type
    // À adapter selon votre besoin : vous pouvez stocker chaque événement dans une ligne
    // Simple : chaque pointage donne une ligne timesheets (avec arrived_at ou left_at)
    // Mais le modèle initial table timesheets a une ligne par jour. Donc il faut gérer les mises à jour
    
    // Méthode simple : une ligne par événement (dans une table logs)
    // Ou alors on met à jour la ligne du jour avec arrived_at et left_at
    // Ici je propose de mettre à jour la ligne du jour avec arrived_at si c'est un check-in, left_at si check-out
    
    const existing = await pool.query(
        `SELECT id, arrived_at, left_at FROM timesheets WHERE employee_id=$1 AND date=$2`,
        [employeeId, date]
    );
    
    if (record.checktype === 0) { // check-in
        if (existing.rows.length === 0) {
            await pool.query(
                `INSERT INTO timesheets (employee_id, salon_id, date, arrived_at, status)
                 VALUES ($1, $2, $3, $4, 'PRESENT')`,
                [employeeId, salonId, date, checkTime]
            );
        } else {
            await pool.query(
                `UPDATE timesheets SET arrived_at = $1 WHERE id = $2`,
                [checkTime, existing.rows[0].id]
            );
        }
    } else if (record.checktype === 1) { // check-out
        if (existing.rows.length > 0 && !existing.rows[0].left_at) {
            await pool.query(
                `UPDATE timesheets SET left_at = $1 WHERE id = $2`,
                [checkTime, existing.rows[0].id]
            );
        }
    }
    // Ajoutez d'autres checktypes si besoin (pause, etc.)
}

// Synchronisation principale
async function syncCrossChex(salonId = 1, sinceDays = 1) {
    console.log('Début synchronisation CrossChex...');
    try {
        const token = await getToken();
        const endTime = new Date().toISOString();
        const beginTime = new Date(Date.now() - sinceDays * 86400000).toISOString();
        
        let page = 1;
        let totalPages = 1;
        do {
            const data = await getRecords(token, beginTime, endTime, page);
            if (!data.payload || !data.payload.list) break;
            const records = data.payload.list;
            totalPages = data.payload.pageCount || 1;
            
            for (const record of records) {
                await upsertTimesheet(record, salonId);
            }
            console.log(`Page ${page}/${totalPages} traitée, ${records.length} enregistrements`);
            page++;
        } while (page <= totalPages);
        
        console.log('Synchronisation terminée');
    } catch (err) {
        console.error('Erreur synchro:', err);
    } finally {
        await pool.end();
    }
}

// Si appelé directement en CLI
if (require.main === module) {
    const salonId = process.argv[2] || 1;
    const sinceDays = process.argv[3] || 1;
    syncCrossChex(salonId, sinceDays).then(() => process.exit(0));
}

module.exports = { syncCrossChex };
