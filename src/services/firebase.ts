import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  initializeAuth,
  browserLocalPersistence,
  inMemoryPersistence,
  type Persistence,
} from 'firebase/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyBfsH0yD7FPcqXo0edh1aScVjaFrMQT9ms",
  authDomain: "asistbeta53.firebaseapp.com",
  projectId: "asistbeta53",
  storageBucket: "asistbeta53.firebasestorage.app",
  messagingSenderId: "587559065195",
  appId: "1:587559065195:web:b1a3da44b066d52bb2c32e"
};

// Uses the official Firebase RN persistence adapter (firebase/auth/react-native).
// Falls back to inMemoryPersistence if the subpath is unavailable in the current
// SDK version — prevents a fatal "internal assertion failed" crash on iOS startup.
function getNativePersistence(): Persistence {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getReactNativePersistence } = require('firebase/auth/react-native');
    return getReactNativePersistence(AsyncStorage);
  } catch {
    return inMemoryPersistence;
  }
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web' ? browserLocalPersistence : getNativePersistence(),
});
