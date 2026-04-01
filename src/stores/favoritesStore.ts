import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FavoriteTeam {
  id: string;
  name: string;
  logo: string;
}

interface FavoritesStore {
  favoriteTeamIds: string[];
  favoriteTeams: FavoriteTeam[];
  toggleFavorite: (teamId: string, name?: string, logo?: string) => void;
  isFavorite: (teamId: string) => boolean;
  loadFavorites: () => Promise<void>;
  getFavoriteTeam: (teamId: string) => FavoriteTeam | undefined;
}

const STORAGE_KEY = '@asist_favorite_teams';
const TEAMS_STORAGE_KEY = '@asist_favorite_teams_info';

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favoriteTeamIds: [],
  favoriteTeams: [],

  toggleFavorite: (teamId: string, name?: string, logo?: string) => {
    const currentIds = get().favoriteTeamIds;
    const currentTeams = get().favoriteTeams;
    const isRemoving = currentIds.includes(teamId);

    const updatedIds = isRemoving
      ? currentIds.filter((id) => id !== teamId)
      : [...currentIds, teamId];

    let updatedTeams = currentTeams;
    if (isRemoving) {
      updatedTeams = currentTeams.filter((t) => t.id !== teamId);
    } else if (name && logo) {
      // Only add if we have team info and it's not already there
      if (!currentTeams.find((t) => t.id === teamId)) {
        updatedTeams = [...currentTeams, { id: teamId, name, logo }];
      }
    }

    set({ favoriteTeamIds: updatedIds, favoriteTeams: updatedTeams });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedIds)).catch((e) => {
      if (__DEV__) console.error('Failed to persist favorite IDs:', e);
    });
    AsyncStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(updatedTeams)).catch((e) => {
      if (__DEV__) console.error('Failed to persist favorite teams:', e);
    });
  },

  isFavorite: (teamId: string) => {
    return get().favoriteTeamIds.includes(teamId);
  },

  getFavoriteTeam: (teamId: string) => {
    return get().favoriteTeams.find((t) => t.id === teamId);
  },

  loadFavorites: async () => {
    try {
      const [storedIds, storedTeams] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(TEAMS_STORAGE_KEY),
      ]);
      const ids = storedIds ? JSON.parse(storedIds) : [];
      const teams = storedTeams ? JSON.parse(storedTeams) : [];
      set({ favoriteTeamIds: ids, favoriteTeams: teams });
    } catch {
      // ignore
    }
  },
}));
