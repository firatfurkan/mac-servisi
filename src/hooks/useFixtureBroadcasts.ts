import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api";

export const useFixtureBroadcasts = (fixtureId: string, enabled = true) => {
  return useQuery<string[]>({
    queryKey: ["broadcasts", fixtureId],
    queryFn: () => apiService.getFixtureBroadcasts(fixtureId),
    enabled: !!fixtureId && enabled,
    staleTime: 10 * 60 * 1000,
  });
};
