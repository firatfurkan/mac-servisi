import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Match } from '../types';
import { isNearEnd } from '../utils/matchUtils';

export function useMatchDetail(matchId: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['match', matchId],
    enabled: !!matchId,
    queryFn: async () => {
      const data = await apiService.getMatchDetail(matchId);

      // Anasayfa cache'sini senkronize et
      let statusChanged = false;
      queryClient.setQueriesData(
        { queryKey: ['matches'] },
        (oldMatches: Match[] | undefined) => {
          if (!oldMatches) return oldMatches;
          return oldMatches.map((m) => {
            if (m.id !== matchId) return m;
            if (m.status !== data.status) statusChanged = true;
            return {
              ...m,
              minute: data.minute,
              extra: data.extra,
              status: data.status,
              homeScore: data.homeScore,
              awayScore: data.awayScore,
            };
          });
        }
      );

      // Devre arası → canlı geçişinde anasayfayı zorla yenile
      if (statusChanged) {
        queryClient.invalidateQueries({ queryKey: ['matches'] });
      }

      return data;
    },
    refetchInterval: (query) => {
      const data = query.state.data as Match | undefined;
      if (!data) return false;
      if (isNearEnd(data)) return 10_000;
      if (data.status === 'half_time') return 15_000;
      return data.status === 'live' ? 30_000 : false;
    },
    staleTime: 0,
    gcTime: 5 * 60_000, // 5dk cache'de tut — geri dönünce anında göster
  });
}
