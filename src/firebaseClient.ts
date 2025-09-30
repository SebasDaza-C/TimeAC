import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const FirebaseConfig = {
  apiKey: 'AIzaSyC4c1jjaxiZeGgJHQXnqN-1aLgG9nAVKTw',
  authDomain: 'timeac-2025.firebaseapp.com',
  projectId: 'timeac-2025',
  storageBucket: 'timeac-2025.firebasestorage.app',
  messagingSenderId: '924617579555',
  appId: '1:924617579555:web:e2bd8a18f9d8015f22a596',
  measurementId: 'G-6JQP19WDEH',
};

const AppClient = initializeApp(FirebaseConfig);
const Db = getFirestore(AppClient);

export { AppClient, Db, FirebaseConfig };
