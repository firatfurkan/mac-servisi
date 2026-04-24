import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Match } from '../types';
import { getMatchResultForTeam } from '../utils/matchUtils';

export function useLeagueRecentFixtures(leagueId: string, season: string) {
  return useQuery({
    queryKey: ['leagueRecentFixtures', leagueId, season],
    queryFn: () => apiService.getLeagueRecentFixtures(leagueId, season, 60),
    enabled: !!leagueId && !!season,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Son N bitmiş maçtan takım bazında form stringi üretir.
 * Takım sayfasındaki FormStrip ile aynı mantık — getMatchResultForTeam kullanır.
 * Dönen string en eskiden en yeniye sıralı ("WLDWW"), display kodu .reverse() ile gösterir.
 */
export function buildTeamFormMap(fixtures: Match[]): Map<string, string> {
  // Önce tüm bitmiş maçları en yeniden en eskiye sırala (startTime kesin kriter)
  const finished = fixtures
    .filter(m => m.status === 'finished' && m.homeScore != null && m.awayScore != null)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const teamMatches = new Map<string, Match[]>();
  for (const match of finished) {
    const hId = String(match.homeTeam.id);
    const aId = String(match.awayTeam.id);
    if (!teamMatches.has(hId)) teamMatches.set(hId, []);
    if (!teamMatches.has(aId)) teamMatches.set(aId, []);
    teamMatches.get(hId)!.push(match);
    teamMatches.get(aId)!.push(match);
  }

  const formMap = new Map<string, string>();
  for (const [teamId, matches] of teamMatches) {
    // matches zaten en yeniden en eskiye sıralı; ilk 5 = en güncel 5 maç
    // Display kodu .slice(-5).reverse() ile gösteriyor → string en eskiden en yeniye olmalı
    const last5 = matches.slice(0, 5).reverse();
    formMap.set(teamId, last5.map(m => getMatchResultForTeam(m, teamId) ?? 'D').join(''));
  }

  return formMap;
}
