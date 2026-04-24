import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export function useTopAssists(leagueId: string, season: string) {
  return useQuery({
    queryKey: ['topAssists', leagueId, season],
    queryFn: () => apiService.getTopAssists(leagueId, season),
    staleTime: 5 * 60 * 1000,
  });
}
