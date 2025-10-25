// scripts/import_jornadas.js
// Lee public/Schedules.json y lo sube a Realtime Database bajo la ruta `jornadas`.
// Para ejecutar la importación real, define la variable de entorno
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

async function importToRealtimeDB(dryRun = true) {
  const jornadas = loadJornadas();

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('WARNING: GOOGLE_APPLICATION_CREDENTIALS no está definida. Ejecutando en dry-run (no se subirán datos).');
  }

  // Realtime Database necesita una estructura de objeto (clave-valor), no un array.
  // Usaremos el `id` de la jornada como clave.
  const jornadasObject = jornadas.reduce((acc, jornada) => {
    acc[jornada.id] = jornada;
    return acc;
  }, {});

  if (!dryRun && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Evita el error "Firebase app already exists" si el script se ejecuta varias veces
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: 'https://timeac-2025-default-rtdb.firebaseio.com/'
      });
    }

    const db = admin.database();
    const ref = db.ref('jornadas');

    await ref.set(jornadasObject);

    console.log('Importación completada.');
  } else {
    console.log('Dry-run: se subiría la siguiente estructura a Realtime Database en la ruta /jornadas:');
    console.log(JSON.stringify(jornadasObject, null, 2));
    console.log(`\nTotal jornadas: ${jornadas.length}`);
    console.log('\nPara ejecutar la importación real, asegúrate de haber definido GOOGLE_APPLICATION_CREDENTIALS y ejecuta el comando con el argumento --run. Ejemplo: npm run import-jornadas -- --run');
  }
}

const args = process.argv.slice(2);
const forceRun = args.includes('--run');

importToRealtimeDB(!forceRun).catch(err => {
  console.error('Error durante la importación:', err);
  process.exit(1);
});
