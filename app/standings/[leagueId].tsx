import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandMark from "../../src/components/common/BrandMark";
import TournamentBracket from "../../src/components/standings/TournamentBracket";
import { useAppTheme } from "../../src/hooks/useAppTheme";
import { useMatches } from "../../src/hooks/useMatches";
import { useLeagueRecentFixtures, buildTeamFormMap } from "../../src/hooks/useLeagueFixtures";
import { useStandings } from "../../src/hooks/useStandings";
import { useTopAssists } from "../../src/hooks/useTopAssists";
import { useTopScorers } from "../../src/hooks/useTopScorers";
import { TopScorer } from "../../src/types";
import { getDescriptionColor, getLeagueRankColor, translateDescription } from "../../src/utils/matchUtils";
import { applyProjections } from "../../src/utils/standingsProjection";

const FORM_COLORS: Record<string, string> = {
  W: "#00C851",
  D: "#FF8800",
  L: "#FF4444",
};

const FORM_LETTER_MAP: Record<string, Record<string, string>> = {
  tr: { W: "G", D: "B", L: "M" },
};

type Tab = "standings" | "scorers" | "assists" | "bracket";

/**
 * Leagues that have a knockout bracket stage.
 * The "Eşleşmeler" tab is ONLY shown for these leagues.
 */
const CUP_LEAGUE_IDS = new Set([
  '2',   '3',   '848', '531', // UEFA CL / Europa / Conference / Super Cup
  '1',   '4',   '5',   '6',   '9',   '33',  // FIFA WC / EURO / NL / Copa Am / AFCON
  '32',  '34',  // WC Qualifiers (Play-offs phase)
  '206', '551',             // Türkiye Kupası / Süper Kupa
  '45',  '48',              // FA Cup / Carabao Cup
  '66',  '81',  '89',       // Coupe de France / DFB-Pokal / KNVB
  '143', '137',             // Copa del Rey / Coppa Italia
  '116',                    // Scottish Cup
  '153', '73',              // Copa do Brasil / Copa Argentina
  '65',                     // Coupe de la Ligue (France)
]);

/**
 * Leagues where the standings tab is hidden entirely (pure knockout cups).
 * Default tab becomes "bracket" for these.
 */
const HIDE_STANDINGS_LEAGUE_IDS = new Set([
  '206',  // Türkiye Kupası — group stage data is messy, show only bracket
]);

export default function StandingsScreen() {
  const {
    leagueId,
    name,
    logo,
    season: seasonParam,
    teamId,
  } = useLocalSearchParams<{
    leagueId: string;
    name: string;
    logo: string;
    season: string;
    teamId?: string;
  }>();
  const theme = useAppTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
    const season = seasonParam && seasonParam !== "undefined" ? seasonParam : String(new Date().getFullYear() - 1);

  const hideStandings = leagueId ? HIDE_STANDINGS_LEAGUE_IDS.has(leagueId) : false;
  const [activeTab, setActiveTab] = useState<Tab>(hideStandings ? "bracket" : "standings");

  // Bazı ligler (eleme turu ID'leri) için grup aşaması farklı bir ID altında tutulur.
  // Örnek: 206 (TR Kupa eleme) → 552 (TR Kupa grup aşaması)
  const STANDINGS_FALLBACK: Record<string, string> = {};
  const fallbackId = STANDINGS_FALLBACK[leagueId ?? ""];

  const {
    data: standingsData,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useStandings(leagueId!, season, undefined, undefined, teamId);

  const primaryEmpty = !isLoading && (standingsData?.rows ?? []).length === 0;

  const {
    data: fallbackData,
    isLoading: fallbackLoading,
  } = useStandings(fallbackId ?? "", season, !!fallbackId && primaryEmpty, undefined, teamId);

  // Birincil veri boşsa ve fallback varsa onu kullan
  const activeStandingsData = primaryEmpty && fallbackData ? fallbackData : standingsData;

  const allGroups = activeStandingsData?.groups ?? [];
  const hasGroups = allGroups.length > 1;
  const [selectedGroupIdx, setSelectedGroupIdx] = useState(0);

  const activeGroupRows = hasGroups
    ? (allGroups[selectedGroupIdx]?.rows ?? [])
    : (activeStandingsData?.rows ?? []);
  const groupName = hasGroups
    ? (allGroups[selectedGroupIdx]?.name ?? "")
    : (activeStandingsData?.groupName ?? "");

  const { data: scorers = [], isLoading: scorersLoading, refetch: refetchScorers } = useTopScorers(
    leagueId!,
    season,
  );
  const { data: assisters = [], isLoading: assistsLoading, refetch: refetchAssists } = useTopAssists(
    leagueId!,
    season,
  );

  // Bugünkü maçları çek — bu ligdeki canlı/biten maçları projeksiyon için kullan.
  // useMatches zaten cache'de varsa ağ isteği yapmaz (staleTime: 30s).
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const { data: todayMatches = [], refetch: refetchMatches } = useMatches(today);

  // Ligin son 50 fikstürünü çek — her takımın formunu gerçek skor verisinden hesapla.
  // Takım sayfasıyla aynı kaynak (getMatchResultForTeam), API form string'i devre dışı.
  const { data: recentFixtures = [] } = useLeagueRecentFixtures(leagueId!, season);
  const teamFormMap = React.useMemo(
    () => buildTeamFormMap(recentFixtures),
    [recentFixtures],
  );

  // Bu lig için projeksiyon: canlı ve yeni biten maçların sonucunu tabloya yansıt.
  // applyProjections() çift sayım korumasını içeriyor (API güncellediyse atla).
  const leagueMatches = React.useMemo(
    () => todayMatches.filter((m) => String(m.league.id) === String(leagueId)),
    [todayMatches, leagueId],
  );
  const { rows: standings, isProjecting } = React.useMemo(
    () => applyProjections(activeGroupRows, leagueMatches),
    [activeGroupRows, leagueMatches],
  );

  // Sayfa odaklandığında (her açılışta) en güncel veriyi çek
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchScorers();
      refetchAssists();
      refetchMatches(); // projeksiyon için maç verisi de taze olsun
    }, [refetch, refetchScorers, refetchAssists, refetchMatches])
  );

  const onRefresh = useCallback(() => {
    refetch();
    refetchScorers();
    refetchAssists();
  }, [refetch, refetchScorers, refetchAssists]);

  const goToTeam = (id: string, teamName: string, teamLogo: string) => {
    router.push(
      `/team/${id}?name=${encodeURIComponent(teamName)}&logo=${encodeURIComponent(teamLogo)}`,
    );
  };

  const goToPlayer = (scorer: TopScorer) => {
    router.push(
      `/player/${String(scorer.player.id)}?name=${encodeURIComponent(scorer.player.name)}&photo=${encodeURIComponent(scorer.player.photo)}` as any,
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Header */}
        <View
          style={[styles.header, { backgroundColor: theme.colors.surface, paddingTop: insets.top + 8 }]}
        >
          <TouchableOpacity
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/(tabs)")
            }
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            {logo && (
              <Image
                source={{ uri: decodeURIComponent(logo) }}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            )}
            <View>
              <Text
                style={[
                  styles.headerTitle,
                  { color: theme.colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {name ? decodeURIComponent(name) : t('standings.table')}
              </Text>
              <Text
                style={[
                  styles.headerSeason,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {season}/{parseInt(season) + 1}
              </Text>
            </View>
          </View>
          <BrandMark />
        </View>

        {/* Tab bar */}
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.divider,
            },
          ]}
        >
          {([
            // Hide standings tab for pure knockout cups (Türkiye Kupası etc.)
            ...(!hideStandings
              ? [{
                  key: "standings" as Tab,
                  label: t('standings.table'),
                  icon: "trophy-outline",
                }]
              : []),
            // Show bracket tab FIRST for hide-standings cups, so it feels like the main tab
            ...(leagueId && CUP_LEAGUE_IDS.has(leagueId) && hideStandings
              ? [{ key: "bracket" as Tab, label: t('standings.bracketTab'), icon: "git-branch-outline" }]
              : []),
            {
              key: "scorers" as Tab,
              label: t('standings.topScorers'),
              icon: "football-outline",
            },
            {
              key: "assists" as Tab,
              label: t('standings.topAssists'),
              icon: "swap-horizontal-outline",
            },
            // Bracket tab for non-hide-standings cup leagues (appears after assists)
            ...(leagueId && CUP_LEAGUE_IDS.has(leagueId) && !hideStandings
              ? [{ key: "bracket" as Tab, label: t('standings.bracketTab'), icon: "git-branch-outline" }]
              : []),
          ] as { key: Tab; label: string; icon: string }[]).map((tab) => {
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
                  color={
                    active ? theme.colors.primary : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: active
                        ? theme.colors.primary
                        : theme.colors.textSecondary,
                    },
                    active && { fontWeight: "700" },
                  ]}
                >
                  {tab.label}
                </Text>
                {active && (
                  <View
                    style={[
                      styles.tabIndicator,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === "standings" ? (
          (isLoading || (primaryEmpty && !!fallbackId && fallbackLoading)) ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : isError && standings.length === 0 ? (
            <View style={styles.center}>
              <Ionicons
                name="trophy-outline"
                size={48}
                color={theme.colors.textSecondary + "60"}
              />
              <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
                {t('standings.tableNotFound')}
              </Text>
              <TouchableOpacity
                onPress={() => refetch()}
                style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={styles.retryBtnText}>{t('common.retry') ?? 'Tekrar Dene'}</Text>
              </TouchableOpacity>
            </View>
          ) : standings.length === 0 ? (
            <View style={styles.center}>
              <Ionicons
                name="trophy-outline"
                size={48}
                color={theme.colors.textSecondary + "60"}
              />
              <Text style={{ color: theme.colors.textSecondary, marginTop: 12, textAlign: 'center', paddingHorizontal: 32 }}>
                {CUP_LEAGUE_IDS.has(leagueId!)
                  ? "Bu eleme turu için puan tablosu bulunmuyor.\nEşleşmeler sekmesine göz atabilirsiniz."
                  : t('standings.tableNotFound')}
              </Text>
              {CUP_LEAGUE_IDS.has(leagueId!) ? (
                <TouchableOpacity
                  onPress={() => setActiveTab("bracket")}
                  style={[styles.retryBtn, { backgroundColor: theme.colors.primary, marginTop: 16 }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryBtnText}>Eşleşmelere Git</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => refetch()}
                  style={[styles.retryBtn, { backgroundColor: theme.colors.primary, marginTop: 16 }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryBtnText}>{t('common.retry') ?? 'Tekrar Dene'}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <ScrollView
              horizontal={false}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                />
              }
            >
              {/* Grup Seçici — birden fazla grup varsa göster */}
              {hasGroups && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ paddingVertical: 8 }}
                  contentContainerStyle={{ paddingHorizontal: 12, gap: 8, flexDirection: 'row' }}
                >
                  {allGroups.map((g, idx) => (
                    <TouchableOpacity
                      key={g.name}
                      onPress={() => setSelectedGroupIdx(idx)}
                      activeOpacity={0.75}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 20,
                        backgroundColor: idx === selectedGroupIdx
                          ? theme.colors.primary
                          : theme.colors.surface,
                        borderWidth: 1,
                        borderColor: idx === selectedGroupIdx
                          ? theme.colors.primary
                          : theme.colors.divider,
                      }}
                    >
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: idx === selectedGroupIdx ? '#fff' : theme.colors.textSecondary,
                      }}>
                        {g.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Table header */}
              <View
                style={[
                  styles.tableHeader,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <Text
                  style={[styles.thRank, { color: theme.colors.textSecondary }]}
                  adjustsFontSizeToFit numberOfLines={1}
                >
                  #
                </Text>
                <Text
                  style={[styles.thTeam, { color: theme.colors.textSecondary }]}
                >
                  {t('standings.team')}
                </Text>
                <Text
                  style={[styles.thStat, { color: theme.colors.textSecondary }]}
                  adjustsFontSizeToFit numberOfLines={1}
                >
                  {t('standings.played')}
                </Text>
                <Text
                  style={[styles.thStat, { color: theme.colors.textSecondary }]}
                  adjustsFontSizeToFit numberOfLines={1}
                >
                  {t('standings.win')}
                </Text>
                <Text
                  style={[styles.thStat, { color: theme.colors.textSecondary }]}
                  adjustsFontSizeToFit numberOfLines={1}
                >
                  {t('standings.draw')}
                </Text>
                <Text
                  style={[styles.thStat, { color: theme.colors.textSecondary }]}
                  adjustsFontSizeToFit numberOfLines={1}
                >
                  {t('standings.loss')}
                </Text>
                <Text
                  style={[styles.thStat, { color: theme.colors.textSecondary }]}
                  adjustsFontSizeToFit numberOfLines={1}
                >
                  {t('standings.goalDiff')}
                </Text>
                <Text
                  style={[
                    styles.thPoints,
                    { color: theme.colors.textSecondary },
                  ]}
                  adjustsFontSizeToFit numberOfLines={1}
                >
                  {t('standings.points')}
                </Text>
                <Text
                  style={[styles.thForm, { color: theme.colors.textSecondary }]}
                >
                  {t('standings.form')}
                </Text>
              </View>

              {standings.map((row, index) => (
                <TouchableOpacity
                  key={row.team.id ?? `row-${index}`}
                  style={[
                    styles.tableRow,
                    {
                      backgroundColor:
                        index % 2 === 0
                          ? theme.colors.card
                          : theme.colors.background,
                    },
                  ]}
                  onPress={() =>
                    goToTeam(row.team.id, row.team.name, row.team.logoUrl)
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.rankCol}>
                    <View
                      style={[
                        styles.rankDot,
                        { backgroundColor: getLeagueRankColor(leagueId!, row.rank, standings.length, row.description) },
                      ]}
                    />
                    <Text
                      style={[styles.rank, { color: theme.colors.textPrimary }]}
                      adjustsFontSizeToFit numberOfLines={1}
                    >
                      {row.rank}
                    </Text>
                  </View>
                  <View style={styles.teamCol}>
                    <Image
                      source={{ uri: row.team.logoUrl }}
                      style={styles.teamLogo}
                      resizeMode="contain"
                    />
                    <Text
                      style={[
                        styles.teamName,
                        { color: theme.colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {row.team.name}
                    </Text>
                  </View>
                  <Text
                    style={[styles.stat, { color: theme.colors.textSecondary }]}
                    adjustsFontSizeToFit numberOfLines={1}
                  >
                    {row.played}
                  </Text>
                  <Text
                    style={[styles.stat, { color: theme.colors.textPrimary }]}
                    adjustsFontSizeToFit numberOfLines={1}
                  >
                    {row.won}
                  </Text>
                  <Text
                    style={[styles.stat, { color: theme.colors.textSecondary }]}
                    adjustsFontSizeToFit numberOfLines={1}
                  >
                    {row.drawn}
                  </Text>
                  <Text
                    style={[styles.stat, { color: theme.colors.textSecondary }]}
                    adjustsFontSizeToFit numberOfLines={1}
                  >
                    {row.lost}
                  </Text>
                  <Text
                    style={[
                      styles.stat,
                      {
                        color:
                          row.goalDifference > 0
                            ? "#00C851"
                            : row.goalDifference < 0
                              ? "#FF4444"
                              : theme.colors.textSecondary,
                      },
                    ]}
                    adjustsFontSizeToFit numberOfLines={1}
                  >
                    {row.goalDifference > 0
                      ? `+${row.goalDifference}`
                      : row.goalDifference}
                  </Text>
                  <Text
                    style={[styles.points, { color: theme.colors.textPrimary }]}
                    adjustsFontSizeToFit numberOfLines={1}
                  >
                    {row.points}
                  </Text>
                  <View style={styles.formCol}>
                    {(teamFormMap.get(String(row.team.id)) ?? "")
                      .split("")
                      .slice(-5)
                      .map((f, fi) => (
                        <View
                          key={fi}
                          style={[
                            styles.formDot,
                            { backgroundColor: FORM_COLORS[f] ?? "#888" },
                          ]}
                        >
                          <Text style={styles.formDotText}>{FORM_LETTER_MAP[i18n.language]?.[f] ?? f}</Text>
                        </View>
                      ))}
                  </View>
                </TouchableOpacity>
              ))}

              {/* Legend — ligden otomatik */}
              <StandingsLegend rows={standings} leagueId={leagueId!} language={i18n.language} theme={theme} />
            </ScrollView>
          )
        ) : activeTab === "scorers" ? (
          /* Top Scorers Tab */
          scorersLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : scorers.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="football-outline" size={48} color={theme.colors.textSecondary + "60"} />
              <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
                {t('standings.topScorersNotFound')}
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal={false}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
            >
              <PlayerListHeader cols={["M", "G", "A"]} t={t} theme={theme} />
              {scorers.map((scorer, index) => (
                <PlayerListRow
                  key={scorer.player.id ?? `scorer-${index}`}
                  scorer={scorer}
                  index={index}
                  highlightValue={scorer.goals}
                  cols={[scorer.matches, scorer.goals, scorer.assists]}
                  theme={theme}
                  onPress={() => goToPlayer(scorer)}
                />
              ))}
            </ScrollView>
          )
        ) : activeTab === "assists" ? (
          /* Top Assists Tab */
          assistsLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : assisters.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="swap-horizontal-outline" size={48} color={theme.colors.textSecondary + "60"} />
              <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
                {t('standings.topAssistsNotFound')}
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal={false}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
            >
              <PlayerListHeader cols={["M", "G", "A"]} t={t} theme={theme} />
              {assisters.map((assister, index) => (
                <PlayerListRow
                  key={assister.player.id ?? `assister-${index}`}
                  scorer={assister}
                  index={index}
                  highlightValue={assister.assists}
                  cols={[assister.matches, assister.goals, assister.assists]}
                  theme={theme}
                  onPress={() => goToPlayer(assister)}
                />
              ))}
            </ScrollView>
          )
        ) : (
          /* Tournament Bracket Tab */
          <TournamentBracket
            leagueId={leagueId!}
            season={season}
            theme={theme}
            onMatchPress={(matchId) => router.push(`/match/${matchId}` as any)}
          />
        )}
      </View>
    </>
  );
}

// ─── Dynamic Standings Legend ────────────────────────────────────────────────

const TFF1_LEGEND = [
  { color: '#2E7D32', tr: "Süper Lig'e Yükselme",  en: 'Promotion to Süper Lig' },
  { color: '#00897B', tr: 'Play-off Final',          en: 'Play-off Final' },
  { color: '#F57C00', tr: 'Play-off Çeyrek Final',   en: 'Play-off Quarter-Final' },
  { color: '#FF4444', tr: 'Küme Düşme',              en: 'Relegation' },
];

function StandingsLegend({
  rows,
  leagueId,
  language,
  theme,
}: {
  rows: { description?: string }[];
  leagueId: string;
  language: string;
  theme: any;
}) {
  const items = React.useMemo(() => {
    if (String(leagueId) === '204') {
      return TFF1_LEGEND.map(item => ({
        label: language === 'tr' ? item.tr : item.en,
        color: item.color,
      }));
    }
    const seen = new Map<string, string>();
    for (const row of rows) {
      const desc = row.description;
      if (!desc) continue;
      const color = getDescriptionColor(desc);
      if (color === "transparent") continue;
      const label = translateDescription(desc, language);
      if (!seen.has(label)) seen.set(label, color);
    }
    return Array.from(seen.entries()).map(([label, color]) => ({ label, color }));
  }, [rows, leagueId, language]);

  if (items.length === 0) return null;

  return (
    <View style={[legendStyle.wrapper, { borderTopColor: theme.colors.divider }]}>
      {items.map((item, i) => (
        <View key={i} style={legendStyle.item}>
          <View style={[legendStyle.dot, { backgroundColor: item.color }]} />
          <Text style={[legendStyle.text, { color: theme.colors.textSecondary }]}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const legendStyle = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 14,
    marginHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 10 },
});

// ─── Shared player list components (Scorers & Assists) ───────────────────────

function PlayerListHeader({ cols, t, theme }: { cols: string[]; t: any; theme: any }) {
  return (
    <View style={[playerStyles.header, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Text style={[playerStyles.thRank, { color: theme.colors.textSecondary }]}>#</Text>
      <Text style={[playerStyles.thName, { color: theme.colors.textSecondary }]}>
        {t('standings.player')}
      </Text>
      {cols.map((c) => (
        <Text key={c} style={[playerStyles.thStat, { color: theme.colors.textSecondary }]}>{c}</Text>
      ))}
    </View>
  );
}

function PlayerListRow({
  scorer,
  index,
  highlightValue,
  cols,
  theme,
  onPress,
}: {
  scorer: TopScorer;
  index: number;
  highlightValue: number;
  cols: number[];
  theme: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        playerStyles.row,
        { backgroundColor: index % 2 === 0 ? theme.colors.card : theme.colors.background },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          playerStyles.rank,
          { color: index < 3 ? theme.colors.primary : theme.colors.textSecondary },
        ]}
      >
        {scorer.rank}
      </Text>
      <Image source={{ uri: scorer.player.photo }} style={playerStyles.photo} />
      <View style={playerStyles.info}>
        <Text style={[playerStyles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {scorer.player.name}
        </Text>
        <View style={playerStyles.teamRow}>
          <Image source={{ uri: scorer.team.logoUrl }} style={playerStyles.teamLogo} resizeMode="contain" />
          <Text style={[playerStyles.teamName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {scorer.team.name}
          </Text>
        </View>
      </View>
      {cols.map((val, i) => (
        <Text
          key={i}
          style={[
            playerStyles.stat,
            val === highlightValue && i === cols.indexOf(highlightValue)
              ? { color: theme.colors.primary, fontWeight: "800" as const, fontSize: 14 }
              : { color: theme.colors.textSecondary },
          ]}
        >
          {val}
        </Text>
      ))}
    </TouchableOpacity>
  );
}

const playerStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  thRank: { width: 24, fontSize: 10, fontWeight: "700", textAlign: "center" },
  thName: { flex: 1, fontSize: 10, fontWeight: "700", marginLeft: 40 },
  thStat: { width: 32, fontSize: 10, fontWeight: "700", textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rank: { width: 24, fontSize: 14, fontWeight: "800", textAlign: "center" },
  photo: { width: 36, height: 36, borderRadius: 18, marginLeft: 8 },
  info: { flex: 1, marginLeft: 10, gap: 2 },
  name: { fontSize: 13, fontWeight: "600" },
  teamRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  teamLogo: { width: 14, height: 14 },
  teamName: { fontSize: 11 },
  stat: { width: 32, fontSize: 13, textAlign: "center" },
});

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden", maxWidth: "100%" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  projectionBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 7,
  },
  projectionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FF8800" },
  projectionText: { fontSize: 11, fontWeight: "600" as const, flex: 1 },
  groupHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center" as const,
  },
  groupHeaderText: {
    fontSize: 13,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    paddingHorizontal: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  headerLogo: { width: 28, height: 28, borderRadius: 4 },
  headerTitle: { fontSize: 15, fontWeight: "700" },
  headerSeason: { fontSize: 11, marginTop: 1 },

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

  // Table header
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  thRank: { width: 30, fontSize: 10, fontWeight: "700", textAlign: "center", minWidth: 30 },
  thTeam: { flex: 1, fontSize: 10, fontWeight: "700" },
  thStat: { width: 26, fontSize: 10, fontWeight: "700", textAlign: "center", minWidth: 26 },
  thPoints: { width: 28, fontSize: 10, fontWeight: "700", textAlign: "center", minWidth: 28 },
  thForm: { width: 72, fontSize: 10, fontWeight: "700", textAlign: "center" },

  // Table row
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  rankCol: { width: 30, flexDirection: "row", alignItems: "center", gap: 4, minWidth: 30 },
  rankDot: { width: 3, height: 14, borderRadius: 2 },
  rank: { fontSize: 12, fontWeight: "700" },
  teamCol: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  teamLogo: { width: 20, height: 20 },
  teamName: { fontSize: 12, fontWeight: "600", flex: 1 },
  stat: { width: 26, fontSize: 12, textAlign: "center", minWidth: 26 },
  points: { width: 28, fontSize: 13, fontWeight: "800", textAlign: "center", minWidth: 28 },
  formCol: {
    width: 72,
    flexDirection: "row",
    gap: 2,
    justifyContent: "center",
  },
  formDot: {
    width: 13,
    height: 13,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  formDotText: { color: "#fff", fontSize: 8, fontWeight: "700" },


});
