const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

admin.initializeApp();

/**
 * Lee el archivo local `Schedules.json` y lo prepara para la base de datos.
 * @return {object} Un objeto con las jornadas, usando su ID como clave.
 */
function loadSchedulesAsObject() {
  // La ruta es relativa al directorio de funciones al desplegar
  const schedulesPath = path.join(__dirname, "Schedules.json");
  const rawData = fs.readFileSync(schedulesPath, "utf8");
  const schedulesArray = JSON.parse(rawData);

  // Convierte el array en un objeto, usando el id de la jornada como clave.
  const schedulesObject = schedulesArray.reduce((acc, schedule) => {
    acc[schedule.id] = schedule;
    return acc;
  }, {});

  return schedulesObject;
}

/**
 * Función Cloud invocable para reestablecer las jornadas en Realtime Database
 * a partir del archivo `Schedules.json` local.
 */
exports.resetJornadas = functions.https.onCall(async (data, context) => {
  // Opcional: podrías añadir autenticación para asegurar que solo usuarios
  // autorizados puedan ejecutar esta acción.

  const schedules = loadSchedulesAsObject();
  const db = admin.database();
  const ref = db.ref("jornadas");

  await ref.set(schedules);

  return { success: true, message: "Jornadas reestablecidas correctamente." };
});