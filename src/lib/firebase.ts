// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUKXOCOcrnAzQT4LjimD4q4Gu99RkTotI",
  authDomain: "note-keep-know.firebaseapp.com",
  projectId: "note-keep-know",
  storageBucket: "note-keep-know.firebasestorage.app",
  messagingSenderId: "259043482521",
  appId: "1:259043482521:web:615f5a41400be0aa225108"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}


export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export const getAppStorage = () => storage;

export const getDb = () => db;