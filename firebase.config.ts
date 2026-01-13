import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "",
  authDomain: "studify-168c9.firebaseapp.com",
  databaseURL: "https://studify-168c9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "studify-168c9",
  storageBucket: "studify-168c9.firebasestorage.app",
  messagingSenderId: "873292603502",
  appId: "1:873292603502:web:bb38028d0282a732cd067f",
  measurementId: "G-V7SLF0Y1KJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const database = getDatabase(app);
