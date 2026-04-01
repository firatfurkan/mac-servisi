import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Match } from '../types';
import { isLive, isNearEnd } from '../utils/matchUtils';

export function useMatches(date: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['matches', date],
    queryFn: async () => {
      // Mevcut cache'de canlı maç varsa, live endpoint'i paralel çekerek
      // date endpoint'inin CDN cache'inden kaynaklanan gecikmeyi atlarız.
      const currentData = queryClient.getQueryData<Match[]>(['matches', date]);
      const hasLive = currentData?.some(
        (m) => m.status === 'live' || m.status === 'half_time',
      );

      const [matches, liveMatches] = await Promise.all([
        apiService.getMatchesByDate(date),
        hasLive
          ? apiService.getLiveMatches().catch(() => [] as Match[])
          : Promise.resolve<Match[]>([]),
      ]);

      if (liveMatches.length === 0) return matches;

      // Live endpoint'inden gelen verileri maç listesine yaz.
      // Sadece live/half_time olan maçlar güncellenir; bitmiş maçlara dokunulmaz.
      const liveMap = new Map(liveMatches.map((m) => [m.id, m]));
      const FINISHED_STATUSES = new Set(['finished', 'ft', 'aet', 'pen']);
      const LIVE_STATUSES = new Set(['live', 'half_time']);
      return matches.map((m) => {
        const live = liveMap.get(m.id);
        if (!live) return m;
        // Maç bitmiş (date endpoint) veya live status geçersizse dokunma
        if (FINISHED_STATUSES.has(m.status)) return m;
        if (!LIVE_STATUSES.has(live.status)) return m;
        return {
          ...m,
          minute: live.minute,
          extra: live.extra,
          homeScore: live.homeScore,
          awayScore: live.awayScore,
          status: live.status,
        };
      });
    },
    refetchInterval: (query) => {
      const data = query.state.data as Match[] | undefined;
      const hasNearEnd = data?.some(isNearEnd);
      const hasHalfTime = data?.some((m) => m.status === 'half_time');
      const hasLive = data?.some((m) => isLive(m));
      if (hasNearEnd) return 20_000;  // 85-90. dakika: 20sn
      if (hasHalfTime) return 30_000; // Devre arası: 30sn
      if (hasLive) return 60_000;     // Canlı maç: 60sn (getLiveMatches ile zaten anlık skor gelir)
      return 5 * 60_000;              // Canlı maç yok: 5dk
    },
    staleTime: 30_000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
