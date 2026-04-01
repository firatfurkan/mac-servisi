import { Match } from "../types";

// ─── Milli Takım İsim Çevirileri (İngilizce → Türkçe) ──────────────────────
// API-Sports İngilizce isim döndürür; Türkçe seçildiğinde bu harita kullanılır.
const TEAM_NAMES_TR: Record<string, string> = {
  // ── Avrupa ──────────────────────────────────────────────────────────────
  "albania": "Arnavutluk",
  "andorra": "Andorra",
  "armenia": "Ermenistan",
  "austria": "Avusturya",
  "azerbaijan": "Azerbaycan",
  "belarus": "Belarus",
  "belgium": "Belçika",
  "bosnia": "Bosna Hersek",
  "bosnia and herzegovina": "Bosna Hersek",
  "bosnia & herzegovina": "Bosna Hersek",
  "bulgaria": "Bulgaristan",
  "croatia": "Hırvatistan",
  "cyprus": "Kıbrıs",
  "czech republic": "Çek Cumhuriyeti",
  "czechia": "Çek Cumhuriyeti",
  "denmark": "Danimarka",
  "england": "İngiltere",
  "estonia": "Estonya",
  "faroe islands": "Faroe Adaları",
  "finland": "Finlandiya",
  "france": "Fransa",
  "georgia": "Gürcistan",
  "germany": "Almanya",
  "gibraltar": "Cebelitarık",
  "greece": "Yunanistan",
  "hungary": "Macaristan",
  "iceland": "İzlanda",
  "ireland": "İrlanda",
  "rep of ireland": "İrlanda",
  "rep. of ireland": "İrlanda",
  "republic of ireland": "İrlanda",
  "israel": "İsrail",
  "italy": "İtalya",
  "kazakhstan": "Kazakistan",
  "kosovo": "Kosova",
  "latvia": "Letonya",
  "liechtenstein": "Lihtenştayn",
  "lithuania": "Litvanya",
  "luxembourg": "Lüksemburg",
  "malta": "Malta",
  "moldova": "Moldova",
  "montenegro": "Karadağ",
  "netherlands": "Hollanda",
  "north macedonia": "Kuzey Makedonya",
  "northern ireland": "Kuzey İrlanda",
  "norway": "Norveç",
  "poland": "Polonya",
  "portugal": "Portekiz",
  "romania": "Romanya",
  "russia": "Rusya",
  "san marino": "San Marino",
  "scotland": "İskoçya",
  "serbia": "Sırbistan",
  "slovakia": "Slovakya",
  "slovenia": "Slovenya",
  "spain": "İspanya",
  "sweden": "İsveç",
  "switzerland": "İsviçre",
  "turkey": "Türkiye",
  "ukraine": "Ukrayna",
  "wales": "Galler",
  // ── Güney Amerika ──────────────────────────────────────────────────────
  "argentina": "Arjantin",
  "bolivia": "Bolivya",
  "brazil": "Brezilya",
  "chile": "Şili",
  "colombia": "Kolombiya",
  "ecuador": "Ekvador",
  "paraguay": "Paraguay",
  "peru": "Peru",
  "uruguay": "Uruguay",
  "venezuela": "Venezuela",
  // ── Kuzey/Orta Amerika & Karayipler ─────────────────────────────────
  "canada": "Kanada",
  "costa rica": "Kosta Rika",
  "cuba": "Küba",
  "el salvador": "El Salvador",
  "guatemala": "Guatemala",
  "haiti": "Haiti",
  "honduras": "Honduras",
  "jamaica": "Jamaika",
  "mexico": "Meksika",
  "nicaragua": "Nikaragua",
  "panama": "Panama",
  "trinidad and tobago": "Trinidad ve Tobago",
  "trinidad & tobago": "Trinidad ve Tobago",
  "united states": "ABD",
  "usa": "ABD",
  // ── Afrika ─────────────────────────────────────────────────────────
  "algeria": "Cezayir",
  "angola": "Angola",
  "burkina faso": "Burkina Faso",
  "cameroon": "Kamerun",
  "cape verde": "Yeşil Burun Adaları",
  "central african rep.": "Orta Afrika Cumhuriyeti",
  "central african republic": "Orta Afrika Cumhuriyeti",
  "comoros": "Komoros",
  "côte d'ivoire": "Fildişi Sahili",
  "ivory coast": "Fildişi Sahili",
  "dr congo": "Demokratik Kongo Cumhuriyeti",
  "egypt": "Mısır",
  "ethiopia": "Etiyopya",
  "gabon": "Gabon",
  "gambia": "Gambiya",
  "ghana": "Gana",
  "guinea": "Gine",
  "kenya": "Kenya",
  "libya": "Libya",
  "madagascar": "Madagaskar",
  "mali": "Mali",
  "mauritania": "Moritanya",
  "morocco": "Fas",
  "mozambique": "Mozambik",
  "namibia": "Namibya",
  "niger": "Nijer",
  "nigeria": "Nijerya",
  "senegal": "Senegal",
  "sierra leone": "Sierra Leone",
  "south africa": "Güney Afrika",
  "sudan": "Sudan",
  "tanzania": "Tanzanya",
  "togo": "Togo",
  "tunisia": "Tunus",
  "uganda": "Uganda",
  "zambia": "Zambiya",
  "zimbabwe": "Zimbabve",
  // ── Asya ──────────────────────────────────────────────────────────
  "afghanistan": "Afganistan",
  "australia": "Avustralya",
  "bahrain": "Bahreyn",
  "china": "Çin",
  "china pr": "Çin",
  "hong kong": "Hong Kong",
  "india": "Hindistan",
  "indonesia": "Endonezya",
  "iran": "İran",
  "ir iran": "İran",
  "iraq": "Irak",
  "japan": "Japonya",
  "jordan": "Ürdün",
  "korea dpr": "Kuzey Kore",
  "korea republic": "Güney Kore",
  "south korea": "Güney Kore",
  "kuwait": "Kuveyt",
  "kyrgyzstan": "Kırgızistan",
  "lebanon": "Lübnan",
  "malaysia": "Malezya",
  "myanmar": "Miyanmar",
  "new zealand": "Yeni Zelanda",
  "north korea": "Kuzey Kore",
  "oman": "Umman",
  "pakistan": "Pakistan",
  "palestine": "Filistin",
  "philippines": "Filipinler",
  "qatar": "Katar",
  "saudi arabia": "Suudi Arabistan",
  "singapore": "Singapur",
  "syria": "Suriye",
  "tajikistan": "Tacikistan",
  "thailand": "Tayland",
  "turkmenistan": "Türkmenistan",
  "united arab emirates": "Birleşik Arap Emirlikleri",
  "uae": "Birleşik Arap Emirlikleri",
  "uzbekistan": "Özbekistan",
  "vietnam": "Vietnam",
  "yemen": "Yemen",
};

/**
 * Milli takım adını dile göre çevirir.
 * Türkçe seçiliyse TEAM_NAMES_TR haritasına bakar; bulamazsa orijinal adı döner.
 * Kulüp takımları için haritada bulunamaz → orijinal isim korunur.
 */
export function translateTeamName(name: string, lang: string): string {
  if (!name || lang !== "tr") return name;
  const key = name.toLowerCase().trim();
  return TEAM_NAMES_TR[key] ?? name;
}

// ─── Ülke / Kıta İsimleri (lig country alanı için) ─────────────────────────
// TEAM_NAMES_TR zaten çoğu ülkeyi kapsıyor; burada eksik kalanlar ekleniyor.
const EXTRA_COUNTRY_TR: Record<string, string> = {
  "world": "Dünya",
  "europe": "Avrupa",
  "south america": "Güney Amerika",
  "north america": "Kuzey Amerika",
  "central america": "Orta Amerika",
  "africa": "Afrika",
  "asia": "Asya",
  "oceania": "Okyanusya",
  "concacaf": "CONCACAF",
  "conmebol": "CONMEBOL",
  "international": "Uluslararası",
};

/** Ülke/kıta adını Türkçeye çevirir (lig ülkesi için). */
export function translateCountry(name: string, lang: string): string {
  if (!name || lang !== "tr") return name;
  const key = name.toLowerCase().trim();
  return EXTRA_COUNTRY_TR[key] ?? TEAM_NAMES_TR[key] ?? name;
}

// ─── Lig İsimleri (İngilizce → Türkçe) ─────────────────────────────────────
const LEAGUE_NAMES_TR: Record<string, string> = {
  // ── FIFA / Dünya Kupası ────────────────────────────────────────────────
  "fifa world cup": "FIFA Dünya Kupası",
  "world cup": "Dünya Kupası",
  "world cup - qualification europe": "Dünya Kupası Elemeleri - Avrupa",
  "world cup - qualification south america": "Dünya Kupası Elemeleri - Güney Amerika",
  "world cup - qualification asia": "Dünya Kupası Elemeleri - Asya",
  "world cup - qualification africa": "Dünya Kupası Elemeleri - Afrika",
  "world cup - qualification concacaf": "Dünya Kupası Elemeleri - CONCACAF",
  "world cup - qualification oceania": "Dünya Kupası Elemeleri - Okyanusya",
  "world cup - qualification intercontinental": "Dünya Kupası Elemeleri - Kıtalar Arası",
  "world cup - qualification": "Dünya Kupası Elemeleri",
  // ── UEFA ──────────────────────────────────────────────────────────────
  "uefa champions league": "UEFA Şampiyonlar Ligi",
  "champions league": "Şampiyonlar Ligi",
  "uefa europa league": "UEFA Avrupa Ligi",
  "europa league": "Avrupa Ligi",
  "uefa conference league": "UEFA Konferans Ligi",
  "conference league": "Konferans Ligi",
  "uefa super cup": "UEFA Süper Kupası",
  "uefa nations league": "UEFA Uluslar Ligi",
  "nations league": "Uluslar Ligi",
  "euro championship": "Avrupa Şampiyonası",
  "uefa european championship": "Avrupa Şampiyonası",
  "euro championship - qualification": "Avrupa Şampiyonası Elemeleri",
  "european championship qualification": "Avrupa Şampiyonası Elemeleri",
  // ── Türkiye ────────────────────────────────────────────────────────────
  "süper lig": "Süper Lig",
  "super lig": "Süper Lig",
  "1. lig": "1. Lig",
  "tff first league": "TFF 1. Lig",
  "tff second league": "TFF 2. Lig",
  "tff third league": "TFF 3. Lig",
  "türkiye kupası": "Türkiye Kupası",
  "turkish cup": "Türkiye Kupası",
  "ziraat türkiye kupası": "Ziraat Türkiye Kupası",
  "türkiye süper kupası": "Türkiye Süper Kupası",
  // ── İngiltere ─────────────────────────────────────────────────────────
  "premier league": "Premier Lig",
  "championship": "Championship",
  "league one": "League One",
  "league two": "League Two",
  "fa cup": "FA Kupası",
  "efl cup": "EFL Kupası",
  "league cup": "Lig Kupası",
  "community shield": "Community Shield",
  // ── İspanya ────────────────────────────────────────────────────────────
  "la liga": "La Liga",
  "segunda división": "Segunda División",
  "copa del rey": "Copa del Rey",
  "supercopa de españa": "İspanya Süper Kupası",
  // ── Almanya ────────────────────────────────────────────────────────────
  "bundesliga": "Bundesliga",
  "2. bundesliga": "2. Bundesliga",
  "dfb pokal": "DFB Kupası",
  "dfb-pokal": "DFB Kupası",
  "supercup": "Almanya Süper Kupası",
  // ── İtalya ─────────────────────────────────────────────────────────────
  "serie a": "Serie A",
  "serie b": "Serie B",
  "coppa italia": "Coppa Italia",
  "supercoppa italiana": "İtalya Süper Kupası",
  // ── Fransa ─────────────────────────────────────────────────────────────
  "ligue 1": "Ligue 1",
  "ligue 2": "Ligue 2",
  "coupe de france": "Fransa Kupası",
  "trophée des champions": "Fransa Süper Kupası",
  // ── Hollanda ───────────────────────────────────────────────────────────
  "eredivisie": "Eredivisie",
  "eerste divisie": "Eerste Divisie",
  "knvb cup": "KNVB Kupası",
  // ── Portekiz ───────────────────────────────────────────────────────────
  "primeira liga": "Primeira Liga",
  "liga portugal": "Portekiz Ligi",
  "taça de portugal": "Portekiz Kupası",
  // ── Belçika ────────────────────────────────────────────────────────────
  "jupiler pro league": "Belçika Pro Ligi",
  "pro league": "Belçika Pro Ligi",
  "belgian first division a": "Belçika 1. Ligi",
  // ── İskoçya ────────────────────────────────────────────────────────────
  "premiership": "İskoçya Premier Ligi",
  "scottish premiership": "İskoçya Premier Ligi",
  "scottish fa cup": "İskoçya FA Kupası",
  // ── Rusya ──────────────────────────────────────────────────────────────
  "premier league russia": "Rusya Premier Ligi",
  "russian premier league": "Rusya Premier Ligi",
  // ── Güney Amerika ──────────────────────────────────────────────────────
  "copa america": "Copa America",
  "copa libertadores": "Copa Libertadores",
  "copa sudamericana": "Copa Sudamericana",
  "recopa sudamericana": "Recopa Sudamericana",
  "brasileiro série a": "Brezilya Serie A",
  "serie a brazil": "Brezilya Serie A",
  "liga profesional argentina": "Arjantin Profesyonel Ligi",
  // ── Afrika ─────────────────────────────────────────────────────────────
  "africa cup of nations": "Afrika Uluslar Kupası",
  "afcon": "Afrika Uluslar Kupası",
  "africa cup of nations - qualification": "Afrika Uluslar Kupası Elemeleri",
  "caf champions league": "CAF Şampiyonlar Ligi",
  // ── Asya ───────────────────────────────────────────────────────────────
  "afc champions league": "AFC Şampiyonlar Ligi",
  "asian cup": "Asya Kupası",
  "asian cup - qualification": "Asya Kupası Elemeleri",
  "afc asian cup": "AFC Asya Kupası",
  // ── Diğer Uluslararası ─────────────────────────────────────────────────
  "friendly": "Hazırlık Maçı",
  "friendlies": "Hazırlık Maçları",
  "international friendly": "Uluslararası Hazırlık Maçı",
  "club friendly": "Kulüp Hazırlık Maçı",
  "club friendlies": "Kulüp Hazırlık Maçları",
};

/**
 * Lig adını dile göre çevirir.
 * Türkçe seçiliyse LEAGUE_NAMES_TR haritasına bakar; bulamazsa orijinal adı döner.
 */
export function translateLeagueName(name: string, lang: string): string {
  if (!name || lang !== "tr") return name;
  const key = name.toLowerCase().trim();
  return LEAGUE_NAMES_TR[key] ?? name;
}

// Türkiye UTC+3 sabit (2016'dan beri yaz/kış saati yok)
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * UTC timestamp'i Istanbul saatine çevirir.
 * Intl.DateTimeFormat veya dayjs.tz kullanmaz — Hermes'te de çalışır.
 */
export function toIstanbulDate(date: Date): Date {
  return new Date(date.getTime() + ISTANBUL_OFFSET_MS);
}

/**
 * ISO tarih stringinden Istanbul saatini HH:mm olarak döner.
 * Intl.DateTimeFormat bypass — Expo Go/Hermes'te güvenilir.
 */
export function formatMatchTime(startTime: string): string {
  if (!startTime) return "";
  const d = new Date(startTime);
  if (isNaN(d.getTime())) return startTime.substring(11, 16) ?? "";
  const ist = toIstanbulDate(d);
  return `${String(ist.getUTCHours()).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")}`;
}

/** Eleme turu mu? (Tur atlama rozeti göstermek için) */
export function isKnockoutRound(round?: string): boolean {
  if (!round) return false;
  const r = round.toLowerCase();
  return (
    r.includes("final") ||
    r.includes("semi") ||
    r.includes("quarter") ||
    r.includes("round of") ||
    r.includes(" leg") ||
    r.includes("knockout") ||
    r.includes("play-off") ||
    r.includes("playoff") ||
    r.includes("elimination") ||
    r.includes("last ")
  );
}

/** Round adını Türkçeye çevirir */
const ROUND_TR: [string, string][] = [
  ["Final", "Final"],
  ["Semi-finals", "Yarı Final"],
  ["Semi-Finals", "Yarı Final"],
  ["Quarter-finals", "Çeyrek Final"],
  ["Quarter-Finals", "Çeyrek Final"],
  ["Round of 16", "Son 16"],
  ["Round of 32", "Son 32"],
  ["Round of 64", "Son 64"],
  ["3rd Place Final", "3. Yer Maçı"],
  ["Group Stage", "Grup Aşaması"],
  ["Preliminary Round", "Ön Eleme"],
  ["Qualifying Round", "Ön Eleme"],
  ["Play-offs", "Playoff"],
  ["Playoff Round", "Playoff"],
  ["Regular Season", "Normal Sezon"],
  ["League Stage", "Lig Aşaması"],
];

export function translateRound(round: string | undefined, lang: string): string {
  if (!round) return "";
  if (lang !== "tr") return round;
  for (const [en, tr] of ROUND_TR) {
    if (round === en) return tr;
    if (round.startsWith(en + " -") || round.startsWith(en + "-")) {
      return round.replace(en, tr);
    }
  }
  // "Group X" / "group-X" → "Grup X"
  const groupMatch = round.match(/^[Gg]roup[\s\-_]*(\S+)$/);
  if (groupMatch) return `Grup ${groupMatch[1]}`;
  // "Regular Season - Group X" → "Grup X"
  const regularGroupMatch = round.match(/Regular Season\s*-\s*[Gg]roup[\s\-_]*(\S+)$/);
  if (regularGroupMatch) return `Grup ${regularGroupMatch[1]}`;
  return round;
}

/** 1. maç mı? (e.g. "Round of 16 - 1st Leg") */
export function isFirstLeg(round?: string): boolean {
  if (!round) return false;
  return /1st\s*leg/i.test(round);
}

/** 2. maç mı? (e.g. "Round of 16 - 2nd Leg") */
export function isSecondLeg(round?: string): boolean {
  if (!round) return false;
  return /2nd\s*leg/i.test(round);
}

/** 2. maç round stringinden 1. maç round stringini çıkar */
export function getFirstLegRound(round: string): string {
  // "Round of 16 - 2nd Leg" → "Round of 16 - 1st Leg"
  return round.replace(/2nd\s*Leg/i, "1st Leg");
}

/** Round'un base adını çıkar (leg kısmını siler) */
export function getRoundBase(round: string): string {
  // "Round of 16 - 2nd Leg" → "Round of 16"
  // "Round of 16 - 1st Leg" → "Round of 16"
  // "Round of 16" → "Round of 16"
  return round.replace(/\s*-?\s*(1st|2nd)\s*leg/i, "").trim();
}

/** Tek maçlık knockout mu? (Final, 3rd Place) */
export function isSingleLegKnockout(round?: string): boolean {
  if (!round) return false;
  const r = round.toLowerCase();
  // "Final" ve "3rd Place Final" tek maçtır
  return (r === "final" || r.includes("3rd place"));
}

/**
 * Eleme turu maçında tur atlayan takımı hesaplar.
 * pairedMatch: Aynı turdaki diğer maç (1st/2nd leg eşleşmesi)
 *
 * - İki maçlı tur (paired match varsa) → aggregate hesapla
 * - Tek maçlık tur (Final, 3rd Place) → match.winner kullan
 * - Paired match yoksa ve tek maçlık değilse → null (veri eksik)
 */
export function getAggregateAdvancer(
  match: Match,
  pairedMatch?: Match | null,
): "home" | "away" | null {
  if (match.status !== "finished") return null;
  if (!isKnockoutRound(match.league.round)) return null;

  // Tek maçlık knockout (Final, 3rd Place) → API winner kullan
  if (isSingleLegKnockout(match.league.round)) {
    return match.winner ?? null;
  }

  // İki maçlı tur → paired match yoksa gösterme (veri eksik)
  if (!pairedMatch || pairedMatch.status !== "finished") return null;

  // Hangi maç daha önce oynandı? Erken olan = 1st leg
  const matchDate = new Date(match.startTime).getTime();
  const pairedDate = new Date(pairedMatch.startTime).getTime();
  const isThisSecondLeg = matchDate >= pairedDate;

  // Bu maçın home takımı, diğer maçta home mu away mi?
  const thisHomeIsPairedHome = match.homeTeam.id === pairedMatch.homeTeam.id;

  // Aggregate skor hesapla (match.home takımı perspektifinden)
  const aggHome =
    (match.homeScore ?? 0) +
    (thisHomeIsPairedHome ? (pairedMatch.homeScore ?? 0) : (pairedMatch.awayScore ?? 0));
  const aggAway =
    (match.awayScore ?? 0) +
    (thisHomeIsPairedHome ? (pairedMatch.awayScore ?? 0) : (pairedMatch.homeScore ?? 0));

  // 2nd leg'de penaltı atıldıysa (aggregate berabere)
  const secondLeg = isThisSecondLeg ? match : pairedMatch;
  if (secondLeg.scorePenalty?.home != null && secondLeg.scorePenalty?.away != null) {
    // Penaltı skorunu bu maçın home/away perspektifine çevir
    const penHome = isThisSecondLeg
      ? secondLeg.scorePenalty.home
      : (match.homeTeam.id === secondLeg.homeTeam.id ? secondLeg.scorePenalty.home : secondLeg.scorePenalty.away);
    const penAway = isThisSecondLeg
      ? secondLeg.scorePenalty.away
      : (match.homeTeam.id === secondLeg.homeTeam.id ? secondLeg.scorePenalty.away : secondLeg.scorePenalty.home);
    if (penHome > penAway) return "home";
    if (penAway > penHome) return "away";
  }

  if (aggHome > aggAway) return "home";
  if (aggAway > aggHome) return "away";

  // Aggregate eşitse → API winner'a güven
  return match.winner ?? null;
}

/** Maç bitmek üzere mi? 45. dakika uzatmasında veya 90+ dakikada ise true. */
export function isNearEnd(m: Match): boolean {
  if (!isLive(m)) return false;
  const minute = m.minute ?? 0;
  return minute > 85 || m.extra != null;
}

export function getStatusText(
  match: Match,
  t: (key: string) => string,
): string {
  switch (match.status) {
    case "live":
      return match.extra
        ? `${match.minute ?? 0}+${match.extra}'`
        : `${match.minute ?? 0}'`;
    case "half_time":
      return t("matchStatus.halfTime");
    case "finished":
      return t("matchStatus.finished");
    case "not_started":
      return formatMatchTime(match.startTime) || t("matchStatus.notStarted");
    case "postponed":
      return t("matchStatus.postponed");
    case "cancelled":
      return t("matchStatus.cancelled");
    default:
      return "";
  }
}

export function isLive(match: Match): boolean {
  return match.status === "live" || match.status === "half_time";
}

function statusOrder(status: Match["status"]): number {
  // finished/live/half_time first, then not_started, then postponed/cancelled
  switch (status) {
    case "live":
      return 0;
    case "half_time":
      return 0;
    case "finished":
      return 1;
    case "not_started":
      return 2;
    case "postponed":
      return 3;
    case "cancelled":
      return 3;
    default:
      return 2;
  }
}

/**
 * Gruplama anahtarını döner.
 * Eleme turları (knockout) için leagueId__round, grup aşaması için sadece leagueId.
 * Böylece aynı ligde hem Grup hem Round of 16 varsa ayrı bölümler oluşur.
 */
export function groupKey(match: Match): string {
  const round = match.league.round ?? "";
  if (isKnockoutRound(round)) return `${match.league.id}__${round}`;
  // "Regular Season - Group A" / "Group 1" gibi grup ayrımlarını key'e ekle
  const groupPart = round.match(/[Gg]roup[\s\-_]*(\S+)/)?.[1];
  if (groupPart) return `${match.league.id}__${match.league.name}__group_${groupPart}`;
  return `${match.league.id}__${match.league.name}`;
}

export function groupMatchesByLeague(
  matches: Match[],
): Record<string, Match[]> {
  const grouped = matches.reduce(
    (acc, match) => {
      const key = groupKey(match);
      if (!acc[key]) acc[key] = [];
      acc[key].push(match);
      return acc;
    },
    {} as Record<string, Match[]>,
  );

  // Sort matches within each group: by start time
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => {
      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();
      if (timeA === timeB) {
        return statusOrder(a.status) - statusOrder(b.status);
      }
      return timeA - timeB;
    });
  }

  return grouped;
}

export function formatPlayerName(fullName: string, nationality?: string): string {
  if (!fullName || fullName.trim() === "") return fullName;
  const isTurkish = nationality === "Turkey";
  const maxLen = 14;

  // İsim sığıyorsa olduğu gibi döndür
  if (fullName.length <= maxLen) return fullName;

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return fullName;

  if (isTurkish) {
    // Türk: Tüm adlar + soyad baş harfi → "Barış Alper Y."
    const firstNames = parts.slice(0, -1).join(" ");
    const lastInitial = parts[parts.length - 1][0];
    return `${firstNames} ${lastInitial}.`;
  }

  // Yabancı: Ad baş harfi + soyadı → "V. Osimhen"
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  const abbreviated = `${firstName[0]}. ${lastName}`;
  if (abbreviated.length <= maxLen) return abbreviated;

  // Hala sığmıyorsa soyadı da kısalt → "V. Osimhen" zaten kısa, ama 3+ kelimeli isimlerde
  const lastPart = parts[parts.length - 1];
  return `${firstName[0]}. ${lastPart}`;
}


function applyTurkishTerms(text: string, homeTeamName?: string, awayTeamName?: string): string {
  let t = text;
  // Milli takım maçları: gerçek takım adını ev sahibi/deplasman ile değiştir
  if (homeTeamName) {
    t = t.replace(new RegExp(`\\b${homeTeamName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "ev sahibi");
  }
  if (awayTeamName) {
    t = t.replace(new RegExp(`\\b${awayTeamName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "deplasman");
  }
  return t
    .replace(/\bdouble chance\b/gi, "çifte şans")
    .replace(/\bcombo\b/gi, "kombine")
    .replace(/\bwinner\b/gi, "kazanan")
    .replace(/\bdraw\b/gi, "beraberlik")
    .replace(/\bhome\b/gi, "ev sahibi")
    .replace(/\baway\b/gi, "deplasman")
    .replace(/\bwin\b/gi, "galibiyeti")
    .replace(/\bwins\b/gi, "galibiyeti")
    .replace(/\byes\b/gi, "evet")
    .replace(/\bno\b/gi, "hayır")
    .replace(/\s+or\s+/gi, " veya ")
    .replace(/\s+and\s+/gi, " ve ")
    .replace(/[+]1\.5 goals?/gi, "1.5 gol üstü")
    .replace(/-1\.5 goals?/gi, "1.5 gol altı")
    .replace(/[+]2\.5 goals?/gi, "2.5 gol üstü")
    .replace(/-2\.5 goals?/gi, "2.5 gol altı")
    .replace(/[+]3\.5 goals?/gi, "3.5 gol üstü")
    .replace(/-3\.5 goals?/gi, "3.5 gol altı");
}

export function translatePrediction(
  text: string | undefined | null,
  language: string,
  homeTeamName?: string,
  awayTeamName?: string,
): string {
  if (!text) return "";

  const isTR = language === "tr";
  const lower = text.toLowerCase().trim();

  // Both Teams To Score pattern
  if (lower.includes("both teams to score")) {
    const isYes = /:\s*yes/i.test(text) || /yes\s*$/i.test(text);
    if (isTR) {
      return isYes
        ? "Her iki takımın da gol kaydetmesi, karşılıklı maç geçmişi ve hücum istatistikleri değerlendirildiğinde daha olası bir senaryo olarak öne çıkmaktadır."
        : "Düşük gollü bir karşılaşma beklentisi öne çıkmaktadır; her iki takımın savunma istatistikleri bu senaryoyu destekler niteliktedir.";
    } else {
      return isYes
        ? "Based on both teams' attacking statistics and head-to-head history, a mutual goalscoring scenario appears to be the more probable outcome."
        : "A low-scoring encounter is the more likely outcome, supported by both teams' defensive statistics.";
    }
  }

  // Strip all betting-style labels globally (not just at start)
  let core = text
    .replace(/double chance\s*:\s*/gi, "")
    .replace(/combo\s*:\s*/gi, "")
    .replace(/winner\s*:\s*/gi, "")
    .trim();

  // Her kelimenin ilk harfini büyük yap — takım isimleri için
  core = core.replace(/\b\w/g, (c) => c.toUpperCase());

  if (isTR) {
    core = applyTurkishTerms(core, homeTeamName, awayTeamName);
    return `Güncel form verileri ve istatistiksel karşılaştırmalar değerlendirildiğinde, ${core} senaryosu daha olası bir sonuç olarak öne çıkmaktadır.`;
  } else {
    core = core
      .replace(/[+]1\.5 goals?/gi, "over 1.5 goals")
      .replace(/-1\.5 goals?/gi, "under 1.5 goals")
      .replace(/[+]2\.5 goals?/gi, "over 2.5 goals")
      .replace(/-2\.5 goals?/gi, "under 2.5 goals")
      .replace(/[+]3\.5 goals?/gi, "over 3.5 goals")
      .replace(/-3\.5 goals?/gi, "under 3.5 goals");
    return `Based on current form data and statistical comparisons, a ${core} outcome appears to be the more probable scenario.`;
  }
}

export function translateH2H(text: string | undefined | null, language: string): string {
  if (!text) return "";
  if (language !== "tr") return text;

  return text
    .replace(/\bhead[-\s]to[-\s]head\b/gi, "karşılıklı maç geçmişi")
    .replace(/\bencounters?\b/gi, "karşılaşma")
    .replace(/\bmatches?\b/gi, "maç")
    .replace(/\bgames?\b/gi, "maç")
    .replace(/\bhave won\b/gi, "galip geldi")
    .replace(/\bhas won\b/gi, "galip geldi")
    .replace(/\bwon\b/gi, "kazandı")
    .replace(/\bscored\b/gi, "gol kaydetti")
    .replace(/\blost\b/gi, "kaybetti")
    .replace(/\blosses?\b/gi, "mağlubiyet")
    .replace(/\bdrawn?\b/gi, "beraberlikle")
    .replace(/\bdraws?\b/gi, "beraberlik")
    .replace(/\bboth teams\b/gi, "her iki takım da")
    .replace(/\bhome team\b/gi, "ev sahibi takım")
    .replace(/\baway team\b/gi, "deplasman takımı")
    .replace(/\bhome\b/gi, "ev sahibi")
    .replace(/\baway\b/gi, "deplasman")
    .replace(/\bout of\b/gi, "karşılaşmadan")
    .replace(/\btheir last\b/gi, "son")
    .replace(/\bthe last\b/gi, "son")
    .replace(/\blast\b/gi, "son")
    .replace(/\baverage\b/gi, "ortalama")
    .replace(/\bgoals? per game\b/gi, "maç başına gol")
    .replace(/\bgoals?\b/gi, "gol")
    .replace(/\bwin\b/gi, "galibiyet")
    .replace(/\bwins\b/gi, "galibiyet")
    .replace(/\bagainst\b/gi, "karşısında")
    .replace(/\bin \d+ of these\b/gi, (m) => m.replace("in", "").replace("of these", "tanesinde").trim())
    .replace(/\balso\b/gi, "aynı zamanda")
    .replace(/\bthey\b/gi, "ev sahibi takım")
    .replace(/\bthe team\b/gi, "takım");
}
