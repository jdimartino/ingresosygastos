const fs = require('fs');

const manualText = fs.readFileSync('manual_calc.txt', 'utf8');
const manualLines = manualText.split('\n').filter(l => l.trim() !== '');

let manualSum = 0;
const manualItems = [];
const manualItemsSig = [];

manualLines.forEach(line => {
    // Format: 2/2/2026 \t Comida (Mercado) \t 4
    const parts = line.split('\t');
    if (parts.length >= 3) {
        const monto = parseFloat(parts[2].trim());
        manualSum += monto;
        manualItems.push({ fecha: parts[0].trim(), categoria: parts[1].trim(), monto });
        manualItemsSig.push(`${parts[1].trim()} - ${monto}`);
    }
});

console.log("=== CALCULO MANUAL (Tu Lista) ===");
console.log("Total Manual:", manualSum);
console.log("Cantidad de items manuales:", manualItems.length);

const dbText = fs.readFileSync('/Users/jdimartino/.gemini/antigravity/brain/b0c45fe6-b451-4bda-85c1-119f2d15a14c/.system_generated/steps/952/output.txt', 'utf8');
const dbLines = dbText.split('\n');

let dbSum = 0;
const dbItems = [];
const dbItemsSig = [];
let currentItem = {};

for (let line of dbLines) {
    line = line.trim();
    if (line.startsWith('- __path__:')) {
        if (Object.keys(currentItem).length > 0) {
            dbItems.push(currentItem);
            dbItemsSig.push(`${currentItem.categoria} - ${currentItem.monto}`);
            dbSum += currentItem.monto;
        }
        currentItem = {};
    } else if (line.startsWith("fecha: '")) {
        currentItem.fecha = line.split("'")[1]; // extract '2026-02-23'
    } else if (line.startsWith('categoria:')) {
        currentItem.categoria = line.substring(line.indexOf(':') + 1).trim();
    } else if (line.startsWith('monto:')) {
        currentItem.monto = parseFloat(line.split(':')[1].trim());
    }
}
if (Object.keys(currentItem).length > 0) {
    dbItems.push(currentItem);
    dbItemsSig.push(`${currentItem.categoria} - ${currentItem.monto}`);
    dbSum += currentItem.monto;
}

console.log("\n=== BASE DE DATOS (Firestore) ===");
console.log("Total DB:", dbSum);
console.log("Cantidad de items DB:", dbItems.length);

console.log("\n=== DIFERENCIAS ENCONTRADAS ===");

// Check what's in manual but missing in DB
const missingInDB = [...manualItemsSig];
const surplusInDB = [...dbItemsSig];

// Cross out matches
for (let i = missingInDB.length - 1; i >= 0; i--) {
    const item = missingInDB[i];
    const matchIdx = surplusInDB.indexOf(item);
    if (matchIdx !== -1) {
        // Found a match, remove from both
        missingInDB.splice(i, 1);
        surplusInDB.splice(matchIdx, 1);
    }
}

console.log("\n📌 Gastos en tu lista manual que NO ESTÁN en la base de datos:");
if (missingInDB.length === 0) console.log("(Ninguno)");
missingInDB.forEach(i => console.log("  -", i));

console.log("\n📌 Gastos en la base de datos que NO ESTÁN en tu lista manual:");
if (surplusInDB.length === 0) console.log("(Ninguno)");
surplusInDB.forEach(i => console.log("  -", i));
