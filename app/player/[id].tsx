import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../src/hooks/useAppTheme";
import { usePlayerFixtures } from "../../src/hooks/usePlayerFixtures";
import { usePlayerProfile } from "../../src/hooks/usePlayerProfile";
import { Match, PlayerSeason, PlayerTransfer } from "../../src/types";
import { semanticColors } from "../../src/theme/tokens";
import { formatMatchTime, toIstanbulDate, translateCountry } from "../../src/utils/matchUtils";

type PlayerTab = "stats" | "career" | "transfers" | "matches";

const NATIONAL_TEAMS = [
  // Europe
  "Albania", "Andorra", "Armenia", "Austria", "Azerbaijan", "Belarus", "Belgium",
  "Bosnia and Herzegovina", "Bosnia & Herzegovina", "Bosnia",
  "Bulgaria", "Croatia", "Cyprus", "Czech Republic", "Czechia", "Denmark", "England", "Estonia", "Finland",
  "France", "Georgia", "Germany", "Greece", "Hungary", "Iceland", "Ireland", "Israel", "Italy", "Kazakhstan",
  "Kosovo", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Moldova", "Montenegro", "Netherlands",
  "North Macedonia", "Norway", "Poland", "Portugal", "Romania", "Russia", "San Marino", "Scotland", "Serbia",
  "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "Turkey", "Türkiye", "Ukraine", "Wales",

  // Americas
  "Antigua and Barbuda", "Argentina", "Bahamas", "Barbados", "Belize", "Bolivia", "Brazil", "Canada",
  "Chile", "Colombia", "Costa Rica", "Cuba", "Dominica", "Dominican Republic", "Ecuador", "El Salvador",
  "Grenada", "Guatemala", "Guyana", "Haiti", "Honduras", "Jamaica", "Mexico", "Nicaragua", "Panama",
  "Paraguay", "Peru", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Suriname", "Trinidad and Tobago", "USA", "United States", "Uruguay", "Venezuela",

  // Africa
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde", "Cameroon",
  "Central African Republic", "Chad", "Comoros", "Congo", "Democratic Republic of the Congo", "Côte d'Ivoire",
  "Ivory Coast", "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon",
  "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar",
  "Malawi", "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria",
  "Rwanda", "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone", "Somalia", "South Africa",
  "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe",

  // Asia
  "Afghanistan", "Australia", "Bahrain", "Bangladesh", "Bhutan", "Brunei", "Cambodia", "China",
  "East Timor", "Hong Kong", "India", "Indonesia", "Iran", "Iraq", "Japan", "Jordan", "Kuwait",
  "Kyrgyzstan", "Laos", "Lebanon", "Macao", "Malaysia", "Maldives", "Mongolia", "Myanmar", "Nepal",
  "North Korea", "Oman", "Pakistan", "Palestine", "Philippines", "Qatar", "Saudi Arabia", "Singapore",
  "South Korea", "Sri Lanka", "Syria", "Taiwan", "Tajikistan", "Thailand", "Turkmenistan", "United Arab Emirates",
  "Uzbekistan", "Vietnam", "Yemen",

  // Oceania
  "Fiji", "Kiribati", "Marshall Islands", "Micronesia", "Nauru", "New Zealand", "Palau", "Papua New Guinea",
  "Samoa", "Solomon Islands", "Tonga", "Tuvalu", "Vanuatu",
];

// Takım adından altyapı/rezerv etiketini çıkar
// Örnek: "Beşiktaş U21" → "U21", "Barcelona B" → "B", "Arsenal II" → "II"
function getYouthLabel(teamName: string): string | null {
  const u = teamName.match(/\bU(\d{2,3})\b/i);
  if (u) return `U${u[1]}`;
  const under = teamName.match(/\bUnder[- ]?(\d{2})\b/i);
  if (under) return `U${under[1]}`;
  if (/\bIII\b/.test(teamName)) return "III";
  if (/\bII\b/.test(teamName)) return "II";
  if (/\s+B$/i.test(teamName)) return "B";
  if (/\bReserves?\b/i.test(teamName)) return "Res.";
  if (/\bYouth\b/i.test(teamName)) return "Youth";
  return null;
}

const POSITION_TR: Record<string, string> = {
  Goalkeeper: "Kaleci",
  Defender: "Defans",
  Midfielder: "Orta Saha",
  Forward: "Forvet",
  Attacker: "Forvet",
};

interface MergedSeason {
  season: string;
  team: { id: string; name: string; shortName: string; logoUrl: string };
  matches: number;
  starts: number;
  minutes?: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  isNational: boolean;
  leagueType?: string;
}

function mergeSeasons(seasons: PlayerSeason[]): MergedSeason[] {
  // seasons dizisi api.ts'de zaten sıralanmış gelir:
  // önce en yeni sezon, aynı sezonda en son transfer edilen takım önce.
  // Map insertion order'ı korur; son sort sadece sezon yılı farklıyken devreye girer.
  const escRx = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Ülke adlarını regex olarak ön-derle (her mergeSeasons çağrısında 1 kez)
  const countryPatterns = NATIONAL_TEAMS.map(n => {
    const nc = n.toLowerCase();
    return { nc, regex: new RegExp(`\\b${escRx(nc)}\\b`) };
  });
  const map = new Map<string, MergedSeason>();
  for (const s of seasons) {
    // Normalize: API bazen "&" kullanır ("Bosnia & Herzegovina" vs "Bosnia and Herzegovina")
    const normalizedTeam = s.team.name.toLowerCase().replace(/&/g, " and ").replace(/\s+/g, " ").trim();
    const isNational = countryPatterns.some(({ nc, regex }) => {
      // Ülke adı takım adında TAM KELİME olarak geçiyor mu?
      // "bosnia and herzegovina" ✓, "iran" in "tirana" ✗, "peru" in "perugia" ✗
      if (regex.test(normalizedTeam)) return true;
      // API kısa ad döndürürse: takım adı ülke adında tam kelime mi?
      // "bosnia" → \bbosnia\b matches "bosnia and herzegovina" ✓
      // "roma" → \broma\b does NOT match "romania" ✓ (no word boundary after "roma" in "romania")
      if (normalizedTeam.length >= 4) {
        if (new RegExp(`\\b${escRx(normalizedTeam)}\\b`).test(nc)) return true;
      }
      return false;
    });
    // Benzersiz key: sezon + takım ID + kulüp/milli takım ayrımı
    const key = `${s.season}-${s.team.id}-${isNational ? "NT" : "CLUB"}`;
    const existing = map.get(key);
    if (existing) {
      // Aynı takımın farklı liglerdeki istatistiklerini topla
      existing.matches  += s.matches;
      existing.starts   += s.starts;
      existing.minutes   = (existing.minutes ?? 0) + (s.minutes ?? 0);
      existing.goals    += s.goals;
      existing.assists  += s.assists;
      existing.yellowCards += s.yellowCards;
      existing.redCards    += s.redCards;
    } else {
      map.set(key, {
        season: s.season,
        team: s.team,
        matches: s.matches,
        starts: s.starts,
        minutes: s.minutes,
        goals: s.goals,
        assists: s.assists,
        yellowCards: s.yellowCards,
        redCards: s.redCards,
        isNational: !!isNational,
        leagueType: s.leagueType,
      });
    }
  }
  // Stable sort: farklı sezonlar arasında sırala; aynı sezon içindeki
  // sıra (api.ts'den gelen transfer tarihine göre) bozulmadan korunur.
  return Array.from(map.values())
    .filter(s => s.matches > 0 && (s.minutes ?? 0) > 0 && !!s.team.name)
    .sort((a, b) => Number(b.season) - Number(a.season));
}

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const params = useLocalSearchParams<{ name: string; photo: string }>();
  const theme = useAppTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isTr = i18n.language === "tr";

  const playerId = parseInt(id ?? "0");
  const playerName = params.name ? decodeURIComponent(params.name) : "";
  const playerPhoto = params.photo ? decodeURIComponent(params.photo) : "";

  const { data: player, isLoading, isError } = usePlayerProfile(playerId);
  const [activeTab, setActiveTab] = useState<PlayerTab>("stats");
  // Futbol sezonu Temmuz'da başlar. Temmuz öncesiyse aktif sezon bir önceki yıldır.
  // Örnek: Mart 2026 → season=2025 (2025-26), Eylül 2026 → season=2026 (2026-27)
  const _now = new Date();
  const currentSeason = _now.getMonth() >= 6 ? _now.getFullYear() : _now.getFullYear() - 1;

  const merged = useMemo(
    () => (player ? mergeSeasons(player.seasons) : []),
    [player],
  );
  const clubSeasons = useMemo(() => merged.filter((s) => !s.isNational), [merged]);

  // Oyuncunun mevcut kulübünün ID'si — en güncel sezonun takımından alınır.
  // /fixtures?player= bu API planında desteklenmediği için takım bazlı çekiyoruz.
  const currentTeamId = useMemo(() => {
    const club = merged.find((s) => !s.isNational);
    return club?.team.id ?? "";
  }, [merged]);

  const { data: fixtures = [], isLoading: fixturesLoading } = usePlayerFixtures(
    activeTab === "matches" ? currentTeamId : "",
    activeTab === "matches" ? playerId : 0,
    activeTab === "matches" ? currentSeason : 0,
  );
  const nationalSeasons = useMemo(() => merged.filter((s) => s.isNational), [merged]);

  const filteredTransfers = useMemo(() => {
    if (!player || !player.transfers) return [];
    // Group by "from_team_id-to_team_id", keep the most recent
    const map = new Map<string, PlayerTransfer>();
    for (const t of player.transfers) {
      const key = `${t.teamOut.name || "unknown"}-${t.teamIn.name || "unknown"}`;
      const existing = map.get(key);
      if (!existing || new Date(t.date || "").getTime() > new Date(existing.date || "").getTime()) {
        map.set(key, t);
      }
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.date || "").getTime() - new Date(a.date || "").getTime());
  }, [player]);

  const totalStats = useMemo(() => {
    if (!player || !player.seasons) return null;
    return player.seasons.reduce(
      (acc, curr) => ({
        matches: acc.matches + curr.matches,
        minutes: acc.minutes + (curr.minutes ?? 0),
        goals: acc.goals + curr.goals,
        assists: acc.assists + curr.assists,
        yellowCards: acc.yellowCards + curr.yellowCards,
        redCards: acc.redCards + curr.redCards,
      }),
      { matches: 0, minutes: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
    );
  }, [player]);

  const positionLabel = player
    ? isTr
      ? POSITION_TR[player.position] ?? player.position
      : player.position
    : "";

  const currentClub = player?.currentTeam || "";
  const currentClubLogo = player?.currentTeamLogo || "";

  const goToTeam = (teamId: string, teamName: string, teamLogo: string) => {
    router.push(
      `/team/${teamId}?name=${encodeURIComponent(teamName)}&logo=${encodeURIComponent(teamLogo)}`,
    );
  };

  const formatSeason = (s: string) => {
    const y = parseInt(s);
    return `${String(y).slice(-2)}/${String(y + 1).slice(-2)}`;
  };

  const tabs = [
    { key: "stats" as PlayerTab, label: isTr ? "İstatistik" : "Stats", icon: "stats-chart-outline" },
    { key: "career" as PlayerTab, label: isTr ? "Kariyer" : "Career", icon: "briefcase-outline" },
    { key: "matches" as PlayerTab, label: isTr ? "Maçlar" : "Matches", icon: "football-outline" },
    { key: "transfers" as PlayerTab, label: isTr ? "Transfer" : "Transfers", icon: "swap-horizontal-outline" },
  ];

  const renderSeasonRow = (item: MergedSeason, index: number) => (
    <View
      key={`${item.season}-${item.team.id}-${index}`}
      style={[
        styles.seasonRow,
        {
          backgroundColor:
            index % 2 === 0 ? theme.colors.card : theme.colors.background,
        },
      ]}
    >
      <Text style={[styles.seasonYear, { color: theme.colors.primary }]}>
        {formatSeason(item.season)}
      </Text>
      <TouchableOpacity
        style={styles.seasonTeam}
        onPress={() => goToTeam(item.team.id, item.team.name, item.team.logoUrl)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.team.logoUrl }} style={styles.teamLogo} resizeMode="contain" />
        <Text
          style={[styles.teamName, { color: theme.colors.textPrimary }]}
          numberOfLines={1}
        >
          {item.isNational ? translateCountry(item.team.name, i18n.language) : item.team.name}
        </Text>
        {getYouthLabel(item.team.name) && (
          <View style={[styles.youthBadge, { backgroundColor: theme.colors.primary + "22" }]}>
            <Text style={[styles.youthBadgeText, { color: theme.colors.primary }]}>
              {getYouthLabel(item.team.name)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={[styles.statCell, { color: theme.colors.textPrimary }]}>{item.matches}</Text>
      <Text style={[styles.statCell, { color: theme.colors.textSecondary }]}>{item.starts}</Text>
      <Text style={[styles.statCell, { color: item.goals > 0 ? semanticColors.win : theme.colors.textSecondary }]}>{item.goals}</Text>
      <Text style={[styles.statCell, { color: item.assists > 0 ? semanticColors.assist : theme.colors.textSecondary }]}>{item.assists}</Text>
      <Text style={[styles.statCell, { color: item.yellowCards > 0 ? semanticColors.draw : theme.colors.textSecondary }]}>{item.yellowCards}</Text>
      <Text style={[styles.statCell, { color: item.redCards > 0 ? semanticColors.loss : theme.colors.textSecondary }]}>{item.redCards}</Text>
    </View>
  );

  const renderTransfer = (item: PlayerTransfer, index: number) => (
    <View
      key={`transfer-${index}`}
      style={[
        styles.transferRow,
        {
          backgroundColor:
            index % 2 === 0 ? theme.colors.card : theme.colors.background,
        },
      ]}
    >
      <Text style={[styles.transferDate, { color: theme.colors.textSecondary }]}>
        {item.date ? item.date.substring(0, 10) : "—"}
      </Text>
      <View style={styles.transferTeams}>
        <View style={styles.transferTeamItem}>
          {item.teamOut.logo ? (
            <Image source={{ uri: item.teamOut.logo }} style={styles.transferTeamLogo} resizeMode="contain" />
          ) : null}
          <Text style={[styles.transferTeamName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.teamOut.name || "—"}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
        <View style={styles.transferTeamItem}>
          {item.teamIn.logo ? (
            <Image source={{ uri: item.teamIn.logo }} style={styles.transferTeamLogo} resizeMode="contain" />
          ) : null}
          <Text style={[styles.transferTeamName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {item.teamIn.name || "—"}
          </Text>
        </View>
      </View>
      <Text style={[styles.transferType, { color: theme.colors.textSecondary }]}>
        {item.type}
      </Text>
    </View>
  );

  const sectionHeader = (title: string) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
    </View>
  );

  const tableHeader = () => (
    <View style={[styles.tableHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Text style={[styles.thSeason, { color: theme.colors.textSecondary }]}>
        {isTr ? "Sezon" : "Season"}
      </Text>
      <Text style={[styles.thTeam, { color: theme.colors.textSecondary }]}>
        {t("standings.team")}
      </Text>
      <View style={styles.thIcon}><Ionicons name="shirt-outline" size={12} color={theme.colors.textSecondary} /></View>
      <View style={styles.thIcon}>
        <View style={[styles.thStartBadge, { borderColor: theme.colors.textSecondary }]}>
          <Text style={[styles.thStartText, { color: theme.colors.textSecondary }]}>11</Text>
        </View>
      </View>
      <View style={styles.thIcon}><Ionicons name="football-outline"   size={12} color={theme.colors.textSecondary} /></View>
      <View style={styles.thIcon}><Ionicons name="arrow-redo-outline" size={12} color={theme.colors.textSecondary} /></View>
      <View style={styles.thIcon}><View style={[styles.thCardBox, { backgroundColor: "#F5C518" }]} /></View>
      <View style={styles.thIcon}><View style={[styles.thCardBox, { backgroundColor: "#E53935" }]} /></View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Back bar */}
        <View style={[styles.backBar, { backgroundColor: theme.colors.surface, paddingTop: insets.top + 4 }]}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.center} />
        ) : isError || !player ? (
          <View style={styles.center}>
            <Ionicons name="person-outline" size={48} color={theme.colors.textSecondary + "60"} />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
              {t("player.notFound")}
            </Text>
          </View>
        ) : (
            <ScrollView
            horizontal={false}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={{ flex: 1 }}
          >
            {/* Hero header */}
            <View style={[styles.hero, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider }]}>
              <Image
                source={{ uri: playerPhoto || player.photo }}
                style={[styles.heroPhoto, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.primary }]}
              />
              <Text style={[styles.heroName, { color: theme.colors.textPrimary }]}>
                {player.name}
              </Text>
              <View style={styles.heroMeta}>
                <View style={[styles.metaChip, { backgroundColor: theme.colors.primary + "18" }]}>
                  <Text style={[styles.metaChipText, { color: theme.colors.primary }]}>
                    {player.number ? `#${player.number}` : positionLabel}
                  </Text>
                </View>
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {player.age} {isTr ? "yaş" : "yrs"}
                </Text>
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {translateCountry(player.nationality, i18n.language)}
                </Text>
                {player.birth?.date && (
                  <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                    {isTr ? "Doğum:" : "Birth:"} {player.birth.date}
                  </Text>
                )}
                {player.birth?.place && (
                  <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                    {player.birth.place}
                    {player.birth.country && `, ${translateCountry(player.birth.country, i18n.language)}`}
                  </Text>
                )}
              </View>
              {currentClub ? (
                <View style={styles.currentClubRow}>
                  {currentClubLogo ? (
                    <Image source={{ uri: currentClubLogo }} style={styles.currentClubLogo} resizeMode="contain" />
                  ) : null}
                  <Text style={[styles.currentClubName, { color: theme.colors.textSecondary }]}>
                    {currentClub}
                  </Text>
                </View>
              ) : null}

              {/* Quick stats */}
              {totalStats && (
                <View style={styles.quickStats}>
                  <QuickStat label={isTr ? "Maç" : "Apps"} value={totalStats.matches} color={theme.colors.textPrimary} bg={theme.colors.surfaceVariant} />
                  <QuickStat label={t("player.goals")} value={totalStats.goals} color={semanticColors.win} bg={semanticColors.win + "15"} />
                  <QuickStat label={t("player.assists")} value={totalStats.assists} color={semanticColors.assist} bg={semanticColors.assist + "15"} />
                </View>
              )}
            </View>

            {/* Tab bar */}
            <View style={[styles.tabBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider }]}>
              {tabs.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={styles.tabItem}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={tab.icon as any}
                      size={16}
                      color={active ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.tabText,
                        { color: active ? theme.colors.primary : theme.colors.textSecondary },
                        active && { fontWeight: "700" },
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {active && (
                      <View style={[styles.tabIndicator, { backgroundColor: theme.colors.primary }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tab content — no nested ScrollViews */}
            {activeTab === "stats" ? (
              <View>
                {sectionHeader(isTr ? "KULÜP KARİYERİ" : "CLUB CAREER")}
                {tableHeader()}
                {clubSeasons.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    {isTr ? "Veri bulunamadı" : "No data"}
                  </Text>
                ) : (
                  clubSeasons.map((item, i) => renderSeasonRow(item, i))
                )}
                {nationalSeasons.length > 0 && (
                  <>
                    <View style={[styles.careerNtDivider, { backgroundColor: theme.colors.divider }]} />
                    <View style={[styles.careerSectionHeader, { backgroundColor: theme.colors.primary + "CC" }]}>
                      <Ionicons name="flag-outline" size={13} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.careerSectionTitle}>{isTr ? "MİLLİ TAKIM KARİYERİ" : "NATIONAL TEAM CAREER"}</Text>
                    </View>
                    {tableHeader()}
                    {nationalSeasons.map((item, i) => renderSeasonRow(item, i))}
                  </>
                )}
              </View>
            ) : activeTab === "career" ? (
              <View>
                {/* ── Kulüp Kariyeri ── */}
                <View style={[styles.careerSectionHeader, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.careerSectionTitle}>{isTr ? "KULÜP KARİYERİ" : "CLUB CAREER"}</Text>
                </View>
                {/* Tablo başlığı */}
                <View style={[styles.careerTableHeader, { backgroundColor: theme.colors.surfaceVariant, borderBottomColor: theme.colors.divider }]}>
                  <Text style={[styles.careerThSeason, { color: theme.colors.textSecondary }]}>{isTr ? "SEZON" : "SEASON"}</Text>
                  <Text style={[styles.careerThTeam,   { color: theme.colors.textSecondary }]}>{isTr ? "KULÜP" : "CLUB"}</Text>
                  <Text style={[styles.careerThStat,   { color: theme.colors.textSecondary }]}>M</Text>
                  <Text style={[styles.careerThStat,   { color: theme.colors.textSecondary }]}>G</Text>
                  <Text style={[styles.careerThStat,   { color: theme.colors.textSecondary }]}>A</Text>
                </View>
                {clubSeasons.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    {isTr ? "Veri bulunamadı" : "No data"}
                  </Text>
                ) : (
                  clubSeasons.map((item, i) => (
                    <TouchableOpacity
                      key={`career-club-${item.season}-${item.team.id}-${i}`}
                      style={[styles.careerDataRow, { backgroundColor: i % 2 === 0 ? (theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)') : 'transparent', borderBottomColor: theme.colors.divider }]}
                      onPress={() => goToTeam(item.team.id, item.team.name, item.team.logoUrl)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.careerRowSeason, { color: theme.colors.primary }]}>{formatSeason(item.season)}</Text>
                      <View style={styles.careerRowTeam}>
                        <Image source={{ uri: item.team.logoUrl }} style={styles.careerRowLogo} resizeMode="contain" />
                        <Text style={[styles.careerRowTeamName, { color: theme.colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">{item.isNational ? translateCountry(item.team.name, i18n.language) : item.team.name}</Text>
                        {getYouthLabel(item.team.name) && (
                          <View style={[styles.youthBadge, { backgroundColor: theme.colors.primary + "22" }]}>
                            <Text style={[styles.youthBadgeText, { color: theme.colors.primary }]}>{getYouthLabel(item.team.name)}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.careerRowStat, { color: theme.colors.textPrimary, fontWeight: "700" }]}>{item.matches}</Text>
                      <Text style={[styles.careerRowStat, { color: item.goals > 0 ? semanticColors.win : theme.colors.textSecondary }]}>{item.goals}</Text>
                      <Text style={[styles.careerRowStat, { color: item.assists > 0 ? semanticColors.assist : theme.colors.textSecondary }]}>{item.assists}</Text>
                    </TouchableOpacity>
                  ))
                )}

                {/* ── Milli Takım Kariyeri ── */}
                {nationalSeasons.length > 0 && (
                  <>
                    <View style={[styles.careerNtDivider, { backgroundColor: theme.colors.divider }]} />
                    <View style={[styles.careerSectionHeader, { backgroundColor: theme.colors.primary + "CC" }]}>
                      <Ionicons name="flag-outline" size={13} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.careerSectionTitle}>{isTr ? "MİLLİ TAKIM KARİYERİ" : "NATIONAL TEAM CAREER"}</Text>
                    </View>
                    <View style={[styles.careerTableHeader, { backgroundColor: theme.colors.surfaceVariant, borderBottomColor: theme.colors.divider }]}>
                      <Text style={[styles.careerThSeason, { color: theme.colors.textSecondary }]}>{isTr ? "SEZON" : "SEASON"}</Text>
                      <Text style={[styles.careerThTeam,   { color: theme.colors.textSecondary }]}>{isTr ? "MİLLİ TAKIM" : "NATIONAL TEAM"}</Text>
                      <Text style={[styles.careerThStat,   { color: theme.colors.textSecondary }]}>M</Text>
                      <Text style={[styles.careerThStat,   { color: theme.colors.textSecondary }]}>G</Text>
                      <Text style={[styles.careerThStat,   { color: theme.colors.textSecondary }]}>A</Text>
                    </View>
                    {nationalSeasons.map((item, i) => (
                      <View
                        key={`career-nt-${item.season}-${item.team.id}-${i}`}
                        style={[styles.careerDataRow, { backgroundColor: i % 2 === 0 ? (theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)') : 'transparent', borderBottomColor: theme.colors.divider }]}
                      >
                        <Text style={[styles.careerRowSeason, { color: theme.colors.primary }]}>{formatSeason(item.season)}</Text>
                        <View style={styles.careerRowTeam}>
                          <Image source={{ uri: item.team.logoUrl }} style={styles.careerRowLogo} resizeMode="contain" />
                          <Text style={[styles.careerRowTeamName, { color: theme.colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">{translateCountry(item.team.name, i18n.language)}</Text>
                        </View>
                        <Text style={[styles.careerRowStat, { color: theme.colors.textPrimary, fontWeight: "700" }]}>{item.matches}</Text>
                        <Text style={[styles.careerRowStat, { color: item.goals > 0 ? semanticColors.win : theme.colors.textSecondary }]}>{item.goals}</Text>
                        <Text style={[styles.careerRowStat, { color: item.assists > 0 ? semanticColors.assist : theme.colors.textSecondary }]}>{item.assists}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            ) : activeTab === "matches" ? (
              <View>
                {fixturesLoading ? (
                  <View style={[styles.center, { paddingVertical: 48 }]}>
                    <Ionicons name="football-outline" size={48} color={theme.colors.textSecondary + "60"} />
                    <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
                      {isTr ? "Yükleniyor..." : "Loading..."}
                    </Text>
                  </View>
                ) : fixtures.length === 0 ? (
                  <View style={[styles.center, { paddingVertical: 48 }]}>
                    <Ionicons name="football-outline" size={48} color={theme.colors.textSecondary + "60"} />
                    <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
                      {isTr ? "Maç bulunamadı" : "No matches found"}
                    </Text>
                  </View>
                ) : (
                  <>
                    {sectionHeader(`${merged.find(s => !s.isNational)?.team.name ?? ""} · ${currentSeason}-${currentSeason + 1}`)}
                    {fixtures.map((match, i) => (
                      <PlayerMatchRow
                        key={match.id}
                        match={match}
                        index={i}
                        onPress={() => router.push(`/match/${match.id}`)}
                        theme={theme}
                      />
                    ))}
                  </>
                )}
              </View>
            ) : (
              <View>
                {filteredTransfers.length === 0 ? (
                  <View style={[styles.center, { paddingVertical: 48 }]}>
                    <Ionicons name="swap-horizontal-outline" size={48} color={theme.colors.textSecondary + "60"} />
                    <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
                      {isTr ? "Transfer bilgisi bulunamadı" : "No transfer data"}
                    </Text>
                  </View>
                ) : (
                  <>
                    {sectionHeader(isTr ? "Transfer Geçmişi" : "Transfer History")}
                    {filteredTransfers.map((item, i) => renderTransfer(item, i))}
                  </>
                )}
              </View>
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        )}
      </View>
    </>
  );
}

function PlayerMatchRow({
  match,
  index,
  onPress,
  theme,
}: {
  match: Match;
  index: number;
  onPress: () => void;
  theme: ReturnType<typeof import("../../src/hooks/useAppTheme").useAppTheme>;
}) {
  const isLive = match.status === "live" || match.status === "half_time";
  const isFinished = match.status === "finished";
  const isPostponed = match.status === "postponed";
  const isCancelled = match.status === "cancelled";

  const scoreOrTime = () => {
    if (isFinished || isLive) {
      return `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`;
    }
    if (isPostponed) return "Ert.";
    if (isCancelled) return "İpt.";
    return formatMatchTime(match.startTime);
  };

  const dateStr = toIstanbulDate(new Date(match.startTime)).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.matchRow,
        { backgroundColor: index % 2 === 0 ? theme.colors.card : theme.colors.background,
          borderBottomColor: theme.colors.divider },
      ]}
    >
      {/* Tarih */}
      <View style={styles.matchDateCol}>
        <Text style={[styles.matchDate, { color: theme.colors.textSecondary }]}>{dateStr}</Text>
        <Text style={[styles.matchLeague, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {match.league.name}
        </Text>
      </View>

      {/* Ev sahibi */}
      <View style={styles.matchTeamCol}>
        <Image source={{ uri: match.homeTeam.logoUrl }} style={styles.matchTeamLogo} resizeMode="contain" />
        <Text style={[styles.matchTeamName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {match.homeTeam.name}
        </Text>
      </View>

      {/* Skor / Saat */}
      <View style={styles.matchScoreCol}>
        <Text style={[
          styles.matchScore,
          { color: isLive ? "#FF4444" : theme.colors.textPrimary },
        ]}>
          {scoreOrTime()}
        </Text>
        {isLive && (
          <Text style={[styles.matchMinute, { color: "#FF4444" }]}>
            {match.minute ? `${match.minute}'` : "●"}
          </Text>
        )}
      </View>

      {/* Deplasman */}
      <View style={[styles.matchTeamCol, { alignItems: "flex-end" }]}>
        <Image source={{ uri: match.awayTeam.logoUrl }} style={styles.matchTeamLogo} resizeMode="contain" />
        <Text style={[styles.matchTeamName, { color: theme.colors.textPrimary, textAlign: "right" }]} numberOfLines={1}>
          {match.awayTeam.name}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={12} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );
}

function QuickStat({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <View style={[styles.quickStatBox, { backgroundColor: bg }]}>
      <Text style={[styles.quickStatValue, { color }]}>{value}</Text>
      <Text style={[styles.quickStatLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden", maxWidth: "100%" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },

  // Back bar
  backBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  heroPhoto: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
  },
  heroName: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metaText: {
    fontSize: 12,
  },
  currentClubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  currentClubLogo: {
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  currentClubName: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Quick stats
  quickStats: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  quickStatBox: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 70,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    gap: 3,
    position: "relative",
  },
  tabText: { fontSize: 11, fontWeight: "500" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 2.5,
    borderRadius: 2,
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionDivider: {
    borderBottomWidth: 3,
    marginVertical: 20,
    marginHorizontal: 12,
  },

  // Table header
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  thSeason: {
    width: 62,
    fontSize: 10,
    fontWeight: "700",
  },
  thTeam: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
  },
  thStat: {
    width: 30,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  thIcon: {
    width: 30,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  thCardBox: {
    width: 10,
    height: 14,
    borderRadius: 2,
  },
  thStartBadge: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 2,
    paddingVertical: 0,
  },
  thStartText: {
    fontSize: 8,
    fontWeight: "800",
    lineHeight: 12,
  },

  // Season row
  seasonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    overflow: "hidden",
  },
  seasonYear: {
    fontSize: 10,
    fontWeight: "600",
    width: 62,
  },
  seasonTeam: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  teamLogo: {
    width: 16,
    height: 16,
  },
  teamName: {
    fontSize: 11,
    fontWeight: "500",
    flex: 1,
  },
  youthBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youthBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  statCell: {
    width: 30,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 13,
    paddingVertical: 20,
  },

  // Career redesign
  careerSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  careerSectionTitle: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  careerTableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  careerThSeason: {
    width: 42,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  careerThTeam: {
    flex: 1,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.4,
    paddingLeft: 2,
  },
  careerThStat: {
    width: 30,
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.4,
  },
  careerDataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  careerRowSeason: {
    width: 42,
    fontSize: 12,
    fontWeight: "700",
  },
  careerRowTeam: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 6,
    overflow: "hidden",
  },
  careerRowLogo: {
    width: 20,
    height: 20,
    borderRadius: 3,
    flexShrink: 0,
  },
  careerRowTeamName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  careerRowStat: {
    width: 30,
    fontSize: 12,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  careerNtDivider: {
    height: 6,
  },

  // Transfer row
  transferRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  transferDate: {
    fontSize: 11,
    fontWeight: "600",
  },
  transferTeams: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  transferTeamItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  transferTeamLogo: {
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  transferTeamName: {
    fontSize: 12,
    flex: 1,
  },
  transferType: {
    fontSize: 10,
    fontStyle: "italic",
  },

  // Match row
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  matchDateCol: {
    width: 44,
    gap: 2,
  },
  matchDate: {
    fontSize: 9,
    fontWeight: "600",
  },
  matchLeague: {
    fontSize: 8,
    opacity: 0.7,
  },
  matchTeamCol: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  matchTeamLogo: {
    width: 20,
    height: 20,
  },
  matchTeamName: {
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
  },
  matchScoreCol: {
    width: 52,
    alignItems: "center",
    gap: 2,
  },
  matchScore: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  matchMinute: {
    fontSize: 9,
    fontWeight: "700",
  },
});
