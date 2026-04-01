import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {

    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../src/hooks/useAppTheme";
import { useStandings } from "../../src/hooks/useStandings";
import { useTopScorers } from "../../src/hooks/useTopScorers";
import { TopScorer } from "../../src/types";

const FORM_COLORS: Record<string, string> = {
  W: "#00C851",
  D: "#FF8800",
  L: "#FF4444",
};

const FORM_LETTER_MAP: Record<string, Record<string, string>> = {
  tr: { W: "G", D: "B", L: "M" },
};

type Tab = "standings" | "scorers";

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
  const season = seasonParam ?? String(new Date().getFullYear() - 1);
  const [activeTab, setActiveTab] = useState<Tab>("standings");

  const {
    data: standingsData,
    isLoading,
    isError,
  } = useStandings(leagueId!, season, undefined, undefined, teamId);
  const standings = standingsData?.rows ?? [];
  const groupName = standingsData?.groupName ?? "";
  const { data: scorers = [], isLoading: scorersLoading } = useTopScorers(
    leagueId!,
    season,
  );

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
          <View style={styles.backBtn} />
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
          {[
            {
              key: "standings" as Tab,
              label: t('standings.table'),
              icon: "trophy-outline",
            },
            {
              key: "scorers" as Tab,
              label: t('standings.topScorers'),
              icon: "football-outline",
            },
          ].map((tab) => {
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
          isLoading ? (
            <View style={styles.center}>
            </View>
          ) : isError || standings.length === 0 ? (
            <View style={styles.center}>
              <Ionicons
                name="trophy-outline"
                size={48}
                color={theme.colors.textSecondary + "60"}
              />
              <Text
                style={{ color: theme.colors.textSecondary, marginTop: 12 }}
              >
                {t('standings.tableNotFound')}
              </Text>
            </View>
          ) : (
            <ScrollView horizontal={false} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
              {/* Table header */}
              <View
                style={[
                  styles.tableHeader,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <Text
                  style={[styles.thRank, { color: theme.colors.textSecondary }]}
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
                >
                  {t('standings.played')}
                </Text>
                <Text
                  style={[styles.thStat, { color: theme.colors.textSecondary }]}
                >
                  {t('standings.win')}
                </Text>
                <Text
                  style={[styles.thStat, { color: theme.colors.textSecondary }]}
                >
                  {t('standings.draw')}
                </Text>
                <Text
                  style={[styles.thStat, { color: theme.colors.textSecondary }]}
                >
                  {t('standings.loss')}
                </Text>
                <Text
                  style={[styles.thStat, { color: theme.colors.textSecondary }]}
                >
                  {t('standings.goalDiff')}
                </Text>
                <Text
                  style={[
                    styles.thPoints,
                    { color: theme.colors.textSecondary },
                  ]}
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
                        {
                          backgroundColor:
                            index < 4
                              ? "#00C851"
                              : index < 6
                                ? "#2196F3"
                                : index >= standings.length - 3
                                  ? "#FF4444"
                                  : "transparent",
                        },
                      ]}
                    />
                    <Text
                      style={[styles.rank, { color: theme.colors.textPrimary }]}
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
                  >
                    {row.played}
                  </Text>
                  <Text
                    style={[styles.stat, { color: theme.colors.textPrimary }]}
                  >
                    {row.won}
                  </Text>
                  <Text
                    style={[styles.stat, { color: theme.colors.textSecondary }]}
                  >
                    {row.drawn}
                  </Text>
                  <Text
                    style={[styles.stat, { color: theme.colors.textSecondary }]}
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
                  >
                    {row.goalDifference > 0
                      ? `+${row.goalDifference}`
                      : row.goalDifference}
                  </Text>
                  <Text
                    style={[styles.points, { color: theme.colors.textPrimary }]}
                  >
                    {row.points}
                  </Text>
                  <View style={styles.formCol}>
                    {row.form
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

              {/* Legend */}
              <View
                style={[
                  styles.legend,
                  { borderTopColor: theme.colors.divider },
                ]}
              >
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#00C851" }]}
                  />
                  <Text
                    style={[
                      styles.legendText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t('standings.championsLeague')}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#2196F3" }]}
                  />
                  <Text
                    style={[
                      styles.legendText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t('standings.europaLeague')}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#FF4444" }]}
                  />
                  <Text
                    style={[
                      styles.legendText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t('standings.relegation')}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )
        ) : /* Top Scorers Tab */
        scorersLoading ? (
          <View style={styles.center}>
          </View>
        ) : scorers.length === 0 ? (
          <View style={styles.center}>
            <Ionicons
              name="football-outline"
              size={48}
              color={theme.colors.textSecondary + "60"}
            />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
              {t('standings.topScorersNotFound')}
            </Text>
          </View>
        ) : (
          <ScrollView horizontal={false} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
            {/* Scorers header */}
            <View
              style={[
                styles.scorerHeader,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <Text
                style={[
                  styles.scorerThRank,
                  { color: theme.colors.textSecondary },
                ]}
              >
                #
              </Text>
              <Text
                style={[
                  styles.scorerThName,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t('standings.player')}
              </Text>
              <Text
                style={[
                  styles.scorerThStat,
                  { color: theme.colors.textSecondary },
                ]}
              >
                M
              </Text>
              <Text
                style={[
                  styles.scorerThStat,
                  { color: theme.colors.textSecondary },
                ]}
              >
                G
              </Text>
              <Text
                style={[
                  styles.scorerThStat,
                  { color: theme.colors.textSecondary },
                ]}
              >
                A
              </Text>
            </View>

            {scorers.map((scorer, index) => (
              <TouchableOpacity
                key={scorer.player.id ?? `scorer-${index}`}
                style={[
                  styles.scorerRow,
                  {
                    backgroundColor:
                      index % 2 === 0
                        ? theme.colors.card
                        : theme.colors.background,
                  },
                ]}
                onPress={() => goToPlayer(scorer)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.scorerRank,
                    {
                      color:
                        index < 3
                          ? theme.colors.primary
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {scorer.rank}
                </Text>
                <Image
                  source={{ uri: scorer.player.photo }}
                  style={styles.playerPhoto}
                />
                <View style={styles.scorerInfo}>
                  <Text
                    style={[
                      styles.playerName,
                      { color: theme.colors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {scorer.player.name}
                  </Text>
                  <View style={styles.scorerTeamRow}>
                    <Image
                      source={{ uri: scorer.team.logoUrl }}
                      style={styles.scorerTeamLogo}
                      resizeMode="contain"
                    />
                    <Text
                      style={[
                        styles.scorerTeamName,
                        { color: theme.colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {scorer.team.name}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.scorerStat,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {scorer.matches}
                </Text>
                <Text
                  style={[styles.scorerGoals, { color: theme.colors.primary }]}
                >
                  {scorer.goals}
                </Text>
                <Text
                  style={[
                    styles.scorerStat,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {scorer.assists}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden", maxWidth: "100%" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
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
  thRank: { width: 30, fontSize: 10, fontWeight: "700", textAlign: "center" },
  thTeam: { flex: 1, fontSize: 10, fontWeight: "700" },
  thStat: { width: 26, fontSize: 10, fontWeight: "700", textAlign: "center" },
  thPoints: { width: 28, fontSize: 10, fontWeight: "700", textAlign: "center" },
  thForm: { width: 72, fontSize: 10, fontWeight: "700", textAlign: "center" },

  // Table row
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  rankCol: { width: 30, flexDirection: "row", alignItems: "center", gap: 4 },
  rankDot: { width: 3, height: 14, borderRadius: 2 },
  rank: { fontSize: 12, fontWeight: "700" },
  teamCol: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  teamLogo: { width: 20, height: 20 },
  teamName: { fontSize: 12, fontWeight: "600", flex: 1 },
  stat: { width: 26, fontSize: 12, textAlign: "center" },
  points: { width: 28, fontSize: 13, fontWeight: "800", textAlign: "center" },
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

  // Legend
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 16,
    marginHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10 },

  // Scorers
  scorerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scorerThRank: {
    width: 24,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  scorerThName: { flex: 1, fontSize: 10, fontWeight: "700", marginLeft: 40 },
  scorerThStat: {
    width: 32,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  scorerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scorerRank: {
    width: 24,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  playerPhoto: { width: 36, height: 36, borderRadius: 18, marginLeft: 8 },
  scorerInfo: { flex: 1, marginLeft: 10, gap: 2 },
  playerName: { fontSize: 13, fontWeight: "600" },
  scorerTeamRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  scorerTeamLogo: { width: 14, height: 14 },
  scorerTeamName: { fontSize: 11 },
  scorerStat: { width: 32, fontSize: 13, textAlign: "center" },
  scorerGoals: {
    width: 32,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
});
