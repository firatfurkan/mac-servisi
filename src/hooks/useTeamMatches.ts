import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Match } from '../types';
import { apiService } from '../services/api';

const CURRENT_YEAR = new Date().getFullYear();
// api-football seasons run Aug-May, so the "current" season started last year
const CURRENT_SEASON = String(CURRENT_YEAR - 1);

function isHistorical(season: string) {
  return season !== CURRENT_SEASON && parseInt(season) < parseInt(CURRENT_SEASON);
}

async function fetchWithCache(teamId: string, season: string): Promise<Match[]> {
  const cacheKey = `@asist_team_${teamId}_${season}`;

  // Historical seasons: use AsyncStorage cache permanently
  if (isHistorical(season)) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed: Match[] = JSON.parse(cached);
        if (parsed.length > 0) return parsed;
      }
    } catch {}
  }

  const data = await apiService.getTeamMatches(teamId, season);

  // Save historical seasons permanently — they never change
  if (isHistorical(season) && data.length > 0) {
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    } catch {}
  }

  return data;
}

export function useTeamMatches(teamId: string, season: string) {
  return useQuery({
    queryKey: ['teamMatches', teamId, season],
    queryFn: () => fetchWithCache(teamId, season),
    // Historical seasons: never re-fetch (cached forever)
    // Current season: refresh every 5 minutes
    staleTime: isHistorical(season) ? Infinity : 5 * 60 * 1000,
    enabled: !!teamId && !!season,
  });
}
