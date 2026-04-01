import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api";
import { Team } from "../types";

export const useTeamDetail = (teamId: string) => {
  return useQuery<Team | null>({
    queryKey: ["teamDetail", teamId],
    queryFn: () => apiService.getTeamDetail(teamId),
    enabled: !!teamId,
  });
};
