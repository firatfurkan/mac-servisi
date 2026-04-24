import { Match, StandingRow } from "../types";

// Statuses that carry a score we can project
const FINISHED_STATUSES = new Set(["finished", "ft", "aet", "pen"]);
const LIVE_STATUSES     = new Set(["live", "half_time"]);

/**
 * "Regular Season - 28" → 28, parse edilemezse null döner.
 */
function parseRoundNumber(round?: string): number | null {
  if (!round) return null;
  const m = round.match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Bu maçı projeksiyon kapsamına almalı mıyız?
 * Canlı veya biten, skoru belli maçları yakalarız.
 */
export function isProjectable(match: Match): boolean {
  return (
    (LIVE_STATUSES.has(match.status) || FINISHED_STATUSES.has(match.status)) &&
    match.homeScore != null &&
    match.awayScore != null
  );
}

/**
 * Verilen maçları puan tablosuna yansıt (projeksiyon).
 *
 * API-Sports standings endpoint'i maç bittikten 30 dk – 2 saat sonra güncellenir.
 * Bu gecikmeyi kullanıcıdan gizlemek için canlı/yeni biten maçların sonucunu
 * tabloyu kendi hesaplamamızla ekleriz.
 *
 * alreadyCounted koruması (maxPlayed + roundNumber):
 *   played >= maxPlayed VE played >= roundNumber → bu maç API'ye işlenmiş, atla.
 *   played < maxPlayed → erteleme maçı istisnası, roundNumber göz ardı edilir.
 */
export function applyProjections(
  rows: StandingRow[],
  matches: Match[],
): { rows: StandingRow[]; isProjecting: boolean } {
  if (rows.length === 0 || matches.length === 0) {
    return { rows, isProjecting: false };
  }

  const projectableMatches = matches.filter(isProjectable);
  if (projectableMatches.length === 0) return { rows, isProjecting: false };

  const maxPlayed = Math.max(...rows.map((r) => r.played));

  let projected: StandingRow[] = rows.map((r) => ({
    ...r,
    team: { ...r.team, id: String(r.team.id) },
  }));
  let anyProjected = false;

  for (const match of projectableMatches) {
    const hId    = String(match.homeTeam.id);
    const aId    = String(match.awayTeam.id);
    const hScore = match.homeScore!;
    const aScore = match.awayScore!;

    const homeRow = projected.find((r) => String(r.team.id) === String(hId));
    const awayRow = projected.find((r) => String(r.team.id) === String(aId));
    if (!homeRow || !awayRow) continue;

    const roundNumber = parseRoundNumber(match.league?.round);
    const rn = roundNumber ?? 0;
    const homeAlreadyCounted = homeRow.played >= maxPlayed && homeRow.played >= rn;
    const awayAlreadyCounted = awayRow.played >= maxPlayed && awayRow.played >= rn;
    if (homeAlreadyCounted || awayAlreadyCounted) continue;

    const hPts = hScore > aScore ? 3 : hScore === aScore ? 1 : 0;
    const aPts = aScore > hScore ? 3 : hScore === aScore ? 1 : 0;

    const homeFormLetter = hPts === 3 ? 'W' : hPts === 1 ? 'D' : 'L';
    const awayFormLetter = aPts === 3 ? 'W' : aPts === 1 ? 'D' : 'L';

    projected = projected.map((row): StandingRow => {
      if (String(row.team.id) === String(hId)) {
        return {
          ...row,
          points:         row.points + hPts,
          played:         row.played + 1,
          won:            row.won   + (hPts === 3 ? 1 : 0),
          drawn:          row.drawn + (hPts === 1 ? 1 : 0),
          lost:           row.lost  + (hPts === 0 ? 1 : 0),
          goalsFor:       row.goalsFor     + hScore,
          goalsAgainst:   row.goalsAgainst + aScore,
          goalDifference: row.goalDifference + (hScore - aScore),
          form:           (row.form ?? '') + homeFormLetter,
        };
      }
      if (String(row.team.id) === String(aId)) {
        return {
          ...row,
          points:         row.points + aPts,
          played:         row.played + 1,
          won:            row.won   + (aPts === 3 ? 1 : 0),
          drawn:          row.drawn + (aPts === 1 ? 1 : 0),
          lost:           row.lost  + (aPts === 0 ? 1 : 0),
          goalsFor:       row.goalsFor     + aScore,
          goalsAgainst:   row.goalsAgainst + hScore,
          goalDifference: row.goalDifference + (aScore - hScore),
          form:           (row.form ?? '') + awayFormLetter,
        };
      }
      return row;
    });

    anyProjected = true;
  }

  if (!anyProjected) return { rows, isProjecting: false };

  const rankToDescription = new Map<number, string | undefined>();
  for (const row of rows) {
    rankToDescription.set(row.rank, row.description);
  }

  const sorted = projected
    .slice()
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor,
    )
    .map((row, idx) => ({
      ...row,
      rank:        idx + 1,
      description: rankToDescription.get(idx + 1) ?? row.description,
    }));

  return { rows: sorted, isProjecting: true };
}
