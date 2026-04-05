import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export function useStandings(
  leagueId: string,
  season: string,
  enabled?: boolean,
  refetchInterval?: number | false,
  teamId?: string,
) {
  return useQuery({
    queryKey: ['standings', leagueId, season, teamId ?? ''],
    queryFn: () => apiService.getStandings(leagueId, season, teamId),
    staleTime: 5 * 60_000,      // 5 minutes — standings don't change that fast
    gcTime: 30 * 60_000,        // Keep in cache 30 min so stale data shows while loading
    refetchOnMount: 'always',   // Always fetch fresh when screen is opened
    refetchInterval: refetchInterval ?? false,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}
