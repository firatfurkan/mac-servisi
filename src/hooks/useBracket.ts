import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export function useBracket(leagueId: string, season: string) {
  return useQuery({
    queryKey: ['bracket', leagueId, season],
    queryFn: () => apiService.getBracket(leagueId, season),
    // Play-off ligleri (206, 1007, 204, 205): short stale + gc times so
    // mis-labeled rounds get corrected quickly on refetch.
    staleTime: ['206', '1007', '204', '205'].includes(leagueId) ? 60_000 : 60 * 60 * 1000,
    gcTime:    ['206', '1007', '204', '205'].includes(leagueId) ? 90_000 : 60 * 60 * 1000,
    refetchOnMount: 'always' as const,
    enabled: !!leagueId && !!season,
  });
}
