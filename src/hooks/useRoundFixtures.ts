import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export function useRoundFixtures(
  leagueId: string,
  season: string,
  round: string,
  enabled?: boolean,
) {
  return useQuery({
    queryKey: ['roundFixtures', leagueId, season, round],
    queryFn: () => apiService.getLeagueFixturesByRound(leagueId, season, round),
    staleTime: 5 * 60_000,
    enabled: (enabled ?? true) && !!leagueId && !!round,
  });
}
