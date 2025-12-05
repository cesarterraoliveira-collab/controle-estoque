// src/configuracoes/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// 🔥 CONFIGURAÇÃO REAL DO PROJETO "estoque-roupas-julio"
const firebaseConfig = {
  apiKey: "AIzaSyCmmdGvtePI1fo3bCMFLjgh1TNX0l62_CI",
  authDomain: "estoque-roupas-julio.firebaseapp.com",
  projectId: "estoque-roupas-julio",
  storageBucket: "estoque-roupas-julio.firebasestorage.app",
  messagingSenderId: "690408278025",
  appId: "1:690408278025:web:b40242835e381b53f2d0d8",
  measurementId: "G-W69D85PBJS"
};

// 🔹 Inicializa o app Firebase
const app = initializeApp(firebaseConfig);

// 🔹 Firestore
// Use getFirestore para produção, initializeFirestore com long polling para desenvolvimento local
const db =
  process.env.NODE_ENV === "development"
    ? initializeFirestore(app, {
        experimentalForceLongPolling: true,
        useFetchStreams: false
      })
    : getFirestore(app);

// 🔹 Firebase Authentication
const auth = getAuth(app);

// 🔹 Exporta tudo
export { app, db, auth };
