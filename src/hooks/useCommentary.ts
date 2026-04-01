import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api";

export function useCommentary(matchId: string, matchStatus?: string, enabled = true) {
  return useQuery({
    queryKey: ["match-commentary", matchId],
    queryFn: () => apiService.getMatchCommentary(matchId),
    refetchInterval: () => {
      if (matchStatus === 'live' || matchStatus === 'half_time') return 60_000;
      return false;
    },
    staleTime: 30_000,
    enabled: !!matchId && enabled,
  });
}
