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
    staleTime: 5 * 60_000, // 5 minutes
    enabled: enabled !== undefined ? (enabled && !!leagueId) : !!leagueId,
    refetchInterval: refetchInterval ?? false,
  });
}
