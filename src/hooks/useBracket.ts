import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export function useBracket(leagueId: string, season: string) {
  return useQuery({
    queryKey: ['bracket', leagueId, season],
    queryFn: () => apiService.getBracket(leagueId, season),
    // Türkiye Kupası (206): keep staleTime short so mis-labeled rounds get
    // corrected quickly as the tournament progresses. Other cups: 1 hour.
    staleTime: leagueId === '206' ? 60_000 : 60 * 60 * 1000,
    refetchOnMount: true,
    enabled: !!leagueId && !!season,
  });
}
