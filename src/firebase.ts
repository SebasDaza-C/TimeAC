// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC42V8ti4eSxFSYOAESoZ3drT6nEF5__YY",
  authDomain: "timeac-d9b0b.firebaseapp.com",
  projectId: "timeac-d9b0b",
  storageBucket: "timeac-d9b0b.appspot.com",
  messagingSenderId: "692291139243",
  appId: "1:692291139243:web:691ac74e5cea4d9db969ee",
  measurementId: "G-QGVRLP0JMG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { db };
