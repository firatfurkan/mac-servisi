import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api";
import { Injury } from "../types";

export const useInjuries = (fixtureId: string, enabled = true) => {
  return useQuery<Injury[]>({
    queryKey: ["injuries", fixtureId],
    queryFn: () => apiService.getMatchInjuries(fixtureId),
    enabled: !!fixtureId && enabled,
    staleTime: 10 * 60 * 1000,
  });
};
