import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyBojIfPxkkNnk-OYP80k6bGP6Fc_a4KJT4",
  authDomain:        "farmacia-arcanjo.firebaseapp.com",
  projectId:         "farmacia-arcanjo",
  storageBucket:     "farmacia-arcanjo.firebasestorage.app",
  messagingSenderId: "934974132501",
  appId:             "1:934974132501:web:d8248e9d6b76143874d91c",
  measurementId:     "G-XZZ7KT3W2N",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
