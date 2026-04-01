import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export function useTeamLastHomeMatches(teamId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['team-last-home-matches', teamId],
    queryFn: () => apiService.getTeamLastHomeMatches(teamId),
    staleTime: 30 * 60 * 1000,
    enabled: enabled && !!teamId,
  });
}

export function useTeamLastAwayMatches(teamId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['team-last-away-matches', teamId],
    queryFn: () => apiService.getTeamLastAwayMatches(teamId),
    staleTime: 30 * 60 * 1000,
    enabled: enabled && !!teamId,
  });
}
