// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4c1jjaxiZeGgJHQXnqN-1aLgG9nAVKTw",
  authDomain: "timeac-2025.firebaseapp.com",
  projectId: "timeac-2025",
  storageBucket: "timeac-2025.firebasestorage.app",
  messagingSenderId: "924617579555",
  appId: "1:924617579555:web:e2bd8a18f9d8015f22a596",
  measurementId: "G-6JQP19WDEH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services for use in other components
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };