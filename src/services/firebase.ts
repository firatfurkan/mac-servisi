import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, browserLocalPersistence, inMemoryPersistence } from 'firebase/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyBfsH0yD7FPcqXo0edh1aScVjaFrMQT9ms",
  authDomain: "asistbeta53.firebaseapp.com",
  projectId: "asistbeta53",
  storageBucket: "asistbeta53.firebasestorage.app",
  messagingSenderId: "587559065195",
  appId: "1:587559065195:web:b1a3da44b066d52bb2c32e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web' ? browserLocalPersistence : inMemoryPersistence,
});
