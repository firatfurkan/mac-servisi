import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api";
import { Transfer } from "../types";

export const useTransfers = (teamId: string, enabled = true) => {
  return useQuery<Transfer[]>({
    queryKey: ["transfers", teamId],
    queryFn: () => apiService.getTeamTransfers(teamId),
    enabled: !!teamId && enabled,
    staleTime: 30 * 60 * 1000, // 30 min - transfers don't change often
  });
};
