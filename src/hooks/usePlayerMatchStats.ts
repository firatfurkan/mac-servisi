import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api";
import { PlayerMatchStats } from "../types";

export const usePlayerMatchStats = (fixtureId: string, enabled = true) => {
  return useQuery<PlayerMatchStats[]>({
    queryKey: ["playerMatchStats", fixtureId],
    queryFn: () => apiService.getPlayerMatchStats(fixtureId),
    enabled: !!fixtureId && enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};
