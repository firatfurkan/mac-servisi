import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export function useStandings(
  leagueId: string,
  season: string,
  enabled?: boolean,
  refetchInterval?: number | false,
  teamId?: string,
) {
  return useQuery({
    queryKey: ['standings', leagueId, season, teamId ?? ''],
    queryFn: () => apiService.getStandings(leagueId, season, teamId),
    enabled: enabled !== false,
    // 2 dakika: standings saatler içinde değişir; tab geçişlerinde gereksiz
    // API isteği atmaz, ama useFocusEffect manuel refetch'i yine de çalışır.
    staleTime: 2 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnMount: true,       // stale ise mount'ta fetch et (always → her zaman istek)
    refetchOnWindowFocus: false,
    refetchInterval: refetchInterval ?? false,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
  });
}
