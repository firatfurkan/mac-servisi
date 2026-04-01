import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export function useTeamSquad(teamId: string, season: string, enabled = true) {
  return useQuery({
    queryKey: ['teamSquad', teamId, season],
    queryFn: () => apiService.getTeamSquad(teamId, season),
    staleTime: 10 * 60 * 1000,
    enabled: !!teamId && enabled,
  });
}
