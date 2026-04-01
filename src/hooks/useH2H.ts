import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export function useH2H(team1Id: string, team2Id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['h2h', team1Id, team2Id],
    queryFn: () => apiService.getH2H(team1Id, team2Id),
    staleTime: 30 * 60 * 1000,
    enabled: enabled && !!team1Id && !!team2Id,
  });
}
