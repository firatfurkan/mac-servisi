import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export function usePlayerProfile(playerId: number) {
  return useQuery({
    queryKey: ['player', playerId],
    queryFn: () => apiService.getPlayerProfile(playerId),
    staleTime: 2 * 60 * 1000,
    enabled: playerId > 0,
  });
}
