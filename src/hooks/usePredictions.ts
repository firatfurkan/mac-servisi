import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api";

export function usePredictions(matchId: string, enabled = true) {
  return useQuery({
    queryKey: ["match-predictions", matchId],
    queryFn: () => apiService.getMatchPredictions(matchId),
    staleTime: 60 * 60 * 1000,
    enabled: !!matchId && enabled,
  });
}
