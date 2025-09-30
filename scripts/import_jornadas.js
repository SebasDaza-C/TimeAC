// scripts/import_jornadas.js
// Lee public/jornadas.json y lo sube a Firestore bajo la colección `jornadas`.
// Para ejecutar la importación real, exporta la variable de entorno
// GOOGLE_APPLICATION_CREDENTIALS que apunte al archivo JSON de credenciales del servicio.
// Ejemplo (PowerShell):
// $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\serviceAccountKey.json'; npm run import-jornadas

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const jornadasPath = path.join(__dirname, '..', 'public', 'Schedules.json');

function loadJornadas() {
  const raw = fs.readFileSync(jornadasPath, 'utf8');
  return JSON.parse(raw);
}

async function importToFirestore(dryRun = true) {
  const jornadas = loadJornadas();

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('WARNING: GOOGLE_APPLICATION_CREDENTIALS no está definida. Ejecutando en dry-run (no se subirán datos).');
  }

  if (!dryRun && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    const db = admin.firestore();

    for (const jornada of jornadas) {
      const docRef = db.collection('jornadas').doc(String(jornada.id));
      await docRef.set(jornada, { merge: true });
      console.log(`Subida: jornada id=${jornada.id}`);
    }

    console.log('Importación completada.');
  } else {
    console.log('Dry-run: mostraría la siguiente estructura para subir a Firestore:');
    for (const jornada of jornadas) {
      console.log(`-> Colección: jornadas / Doc ID: ${jornada.id}`);
    }
    console.log(`Total jornadas: ${jornadas.length}`);
    console.log('\nPara ejecutar la importación real exporta la variable de entorno GOOGLE_APPLICATION_CREDENTIALS y rerun el script con NODE_ENV=production o edita dryRun a false.');
  }
}

// Si se ejecuta con el argumento --run o con NODE_ENV=production, intentará subir (si está la variable de credenciales)
const args = process.argv.slice(2);
const forceRun = args.includes('--run') || process.env.NODE_ENV === 'production';

importToFirestore(!forceRun).catch(err => {
  console.error('Error durante la importación:', err);
  process.exit(1);
});
