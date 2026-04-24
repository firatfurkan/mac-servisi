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

      const FINISHED_STATUSES = new Set(['finished', 'ft', 'aet', 'pen']);
      const LIVE_STATUSES = new Set(['live', 'half_time']);
      const liveMap = new Map(liveMatches.map((m) => [m.id, m]));

      if (liveMatches.length === 0 && hasLive) {
        // Önceki veride canlı maç varsa ama artık yoksa → maçlar bitmiş demektir
        queryClient.invalidateQueries({ queryKey: ['standings'] });
      }

      // ── Her maç için CDN stale koruması + live merge ──────────────────────────
      // Date endpoint CDN'i gecikmiş olabilir: skor null veya statü eski.
      // Cache'deki (live sırasında gerçek zamanlı güncellenen) veri daha güvenilir.
      // Bu kontrol liveMatches.length > 0 veya 0 olmasından bağımsız çalışır.
      const result = matches.map((m) => {
        // 1) Live endpoint'ten güncel veri var mı?
        // API-Sports maç bittikten sonra 5-10 dk daha live endpoint'inde tutar,
        // bu sürede status "FT"/"finished" olur. FINISHED_STATUSES'ı da kabul ediyoruz
        // ki son skor + statü kaçmasın ve projeksiyon doğru çalışsın.
        const live = liveMap.get(m.id);
        const liveIsUsable = live && (
          LIVE_STATUSES.has(live.status) || FINISHED_STATUSES.has(live.status)
        );
        if (liveIsUsable) {
          return {
            ...m,
            minute: live!.minute,
            extra: live!.extra,
            homeScore: live!.homeScore,
            awayScore: live!.awayScore,
            status: live!.status,
          };
        }

        // 2) Date endpoint CDN gecikmeli mi? (skor null ama cache'de skor var)
        if (currentData) {
          const cached = currentData.find((p) => p.id === m.id);
          if (
            cached &&
            (m.homeScore == null || m.awayScore == null) &&
            (cached.homeScore != null || cached.awayScore != null)
          ) {
            // Date endpoint'i henüz skoru yazmamış → cache'deki veriyi koru
            return cached;
          }
        }

        return m;
      });

      // Önceki fetch'te canlı olan maçlardan biri artık bitmişse standings'i yenile
      if (currentData) {
        let anyFinished = false;
        for (const prev of currentData) {
          if (prev.status === 'live' || prev.status === 'half_time') {
            const updated = result.find((m) => m.id === prev.id);
            if (updated && FINISHED_STATUSES.has(updated.status)) {
              anyFinished = true;
              break;
            }
          }
        }
        if (anyFinished) {
          queryClient.invalidateQueries({ queryKey: ['standings'] });
        }
      }

      return result;
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
