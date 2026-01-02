
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBN0Wu1a46dEntG-895v-3NFT6bkpc536w",
  authDomain: "mini-mundo-38d14.firebaseapp.com",
  projectId: "mini-mundo-38d14",
  storageBucket: "mini-mundo-38d14.firebasestorage.app",
  messagingSenderId: "156751499542",
  appId: "1:156751499542:web:02f791a7b50af591dc8037",
  measurementId: "G-88X9VY6DZV"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Inicialização segura do Analytics (previne erros em ambientes sem suporte a cookies/window)
export const analytics = typeof window !== 'undefined' ? 
  isSupported().then(yes => yes ? getAnalytics(app) : null) 
  : null;
