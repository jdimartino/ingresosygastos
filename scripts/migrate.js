import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import csv from 'csv-parser';

// You will need to download your serviceAccountKey.json from Firebase Console
// Project Settings > Service Accounts > Generate new private key
import serviceAccount from './serviceAccountKey.json' with { type: "json" };

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// Normalize d/M/yyyy or dd/MM/yyyy -> yyyy-MM-dd
function normalizeDate(rawDate) {
    if (!rawDate) return new Date().toISOString().slice(0, 10);
    // If already in yyyy-MM-dd format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) return rawDate.trim();
    // Parse d/M/yyyy or d/M/yy
    const parts = rawDate.trim().split('/');
    if (parts.length === 3) {
        const [d, m, y] = parts;
        const year = y.length === 2 ? '20' + y : y;
        return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // Fallback
    return rawDate.trim();
}

async function migrateIngresos(csvFilePath) {
    if (!fs.existsSync(csvFilePath)) return;
    const results = [];
    console.log(`Reading CSV ${csvFilePath}...`);

    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                console.log(`Found ${results.length} ingresos. Starting migration...`);
                let count = 0;

                for (const row of results) {
                    try {
                        const fecha = normalizeDate(row['Fecha']);
                        const cliente = row['Quien'] || row['Cliente'] || 'Desconocido';
                        const montoBase = parseFloat(String(row['Monto_Base'] || row['Monto'] || 0).replace(/,/g, '.'));
                        const porcentaje = parseFloat(String(row['Porcentaje'] || 0).replace(/,/g, '.'));
                        const comisionTotal = parseFloat(String(row['Comision_Total'] || 0).replace(/,/g, '.'));
                        const ingresoReal = comisionTotal || montoBase * (porcentaje / 100);

                        // Skip blank/summary rows with no real data
                        if (!cliente || cliente === 'Desconocido' || montoBase === 0 || isNaN(montoBase)) {
                            continue;
                        }

                        await db.collection('ingresos').add({
                            fecha,
                            cliente,
                            montoBase,
                            porcentaje,
                            ingresoReal,
                            timestampRegistro: new Date()
                        });
                        count++;
                    } catch (e) {
                        console.error('Error adding ingreso: ', e);
                    }
                }
                console.log(`Successfully migrated ${count} ingresos.`);
                resolve();
            })
            .on('error', reject);
    });
}

async function migrateGastos(csvFilePath) {
    if (!fs.existsSync(csvFilePath)) return;
    const results = [];
    console.log(`Reading CSV ${csvFilePath}...`);

    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                console.log(`Found ${results.length} gastos. Starting migration...`);
                let count = 0;

                for (const row of results) {
                    try {
                        // Actual CSV headers: Fecha, Descripcion, Monto_Gasto, Detalle_Gasto
                        const fecha = normalizeDate(row['Fecha']);
                        const categoria = row['Descripcion'] || row['Categoria'] || row['Categoría'] || 'Otra';
                        const monto = parseFloat(String(row['Monto_Gasto'] || row['Monto'] || 0).replace(/,/g, '.'));
                        const detalle = row['Detalle_Gasto'] || row['Detalle'] || '';

                        // Skip blank/summary rows with no real data
                        if (!categoria || categoria === 'Otra' || monto === 0 || isNaN(monto)) {
                            continue;
                        }

                        await db.collection('gastos').add({
                            fecha,
                            categoria,
                            monto,
                            detalle,
                            timestampRegistro: new Date()
                        });
                        count++;
                    } catch (e) {
                        console.error('Error adding gasto: ', e);
                    }
                }
                console.log(`Successfully migrated ${count} gastos.`);
                resolve();
            })
            .on('error', reject);
    });
}

async function deleteCollection(collectionName) {
    console.log(`Deleting old ${collectionName} data...`);
    const snapshot = await db.collection(collectionName).get();
    const batchSize = 500;
    let deleted = 0;
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += batchSize) {
        const batch = db.batch();
        docs.slice(i, i + batchSize).forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        deleted += Math.min(batchSize, docs.length - i);
    }
    console.log(`Deleted ${deleted} documents from ${collectionName}.`);
}

async function runMigration() {
    console.log('--- Starting Migration ---');
    if (!fs.existsSync('./scripts/serviceAccountKey.json')) {
        console.error('Error: ./scripts/serviceAccountKey.json is missing.');
        return;
    }

    // Delete old data first
    await deleteCollection('ingresos');
    await deleteCollection('gastos');

    const ingresosFile = './ingresos.csv';
    const gastosFile = './gastos.csv';

    if (fs.existsSync(ingresosFile)) {
        await migrateIngresos(ingresosFile);
    } else {
        console.log('Skipping Ingresos (ingresos.csv not found)');
    }

    if (fs.existsSync(gastosFile)) {
        await migrateGastos(gastosFile);
    } else {
        console.log('Skipping Gastos (gastos.csv not found)');
    }

    console.log('--- Migration Finished ---');
}

runMigration().catch(console.error);
