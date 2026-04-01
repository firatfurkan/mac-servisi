import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api";

export interface TeamLeague {
  id: string;
  name: string;
  type: string;
  logoUrl: string;
}

export const useTeamLeagues = (teamId: string, season: number) => {
  return useQuery<TeamLeague[]>({
    queryKey: ["teamLeagues", teamId, season],
    queryFn: () => apiService.getTeamLeagues(teamId, season),
    enabled: !!teamId,
    staleTime: 1000 * 60 * 60, // 1 saat — sezon boyunca değişmez
  });
};
