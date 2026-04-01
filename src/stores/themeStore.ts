import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '../types';

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  initializeTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = '@asist_theme_mode';

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: 'system',
  setMode: (mode) => {
    set({ mode });
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch((error) => {
      if (__DEV__) console.error('Failed to persist theme mode:', error);
    });
  },
  initializeTheme: async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
        set({ mode: savedMode as ThemeMode });
      }
    } catch (error) {
      if (__DEV__) console.error('Failed to load theme mode:', error);
    }
  },
}));
