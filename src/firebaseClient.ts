import { initializeApp } from 'firebase/app';
import { getDatabase, ref, update, onValue } from 'firebase/database';
import type { BellControls } from './Types';

const FirebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  databaseURL: 'https://timeac-2025-default-rtdb.firebaseio.com/',
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};

const AppClient = initializeApp(FirebaseConfig);
const Db = getDatabase(AppClient);

const bellControlsRef = ref(Db, 'bell');

export const updateBellControls = (data: Partial<BellControls>) => {
  return update(bellControlsRef, data);
};

export const ringBell = async (duration: number = 3000) => {
  await update(bellControlsRef, { isRinging: true });
  setTimeout(async () => {
    await update(bellControlsRef, { isRinging: false });
  }, duration);
};

export const onBellControlsChange = (callback: (data: BellControls) => void) => {
  return onValue(bellControlsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback(data as BellControls);
    } else {
      // Si no existen datos en la ruta, proveer valores por defecto
      callback({
        isRinging: false,
        autoRingEnabled: true,
        isSilenced: false,
      });
    }
  });
};

export { AppClient, Db };