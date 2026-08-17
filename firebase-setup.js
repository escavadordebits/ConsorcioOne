import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, setDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Configuração real do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCVxdbFK3oW3aIiXdrFRHbT6J0ZmVLzdp8",
  authDomain: "consorcioone-2e641.firebaseapp.com",
  projectId: "consorcioone-2e641",
  storageBucket: "consorcioone-2e641.firebasestorage.app",
  messagingSenderId: "45426955746",
  appId: "1:45426955746:web:23c738b08ea8719a22d5bb",
  measurementId: "G-4PC2Q5TD3W"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { 
    auth, 
    db, 
    googleProvider, 
    signInWithPopup, 
    onAuthStateChanged, 
    signOut, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    getDoc, 
    setDoc,
    query,
    where
};
