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
          // Avoid duplicates: check if this card already exists
          const exists = state.events.some(
            (e) =>
              e.matchId === event.matchId &&
              e.playerName === event.playerName &&
              e.minute === event.minute &&
              Math.abs(e.timestamp - event.timestamp) < 5000, // Within 5 seconds
          );

          if (exists) return state;

          // Add new event, keep last 100
          return {
            events: [event, ...state.events].slice(0, 100),
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
