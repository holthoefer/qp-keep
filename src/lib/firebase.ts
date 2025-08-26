// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "keep-know",
  "appId": "1:897948696245:web:993f704158bf4bd63e88fc",
  "storageBucket": "keep-know.firebasestorage.app",
  "apiKey": "AIzaSyA7fATeewT2caPFET9uyd1YUEgkVvsRM8Q",
  "authDomain": "keep-know.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "897948696245"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
}

export const db = getFirestore(app);
export const auth = getAuth(app);
