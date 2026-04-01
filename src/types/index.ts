export type ThemeMode = "light" | "dark" | "system";
export type Language = "tr" | "en";

export interface Referee {
  name: string;
  nationality?: string;
}

export interface Match {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  status:
    | "not_started"
    | "live"
    | "half_time"
    | "finished"
    | "postponed"
    | "cancelled";
  minute?: number;
  extra?: number;
  startTime: string;
  league: League;
  venue?: {
    id: number;
    name: string;
    city: string;
  };
  referee?: string | Referee;
  assistantReferees?: Referee[];
  broadcast?: string[];
  winner?: "home" | "away" | null;
  scorePenalty?: { home: number | null; away: number | null };
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string;
  venue?: Venue;
  coach?: Coach;
  national?: boolean;
}

export interface League {
  id: string;
  name: string;
  country: string;
  logoUrl: string;
  season: string;
  round?: string;
}

export interface MatchStatistics {
  matchId: string;
  home: TeamStats;
  away: TeamStats;
}

export interface TeamStats {
  possession: number;
  xg: number;
  shots: number;
  shotsOnTarget: number;
  shotsOffTarget: number;
  blockedShots: number;
  shotsInsideBox: number;
  shotsOutsideBox: number;
  totalPasses: number;
  accuratePasses: number;
  passAccuracy: number;
  corners: number;
  offsides: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  saves: number;
}

export interface MatchEvent {
  id: string;
  minute: number;
  type:
    | "goal"
    | "yellow_card"
    | "red_card"
    | "substitution"
    | "own_goal"
    | "penalty"
    | "missed_penalty";
  team: "home" | "away";
  player: string;
  playerId?: number;
  assistPlayer?: string;
  assistPlayerId?: number;
  substitutePlayer?: string;
  substitutePlayerId?: number;
  isShootout?: boolean;
}

export interface LineupPlayer {
  id: number;
  name: string;
  number: number;
  pos: string;
  grid: string | null;
  captain?: boolean;
}

export interface TeamLineup {
  team: { id: string; name: string; logoUrl: string };
  formation: string;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
  coach: string;
}

export interface MatchLineup {
  home: TeamLineup;
  away: TeamLineup;
}

export interface PlayerMatchStats {
  playerId: number;
  playerName: string;
  nationality?: string;
  rating: number;
  position: string;
  minutes: number;
  // Passes
  passesAccurate: number;
  passesTotal: number;
  // Goals & assists
  goals: number;
  assists: number;
  // Goalkeeper
  saves: number;
  goalsConceded: number;
  longBalls: number;
  // Outfield
  shots: number;
  shotsOnTarget: number;
  duelsWon: number;
  duelsTotal: number;
  aerialWon: number;
  aerialTotal: number;
}

export interface MatchDetail extends Match {
  statistics: MatchStatistics;
  events: MatchEvent[];
}

export interface StandingRow {
  rank: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string; // e.g. "WWDLW"
}

export interface TopScorer {
  rank: number;
  player: {
    id: number;
    name: string;
    photo: string;
  };
  team: Team;
  goals: number;
  assists: number;
  matches: number;
}

export interface PlayerSeason {
  season: string;
  team: Team;
  leagueId?: string;
  leagueName?: string;
  leagueCountry?: string;
  leagueType?: string;
  matches: number;
  starts: number;
  minutes?: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  rating: string;
}

export interface PlayerTransfer {
  date: string;
  teamIn: { id: string; name: string; logo: string };
  teamOut: { id: string; name: string; logo: string };
  type: string;
}

export interface PlayerProfile {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  photo: string;
  age: number;
  nationality: string;
  height: string;
  weight?: string;
  position: string;
  birth?: {
    date?: string;
    place?: string;
    country?: string;
  };
  number?: number;
  currentTeam?: string;
  currentTeamLogo?: string;
  seasons: PlayerSeason[];
  transfers?: PlayerTransfer[];
}

export interface SquadPlayer {
  id: number;
  name: string;
  photo: string;
  age: number;
  number: number | null;
  position: string;
  nationality: string;
  matches: number;
  starts: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  rating: string;
  minutes?: number;
  passAccuracy?: number | null;
  goalsConceded?: number;
  saves?: number;
  cleanSheets?: number;
}

export interface Profile {
  name: string;
  email: string;
  favoriteTeam?: string;
}

export interface MatchPrediction {
  winner: "home" | "away" | "draw" | null;
  probabilities: {
    home: number;
    draw: number;
    away: number;
  };
  advice: string;
  h2h: string;
  homeTeamName?: string;
  awayTeamName?: string;
  comparison: {
    form: { home: string; away: string };
    att: { home: string; away: string };
    def: { home: string; away: string };
  };
}

export interface CommentaryItem {
  id: string;
  minute: number;
  text: string;
  type: "general" | "goal" | "card" | "important";
}
export interface Venue {
  id: number;
  name: string;
  address?: string;
  city: string;
  capacity?: number;
  surface?: string;
  image?: string;
}

export interface Coach {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  age: number;
  nationality: string;
  photo: string;
}

export interface Injury {
  player: {
    id: number;
    name: string;
    photo: string;
    type: string;
    reason: string;
  };
  team: {
    id: number;
    name: string;
    logo: string;
  };
  fixture: number;
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    season: number;
  };
}

export interface Transfer {
  player: {
    id: number;
    name: string;
  };
  update: string;
  type: string;
  teams: {
    in: {
      id: number;
      name: string;
      logo: string;
    };
    out: {
      id: number;
      name: string;
      logo: string;
    };
  };
}
