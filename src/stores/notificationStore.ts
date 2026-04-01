import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotifiedMatch {
  id: string;
  startTime: string;
  homeTeamName: string;
  awayTeamName: string;
}

interface NotificationStore {
  notifiedMatches: NotifiedMatch[];
  toggleMatchNotification: (match: NotifiedMatch) => void;
  isMatchNotified: (matchId: string) => boolean;
  removeMatchNotification: (matchId: string) => void;
  loadNotifications: () => Promise<void>;
  /** Convenience getter for IDs only (used by goalTracker) */
  notifiedMatchIds: string[];
}

const STORAGE_KEY = '@asist_notified_matches_v2';

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifiedMatches: [],
  notifiedMatchIds: [],

  toggleMatchNotification: (match: NotifiedMatch) => {
    const current = get().notifiedMatches;
    const exists = current.some((m) => m.id === match.id);
    const updated = exists
      ? current.filter((m) => m.id !== match.id)
      : [...current, match];
    const ids = updated.map((m) => m.id);
    set({ notifiedMatches: updated, notifiedMatchIds: ids });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  isMatchNotified: (matchId: string) => {
    return get().notifiedMatchIds.includes(matchId);
  },

  removeMatchNotification: (matchId: string) => {
    const updated = get().notifiedMatches.filter((m) => m.id !== matchId);
    const ids = updated.map((m) => m.id);
    set({ notifiedMatches: updated, notifiedMatchIds: ids });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  },

  loadNotifications: async () => {
    try {
      // Try v2 format first
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: NotifiedMatch[] = JSON.parse(stored);
        // Maç max ~2.5 saat sürer — 4 saat öncesinden başlamışları temizle
        const STALE_MS = 4 * 60 * 60 * 1000;
        const now = Date.now();
        const active = parsed.filter(m => {
          if (!m.startTime) return true;
          return (now - new Date(m.startTime).getTime()) < STALE_MS;
        });
        // Temizlendiyse storage'ı güncelle
        if (active.length !== parsed.length) {
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(active)).catch(() => {});
        }
        set({
          notifiedMatches: active,
          notifiedMatchIds: active.map((m) => m.id),
        });
        return;
      }
      // Migrate from v1 (just IDs)
      const oldStored = await AsyncStorage.getItem('@asist_notified_matches');
      if (oldStored) {
        const oldIds: string[] = JSON.parse(oldStored);
        const migrated: NotifiedMatch[] = oldIds.map((id) => ({
          id,
          startTime: '',
          homeTeamName: '',
          awayTeamName: '',
        }));
        set({
          notifiedMatches: migrated,
          notifiedMatchIds: oldIds,
        });
        // Save in new format and remove old
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        await AsyncStorage.removeItem('@asist_notified_matches');
      }
    } catch {
      // ignore
    }
  },
}));
