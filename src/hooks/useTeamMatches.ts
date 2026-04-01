import { useQuery, keepPreviousData } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Match } from '../types';
import { apiService } from '../services/api';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_SEASON = String(CURRENT_YEAR - 1);
export const NATIONAL_MIN_SEASON = 2013;

function isHistorical(season: string) {
  return season !== CURRENT_SEASON && parseInt(season) < parseInt(CURRENT_SEASON);
}

async function fetchWithCache(teamId: string, season: string): Promise<Match[]> {
  const cacheKey = `@asist_team_${teamId}_${season}`;

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

  if (isHistorical(season) && data.length > 0) {
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    } catch {}
  }

  return data;
}

// Normal club teams — single season
export function useTeamMatches(teamId: string, season: string) {
  return useQuery({
    queryKey: ['teamMatches', teamId, season],
    queryFn: () => fetchWithCache(teamId, season),
    staleTime: isHistorical(season) ? Infinity : 5 * 60 * 1000,
    enabled: !!teamId && !!season,
  });
}

// National teams — multiple seasons merged, newest-first
// Returns { data, isLoadingInitial, isFetchingMore }
export function useNationalTeamMatches(teamId: string, seasons: string[]) {
  const query = useQuery({
    queryKey: ['nationalTeamMatches', teamId, seasons.join(',')],
    queryFn: async () => {
      const results = await Promise.allSettled(
        seasons.map(s => fetchWithCache(teamId, s))
      );
      const all: Match[] = [];
      for (const r of results) {
        if (r.status === 'fulfilled') all.push(...r.value);
      }
      const seen = new Set<string>();
      return all
        .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!teamId && seasons.length > 0,
    // Keep previous data visible while new season loads — no full-screen wipe
    placeholderData: keepPreviousData,
  });

  return {
    ...query,
    // True only on the very first load (no data yet)
    isLoadingInitial: query.isLoading && !query.data,
    // True when adding more seasons (data already exists)
    isFetchingMore: query.isFetching && !!query.data,
  };
}
