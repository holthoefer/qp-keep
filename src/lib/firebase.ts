
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

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

// In development, connect to emulators
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log("Connecting to Firebase emulators...");
    try {
        connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
        connectFirestoreEmulator(db, 'localhost', 8080);
        connectStorageEmulator(storage, 'localhost', 9199);
        console.log("Successfully connected to emulators.");
    } catch (error) {
        console.error("Error connecting to Firebase emulators:", error);
    }
}


export const getAppStorage = () => storage;

export const getDb = () => db;
