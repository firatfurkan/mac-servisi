import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api";

export function usePlayerFixtures(teamId: string, playerId: number, season: number) {
  return useQuery({
    queryKey: ["playerFixtures", teamId, playerId, season],
    queryFn: () => apiService.getPlayerFixtures(teamId, playerId, season),
    staleTime: 10 * 60 * 1000,
    enabled: !!teamId && playerId > 0 && season > 0,
  });
}
