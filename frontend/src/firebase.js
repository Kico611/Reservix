// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase konfiguracija
const firebaseConfig = {
  apiKey: "AIzaSyAEh49kK6KVcPnWcAmrtQps_uqoIBJeyQM",
  authDomain: "termini-56063.firebaseapp.com",
  projectId: "termini-56063",
  storageBucket: "termini-56063.appspot.com",
  messagingSenderId: "629298079947",
  appId: "1:629298079947:web:b387aebb309f1c2117934e",
};

// Inicijalizacija Firebase aplikacije
const app = initializeApp(firebaseConfig);

// Inicijalizacija autentifikacije
const auth = getAuth(app);

export const db = getFirestore(app);

// Export auth objekta
export { auth };
