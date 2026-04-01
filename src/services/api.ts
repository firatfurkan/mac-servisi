import {
  CommentaryItem,
  Injury,
  LineupPlayer,
  Match,
  MatchDetail,
  MatchEvent,
  MatchLineup,
  MatchPrediction,
  MatchStatistics,
  PlayerMatchStats,
  PlayerProfile,
  PlayerSeason,
  PlayerTransfer,
  SquadPlayer,
  StandingRow,
  Team,
  TeamLineup,
  TopScorer,
  Transfer,
} from "../types";
import { USE_MOCK, mockApiService } from "./mockData";
import { translateTeamName, translateLeagueName, translateCountry } from "../utils/matchUtils";
import i18n from "../i18n/config";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

const headers = {
  "x-apisports-key": API_KEY!,
};

async function safeFetch(url: string, options?: RequestInit): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function transformFixture(f: any): Match {
  const broadcast: string[] = [];
  if (f.fixture.coverage?.tv) {
    broadcast.push(...(Array.isArray(f.fixture.coverage.tv) ? f.fixture.coverage.tv : [f.fixture.coverage.tv]));
  }

  const assistantReferees = [];
  if (f.fixture.referees?.secondRef?.name) {
    assistantReferees.push({ name: f.fixture.referees.secondRef.name });
  }
  if (f.fixture.referees?.thirdRef?.name) {
    assistantReferees.push({ name: f.fixture.referees.thirdRef.name });
  }
  if (f.fixture.referees?.fourthRef?.name) {
    assistantReferees.push({ name: f.fixture.referees.fourthRef.name });
  }
  if (Array.isArray(f.fixture.referees) && f.fixture.referees.length > 1) {
    for (let i = 1; i < f.fixture.referees.length; i++) {
      const ref = f.fixture.referees[i];
      if (ref?.name) assistantReferees.push({ name: ref.name });
    }
  }

  const lang = i18n.language;
  const homeName = translateTeamName(f.teams.home.name, lang);
  const awayName = translateTeamName(f.teams.away.name, lang);
  return {
    id: String(f.fixture.id),
    homeTeam: {
      id: String(f.teams.home.id),
      name: homeName,
      shortName: homeName.substring(0, 3).toUpperCase(),
      logoUrl: f.teams.home.logo,
    },
    awayTeam: {
      id: String(f.teams.away.id),
      name: awayName,
      shortName: awayName.substring(0, 3).toUpperCase(),
      logoUrl: f.teams.away.logo,
    },
    homeScore: f.goals.home,
    awayScore: f.goals.away,
    status: mapStatus(f.fixture.status.short),
    minute: f.fixture.status.elapsed ?? undefined,
    extra: f.fixture.status.extra != null ? Number(f.fixture.status.extra) : undefined,
    startTime: f.fixture.date,
    league: {
      id: String(f.league.id),
      name: translateLeagueName(f.league.name, lang),
      country: translateCountry(f.league.country, lang),
      logoUrl: f.league.logo,
      season: String(f.league.season),
      round: f.league.round ?? undefined,
    },
    venue: f.fixture.venue
      ? { id: Number(f.fixture.venue.id), name: f.fixture.venue.name, city: f.fixture.venue.city }
      : undefined,
    referee: f.fixture.referee ?? undefined,
    assistantReferees: assistantReferees.length > 0 ? assistantReferees : undefined,
    broadcast: broadcast.length > 0 ? broadcast : undefined,
    winner: f.teams?.home?.winner === true ? "home"
          : f.teams?.away?.winner === true ? "away"
          : null,
    scorePenalty: (f.score?.penalty?.home != null || f.score?.penalty?.away != null)
      ? { home: f.score.penalty.home ?? null, away: f.score.penalty.away ?? null }
      : undefined,
  };
}

function mapStatus(short: string): Match["status"] {
  const map: Record<string, Match["status"]> = {
    TBD: "not_started",
    NS: "not_started",
    "1H": "live",
    HT: "half_time",
    "2H": "live",
    ET: "live",
    BT: "live",
    P: "live",
    SUSP: "postponed",
    INT: "live",
    FT: "finished",
    AET: "finished",
    PEN: "finished",
    PST: "postponed",
    CANC: "cancelled",
    ABD: "cancelled",
    AWD: "finished",
    WO: "finished",
    LIVE: "live",
  };
  return map[short] ?? "not_started";
}

function transformEvents(events: any[], homeTeamId?: number): MatchEvent[] {
  return events
    .filter((e) => {
      // Sadece bilinen event tipleri dahil edilir
      const known = ["Goal", "Card", "subst"];
      if (!known.includes(e.type)) return false;
      if (e.type === "Goal") {
        const detail = e.detail ?? "";
        // İptal edilen goller dahil edilmez
        if (detail === "Disallowed Goal") return false;
        // Missed Penalty: tümünü tut — shootout atışları EventTimeline'da
        // ayrı bölümde gösterilir, maç içi olanlar normal timeline'da kalır.
      }
      return true;
    })
    .map((e, i) => {
      const detail = e.detail ?? "";
      const isPenType = detail === "Penalty" || detail === "Missed Penalty";
      const comments = (e.comments ?? "").toLowerCase();
      const isShootout =
        e.type === "Goal" && isPenType &&
        (comments.includes("shootout") || comments.includes("penalty shootout") ||
         (e.time?.elapsed ?? 0) >= 120);
      return {
        id: String(i),
        minute: e.time?.elapsed ?? (isShootout ? 120 : 0),
        type: mapEventType(e.type, e.detail),
        team: homeTeamId ? (e.team.id === homeTeamId ? "home" : "away") : "home",
        player: e.player?.name ?? "",
        playerId: e.player?.id ?? undefined,
        assistPlayer: e.assist?.name ?? undefined,
        assistPlayerId: e.assist?.id ?? undefined,
        substitutePlayer:
          e.type === "subst" ? (e.assist?.name ?? undefined) : undefined,
        substitutePlayerId:
          e.type === "subst" ? (e.assist?.id ?? undefined) : undefined,
        isShootout,
      };
    });
}

function mapEventType(type: string, detail: string): MatchEvent["type"] {
  if (type === "Goal") {
    if (detail === "Own Goal") return "own_goal";
    if (detail === "Missed Penalty") return "missed_penalty";
    if (detail === "Penalty") return "penalty";
    return "goal";
  }
  if (type === "Card") {
    if (detail === "Yellow Card") return "yellow_card";
    return "red_card";
  }
  if (type === "subst") return "substitution";
  return null as any; // Bilinmeyen tipler filtrelenecek
}

function transformStats(stats: any[], matchId: string): MatchStatistics {
  const getStat = (team: any[], name: string): number => {
    const s = team.find((s: any) => s.type === name);
    return Number(s?.value ?? 0) || 0;
  };
  const homeStats = stats[0]?.statistics ?? [];
  const awayStats = stats[1]?.statistics ?? [];
  const homePoss = homeStats.find(
    (s: any) => s.type === "Ball Possession",
  )?.value;
  const awayPoss = awayStats.find(
    (s: any) => s.type === "Ball Possession",
  )?.value;

  const getXg = (teamStats: any[]): number => {
    const s = teamStats.find((s: any) =>
      s.type === "expected_goals" || s.type === "Expected Goals" || s.type === "xG"
    );
    return parseFloat(s?.value ?? 0) || 0;
  };
  const getPassPct = (teamStats: any[]): number => {
    const s = teamStats.find((s: any) => s.type === "Passes %");
    return parseInt(s?.value ?? 0) || 0;
  };

  return {
    matchId,
    home: {
      possession: parseInt(homePoss) || 50,
      xg: getXg(homeStats),
      shots: getStat(homeStats, "Total Shots"),
      shotsOnTarget: getStat(homeStats, "Shots on Goal"),
      shotsOffTarget: getStat(homeStats, "Shots off Goal"),
      blockedShots: getStat(homeStats, "Blocked Shots"),
      shotsInsideBox: getStat(homeStats, "Shots insidebox"),
      shotsOutsideBox: getStat(homeStats, "Shots outsidebox"),
      totalPasses: getStat(homeStats, "Total passes"),
      accuratePasses: getStat(homeStats, "Passes accurate"),
      passAccuracy: getPassPct(homeStats),
      corners: getStat(homeStats, "Corner Kicks"),
      offsides: getStat(homeStats, "Offsides"),
      fouls: getStat(homeStats, "Fouls"),
      yellowCards: getStat(homeStats, "Yellow Cards"),
      redCards: getStat(homeStats, "Red Cards"),
      saves: getStat(homeStats, "Goalkeeper Saves"),
    },
    away: {
      possession: parseInt(awayPoss) || 50,
      xg: getXg(awayStats),
      shots: getStat(awayStats, "Total Shots"),
      shotsOnTarget: getStat(awayStats, "Shots on Goal"),
      shotsOffTarget: getStat(awayStats, "Shots off Goal"),
      blockedShots: getStat(awayStats, "Blocked Shots"),
      shotsInsideBox: getStat(awayStats, "Shots insidebox"),
      shotsOutsideBox: getStat(awayStats, "Shots outsidebox"),
      totalPasses: getStat(awayStats, "Total passes"),
      accuratePasses: getStat(awayStats, "Passes accurate"),
      passAccuracy: getPassPct(awayStats),
      corners: getStat(awayStats, "Corner Kicks"),
      offsides: getStat(awayStats, "Offsides"),
      fouls: getStat(awayStats, "Fouls"),
      yellowCards: getStat(awayStats, "Yellow Cards"),
      redCards: getStat(awayStats, "Red Cards"),
      saves: getStat(awayStats, "Goalkeeper Saves"),
    },
  };
}

export const apiService = {
  async getMatchesByDate(date: string): Promise<Match[]> {
    if (USE_MOCK) return mockApiService.getMatchesByDate(date);
    const data = await safeFetch(
      `${BASE_URL}/fixtures?date=${date}&timezone=Europe/Istanbul`,
      { headers },
    );
    if (!data.response) return [];
    return data.response.map(transformFixture);
  },

  async getLiveMatches(): Promise<Match[]> {
    if (USE_MOCK) return [];
    const data = await safeFetch(
      `${BASE_URL}/fixtures?live=all&timezone=Europe/Istanbul`,
      { headers },
    );
    if (!data.response) return [];
    return data.response.map(transformFixture);
  },

  async getMatchById(fixtureId: string): Promise<Match | null> {
    if (USE_MOCK) return null;
    const data = await safeFetch(
      `${BASE_URL}/fixtures?id=${fixtureId}&timezone=Europe/Istanbul`,
      { headers },
    );
    if (!data.response?.[0]) return null;
    return transformFixture(data.response[0]);
  },

  async getTeamMatches(teamId: string, season: string): Promise<Match[]> {
    if (USE_MOCK) return mockApiService.getTeamMatches(teamId, season);
    // For national teams: season can be empty to fetch all seasons
    const url = season
      ? `${BASE_URL}/fixtures?team=${teamId}&season=${season}&timezone=Europe/Istanbul`
      : `${BASE_URL}/fixtures?team=${teamId}&timezone=Europe/Istanbul`;
    const data = await safeFetch(url, { headers });
    if (!data.response) return [];
    return data.response.map(transformFixture);
  },

  async getH2H(team1Id: string, team2Id: string): Promise<Match[]> {
    if (USE_MOCK) return mockApiService.getH2H(team1Id, team2Id);
    const data = await safeFetch(
      `${BASE_URL}/fixtures/headtohead?h2h=${team1Id}-${team2Id}&last=10&timezone=Europe/Istanbul`,
      { headers },
    );
    if (!data.response) return [];
    return data.response.map(transformFixture);
  },

  async getMatchLineup(fixtureId: string): Promise<MatchLineup | null> {
    if (USE_MOCK) return mockApiService.getMatchLineup(fixtureId);

    const data = await safeFetch(
      `${BASE_URL}/fixtures/lineups?fixture=${fixtureId}`,
      { headers }
    );

    if (!data.response || data.response.length < 2) return null;

    // Coach null ise team endpoint'inden çek
    const fetchCoachName = async (teamId: number, inlineCoach: any): Promise<string> => {
      const name = inlineCoach?.name ?? inlineCoach?.lastname ?? "";
      if (name.trim()) return name;
      try {
        const coachData = await safeFetch(`${BASE_URL}/coachs?team=${teamId}`, { headers });
        const coaches: any[] = coachData.response ?? [];
        // Aktif antrenörü bul (career.end === null)
        for (const c of coaches) {
          const active = (c.career ?? []).find((career: any) => career.team?.id === teamId && career.end === null);
          if (active && c.name) return c.name;
        }
        // Aktif yoksa en son career girişini al
        if (coaches.length > 0 && coaches[0].name) return coaches[0].name;
      } catch {
        // sessizce yoksay
      }
      return "";
    };

    const transformTeam = (t: any, coachName: string): TeamLineup => ({
      team: { id: String(t.team.id), name: t.team.name, logoUrl: t.team.logo },
      formation: t.formation ?? "",
      coach: coachName,
      startXI: (t.startXI ?? []).map((p: any): LineupPlayer => ({
        id: p.player.id,
        name: p.player.name,
        number: p.player.number,
        pos: p.player.pos,
        grid: p.player.grid,
        captain: p.player.captain ?? false,
      })),
      substitutes: (t.substitutes ?? []).map((p: any): LineupPlayer => ({
        id: p.player.id,
        name: p.player.name,
        number: p.player.number,
        pos: p.player.pos,
        grid: p.player.grid,
        captain: p.player.captain ?? false,
      })),
    });

    const homeRaw = data.response[0];
    const awayRaw = data.response[1];

    // İki takım için coach fetch'i paralel yap
    const [homeCoach, awayCoach] = await Promise.all([
      fetchCoachName(homeRaw.team.id, homeRaw.coach),
      fetchCoachName(awayRaw.team.id, awayRaw.coach),
    ]);

    return {
      home: transformTeam(homeRaw, homeCoach),
      away: transformTeam(awayRaw, awayCoach),
    };
  },

  async getMatchDetail(id: string): Promise<MatchDetail> {
    if (USE_MOCK) return mockApiService.getMatchDetail(id);
    const [fixtureData, statsData, eventsData] = await Promise.all([
      safeFetch(`${BASE_URL}/fixtures?id=${id}&timezone=Europe/Istanbul`, { headers }),
      safeFetch(`${BASE_URL}/fixtures/statistics?fixture=${id}`, { headers }),
      safeFetch(`${BASE_URL}/fixtures/events?fixture=${id}`, { headers }),
    ]);

    if (!fixtureData.response?.[0]) throw new Error(`Match not found: ${id}`);
    const fixture = fixtureData.response[0];
    const match = transformFixture(fixture);

    const homeTeamId = fixture.teams.home.id;
    // Fixture inline events genellikle daha eksiksiz (shootout dahil).
    // Ayrı events endpoint shootout event'lerini içermeyebiliyor.
    // Hangisi daha çok event içeriyorsa onu kullan.
    const separateEvents: any[] = eventsData.response ?? [];
    const inlineEvents: any[] = fixture.events ?? [];
    const rawEvents = inlineEvents.length >= separateEvents.length
      ? inlineEvents
      : separateEvents;
    return {
      ...match,
      statistics: transformStats(statsData.response ?? [], id),
      events: transformEvents(rawEvents, homeTeamId),
    };
  },

  async getStandings(
    leagueId: string,
    season: string,
    teamId?: string,
  ): Promise<{ rows: StandingRow[]; groupName: string }> {
    if (USE_MOCK) {
      const rows = await mockApiService.getStandings(leagueId, season);
      return { rows, groupName: "" };
    }
    const data = await safeFetch(
      `${BASE_URL}/standings?league=${leagueId}&season=${season}`,
      { headers },
    );
    const allGroups: any[][] = data.response?.[0]?.league?.standings ?? [];
    if (!allGroups.length) return { rows: [], groupName: "" };

    // If multiple groups, pick the one containing teamId (for split leagues like TFF 2. Lig)
    let group = allGroups[0];
    if (teamId && allGroups.length > 1) {
      const found = allGroups.find((g) =>
        g.some((s: any) => String(s.team.id) === String(teamId)),
      );
      if (found) group = found;
    }

    // Only show groupName when there are genuinely multiple groups (e.g. TFF 2. Lig)
    const groupName: string = allGroups.length > 1 ? (group[0]?.group ?? "") : "";
    const rows = group.map(
      (s: any): StandingRow => ({
        rank: s.rank,
        team: {
          id: String(s.team.id),
          name: s.team.name,
          shortName: s.team.name.substring(0, 3).toUpperCase(),
          logoUrl: s.team.logo,
        },
        played: s.all.played,
        won: s.all.win,
        drawn: s.all.draw,
        lost: s.all.lose,
        goalsFor: s.all.goals.for,
        goalsAgainst: s.all.goals.against,
        goalDifference: s.goalsDiff,
        points: s.points,
        form: s.form ?? "",
      }),
    );
    return { rows, groupName };
  },

  async getTopScorers(leagueId: string, season: string): Promise<TopScorer[]> {
    if (USE_MOCK) return mockApiService.getTopScorers(leagueId, season);
    const data = await safeFetch(
      `${BASE_URL}/players/topscorers?league=${leagueId}&season=${season}`,
      { headers },
    );
    if (!data.response) return [];
    return data.response.map(
      (p: any, i: number): TopScorer => ({
        rank: i + 1,
        player: {
          id: p.player.id,
          name: p.player.name,
          photo: p.player.photo,
        },
        team: {
          id: String(p.statistics[0]?.team?.id ?? ""),
          name: p.statistics[0]?.team?.name ?? "",
          shortName: (p.statistics[0]?.team?.name ?? "")
            .substring(0, 3)
            .toUpperCase(),
          logoUrl: p.statistics[0]?.team?.logo ?? "",
        },
        goals: p.statistics[0]?.goals?.total ?? 0,
        assists: p.statistics[0]?.goals?.assists ?? 0,
        matches: p.statistics[0]?.games?.appearences ?? 0,
      }),
    );
  },

  async getPlayerProfile(playerId: number): Promise<PlayerProfile | null> {
    if (USE_MOCK) return mockApiService.getPlayerProfile(playerId);
    // Futbol sezonu Temmuz'da başlar; Temmuz öncesiyse aktif sezon bir önceki takvim yılıdır.
    const _now = new Date();
    const currentYear = _now.getMonth() >= 6 ? _now.getFullYear() : _now.getFullYear() - 1;

    // Step 1: Fetch current season to get player info
    const firstData = await safeFetch(
      `${BASE_URL}/players?id=${playerId}&season=${currentYear}`,
      { headers },
    );
    let firstP = firstData.response?.[0];
    if (!firstP) {
      const prevData = await safeFetch(
        `${BASE_URL}/players?id=${playerId}&season=${currentYear - 1}`,
        { headers },
      );
      firstP = prevData.response?.[0];
    }
    if (!firstP) return null;

    const profile = {
      id: firstP.player.id,
      name: firstP.player.firstname && firstP.player.lastname
        ? `${firstP.player.firstname} ${firstP.player.lastname}`.trim()
        : firstP.player.name,
      firstname: firstP.player.firstname ?? "",
      lastname: firstP.player.lastname ?? "",
      photo: firstP.player.photo,
      age: firstP.player.age ?? 0,
      nationality: firstP.player.nationality ?? "",
      height: firstP.player.height ?? "",
      weight: firstP.player.weight ?? "",
      birth: {
        date: firstP.player.birth?.date,
        place: firstP.player.birth?.place,
        country: firstP.player.birth?.country,
      },
      number: firstP.statistics?.[0]?.games?.number ?? undefined,
      position: firstP.statistics?.[0]?.games?.position ?? "",
    };

    // ── Step 2 + Step 3: Transfer ve kariyer sezonlarını PARALel çek ──
    const birthYear = currentYear - (profile.age || 25);
    const careerStartYear = Math.max(birthYear + 16, 2010);
    const allSeasons: number[] = [];
    for (let y = currentYear; y >= careerStartYear; y--) allSeasons.push(y);

    const [transferData, seasonResponses] = await Promise.all([
      // ── Transferler (Step 2) ──
      safeFetch(`${BASE_URL}/transfers?player=${playerId}`, { headers })
        .then((tData) => {
          const raw = tData.response?.[0]?.transfers ?? [];
          const mapped: PlayerTransfer[] = raw.map((t: any) => ({
            date: t.date ?? "",
            teamIn: {
              id: String(t.teams?.in?.id ?? ""),
              name: t.teams?.in?.name ?? "",
              logo: t.teams?.in?.logo ?? "",
            },
            teamOut: {
              id: String(t.teams?.out?.id ?? ""),
              name: t.teams?.out?.name ?? "",
              logo: t.teams?.out?.logo ?? "",
            },
            type: t.type ?? "",
          }));
          let cTeam = "";
          let cLogo = "";
          if (mapped.length > 0) {
            const sorted = [...mapped].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            );
            cTeam = sorted[0].teamIn.name;
            cLogo = sorted[0].teamIn.logo;
          }
          return { transfers: mapped, currentTeam: cTeam, currentTeamLogo: cLogo };
        })
        .catch(() => ({ transfers: [] as PlayerTransfer[], currentTeam: "", currentTeamLogo: "" })),

      // ── Tüm kariyer sezonları (Step 3) — tek Promise.all, delay yok ──
      Promise.all(
        allSeasons.map((season) =>
          safeFetch(`${BASE_URL}/players?id=${playerId}&season=${season}`, { headers })
            .then((d) => ({ season, data: d.response?.[0] }))
            .catch(() => ({ season, data: undefined as any })),
        ),
      ),
    ]);

    let { transfers, currentTeam, currentTeamLogo } = transferData;

    // ── Sezon verilerini birleştir (orijinal filtreleme mantığı aynen korunuyor) ──
    const results: PlayerSeason[] = [];
    for (const { season, data: p } of seasonResponses) {
        if (!p) continue;
        for (const stat of p.statistics ?? []) {
          // 0 maçlık kayıtları atla
          const apps = stat.games?.appearences;
          if (!apps || apps === 0) continue;
          // Takım adı yoksa bu satırı atla (boş isimle kariyer satırı oluşmasın)
          if (!stat.team?.name) continue;
          // Kulüp hazırlık maçlarını atla — sadece resmi lig/kupa/Avrupa maçları
          // API bazen type alanını undefined gönderiyor, league.name ile de kontrol et
          // NOT: Milli takım "Friendlies" verileri korunur (gerçek A Milli maçlarıdır)
          const leagueName = (stat.league?.name ?? '').toLowerCase();
          const leagueType = (stat.league?.type ?? '').toLowerCase();
          const isFriendlyClub = leagueName.includes('friendlies clubs') || leagueType === 'friendly';
          if (isFriendlyClub) continue;
          // API bazen farklı sezon verisini karıştırarak gönderir.
          // stat.league.season ile talep edilen season yılı tam eşleşmiyorsa atla.
          const statSeason = stat.league?.season;
          // API'den gelen sezon bilgisi yoksa veya talep edilen yılla eşleşmiyorsa atla
          if (!statSeason || Number(statSeason) !== season) continue;
          results.push({
            season: String(statSeason),
            team: {
              id: String(stat.team?.id ?? ""),
              name: stat.team?.name ?? "",
              shortName: (stat.team?.name ?? "").substring(0, 3).toUpperCase(),
              logoUrl: stat.team?.logo ?? "",
            },
            leagueId: String(stat.league?.id ?? ""),
            leagueName: stat.league?.name ?? "",
            leagueCountry: stat.league?.country ?? "",
            leagueType: stat.league?.type ?? "",
            matches: stat.games?.appearences ?? 0,
            starts: stat.games?.lineups ?? 0,
            minutes: stat.games?.minutes ?? 0,
            goals: stat.goals?.total ?? 0,
            assists: stat.goals?.assists ?? 0,
            yellowCards: stat.cards?.yellow ?? 0,
            redCards: stat.cards?.red ?? 0,
            rating: stat.games?.rating
              ? parseFloat(stat.games.rating).toFixed(1)
              : "-",
          });
        }
      }

    // Step 3b: Gerçek tekrarları tekilleştir.
    // API bazen aynı takım + aynı lig + aynı sezon için birden fazla satır döndürür
    // (bonservis sahibi + kiralık kulüp çakışması gibi). Aynı üçlü için en çok dakikayı tut.
    // NOT: farklı takımlar için ayrı satırlar korunur (sezon ortası transfer senaryosu).
    const leagueDedupeMap = new Map<string, PlayerSeason>();
    for (const entry of results) {
      const k = `${entry.season}-${entry.leagueId}-${entry.team.id}`;
      const prev = leagueDedupeMap.get(k);
      if (!prev || (entry.minutes ?? 0) > (prev.minutes ?? 0)) {
        leagueDedupeMap.set(k, entry);
      }
    }
    results.length = 0;
    results.push(...Array.from(leagueDedupeMap.values()));

    // teamJoinedAt: takım ID → oyuncunun o takıma katıldığı timestamp (sıralama için)
    const teamJoinedAt = new Map<string, number>();

    // Step 4: Transfer timeline ile yanlış takım istatistiklerini filtrele.
    // API bazen başka takım/sezon verisini oyuncunun istatistiklerine karıştırır
    // (örn. GS verisinin Uğurcan'ın 2022 sezonuna eklenmesi).
    // Transfer timeline'dan her takımın hangi dönemde geçerli olduğunu çıkarıp filtrele.
    //
    // Step 3b artık season-leagueId-teamId key kullandığı için farklı takımlara ait
    // tüm girişler ayrı tutulur; Step 4 sadece timeline'a uymayan takımları kaldırır.
    if (transfers.length > 0) {
      const sortedTransfers = [...transfers].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      const FAR_FUTURE = new Date(2100, 0, 1).getTime();
      const VERY_OLD   = new Date(2000, 0, 1).getTime();

      // Timeline: her transfer dönemi için {from, to, teamId}
      const timeline: { from: number; to: number; teamId: string }[] = [];
      timeline.push({
        from: VERY_OLD,
        to: new Date(sortedTransfers[0].date).getTime(),
        teamId: sortedTransfers[0].teamOut.id,
      });
      for (let i = 0; i < sortedTransfers.length; i++) {
        const start = new Date(sortedTransfers[i].date).getTime();
        const end   = i + 1 < sortedTransfers.length
          ? new Date(sortedTransfers[i + 1].date).getTime()
          : FAR_FUTURE;
        timeline.push({ from: start, to: end, teamId: sortedTransfers[i].teamIn.id });
      }

      // Transfer geçmişindeki tüm kulüp ID'lerini topla.
      // Bu ID'lerin dışındaki takımlar (milli takımlar) transfer listesinde
      // yer almaz — filtre bypass edilmeli.
      const transferTeamIds = new Set<string>();
      for (const tr of sortedTransfers) {
        transferTeamIds.add(String(tr.teamIn.id));
        transferTeamIds.add(String(tr.teamOut.id));
      }

      // Tüm sezonlar için: bu takım bu sezon dönemine denk geliyor mu?
      const validResults = results.filter(entry => {
        const teamId     = entry.team.id;
        // Milli takımlar transfer geçmişinde görünmez → doğrudan kabul et
        if (!transferTeamIds.has(teamId)) return true;
        const seasonYear = Number(entry.season);
        // Mevcut sezon: transfer API gecikmeli güncellenir (yeni transferler henüz kaydedilmemiş olabilir).
        // İstatistik API daha hızlı güncellenir — mevcut sezon verisini filtresiz kabul et.
        if (seasonYear === currentYear) return true;
        // Sezonun resmi başlangıcı Ağustos ortası civarıdır.
        // Transfer penceresi kapanmadan ayrılan oyuncuların hayalet verilerini
        // engellemek için Ağustos 1 kullanıyoruz.
        const seasonStart = new Date(seasonYear, 7, 1).getTime(); // Ağustos 1
        const seasonEnd   = new Date(seasonYear + 1, 5, 30).getTime(); // Haziran 30

        return timeline.some(
          span => span.teamId === teamId &&
                  span.from < seasonEnd &&
                  span.to   > seasonStart,
        );
      });
      results.length = 0;
      results.push(...validResults);

      // teamJoinedAt: her takım için oyuncunun en son katılma tarihi (sıralama için)
      for (const span of timeline) {
        const existing = teamJoinedAt.get(span.teamId);
        if (existing === undefined || span.from > existing) {
          teamJoinedAt.set(span.teamId, span.from);
        }
      }
    }

    // Sıralama: önce en yeni sezon, aynı sezonda en son katılan takım önce
    results.sort((a, b) => {
      const seasonDiff = Number(b.season) - Number(a.season);
      if (seasonDiff !== 0) return seasonDiff;
      // Aynı sezon: transfer tarihine göre (daha geç katılan → daha üstte)
      const aJoin = teamJoinedAt.get(a.team.id) ?? 0;
      const bJoin = teamJoinedAt.get(b.team.id) ?? 0;
      return bJoin - aJoin;
    });

    // Mevcut takım: istatistik verisi her zaman transfer verisinden daha güncel.
    // En yeni sezondaki takımı kullan — transfer API gecikmeli güncellenir.
    if (results.length > 0) {
      currentTeam = results[0].team.name;
      currentTeamLogo = results[0].team.logoUrl;
    }

    return {
      ...profile,
      currentTeam,
      currentTeamLogo,
      transfers,
      seasons: results,
    };
  },

  async getPlayerFixtures(teamId: string, playerId: number, season: number): Promise<Match[]> {
    // /fixtures?player= bu API planında desteklenmiyor.
    // Takımın fikstürlerini çekip oyuncunun süre aldığı maçları filtreliyoruz.
    const data = await safeFetch(
      `${BASE_URL}/fixtures?team=${teamId}&season=${season}`,
      { headers },
    );
    if (!Array.isArray(data?.response)) return [];

    const PLAYED = new Set(["finished", "live", "half_time"]);
    const played: Match[] = (data.response as any[])
      .map((f) => { try { return transformFixture(f); } catch { return null; } })
      .filter((m): m is Match => !!m && PLAYED.has(m.status));

    // Her maçta oyuncunun süre alıp almadığını kontrol et (5'li batch)
    const participated: Match[] = [];
    const batchSize = 5;
    for (let i = 0; i < played.length; i += batchSize) {
      if (i > 0) await new Promise((r) => setTimeout(r, 400));
      const batch = played.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (match) => {
          try {
            const res = await safeFetch(
              `${BASE_URL}/fixtures/players?fixture=${match.id}&team=${teamId}`,
              { headers },
            );
            const players: any[] = res?.response?.[0]?.players ?? [];
            const found = players.find(
              (p: any) => Number(p.player?.id) === playerId && (p.statistics?.[0]?.games?.minutes ?? 0) > 0,
            );
            if (found) participated.push(match);
          } catch {
            // API hatası → maçı dahil etme
          }
        }),
      );
    }

    return participated.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );
  },

  async getTeamSquad(teamId: string, season: string): Promise<SquadPlayer[]> {
    if (USE_MOCK) return mockApiService.getTeamSquad(teamId, season);

    // ── Step 1: Get current squad roster from /players/squads ──
    let squadRoster: Map<number, { number: number | null; position: string; photo: string; age: number; name: string }> | null = null;
    try {
      const squadData = await safeFetch(
        `${BASE_URL}/players/squads?team=${teamId}`,
        { headers },
      );
      const rosterPlayers: any[] = squadData.response?.[0]?.players ?? [];
      if (rosterPlayers.length > 0) {
        squadRoster = new Map();
        for (const p of rosterPlayers) {
          squadRoster.set(Number(p.id), {
            number: p.number ?? null,
            position: p.position ?? "",
            photo: p.photo ?? "",
            age: p.age ?? 0,
            name: p.name ?? "",
          });
        }
      }
    } catch (err) {
      if (__DEV__) console.warn("[Squad] /players/squads failed, will show all season players:", err);
    }

    // ── Step 2: Get season stats from /players?team&season (all pages) ──
    const statsMap = new Map<number, any>();
    let currentPage = 1;
    let totalPages = 1;

    do {
      const url = `${BASE_URL}/players?team=${teamId}&season=${season}&page=${currentPage}`;
      let pageData: any;
      try {
        pageData = await safeFetch(url, { headers });
      } catch (err) {
        if (__DEV__) console.error(`[Squad] Page ${currentPage} error:`, err);
        break;
      }

      if (!pageData.response || pageData.response.length === 0) break;

      for (const p of pageData.response) {
        const playerId = Number(p.player.id);
        if (statsMap.has(playerId)) {
          // duplicate player ID — keep most recent (overwrite)
        }
        statsMap.set(playerId, p);
      }

      if (currentPage === 1) {
        totalPages = pageData.paging?.total ?? 1;
      }
      currentPage++;
    } while (currentPage <= Math.min(totalPages, 6));


    // ── Step 3: Build final list ──
    // If we have a roster → use roster as base, enrich with stats
    // If roster failed → use stats players directly
    const playerIds: number[] = squadRoster
      ? Array.from(squadRoster.keys())
      : Array.from(statsMap.keys());

    return playerIds.map((playerId): SquadPlayer => {
      const rosterInfo = squadRoster?.get(playerId);
      const statsEntry = statsMap.get(playerId);

      // Deduplicate by league: if the same league appears multiple times,
      // keep only the entry with the most minutes played
      // (handles cases like loan + parent club duplicates)
      let allStats: any[] = statsEntry?.statistics ?? [];
      const leagueDedupeMap = new Map<string, any>();
      for (const stat of allStats) {
        const leagueId = String(stat.league?.id ?? "");
        const prev = leagueDedupeMap.get(leagueId);
        const prevMinutes = prev?.games?.minutes ?? 0;
        const currMinutes = stat.games?.minutes ?? 0;
        if (!prev || currMinutes > prevMinutes) {
          leagueDedupeMap.set(leagueId, stat);
        }
      }
      allStats = Array.from(leagueDedupeMap.values());

      // Sum numeric fields across all competition entries
      const sum = (fn: (s: any) => number) =>
        allStats.reduce((acc, s) => acc + (fn(s) ?? 0), 0);

      // Weighted average rating
      const ratingEntries = allStats.filter(
        (s) => s.games?.rating != null && s.games.rating !== "",
      );
      const avgRating =
        ratingEntries.length > 0
          ? (() => {
              const totalApps = ratingEntries.reduce(
                (acc, s) => acc + (s.games.appearences ?? 1),
                0,
              );
              const weightedSum = ratingEntries.reduce(
                (acc, s) =>
                  acc + parseFloat(s.games.rating) * (s.games.appearences ?? 1),
                0,
              );
              return totalApps > 0
                ? (weightedSum / totalApps).toFixed(1)
                : "-";
            })()
          : "-";

      // Pass accuracy: weighted average
      const passEntries = allStats.filter((s) => s.passes?.accuracy != null);
      const passAccuracy =
        passEntries.length > 0
          ? (() => {
              const totalApps = passEntries.reduce(
                (acc, s) => acc + (s.games?.appearences ?? 1),
                0,
              );
              const weightedSum = passEntries.reduce(
                (acc, s) =>
                  acc + (s.passes.accuracy ?? 0) * (s.games?.appearences ?? 1),
                0,
              );
              return totalApps > 0 ? Math.round(weightedSum / totalApps) : null;
            })()
          : null;

      const stat0 = allStats[0]; // first entry for position/number fallback
      const playerInfo = statsEntry?.player;

      // Build full name from firstname + lastname; fall back to player.name or roster name
      const resolvedName =
        playerInfo?.firstname && playerInfo?.lastname
          ? `${playerInfo.firstname} ${playerInfo.lastname}`.trim()
          : playerInfo?.name ?? rosterInfo?.name ?? "Unknown";
      // Nationality from stats; fall back to roster nationality field if available
      const resolvedNationality =
        playerInfo?.nationality ||
        (rosterInfo as any)?.nationality ||
        "";

      return {
        id: playerId,
        name: resolvedName,
        photo: playerInfo?.photo ?? rosterInfo?.photo ?? "",
        age: playerInfo?.age ?? rosterInfo?.age ?? 0,
        number: rosterInfo?.number ?? stat0?.games?.number ?? null,
        position: rosterInfo?.position ?? stat0?.games?.position ?? "",
        nationality: resolvedNationality,
        matches: sum((s) => s.games?.appearences),
        starts: sum((s) => s.games?.lineups),
        goals: sum((s) => s.goals?.total),
        assists: sum((s) => s.goals?.assists),
        yellowCards: sum((s) => s.cards?.yellow),
        redCards: sum((s) => s.cards?.red),
        rating: avgRating,
        minutes: sum((s) => s.games?.minutes),
        passAccuracy,
        goalsConceded: sum((s) => s.goals?.conceded),
        saves: sum((s) => s.goals?.saves),
        cleanSheets: sum((s) => s.games?.cleansheets),
      };
    });
  },

  async searchTeams(query: string): Promise<Team[]> {
    if (USE_MOCK) return mockApiService.searchTeams(query);
    const data = await safeFetch(
      `${BASE_URL}/teams?search=${encodeURIComponent(query)}`,
      { headers },
    );
    if (!data.response) return [];
    return data.response.map(
      (t: any): Team => ({
        id: String(t.team.id),
        name: t.team.name,
        shortName: t.team.name.substring(0, 3).toUpperCase(),
        logoUrl: t.team.logo,
      }),
    );
  },

  async searchPlayers(query: string, season = 2025): Promise<{ id: number; name: string; photo: string; team: string; teamLogo: string }[]> {
    // API "team veya league gerekli" hatası veriyor — büyük liglerde paralel ara
    const SEARCH_LEAGUES = [39, 140, 135, 78, 61, 2, 3, 203];
    const enc = encodeURIComponent(query);
    const results = await Promise.all(
      SEARCH_LEAGUES.map((lid) =>
        safeFetch(`${BASE_URL}/players?search=${enc}&league=${lid}&season=${season}`, { headers })
          .then((d) => (Array.isArray(d?.response) ? d.response : []))
          .catch(() => [])
      )
    );
    // Birleştir, id'ye göre tekrarları filtrele
    const seen = new Set<number>();
    const merged: { id: number; name: string; photo: string; team: string; teamLogo: string }[] = [];
    for (const page of results) {
      for (const r of page) {
        const id: number = r?.player?.id;
        if (id && !seen.has(id)) {
          seen.add(id);
          merged.push({
            id,
            name: r.player.name,
            photo: r.player.photo ?? "",
            team: r.statistics?.[0]?.team?.name ?? "",
            teamLogo: r.statistics?.[0]?.team?.logo ?? "",
          });
        }
      }
    }
    return merged.slice(0, 10);
  },

  async getMatchPredictions(
    fixtureId: string,
  ): Promise<MatchPrediction | null> {
    if (USE_MOCK) return mockApiService.getMatchPredictions(fixtureId);
    const data = await safeFetch(
      `${BASE_URL}/predictions?fixture=${fixtureId}`,
      {
        headers,
      },
    );
    if (!data.response?.[0]) return null;
    const p = data.response[0];
    const predictedWinner = p.predictions?.winner;
    let winner: "home" | "away" | null = null;
    if (predictedWinner?.name) {
      if (predictedWinner.id != null) {
        // ID karşılaştırması: tip uyumsuzluğuna karşı String() kullan
        winner = String(predictedWinner.id) === String(p.teams.home.id) ? "home" : "away";
      } else {
        // ID null → takım ismiyle karşılaştır (milli takım maçları için)
        winner = predictedWinner.name === p.teams.home.name ? "home" : "away";
      }
    }
    return {
      winner,
      probabilities: {
        home: parseInt(p.predictions.percent?.home) || 0,
        draw: parseInt(p.predictions.percent?.draw) || 0,
        away: parseInt(p.predictions.percent?.away) || 0,
      },
      advice: p.predictions.advice,
      h2h: p.predictions.h2h,
      homeTeamName: p.teams?.home?.name ?? "",
      awayTeamName: p.teams?.away?.name ?? "",
      comparison: {
        form: { home: p.comparison?.form?.home ?? "50%", away: p.comparison?.form?.away ?? "50%" },
        att: { home: p.comparison?.att?.home ?? "50%", away: p.comparison?.att?.away ?? "50%" },
        def: { home: p.comparison?.def?.home ?? "50%", away: p.comparison?.def?.away ?? "50%" },
      },
    };
  },

  async getMatchCommentary(fixtureId: string): Promise<CommentaryItem[]> {
    if (USE_MOCK) return mockApiService.getMatchCommentary(fixtureId);
    const data = await safeFetch(
      `${BASE_URL}/fixtures/events?fixture=${fixtureId}`,
      { headers },
    );
    if (!data.response) return [];
    return data.response.map((e: any, i: number) => ({
      id: String(i),
      minute: e.time.elapsed,
      text: `${e.player.name || ""} - ${e.detail || e.type}`,
      type: e.type === "Goal" ? "goal" : e.type === "Card" ? "card" : "general",
    }));
  },

  async getMatchInjuries(fixtureId: string): Promise<Injury[]> {
    if (USE_MOCK) return mockApiService.getMatchInjuries(fixtureId);
    const data = await safeFetch(
      `${BASE_URL}/fixtures/injuries?fixture=${fixtureId}`,
      {
        headers,
      },
    );
    if (!data.response) return [];
    return data.response.map((i: any) => ({
      player: {
        id: i.player.id,
        name: i.player.name,
        photo: i.player.photo,
        type: i.player.type,
        reason: i.player.reason,
      },
      team: {
        id: i.team.id,
        name: i.team.name,
        logo: i.team.logo,
      },
      fixture: i.fixture.id,
      league: i.league,
    }));
  },

  async getTeamTransfers(teamId: string): Promise<Transfer[]> {
    if (USE_MOCK) return mockApiService.getTeamTransfers(teamId);
    const data = await safeFetch(`${BASE_URL}/transfers?team=${teamId}`, {
      headers,
    });
    if (!data.response) return [];
    // API-Sports returns: response[].player + response[].transfers[]
    const results: Transfer[] = [];
    for (const item of data.response) {
      if (!item.transfers || !Array.isArray(item.transfers)) continue;
      for (const tr of item.transfers) {
        results.push({
          player: item.player,
          update: tr.date ?? "",
          type: tr.type ?? "N/A",
          teams: tr.teams ?? {
            in: { id: 0, name: "", logo: "" },
            out: { id: 0, name: "", logo: "" },
          },
        });
      }
    }
    return results;
  },

  async getTeamDetail(teamId: string): Promise<Team | null> {
    if (USE_MOCK) return mockApiService.getTeamDetail(teamId);
    const data = await safeFetch(`${BASE_URL}/teams?id=${teamId}`, {
      headers,
    });
    if (!data.response || data.response.length === 0) return null;
    const t = data.response[0];
    return {
      id: String(t.team.id),
      name: t.team.name,
      shortName: t.team.code || t.team.name.substring(0, 3).toUpperCase(),
      logoUrl: t.team.logo,
      national: t.team.national ?? false,
      venue: t.venue
        ? {
            id: t.venue.id,
            name: t.venue.name,
            address: t.venue.address,
            city: t.venue.city,
            capacity: t.venue.capacity,
            surface: t.venue.surface,
            image: t.venue.image,
          }
        : undefined,
    };
  },

  async getTeamLeagues(teamId: string, season: number): Promise<{ id: string; name: string; type: string; logoUrl: string }[]> {
    const data = await safeFetch(
      `${BASE_URL}/leagues?team=${teamId}&season=${season}`,
      { headers },
    );
    if (!Array.isArray(data?.response)) return [];
    return data.response.map((r: any) => ({
      id: String(r.league.id),
      name: r.league.name,
      type: r.league.type, // "League" veya "Cup"
      logoUrl: r.league.logo,
    }));
  },

  async getLeagueFixturesByRound(leagueId: string, season: string, round: string): Promise<Match[]> {
    if (USE_MOCK) return [];
    const data = await safeFetch(
      `${BASE_URL}/fixtures?league=${leagueId}&season=${season}&round=${encodeURIComponent(round)}&timezone=Europe/Istanbul`,
      { headers },
    );
    if (!data.response) return [];
    return data.response.map(transformFixture);
  },

  async getTeamLastHomeMatches(teamId: string): Promise<Match[]> {
    if (USE_MOCK) return [];
    const data = await safeFetch(
      `${BASE_URL}/fixtures?team=${teamId}&last=20&timezone=Europe/Istanbul`,
      { headers },
    );
    if (!data.response) return [];
    const allMatches = data.response.map(transformFixture);
    // Filter to only home matches (where this team is the home team)
    return allMatches
      .filter((m: Match) => m.homeTeam.id === teamId)
      .slice(0, 10);
  },

  async getTeamLastAwayMatches(teamId: string): Promise<Match[]> {
    if (USE_MOCK) return [];
    const data = await safeFetch(
      `${BASE_URL}/fixtures?team=${teamId}&last=20&timezone=Europe/Istanbul`,
      { headers },
    );
    if (!data.response) return [];
    const allMatches = data.response.map(transformFixture);
    // Filter to only away matches (where this team is the away team)
    return allMatches
      .filter((m: Match) => m.awayTeam.id === teamId)
      .slice(0, 10);
  },

  async getPlayerMatchStats(fixtureId: string): Promise<PlayerMatchStats[]> {
    if (USE_MOCK) return [];
    const data = await safeFetch(
      `${BASE_URL}/fixtures/players?fixture=${fixtureId}`,
      { headers },
    );
    if (!data.response) return [];

    const results: PlayerMatchStats[] = [];

    for (const teamData of data.response) {
      if (!teamData.players) continue;

      for (const playerData of teamData.players) {
        const p = playerData.player;
        const stats = playerData.statistics?.[0];
        if (!stats) continue;

        // Build full name from firstname + lastname (p.name is often abbreviated)
        const fullName = p.firstname && p.lastname
          ? `${p.firstname} ${p.lastname}`.trim()
          : p.name;

        results.push({
          playerId: p.id,
          playerName: fullName,
          nationality: p.nationality ?? undefined,
          rating: stats.games?.rating ? parseFloat(stats.games.rating) : 0,
          position: stats.games?.position || "",
          minutes: stats.games?.minutes ?? 0,
          // Passes — fixtures/players'da passes.accuracy isabetli pas SAYISIDIR (yüzde değil)
          passesTotal: stats.passes?.total || 0,
          passesAccurate: parseInt(stats.passes?.accuracy || "0") || 0,
          // Goals & assists
          goals: stats.goals?.total || 0,
          assists: stats.goals?.assists || 0,
          // Goalkeeper
          saves: stats.goals?.saves || 0,
          goalsConceded: stats.goals?.conceded || 0,
          longBalls: stats.passes?.long || 0,
          // Outfield
          shots: stats.shots?.total || 0,
          shotsOnTarget: stats.shots?.on || 0,
          duelsWon: stats.duels?.won || 0,
          duelsTotal: stats.duels?.total || 0,
          aerialWon: stats.aerials?.won || 0,
          aerialTotal: stats.aerials?.total || 0,
        });
      }
    }
    return results;
  },
};
