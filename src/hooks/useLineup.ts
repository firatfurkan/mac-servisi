import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export function useLineup(fixtureId: string, enabled = true) {
  return useQuery({
    queryKey: ['lineup', fixtureId],
    queryFn: () => apiService.getMatchLineup(fixtureId),
    staleTime: 10 * 60 * 1000,
    enabled: !!fixtureId && enabled,
  });
}
