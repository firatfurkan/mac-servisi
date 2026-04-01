import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, Profile } from '../types';

interface SettingsStore {
  language: Language;
  profile: Profile;
  eulaAccepted: boolean;
  setLanguage: (lang: Language) => void;
  updateProfile: (data: Partial<Profile>) => void;
  acceptEula: () => void;
  initializeLanguage: () => Promise<void>;
}

const LANGUAGE_STORAGE_KEY = '@asist_language';
const PROFILE_STORAGE_KEY = '@asist_profile';
const EULA_STORAGE_KEY = '@asist_eula_accepted';

export const useSettingsStore = create<SettingsStore>((set) => ({
  language: 'tr',
  profile: { name: '', email: '', favoriteTeam: '' },
  eulaAccepted: false,
  setLanguage: (language) => {
    set({ language });
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language).catch(() => {});
  },
  updateProfile: (data) => {
    set((state) => {
      const updated = { ...state.profile, ...data };
      AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return { profile: updated };
    });
  },
  acceptEula: () => {
    set({ eulaAccepted: true });
    AsyncStorage.setItem(EULA_STORAGE_KEY, '1').catch(() => {});
  },
  initializeLanguage: async () => {
    try {
      const [savedLanguage, savedProfile, savedEula] = await Promise.all([
        AsyncStorage.getItem(LANGUAGE_STORAGE_KEY),
        AsyncStorage.getItem(PROFILE_STORAGE_KEY),
        AsyncStorage.getItem(EULA_STORAGE_KEY),
      ]);
      if (savedLanguage === 'tr' || savedLanguage === 'en') {
        set({ language: savedLanguage as Language });
      }
      if (savedProfile) {
        set({ profile: JSON.parse(savedProfile) });
      }
      if (savedEula === '1') {
        set({ eulaAccepted: true });
      }
    } catch {}
  },
}));
