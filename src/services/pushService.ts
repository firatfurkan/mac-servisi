import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from './firebase';

let cachedToken: string | null = null;

export async function getPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (cachedToken) return cachedToken;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;
    const projectId = (Constants.expoConfig?.extra?.eas?.projectId as string | undefined);
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    cachedToken = result.data;
    return cachedToken;
  } catch {
    return null;
  }
}

// Firestore doc IDs can't have '/' — encode the Expo push token safely
function encodeToken(token: string): string {
  return token.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function registerMatchPush(matchId: string, startTime?: string): Promise<void> {
  const token = await getPushToken();
  if (!token) return;
  try {
    const batch = writeBatch(db);
    // Parent doc — stores match metadata for stale detection in Cloud Function
    const parentRef = doc(db, 'matchSubscriptions', matchId);
    batch.set(parentRef, {
      ...(startTime ? { startTime } : {}),
      createdAt: serverTimestamp(),
    }, { merge: true });
    // Subscriber doc
    const subRef = doc(db, 'matchSubscriptions', matchId, 'subscribers', encodeToken(token));
    batch.set(subRef, { token, platform: Platform.OS, updatedAt: serverTimestamp() });
    await batch.commit();
  } catch {}
}

export async function unregisterMatchPush(matchId: string): Promise<void> {
  try {
    const token = await getPushToken();

     // Token alınamazsa işlem yapma (güvenlik hatasını engeller)
    if (!token) {
      return;
    }


    const ref = doc(db, 'matchSubscriptions', matchId, 'subscribers', encodeToken(token));
    await deleteDoc(ref);
  } catch (err) {
    if (__DEV__) console.error(`Failed to unregister match push ${matchId}:`, err);
  }
}

export interface MatchMeta { id: string; startTime?: string }

/**
 * Called at app startup to ensure all stored notified matches
 * have an active push subscription in Firestore.
 * Skips matches whose startTime is more than 24 hours in the past.
 */
export async function syncPushSubscriptions(matches: MatchMeta[]): Promise<void> {
  if (matches.length === 0) return;
  const token = await getPushToken();
  if (!token) return;
  const encodedToken = encodeToken(token);
  const now = Date.now();
  // Bir maç max ~2.5 saat sürer. 4 saat öncesinden başlamış maçları stale say.
  const STALE_MS = 4 * 60 * 60 * 1000;
  const active = matches.filter(m => {
    if (!m.startTime) return true;
    return (now - new Date(m.startTime).getTime()) < STALE_MS;
  });
  if (active.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const m of active) {
      const parentRef = doc(db, 'matchSubscriptions', m.id);
      batch.set(parentRef, {
        ...(m.startTime ? { startTime: m.startTime } : {}),
        createdAt: serverTimestamp(),
      }, { merge: true });
      const subRef = doc(db, 'matchSubscriptions', m.id, 'subscribers', encodedToken);
      batch.set(subRef, { token, platform: Platform.OS, updatedAt: serverTimestamp() }, { merge: true });
    }
    await batch.commit();
  } catch {}
}
