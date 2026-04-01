import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export function useTopScorers(leagueId: string, season: string) {
  return useQuery({
    queryKey: ['topScorers', leagueId, season],
    queryFn: () => apiService.getTopScorers(leagueId, season),
    staleTime: 5 * 60 * 1000,
  });
}
