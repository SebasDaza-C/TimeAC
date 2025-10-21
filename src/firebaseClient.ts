import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, onSnapshot, DocumentData } from 'firebase/firestore';
import type { BellControls } from './Types';

const FirebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};

const AppClient = initializeApp(FirebaseConfig);
const Db = getFirestore(AppClient);

const bellControlsRef = doc(Db, 'config', 'bellControls');

export const updateBellControls = (data: Partial<BellControls>) => {
  return updateDoc(bellControlsRef, data);
};

export const onBellControlsChange = (callback: (data: BellControls) => void) => {
  return onSnapshot(bellControlsRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as BellControls);
    } else {
      // If the document doesn't exist, provide default values
      callback({
        manualRing: 0,
        autoRingEnabled: true,
        isSilenced: false,
      });
    }
  });
};

export { AppClient, Db, FirebaseConfig };
