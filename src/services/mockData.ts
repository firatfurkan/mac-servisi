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
    PlayerProfile,
    PlayerSeason,
    SquadPlayer,
    StandingRow,
    Team,
    TopScorer,
    Transfer,
} from "../types";

// ─── USE_MOCK flag ────────────────────────────────────────
// true = mock data kullan (API limit yok), false = gerçek API
export const USE_MOCK = false;

// ─── Leagues ──────────────────────────────────────────────
const SUPER_LIG = {
  id: "203",
  name: "Trendyol Süper Lig",
  country: "Turkey",
  logoUrl: "https://media.api-sports.io/football/leagues/203.png",
  season: "2025",
};
const PREMIER = {
  id: "39",
  name: "Premier League",
  country: "England",
  logoUrl: "https://media.api-sports.io/football/leagues/39.png",
  season: "2025",
};
const LA_LIGA = {
  id: "140",
  name: "La Liga",
  country: "Spain",
  logoUrl: "https://media.api-sports.io/football/leagues/140.png",
  season: "2025",
};
const BUNDESLIGA = {
  id: "78",
  name: "Bundesliga",
  country: "Germany",
  logoUrl: "https://media.api-sports.io/football/leagues/78.png",
  season: "2025",
};
const SERIE_A = {
  id: "135",
  name: "Serie A",
  country: "Italy",
  logoUrl: "https://media.api-sports.io/football/leagues/135.png",
  season: "2025",
};
const LIGUE_1 = {
  id: "61",
  name: "Ligue 1",
  country: "France",
  logoUrl: "https://media.api-sports.io/football/leagues/61.png",
  season: "2025",
};
const UCL = {
  id: "2",
  name: "UEFA Champions League",
  country: "World",
  logoUrl: "https://media.api-sports.io/football/leagues/2.png",
  season: "2025",
};

// ─── Team helper ──────────────────────────────────────────
const tm = (
  id: string,
  name: string,
  short?: string,
  coach?: any,
  venue?: any,
) => ({
  id,
  name,
  shortName: short || name.substring(0, 3).toUpperCase(),
  logoUrl: `https://media.api-sports.io/football/teams/${id}.png`,
  coach,
  venue,
});

// Turkey
const GS = tm(
  "645",
  "Galatasaray",
  "GS",
  {
    id: 1,
    name: "Okan Buruk",
    photo: "https://media.api-sports.io/football/coachs/1.png",
  },
  { id: 1, name: "RAMS Park", city: "Istanbul" },
);
const FB = tm(
  "611",
  "Fenerbahçe",
  "FB",
  {
    id: 2,
    name: "Jose Mourinho",
    photo: "https://media.api-sports.io/football/coachs/2.png",
  },
  { id: 2, name: "Ülker Stadyumu", city: "Istanbul" },
);
const BJK = tm(
  "549",
  "Beşiktaş",
  "BJK",
  {
    id: 3,
    name: "Giovanni van Bronckhorst",
    photo: "https://media.api-sports.io/football/coachs/3.png",
  },
  { id: 3, name: "Tüpraş Stadyumu", city: "Istanbul" },
);
const TS = tm("607", "Trabzonspor", "TS");
const BASAK = tm("1005", "Başakşehir", "IBB");
const ADANA = tm("3573", "Adana Demirspor", "ADS");
const ANTALYA = tm("3589", "Antalyaspor", "ANT");
const SIVAS = tm("3566", "Sivasspor", "SVS");
const KONYA = tm("3564", "Konyaspor", "KON");
const HATAY = tm("3575", "Hatayspor", "HAT");
const RIZESPOR = tm("3569", "Çaykur Rizespor", "RZE");
const SAMSUN = tm("3571", "Samsunspor", "SAM");

// England
const MCI = tm("50", "Manchester City", "MCI");
const LIV = tm("40", "Liverpool", "LIV");
const ARS = tm("42", "Arsenal", "ARS");
const MUN = tm("33", "Manchester United", "MUN");
const CHE = tm("49", "Chelsea", "CHE");
const TOT = tm("47", "Tottenham", "TOT");
const NEW = tm("34", "Newcastle", "NEW");
const AVL = tm("66", "Aston Villa", "AVL");

// Spain
const RMA = tm("541", "Real Madrid", "RMA");
const BAR = tm("529", "Barcelona", "BAR");
const ATM = tm("530", "Atletico Madrid", "ATM");
const SEV = tm("536", "Sevilla", "SEV");
const RSOC = tm("548", "Real Sociedad", "RSO");

// Germany
const BAY = tm("157", "Bayern Munich", "BAY");
const BVB = tm("165", "Borussia Dortmund", "BVB");
const LEV = tm("168", "Bayer Leverkusen", "LEV");
const RBL = tm("173", "RB Leipzig", "RBL");

// Italy
const JUV = tm("496", "Juventus", "JUV");
const MIL = tm("489", "AC Milan", "MIL");
const INT = tm("505", "Inter", "INT");
const NAP = tm("492", "Napoli", "NAP");
const ROM = tm("497", "AS Roma", "ROM");

// France
const PSG = tm("85", "Paris Saint Germain", "PSG");
const MAR = tm("81", "Marseille", "MAR");
const LYO = tm("80", "Lyon", "LYO");

// ─── All known teams ─────────────────────────────────────
const ALL_TEAMS = [
  GS,
  FB,
  BJK,
  TS,
  BASAK,
  ADANA,
  ANTALYA,
  SIVAS,
  KONYA,
  HATAY,
  RIZESPOR,
  SAMSUN,
  MCI,
  LIV,
  ARS,
  MUN,
  CHE,
  TOT,
  NEW,
  AVL,
  RMA,
  BAR,
  ATM,
  SEV,
  RSOC,
  BAY,
  BVB,
  LEV,
  RBL,
  JUV,
  MIL,
  INT,
  NAP,
  ROM,
  PSG,
  MAR,
  LYO,
];

// ─── Date helpers ─────────────────────────────────────────
function dateAt(dateStr: string, hour: number, min = 0): string {
  return `${dateStr}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00+03:00`;
}

// ─── Match templates per day ──────────────────────────────
// Use day-of-month to create variety — different leagues on different days
function generateMatchesForDate(dateStr: string): Match[] {
  // Parse YYYY-MM-DD safely without timezone issues
  const parts = dateStr.split("-");
  const day = parseInt(parts[2], 10);
  const isToday = dateStr === new Date().toISOString().split("T")[0];
  const at = (h: number, m = 0) => dateAt(dateStr, h, m);

  // Base matches pool — we'll select subsets
  const superLigMatches: Match[] = [
    {
      id: `${day}01`,
      homeTeam: GS,
      awayTeam: FB,
      homeScore: isToday ? 2 : 3,
      awayScore: isToday ? 1 : 1,
      status: isToday ? "live" : "finished",
      minute: isToday ? 90 : undefined,
      extra: isToday ? 2 : undefined,
      startTime: at(20, 0),
      league: SUPER_LIG,
      venue: { id: 1, name: "RAMS Park", city: "Istanbul" },
    },
    {
      id: `${day}02`,
      homeTeam: BJK,
      awayTeam: TS,
      homeScore: isToday ? 1 : 2,
      awayScore: isToday ? 0 : 0,
      status: isToday ? "half_time" : "finished",
      minute: isToday ? 45 : undefined,
      startTime: at(17, 0),
      league: SUPER_LIG,
    },
    {
      id: `${day}03`,
      homeTeam: BASAK,
      awayTeam: ANTALYA,
      homeScore: null,
      awayScore: null,
      status: "not_started",
      startTime: at(21, 0),
      league: SUPER_LIG,
    },
    {
      id: `${day}04`,
      homeTeam: KONYA,
      awayTeam: ADANA,
      homeScore: 1,
      awayScore: 1,
      status: "finished",
      startTime: at(14, 0),
      league: SUPER_LIG,
    },
    {
      id: `${day}05`,
      homeTeam: SAMSUN,
      awayTeam: RIZESPOR,
      homeScore: 2,
      awayScore: 0,
      status: "finished",
      startTime: at(16, 0),
      league: SUPER_LIG,
    },
    {
      id: `${day}06`,
      homeTeam: FB,
      awayTeam: BJK,
      homeScore: isToday ? 0 : 1,
      awayScore: isToday ? 0 : 2,
      status: isToday ? "live" : "finished",
      minute: isToday ? 34 : undefined,
      startTime: at(19, 0),
      league: SUPER_LIG,
    },
    {
      id: `${day}07`,
      homeTeam: TS,
      awayTeam: GS,
      homeScore: null,
      awayScore: null,
      status: "not_started",
      startTime: at(21, 45),
      league: SUPER_LIG,
    },
    {
      id: `${day}08`,
      homeTeam: HATAY,
      awayTeam: SIVAS,
      homeScore: 0,
      awayScore: 3,
      status: "finished",
      startTime: at(14, 0),
      league: SUPER_LIG,
    },
  ];

  const premierMatches: Match[] = [
    {
      id: `${day}11`,
      homeTeam: LIV,
      awayTeam: MCI,
      homeScore: isToday ? 1 : 2,
      awayScore: isToday ? 1 : 3,
      status: isToday ? "live" : "finished",
      minute: isToday ? 53 : undefined,
      startTime: at(18, 30),
      league: PREMIER,
    },
    {
      id: `${day}12`,
      homeTeam: ARS,
      awayTeam: CHE,
      homeScore: null,
      awayScore: null,
      status: "not_started",
      startTime: at(22, 0),
      league: PREMIER,
    },
    {
      id: `${day}13`,
      homeTeam: MUN,
      awayTeam: TOT,
      homeScore: 2,
      awayScore: 1,
      status: "finished",
      startTime: at(16, 0),
      league: PREMIER,
    },
    {
      id: `${day}14`,
      homeTeam: NEW,
      awayTeam: AVL,
      homeScore: 1,
      awayScore: 0,
      status: "finished",
      startTime: at(17, 0),
      league: PREMIER,
    },
  ];

  const laLigaMatches: Match[] = [
    {
      id: `${day}21`,
      homeTeam: RMA,
      awayTeam: BAR,
      homeScore: isToday ? null : 2,
      awayScore: isToday ? null : 1,
      status: isToday ? "not_started" : "finished",
      startTime: at(22, 0),
      league: LA_LIGA,
    },
    {
      id: `${day}22`,
      homeTeam: ATM,
      awayTeam: SEV,
      homeScore: 3,
      awayScore: 0,
      status: "finished",
      startTime: at(19, 0),
      league: LA_LIGA,
    },
    {
      id: `${day}23`,
      homeTeam: RSOC,
      awayTeam: RMA,
      homeScore: 1,
      awayScore: 4,
      status: "finished",
      startTime: at(16, 15),
      league: LA_LIGA,
    },
  ];

  const bundesligaMatches: Match[] = [
    {
      id: `${day}31`,
      homeTeam: BAY,
      awayTeam: BVB,
      homeScore: isToday ? 2 : 4,
      awayScore: isToday ? 2 : 1,
      status: isToday ? "live" : "finished",
      minute: isToday ? 78 : undefined,
      startTime: at(19, 30),
      league: BUNDESLIGA,
    },
    {
      id: `${day}32`,
      homeTeam: LEV,
      awayTeam: RBL,
      homeScore: 1,
      awayScore: 0,
      status: "finished",
      startTime: at(16, 30),
      league: BUNDESLIGA,
    },
  ];

  const serieAMatches: Match[] = [
    {
      id: `${day}41`,
      homeTeam: JUV,
      awayTeam: INT,
      homeScore: null,
      awayScore: null,
      status: "not_started",
      startTime: at(21, 45),
      league: SERIE_A,
    },
    {
      id: `${day}42`,
      homeTeam: MIL,
      awayTeam: NAP,
      homeScore: 1,
      awayScore: 2,
      status: "finished",
      startTime: at(18, 0),
      league: SERIE_A,
    },
    {
      id: `${day}43`,
      homeTeam: ROM,
      awayTeam: JUV,
      homeScore: 0,
      awayScore: 1,
      status: "finished",
      startTime: at(20, 45),
      league: SERIE_A,
    },
  ];

  const ligue1Matches: Match[] = [
    {
      id: `${day}51`,
      homeTeam: PSG,
      awayTeam: MAR,
      homeScore: isToday ? 3 : 2,
      awayScore: isToday ? 0 : 1,
      status: isToday ? "live" : "finished",
      minute: isToday ? 85 : undefined,
      startTime: at(22, 0),
      league: LIGUE_1,
    },
    {
      id: `${day}52`,
      homeTeam: LYO,
      awayTeam: PSG,
      homeScore: 0,
      awayScore: 2,
      status: "finished",
      startTime: at(21, 0),
      league: LIGUE_1,
    },
  ];

  const uclMatches: Match[] = [
    {
      id: `${day}61`,
      homeTeam: GS,
      awayTeam: BAY,
      homeScore: 1,
      awayScore: 1,
      status: "finished",
      startTime: at(22, 0),
      league: UCL,
    },
    {
      id: `${day}62`,
      homeTeam: BAR,
      awayTeam: LIV,
      homeScore: null,
      awayScore: null,
      status: "not_started",
      startTime: at(22, 0),
      league: UCL,
    },
    {
      id: `${day}63`,
      homeTeam: RMA,
      awayTeam: INT,
      homeScore: 3,
      awayScore: 0,
      status: "finished",
      startTime: at(22, 0),
      league: UCL,
    },
  ];

  // Rotate league combos by day to feel realistic
  const mod = day % 5;
  switch (mod) {
    case 0:
      return [
        ...superLigMatches.slice(0, 4),
        ...premierMatches.slice(0, 3),
        ...serieAMatches.slice(0, 2),
      ];
    case 1:
      return [
        ...superLigMatches.slice(2, 6),
        ...laLigaMatches,
        ...bundesligaMatches,
        ...ligue1Matches.slice(0, 1),
      ];
    case 2:
      return [...superLigMatches.slice(0, 3), ...premierMatches, ...uclMatches];
    case 3:
      return [
        ...superLigMatches.slice(4, 8),
        ...laLigaMatches.slice(0, 2),
        ...serieAMatches,
        ...ligue1Matches,
      ];
    default: // mod 4: full day
      return [
        ...superLigMatches.slice(0, 5),
        ...premierMatches.slice(0, 3),
        ...laLigaMatches.slice(0, 2),
        ...bundesligaMatches,
        ...serieAMatches.slice(0, 2),
        ...ligue1Matches.slice(0, 1),
      ];
  }
}

// ─── Match Detail ─────────────────────────────────────────
function generateMatchDetail(matchId: string): MatchDetail {
  const today = new Date().toISOString().split("T")[0];
  // Search multiple days to find the match
  const dates = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }

  let match: Match | undefined;
  for (const date of dates) {
    const matches = generateMatchesForDate(date);
    match = matches.find((m) => m.id === matchId);
    if (match) break;
  }

  if (!match) {
    match = generateMatchesForDate(today)[0];
  }

  const statistics: MatchStatistics = {
    matchId,
    home: {
      possession: 58,
      xg: 2.4,
      shots: 14,
      shotsOnTarget: 6,
      shotsOffTarget: 5,
      blockedShots: 3,
      shotsInsideBox: 10,
      shotsOutsideBox: 4,
      totalPasses: 487,
      accuratePasses: 420,
      passAccuracy: 86,
      corners: 7,
      offsides: 3,
      fouls: 11,
      yellowCards: 2,
      redCards: 0,
      saves: 4,
    },
    away: {
      possession: 42,
      xg: 1.8,
      shots: 9,
      shotsOnTarget: 3,
      shotsOffTarget: 4,
      blockedShots: 2,
      shotsInsideBox: 6,
      shotsOutsideBox: 3,
      totalPasses: 352,
      accuratePasses: 298,
      passAccuracy: 85,
      corners: 4,
      offsides: 1,
      fouls: 14,
      yellowCards: 3,
      redCards: 0,
      saves: 5,
    },
  };

  const events: MatchEvent[] = [];
  if (match.homeScore !== null && match.homeScore > 0) {
    events.push({
      id: "e1",
      minute: 23,
      type: "goal",
      team: "home",
      player: "Icardi",
      playerId: 11,
      assistPlayer: "Mertens",
      assistPlayerId: 8,
    });
    if (match.homeScore > 1)
      events.push({
        id: "e2",
        minute: 56,
        type: "goal",
        team: "home",
        player: "Ziyech",
        playerId: 2,
      });
    if (match.homeScore > 2)
      events.push({
        id: "e3",
        minute: 78,
        type: "penalty",
        team: "home",
        player: "Icardi",
        playerId: 11,
      });
  }
  if (match.awayScore !== null && match.awayScore > 0) {
    events.push({
      id: "e4",
      minute: 34,
      type: "goal",
      team: "away",
      player: "Tadic",
      playerId: 9,
      assistPlayer: "Fred",
      assistPlayerId: 6,
    });
    if (match.awayScore > 1)
      events.push({
        id: "e5",
        minute: 71,
        type: "goal",
        team: "away",
        player: "Dzeko",
        playerId: 11,
      });
  }
  events.push({
    id: "e6",
    minute: 40,
    type: "yellow_card",
    team: "home",
    player: "Torreira",
    playerId: 6,
  });
  events.push({
    id: "e7",
    minute: 62,
    type: "yellow_card",
    team: "away",
    player: "Szymanski",
    playerId: 8,
  });
  events.push({
    id: "e8",
    minute: 70,
    type: "substitution",
    team: "home",
    player: "Ziyech",
    playerId: 2,
    substitutePlayer: "Batshuayi",
    substitutePlayerId: 14,
  });
  events.push({
    id: "e9",
    minute: 81,
    type: "substitution",
    team: "away",
    player: "Tadic",
    playerId: 9,
    substitutePlayer: "Crespo",
    substitutePlayerId: 14,
  });

  events.sort((a, b) => a.minute - b.minute);

  return { ...match, statistics, events };
}

// ─── Team Squads (real player names) ──────────────────────
type Squad = {
  xi: LineupPlayer[];
  subs: LineupPlayer[];
  formation: string;
  coach: string;
};

const SQUADS: Record<string, Squad> = {
  "645": {
    // Galatasaray
    formation: "4-2-3-1",
    coach: "Okan Buruk",
    xi: [
      { id: 1, name: "Muslera", number: 1, pos: "G", grid: "1:1" },
      { id: 2, name: "Ziyech", number: 10, pos: "D", grid: "2:4" },
      { id: 3, name: "Davinson", number: 2, pos: "D", grid: "2:3" },
      { id: 4, name: "Nelsson", number: 4, pos: "D", grid: "2:2" },
      { id: 5, name: "Jelert", number: 13, pos: "D", grid: "2:1" },
      { id: 6, name: "Torreira", number: 34, pos: "M", grid: "3:1" },
      { id: 7, name: "Demirbay", number: 8, pos: "M", grid: "3:2" },
      { id: 8, name: "Mertens", number: 14, pos: "M", grid: "4:3" },
      { id: 9, name: "Yunus Akgün", number: 11, pos: "M", grid: "4:2" },
      { id: 10, name: "Barış Y.", number: 7, pos: "M", grid: "4:1" },
      { id: 11, name: "Icardi", number: 9, pos: "F", grid: "5:1" },
    ],
    subs: [
      { id: 12, name: "Günok", number: 67, pos: "G", grid: null },
      { id: 13, name: "Kaan Ayhan", number: 3, pos: "D", grid: null },
      { id: 14, name: "Batshuayi", number: 23, pos: "F", grid: null },
      { id: 15, name: "Kerem A.", number: 17, pos: "M", grid: null },
      { id: 16, name: "Berkan", number: 6, pos: "M", grid: null },
      { id: 17, name: "Sallai", number: 20, pos: "F", grid: null },
      { id: 18, name: "Boey", number: 22, pos: "D", grid: null },
    ],
  },
  "611": {
    // Fenerbahçe
    formation: "4-2-3-1",
    coach: "Jose Mourinho",
    xi: [
      { id: 1, name: "Livakovic", number: 1, pos: "G", grid: "1:1" },
      { id: 2, name: "Osayi", number: 20, pos: "D", grid: "2:4" },
      { id: 3, name: "Djiku", number: 4, pos: "D", grid: "2:3" },
      { id: 4, name: "Becao", number: 3, pos: "D", grid: "2:2" },
      { id: 5, name: "Oosterwolde", number: 37, pos: "D", grid: "2:1" },
      { id: 6, name: "Fred", number: 17, pos: "M", grid: "3:1" },
      { id: 7, name: "Amrabat", number: 6, pos: "M", grid: "3:2" },
      { id: 8, name: "Szymanski", number: 10, pos: "M", grid: "4:3" },
      { id: 9, name: "Tadic", number: 7, pos: "M", grid: "4:2" },
      { id: 10, name: "Saint-Maximin", number: 11, pos: "M", grid: "4:1" },
      { id: 11, name: "Dzeko", number: 9, pos: "F", grid: "5:1" },
    ],
    subs: [
      { id: 12, name: "İrfan Can", number: 99, pos: "G", grid: null },
      { id: 13, name: "Mert Müldür", number: 2, pos: "D", grid: null },
      { id: 14, name: "Crespo", number: 15, pos: "M", grid: null },
      { id: 15, name: "İsmail Y.", number: 23, pos: "M", grid: null },
      { id: 16, name: "Batshuayi", number: 23, pos: "F", grid: null },
      { id: 17, name: "En-Nesyri", number: 19, pos: "F", grid: null },
      { id: 18, name: "Krunic", number: 8, pos: "M", grid: null },
    ],
  },
  "549": {
    // Beşiktaş
    formation: "4-3-3",
    coach: "Giovanni van Bronckhorst",
    xi: [
      { id: 1, name: "Destanoğlu", number: 1, pos: "G", grid: "1:1" },
      { id: 2, name: "Masuaku", number: 23, pos: "D", grid: "2:4" },
      { id: 3, name: "Topçu", number: 4, pos: "D", grid: "2:3" },
      { id: 4, name: "Uduokhai", number: 6, pos: "D", grid: "2:2" },
      { id: 5, name: "Svensson", number: 3, pos: "D", grid: "2:1" },
      { id: 6, name: "Fernandes", number: 8, pos: "M", grid: "3:2" },
      { id: 7, name: "Salih Uçan", number: 17, pos: "M", grid: "3:1" },
      { id: 8, name: "Rafa Silva", number: 10, pos: "M", grid: "3:3" },
      { id: 9, name: "Muleka", number: 9, pos: "F", grid: "4:3" },
      { id: 10, name: "Immobile", number: 17, pos: "F", grid: "4:2" },
      { id: 11, name: "Rashica", number: 7, pos: "F", grid: "4:1" },
    ],
    subs: [
      { id: 12, name: "Günok", number: 67, pos: "G", grid: null },
      { id: 13, name: "Necip", number: 34, pos: "D", grid: null },
      { id: 14, name: "Can Keleş", number: 11, pos: "F", grid: null },
      { id: 15, name: "Gedson", number: 28, pos: "M", grid: null },
      { id: 16, name: "Al-Musrati", number: 5, pos: "M", grid: null },
      { id: 17, name: "Cenk Tosun", number: 23, pos: "F", grid: null },
      { id: 18, name: "Paulista", number: 15, pos: "D", grid: null },
    ],
  },
  "607": {
    // Trabzonspor
    formation: "4-2-3-1",
    coach: "Abdullah Avcı",
    xi: [
      { id: 1, name: "Uğurcan", number: 1, pos: "G", grid: "1:1" },
      { id: 2, name: "Meras", number: 3, pos: "D", grid: "2:4" },
      { id: 3, name: "Bardakçı", number: 44, pos: "D", grid: "2:3" },
      { id: 4, name: "Savic", number: 15, pos: "D", grid: "2:2" },
      { id: 5, name: "Denswil", number: 4, pos: "D", grid: "2:1" },
      { id: 6, name: "Bakasetas", number: 10, pos: "M", grid: "3:1" },
      { id: 7, name: "Orsic", number: 18, pos: "M", grid: "3:2" },
      { id: 8, name: "Trezeguet", number: 7, pos: "M", grid: "4:3" },
      { id: 9, name: "Visca", number: 11, pos: "M", grid: "4:2" },
      { id: 10, name: "Nwakaeme", number: 17, pos: "M", grid: "4:1" },
      { id: 11, name: "Cham", number: 9, pos: "F", grid: "5:1" },
    ],
    subs: [
      { id: 12, name: "Taha", number: 12, pos: "G", grid: null },
      { id: 13, name: "Türkmen", number: 5, pos: "D", grid: null },
      { id: 14, name: "Elmacı", number: 22, pos: "D", grid: null },
      { id: 15, name: "Siopis", number: 6, pos: "M", grid: null },
      { id: 16, name: "Tufan", number: 8, pos: "M", grid: null },
      { id: 17, name: "Djaniny", number: 99, pos: "F", grid: null },
      { id: 18, name: "Gomez", number: 23, pos: "F", grid: null },
    ],
  },
};

// Default squad for teams without specific data
function makeDefaultSquad(teamId: string): Squad {
  const names = [
    "Martinez",
    "Silva",
    "Pereira",
    "Santos",
    "Costa",
    "Oliveira",
    "Fernandes",
    "Rodrigues",
    "Almeida",
    "Ribeiro",
    "Souza",
  ];
  const subNames = [
    "Lopez",
    "Garcia",
    "Torres",
    "Moreno",
    "Ruiz",
    "Diaz",
    "Reyes",
  ];
  return {
    formation: "4-3-3",
    coach: "Coach",
    xi: names.map((name, i) => ({
      id: i + 1,
      name,
      number: i === 0 ? 1 : [2, 4, 5, 3, 6, 8, 10, 7, 9, 11][i - 1],
      pos: i === 0 ? "G" : i < 5 ? "D" : i < 8 ? "M" : "F",
      grid: [
        "1:1",
        "2:4",
        "2:3",
        "2:2",
        "2:1",
        "3:2",
        "3:1",
        "3:3",
        "4:3",
        "4:2",
        "4:1",
      ][i],
    })),
    subs: subNames.map((name, i) => ({
      id: 12 + i,
      name,
      number: 12 + i,
      pos: ["G", "D", "D", "M", "M", "F", "F"][i],
      grid: null,
    })),
  };
}

// ─── Lineup ───────────────────────────────────────────────
function generateLineup(matchId: string): MatchLineup | null {
  const today = new Date().toISOString().split("T")[0];
  const dates = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }

  let match: Match | undefined;
  for (const date of dates) {
    const matches = generateMatchesForDate(date);
    match = matches.find((m) => m.id === matchId);
    if (match) break;
  }
  if (!match) match = generateMatchesForDate(today)[0];

  const homeSquad =
    SQUADS[match.homeTeam.id] ?? makeDefaultSquad(match.homeTeam.id);
  const awaySquad =
    SQUADS[match.awayTeam.id] ?? makeDefaultSquad(match.awayTeam.id);

  return {
    home: {
      team: {
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        logoUrl: match.homeTeam.logoUrl,
      },
      formation: homeSquad.formation,
      coach: homeSquad.coach,
      startXI: homeSquad.xi,
      substitutes: homeSquad.subs,
    },
    away: {
      team: {
        id: match.awayTeam.id,
        name: match.awayTeam.name,
        logoUrl: match.awayTeam.logoUrl,
      },
      formation: awaySquad.formation,
      coach: awaySquad.coach,
      startXI: awaySquad.xi,
      substitutes: awaySquad.subs,
    },
  };
}

// ─── H2H ──────────────────────────────────────────────────
function generateH2H(team1Id: string, team2Id: string): Match[] {
  const team1 =
    ALL_TEAMS.find((t) => t.id === team1Id) ?? tm(team1Id, "Takım A");
  const team2 =
    ALL_TEAMS.find((t) => t.id === team2Id) ?? tm(team2Id, "Takım B");
  const results: [number, number][] = [
    [2, 1],
    [0, 0],
    [1, 3],
    [2, 2],
    [1, 0],
    [0, 1],
    [3, 2],
    [1, 1],
    [2, 0],
    [0, 2],
  ];

  return results.map((r, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (i * 3 + 1));
    const home = i % 2 === 0 ? team1 : team2;
    const away = i % 2 === 0 ? team2 : team1;
    return {
      id: `h2h_${i}`,
      homeTeam: home,
      awayTeam: away,
      homeScore: r[0],
      awayScore: r[1],
      status: "finished" as const,
      startTime: d.toISOString(),
      league: SUPER_LIG,
    };
  });
}

// ─── Team Matches ─────────────────────────────────────────
function generateTeamMatches(teamId: string, season: string): Match[] {
  const team = ALL_TEAMS.find((t) => t.id === teamId) ?? tm(teamId, "Takım");
  const opponents = ALL_TEAMS.filter((o) => o.id !== teamId).slice(0, 12);
  const scores: [number, number][] = [
    [2, 0],
    [1, 1],
    [3, 2],
    [0, 1],
    [2, 1],
    [1, 3],
    [0, 0],
    [4, 1],
    [1, 2],
    [2, 2],
    [3, 0],
    [1, 4],
  ];

  return opponents.map((opp, i) => {
    const d = new Date(`${season}-08-15`);
    d.setDate(d.getDate() + i * 14);
    const isHome = i % 2 === 0;
    return {
      id: `tm_${teamId}_${season}_${i}`,
      homeTeam: isHome ? team : opp,
      awayTeam: isHome ? opp : team,
      homeScore: scores[i][0],
      awayScore: scores[i][1],
      status: "finished" as const,
      startTime: d.toISOString(),
      league: SUPER_LIG,
    };
  });
}

// ─── Standings ────────────────────────────────────────────
const LEAGUE_STANDINGS: Record<
  string,
  { teams: (typeof GS)[]; forms: string[] }
> = {
  "203": {
    // Süper Lig
    teams: [
      GS,
      FB,
      BJK,
      TS,
      BASAK,
      ADANA,
      ANTALYA,
      SIVAS,
      KONYA,
      HATAY,
      RIZESPOR,
      SAMSUN,
    ],
    forms: [
      "WWWDW",
      "WWDWW",
      "WDWWL",
      "DWWLD",
      "WDWDL",
      "LDWDW",
      "DDWLD",
      "LLDWW",
      "DWLLD",
      "LLDWD",
      "DLLWD",
      "LLLDD",
    ],
  },
  "39": {
    // Premier League
    teams: [LIV, ARS, MCI, CHE, MUN, TOT, NEW, AVL],
    forms: [
      "WWWWW",
      "WWWDW",
      "WDWWL",
      "WWDLD",
      "DWWLD",
      "LDWWL",
      "WLDLD",
      "LLDWW",
    ],
  },
  "140": {
    // La Liga
    teams: [BAR, RMA, ATM, SEV, RSOC],
    forms: ["WWWWD", "WWDWW", "WDWWL", "DWLWD", "LDWDL"],
  },
  "78": {
    // Bundesliga
    teams: [BAY, BVB, LEV, RBL],
    forms: ["WWWWW", "WDWWL", "WWDLD", "DWLWD"],
  },
  "135": {
    // Serie A
    teams: [INT, NAP, JUV, MIL, ROM],
    forms: ["WWWDW", "WWWLD", "WDWWL", "DWWLD", "LDWDL"],
  },
  "61": {
    // Ligue 1
    teams: [PSG, MAR, LYO],
    forms: ["WWWWW", "WDWWL", "DWLWD"],
  },
};

function generateStandings(leagueId: string): StandingRow[] {
  const data = LEAGUE_STANDINGS[leagueId];
  if (!data) return [];

  return data.teams.map((team, i) => {
    const basePoints = 80 - i * 6 + Math.floor(Math.random() * 3);
    const played = 26 + Math.floor(Math.random() * 4);
    const won = Math.floor(basePoints / 3);
    const drawn = Math.min(played - won, Math.floor(Math.random() * 6) + 2);
    const lost = played - won - drawn;
    const gf = won * 2 + drawn + Math.floor(Math.random() * 10);
    const ga = lost * 2 + drawn + Math.floor(Math.random() * 5);
    return {
      rank: i + 1,
      team,
      played,
      won,
      drawn,
      lost,
      goalsFor: gf,
      goalsAgainst: ga,
      goalDifference: gf - ga,
      points: won * 3 + drawn,
      form: data.forms[i] ?? "DDDDD",
    };
  });
}

const MOCK_SCORERS: Record<
  string,
  {
    name: string;
    teamId: string;
    teamName: string;
    goals: number;
    assists: number;
  }[]
> = {
  "203": [
    {
      name: "Mauro Icardi",
      teamId: "645",
      teamName: "Galatasaray",
      goals: 18,
      assists: 5,
    },
    {
      name: "Edin Dzeko",
      teamId: "611",
      teamName: "Fenerbahçe",
      goals: 14,
      assists: 4,
    },
    {
      name: "Ciro Immobile",
      teamId: "549",
      teamName: "Beşiktaş",
      goals: 12,
      assists: 3,
    },
    {
      name: "Dries Mertens",
      teamId: "645",
      teamName: "Galatasaray",
      goals: 10,
      assists: 8,
    },
    {
      name: "Youssef En-Nesyri",
      teamId: "611",
      teamName: "Fenerbahçe",
      goals: 9,
      assists: 2,
    },
    {
      name: "Semih Kılıçsoy",
      teamId: "549",
      teamName: "Beşiktaş",
      goals: 8,
      assists: 3,
    },
    {
      name: "Muhammed Gümüşkaya",
      teamId: "645",
      teamName: "Galatasaray",
      goals: 7,
      assists: 5,
    },
    {
      name: "Simon Banza",
      teamId: "607",
      teamName: "Trabzonspor",
      goals: 7,
      assists: 2,
    },
    {
      name: "Fred",
      teamId: "611",
      teamName: "Fenerbahçe",
      goals: 6,
      assists: 7,
    },
    {
      name: "Cenk Tosun",
      teamId: "549",
      teamName: "Beşiktaş",
      goals: 6,
      assists: 1,
    },
  ],
};

// Default scorers for any league
const DEFAULT_SCORERS = [
  { name: "Player 1", teamId: "1", teamName: "Team A", goals: 15, assists: 6 },
  { name: "Player 2", teamId: "2", teamName: "Team B", goals: 12, assists: 4 },
  { name: "Player 3", teamId: "3", teamName: "Team C", goals: 10, assists: 3 },
  { name: "Player 4", teamId: "4", teamName: "Team D", goals: 9, assists: 5 },
  { name: "Player 5", teamId: "5", teamName: "Team E", goals: 8, assists: 2 },
];

function generateTopScorers(leagueId: string): TopScorer[] {
  const data = MOCK_SCORERS[leagueId] || DEFAULT_SCORERS;
  return data.map((p, i) => ({
    rank: i + 1,
    player: {
      id: 1000 + i,
      name: p.name,
      photo: `https://media.api-sports.io/football/players/${1000 + i}.png`,
    },
    team: {
      id: p.teamId,
      name: p.teamName,
      shortName: p.teamName.substring(0, 3).toUpperCase(),
      logoUrl: `https://media.api-sports.io/football/teams/${p.teamId}.png`,
    },
    goals: p.goals,
    assists: p.assists,
    matches: 20 + Math.floor(Math.random() * 8),
  }));
}

function generatePlayerProfile(playerId: number): PlayerProfile {
  const scorerNames: Record<
    number,
    {
      name: string;
      firstname: string;
      lastname: string;
      nat: string;
      pos: string;
      teams: string[];
    }
  > = {
    1000: {
      name: "Mauro Icardi",
      firstname: "Mauro",
      lastname: "Icardi",
      nat: "Argentina",
      pos: "Attacker",
      teams: ["645", "505", "85"],
    },
    1001: {
      name: "Edin Dzeko",
      firstname: "Edin",
      lastname: "Dzeko",
      nat: "Bosnia",
      pos: "Attacker",
      teams: ["611", "505", "497"],
    },
    1002: {
      name: "Ciro Immobile",
      firstname: "Ciro",
      lastname: "Immobile",
      nat: "Italy",
      pos: "Attacker",
      teams: ["549", "497", "165"],
    },
    1003: {
      name: "Dries Mertens",
      firstname: "Dries",
      lastname: "Mertens",
      nat: "Belgium",
      pos: "Attacker",
      teams: ["645", "492"],
    },
    1004: {
      name: "Youssef En-Nesyri",
      firstname: "Youssef",
      lastname: "En-Nesyri",
      nat: "Morocco",
      pos: "Attacker",
      teams: ["611", "536"],
    },
  };

  const info = scorerNames[playerId] || {
    name: `Player ${playerId}`,
    firstname: "Player",
    lastname: `${playerId}`,
    nat: "Turkey",
    pos: "Attacker",
    teams: ["645"],
  };

  const currentYear = new Date().getFullYear();
  const playerAge = 25 + Math.floor(Math.random() * 10);
  const careerStartYear = currentYear - playerAge + 17; // Started at ~17
  const careerLength = currentYear - careerStartYear;

  const seasons = Array.from({ length: careerLength }, (_, i) => {
    const year = currentYear - 1 - i;
    if (year < careerStartYear) return null;
    const teamIdx = Math.floor(
      i / Math.max(1, Math.ceil(careerLength / info.teams.length)),
    );
    const teamId = info.teams[Math.min(teamIdx, info.teams.length - 1)];
    const team = ALL_TEAMS.find((t) => t.id === teamId) || ALL_TEAMS[0];
    const matches = 15 + Math.floor(Math.random() * 20);
    const starts = matches - Math.floor(Math.random() * 5);
    return {
      season: String(year),
      team,
      matches,
      starts,
      goals: Math.floor(Math.random() * 15) + 1,
      assists: Math.floor(Math.random() * 8),
      yellowCards: Math.floor(Math.random() * 6),
      redCards: Math.floor(Math.random() * 2),
      rating: (6 + Math.random() * 2).toFixed(1),
    };
  }).filter(Boolean) as PlayerSeason[];

  return {
    id: playerId,
    name: info.name,
    firstname: info.firstname,
    lastname: info.lastname,
    photo: `https://media.api-sports.io/football/players/${playerId}.png`,
    age: playerAge,
    nationality: info.nat,
    height: `${175 + Math.floor(Math.random() * 15)} cm`,
    position: info.pos,
    seasons,
  };
}

// ─── Mock Squad Data ────────────────────────────────────
const MOCK_SQUADS: Record<
  string,
  Array<{
    id: number;
    name: string;
    age: number;
    number: number | null;
    position: string;
    nationality: string;
  }>
> = {
  "645": [
    // Galatasaray
    {
      id: 882,
      name: "Fernando Muslera",
      age: 38,
      number: 1,
      position: "Goalkeeper",
      nationality: "Uruguay",
    },
    {
      id: 50130,
      name: "Günay Güvenç",
      age: 28,
      number: 67,
      position: "Goalkeeper",
      nationality: "Turkey",
    },
    {
      id: 264,
      name: "Davinson Sánchez",
      age: 28,
      number: 6,
      position: "Defender",
      nationality: "Colombia",
    },
    {
      id: 25056,
      name: "Abdülkerim Bardakcı",
      age: 29,
      number: 42,
      position: "Defender",
      nationality: "Turkey",
    },
    {
      id: 891,
      name: "Kaan Ayhan",
      age: 30,
      number: 35,
      position: "Defender",
      nationality: "Turkey",
    },
    {
      id: 80318,
      name: "Ismail Jakobs",
      age: 25,
      number: 24,
      position: "Defender",
      nationality: "Germany",
    },
    {
      id: 22078,
      name: "Sacha Boey",
      age: 24,
      number: 20,
      position: "Defender",
      nationality: "France",
    },
    {
      id: 889,
      name: "Lucas Torreira",
      age: 29,
      number: 34,
      position: "Midfielder",
      nationality: "Uruguay",
    },
    {
      id: 25044,
      name: "Kerem Demirbay",
      age: 31,
      number: 10,
      position: "Midfielder",
      nationality: "Germany",
    },
    {
      id: 25059,
      name: "Yunus Akgün",
      age: 25,
      number: 11,
      position: "Midfielder",
      nationality: "Turkey",
    },
    {
      id: 903,
      name: "Hakim Ziyech",
      age: 32,
      number: 22,
      position: "Midfielder",
      nationality: "Morocco",
    },
    {
      id: 25045,
      name: "Baris Alper Yilmaz",
      age: 24,
      number: 7,
      position: "Midfielder",
      nationality: "Turkey",
    },
    {
      id: 1164,
      name: "Dries Mertens",
      age: 38,
      number: 14,
      position: "Attacker",
      nationality: "Belgium",
    },
    {
      id: 186,
      name: "Mauro Icardi",
      age: 32,
      number: 9,
      position: "Attacker",
      nationality: "Argentina",
    },
    {
      id: 25047,
      name: "Kerem Aktürkoğlu",
      age: 26,
      number: 17,
      position: "Attacker",
      nationality: "Turkey",
    },
    {
      id: 20538,
      name: "Victor Osimhen",
      age: 26,
      number: 45,
      position: "Attacker",
      nationality: "Nigeria",
    },
    {
      id: 904,
      name: "Michy Batshuayi",
      age: 31,
      number: 23,
      position: "Attacker",
      nationality: "Belgium",
    },
    {
      id: 25051,
      name: "Derrick Köhn",
      age: 25,
      number: 3,
      position: "Defender",
      nationality: "Germany",
    },
    {
      id: 286,
      name: "Tanguy Ndombele",
      age: 28,
      number: 28,
      position: "Midfielder",
      nationality: "France",
    },
    {
      id: 25063,
      name: "Kazımcan Karataş",
      age: 20,
      number: 62,
      position: "Midfielder",
      nationality: "Turkey",
    },
  ],
};

function generateTeamSquad(teamId: string): SquadPlayer[] {
  const squad = MOCK_SQUADS[teamId];
  if (squad) {
    return squad.map((p) => ({
      id: p.id,
      name: p.name,
      photo: `https://media.api-sports.io/football/players/${p.id}.png`,
      age: p.age,
      number: p.number,
      position: p.position,
      nationality: p.nationality,
      matches: Math.floor(Math.random() * 30) + 5,
      starts: Math.floor(Math.random() * 25) + 3,
      goals:
        p.position === "Attacker"
          ? Math.floor(Math.random() * 15) + 3
          : p.position === "Midfielder"
            ? Math.floor(Math.random() * 8)
            : Math.floor(Math.random() * 2),
      assists: p.position === "Goalkeeper" ? 0 : Math.floor(Math.random() * 8),
      yellowCards: Math.floor(Math.random() * 6),
      redCards: Math.random() > 0.85 ? 1 : 0,
      rating: (6.0 + Math.random() * 2.5).toFixed(1),
    }));
  }
  // Generic squad for unknown teams
  const positions = [
    "Goalkeeper",
    "Defender",
    "Defender",
    "Defender",
    "Defender",
    "Defender",
    "Midfielder",
    "Midfielder",
    "Midfielder",
    "Midfielder",
    "Midfielder",
    "Attacker",
    "Attacker",
    "Attacker",
    "Attacker",
    "Goalkeeper",
    "Defender",
    "Midfielder",
    "Midfielder",
    "Attacker",
  ];
  const fakeNames = [
    "Ali Yılmaz",
    "Mehmet Demir",
    "Hasan Kaya",
    "Ahmet Çelik",
    "Emre Özkan",
    "Burak Aydın",
    "Can Yıldız",
    "Serkan Arslan",
    "Oğuz Şahin",
    "Mert Koç",
    "Tolga Kurt",
    "Barış Erdoğan",
    "Deniz Aktaş",
    "Furkan Polat",
    "Enes Güneş",
    "Onur Doğan",
    "Kaan Yavuz",
    "Eren Aksoy",
    "Uğur Korkmaz",
    "Batuhan Öztürk",
  ];
  return fakeNames.map((name, i) => ({
    id: 90000 + parseInt(teamId) * 100 + i,
    name,
    photo: `https://media.api-sports.io/football/players/${90000 + parseInt(teamId) * 100 + i}.png`,
    age: 20 + Math.floor(Math.random() * 14),
    number: i + 1,
    position: positions[i],
    nationality: "Turkey",
    matches: Math.floor(Math.random() * 30) + 2,
    starts: Math.floor(Math.random() * 20) + 1,
    goals:
      positions[i] === "Attacker"
        ? Math.floor(Math.random() * 12) + 1
        : positions[i] === "Midfielder"
          ? Math.floor(Math.random() * 6)
          : Math.floor(Math.random() * 2),
    assists: positions[i] === "Goalkeeper" ? 0 : Math.floor(Math.random() * 6),
    yellowCards: Math.floor(Math.random() * 5),
    redCards: Math.random() > 0.85 ? 1 : 0,
    rating: (6.0 + Math.random() * 2.5).toFixed(1),
  }));
}

function searchTeamsMock(query: string): Team[] {
  const q = query.toLowerCase();
  return ALL_TEAMS.filter((t) => t.name.toLowerCase().includes(q));
}

function generateMatchPredictions(fixtureId: string): MatchPrediction {
  return {
    winner:
      Math.random() > 0.6 ? "home" : Math.random() > 0.5 ? "away" : "draw",
    probabilities: {
      home: 45,
      draw: 25,
      away: 30,
    },
    advice:
      "Ev sahibi ekip son maçlarda daha etkili bir oyun sergiliyor. Ev sahibi galibiyeti veya Beraberlik denenebilir.",
    h2h: "Son 5 maçta Ev sahibi 3 galibiyet, Deplasman 1 galibiyet aldı. 1 maç berabere bitti.",
    comparison: {
      form: { home: "85%", away: "60%" },
      att: { home: "78%", away: "65%" },
      def: { home: "70%", away: "55%" },
    },
  };
}

function generateMatchCommentary(fixtureId: string): CommentaryItem[] {
  return (
    [
      {
        id: "c1",
        minute: 1,
        text: "Maç başladı! Her iki takıma da başarılar dileriz.",
        type: "general",
      },
      {
        id: "c2",
        minute: 12,
        text: "Tehlikeli atak! Ceza sahası dışından sert bir şut ama top dışarıda.",
        type: "important",
      },
      {
        id: "c3",
        minute: 23,
        text: "GOOOLL!! Ev sahibi ekip öne geçiyor!",
        type: "goal",
      },
      {
        id: "c4",
        minute: 35,
        text: "Hakem sarı kartını çıkarıyor. Sert bir müdahale.",
        type: "card",
      },
      {
        id: "c5",
        minute: 45,
        text: "İlk yarı sona erdi. Takımlar soyunma odasına gidiyor.",
        type: "general",
      },
      { id: "c6", minute: 46, text: "İkinci yarı başladı.", type: "general" },
      {
        id: "c7",
        minute: 67,
        text: "Zorunlu oyuncu değişikliği. Sakatlık nedeniyle oyun durdu.",
        type: "general",
      },
      {
        id: "c8",
        minute: 78,
        text: "PENALTI! Hakem beyaz noktayı gösterdi.",
        type: "important",
      },
      {
        id: "c9",
        minute: 85,
        text: "Maçta tempo iyice arttı. Her iki kalede de tehlike var.",
        type: "general",
      },
      {
        id: "c10",
        minute: 90,
        text: "Maç bitti! Heyecan dolu bir 90 dakika geride kaldı.",
        type: "general",
      },
    ] as CommentaryItem[]
  ).reverse();
}

// ─── Mock API Service (same interface as real API) ────────

async function generateMatchInjuries(fixtureId: string): Promise<Injury[]> {
  return [
    {
      player: {
        id: 1,
        name: "Eden Džeko",
        photo: "https://media.api-sports.io/football/players/1.png",
        type: "Injured",
        reason: "Hamstring Injury",
      },
      team: {
        id: 611,
        name: "Fenerbahçe",
        logo: "https://media.api-sports.io/football/teams/611.png",
      },
      fixture: parseInt(fixtureId),
      league: {
        id: 203,
        name: "Süper Lig",
        country: "Turkey",
        logo: "https://media.api-sports.io/football/leagues/203.png",
        season: 2025,
      },
    },
    {
      player: {
        id: 2,
        name: "Vincent Aboubakar",
        photo: "https://media.api-sports.io/football/players/2.png",
        type: "Injured",
        reason: "Knee Injury",
      },
      team: {
        id: 565,
        name: "Beşiktaş",
        logo: "https://media.api-sports.io/football/teams/565.png",
      },
      fixture: parseInt(fixtureId),
      league: {
        id: 203,
        name: "Süper Lig",
        country: "Turkey",
        logo: "https://media.api-sports.io/football/leagues/203.png",
        season: 2025,
      },
    },
  ];
}

async function generateTeamTransfers(teamId: string): Promise<Transfer[]> {
  return [
    {
      player: { id: 101, name: "Arda Güler" },
      update: "2025-01-15T12:00:00Z",
      type: "Permanent",
      teams: {
        in: {
          id: 541,
          name: "Real Madrid",
          logo: "https://media.api-sports.io/football/teams/541.png",
        },
        out: {
          id: 611,
          name: "Fenerbahçe",
          logo: "https://media.api-sports.io/football/teams/611.png",
        },
      },
    },
    {
      player: { id: 102, name: "Mauro Icardi" },
      update: "2024-07-01T10:00:00Z",
      type: "Permanent",
      teams: {
        in: {
          id: 610,
          name: "Galatasaray",
          logo: "https://media.api-sports.io/football/teams/610.png",
        },
        out: {
          id: 49,
          name: "PSG",
          logo: "https://media.api-sports.io/football/teams/49.png",
        },
      },
    },
  ];
}

export const mockApiService = {
  async getMatchesByDate(date: string): Promise<Match[]> {
    await new Promise((r) => setTimeout(r, 300));
    return generateMatchesForDate(date);
  },

  async getTeamMatches(teamId: string, season: string): Promise<Match[]> {
    await new Promise((r) => setTimeout(r, 200));
    return generateTeamMatches(teamId, season);
  },

  async getH2H(team1Id: string, team2Id: string): Promise<Match[]> {
    await new Promise((r) => setTimeout(r, 200));
    return generateH2H(team1Id, team2Id);
  },

  async getMatchLineup(fixtureId: string): Promise<MatchLineup | null> {
    await new Promise((r) => setTimeout(r, 200));
    return generateLineup(fixtureId);
  },

  async getMatchDetail(id: string): Promise<MatchDetail> {
    await new Promise((r) => setTimeout(r, 200));
    return generateMatchDetail(id);
  },

  async getStandings(leagueId: string, season: string): Promise<StandingRow[]> {
    await new Promise((r) => setTimeout(r, 300));
    return generateStandings(leagueId);
  },

  async getTopScorers(leagueId: string, season: string): Promise<TopScorer[]> {
    await new Promise((r) => setTimeout(r, 300));
    return generateTopScorers(leagueId);
  },

  async getPlayerProfile(playerId: number): Promise<PlayerProfile | null> {
    await new Promise((r) => setTimeout(r, 300));
    return generatePlayerProfile(playerId);
  },

  async getTeamSquad(teamId: string, season: string): Promise<SquadPlayer[]> {
    await new Promise((r) => setTimeout(r, 300));
    return generateTeamSquad(teamId);
  },

  async searchTeams(query: string): Promise<Team[]> {
    await new Promise((r) => setTimeout(r, 200));
    return searchTeamsMock(query);
  },

  async getMatchPredictions(
    fixtureId: string,
  ): Promise<MatchPrediction | null> {
    await new Promise((r) => setTimeout(r, 200));
    return generateMatchPredictions(fixtureId);
  },

  async getMatchCommentary(fixtureId: string): Promise<CommentaryItem[]> {
    await new Promise((r) => setTimeout(r, 200));
    return generateMatchCommentary(fixtureId);
  },

  async getMatchInjuries(fixtureId: string): Promise<Injury[]> {
    await new Promise((r) => setTimeout(r, 200));
    return generateMatchInjuries(fixtureId);
  },

  async getTeamTransfers(teamId: string): Promise<Transfer[]> {
    await new Promise((r) => setTimeout(r, 200));
    return generateTeamTransfers(teamId);
  },

  async getTeamDetail(teamId: string): Promise<Team | null> {
    await new Promise((r) => setTimeout(r, 200));
    const teams = [
      GS,
      FB,
      BJK,
      TS,
      BASAK,
      ADANA,
      ANTALYA,
      SIVAS,
      KONYA,
      HATAY,
      RIZESPOR,
      SAMSUN,
    ];
    return teams.find((t) => t.id === teamId) || GS;
  },
};
