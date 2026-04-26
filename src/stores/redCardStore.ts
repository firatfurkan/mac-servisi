import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RedCardEvent {
  matchId: string;
  matchLabel: string;
  playerName: string;
  playerTeam: string;
  minute: number;
  timestamp: number;
}

/** Normalize team name for comparison: lowercase, strip Turkish/Latin diacritics, collapse spaces. */
export function normalizeTeamName(name: string): string {
  const CHAR_MAP: Record<string, string> = {
    // Turkish
    'ğ':'g','ş':'s','ı':'i','ö':'o','ü':'u','ç':'c',
    // Latin accented (common in team names)
    'à':'a','á':'a','â':'a','ä':'a','ã':'a','å':'a',
    'è':'e','é':'e','ê':'e','ë':'e',
    'ì':'i','í':'i','î':'i','ï':'i',
    'ò':'o','ó':'o','ô':'o','õ':'o',
    'ù':'u','ú':'u','û':'u',
    'ý':'y','ÿ':'y','ñ':'n','ß':'ss',
  };
  return name
    .toLowerCase()
    .replace(/[ğşıöüçàáâäãåèéêëìíîïòóôõùúûýÿñß]/g, (c) => CHAR_MAP[c] ?? c)
    .replace(/\s+/g, ' ')
    .trim();
}

interface RedCardState {
  events: RedCardEvent[];
  setRedCardEvent: (event: RedCardEvent) => void;
  clearExpired: (maxAgeMs: number) => void;
  clearAll: () => void;
}

export const useRedCardStore = create<RedCardState>()(
  persist(
    (set) => ({
      events: [],

      setRedCardEvent: (event: RedCardEvent) =>
        set((state) => {
          // Deduplicate by matchId + playerName + minute (same card, any session)
          const exists = state.events.some(
            (e) =>
              e.matchId === event.matchId &&
              e.playerName === event.playerName &&
              e.minute === event.minute,
          );

          if (exists) return state;

          // Add new event, keep last 200
          return {
            events: [event, ...state.events].slice(0, 200),
          };
        }),

      clearExpired: (maxAgeMs: number) =>
        set((state) => {
          const now = Date.now();
          return {
            events: state.events.filter((e) => now - e.timestamp < maxAgeMs),
          };
        }),

      clearAll: () => set({ events: [] }),
    }),
    {
      name: '@asist_redcard_events',
      storage: {
        getItem: async (name) => {
          try {
            const item = await AsyncStorage.getItem(name);
            return item ? JSON.parse(item) : null;
          } catch {
            return null;
          }
        },
        setItem: async (name, value) => {
          try {
            await AsyncStorage.setItem(name, JSON.stringify(value));
          } catch {
            // Silently ignore storage errors
          }
        },
        removeItem: async (name) => {
          try {
            await AsyncStorage.removeItem(name);
          } catch {
            // Silently ignore storage errors
          }
        },
      },
    }
  )
);
