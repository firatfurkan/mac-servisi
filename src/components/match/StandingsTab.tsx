import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { buildTeamFormMap, useLeagueRecentFixtures } from "../../hooks/useLeagueFixtures";
import { useMatches } from "../../hooks/useMatches";
import { useRoundFixtures } from "../../hooks/useRoundFixtures";
import { useStandings } from "../../hooks/useStandings";
import { Match } from "../../types";
import { formatMatchTime, getDescriptionColor, getLeagueRankColor, isKnockoutRound, translateDescription, translateRound } from "../../utils/matchUtils";
import { applyProjections } from "../../utils/standingsProjection";

const FORM_COLORS: Record<string, string> = {
  W: "#00C851",
  D: "#FF8800",
  L: "#FF4444",
};

const FORM_LETTER_MAP: Record<string, Record<string, string>> = {
  tr: { W: "G", D: "B", L: "M" },
};

interface StandingsTabProps {
  leagueId: string;
  season: string;
  homeTeamId: string;
  awayTeamId: string;
  isLive: boolean;
  isFinished?: boolean;
  homeScore?: number | null;
  awayScore?: number | null;
  round?: string;
}

export default function StandingsTab({
  leagueId,
  season,
  homeTeamId,
  awayTeamId,
  isLive,
  isFinished = false,
  homeScore,
  awayScore,
  round,
}: StandingsTabProps) {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const router = useRouter();

  const isKnockout = isKnockoutRound(round);
  const baseRound = round?.replace(/\s*-\s*(1st|2nd)\s*Leg/i, "").trim() ?? "";

  // Canlı + biten maçlarda 90s'de bir yeniden fetch et (API gecikmesini yakalamak için)
  const { data: standingsData, isLoading, isError, refetch } = useStandings(
    leagueId,
    season,
    !isKnockout,
    (isLive || isFinished) ? 90_000 : false,
    homeTeamId,
  );
  const groupName = standingsData?.groupName ?? "";

  // Bugünkü tüm lig maçlarını çek — lig sayfasıyla aynı projeksiyon mantığı.
  // useMatches cache'de varsa ağ isteği yapmaz (staleTime: 30s).
  const today = new Date().toISOString().split("T")[0];
  const { data: todayMatches = [] } = useMatches(today);

  const leagueMatches = React.useMemo(
    () => todayMatches.filter((m) => String(m.league.id) === String(leagueId)),
    [todayMatches, leagueId],
  );

  // Projeksiyon: canlı veya biten maçlarda bugünkü tüm lig maçlarını yansıt.
  const { rows: standings, isProjecting } = React.useMemo(() => {
    const raw = standingsData?.rows ?? [];
    if (!isLive && !isFinished) return { rows: raw, isProjecting: false };
    return applyProjections(raw, leagueMatches);
  }, [standingsData?.rows, isLive, isFinished, leagueMatches]);

  // Ligin son 60 fikstüründen form → API row.form yerine gerçek skor verisi kullanılır.
  const { data: recentFixtures = [] } = useLeagueRecentFixtures(leagueId, season);
  const teamFormMap = React.useMemo(
    () => buildTeamFormMap(recentFixtures),
    [recentFixtures],
  );

  // For knockout: fetch both legs
  const firstLegRound = baseRound ? `${baseRound} - 1st Leg` : "";
  const secondLegRound = baseRound ? `${baseRound} - 2nd Leg` : "";

  const { data: firstLegFixtures = [], isLoading: firstLegLoading } = useRoundFixtures(
    leagueId,
    season,
    firstLegRound,
    isKnockout,
  );
  const { data: secondLegFixtures = [], isLoading: secondLegLoading } = useRoundFixtures(
    leagueId,
    season,
    secondLegRound,
    isKnockout,
  );
  // Also fetch the exact round if it doesn't have a leg suffix (e.g., "Final", "Semi-finals")
  const isSingleLeg = isKnockout && round && !/leg/i.test(round);
  const { data: singleRoundFixtures = [], isLoading: singleRoundLoading } = useRoundFixtures(
    leagueId,
    season,
    round ?? "",
    !!isSingleLeg,
  );

  const goToTeam = (id: string, teamName: string, teamLogo: string) => {
    router.push(
      `/team/${id}?name=${encodeURIComponent(teamName)}&logo=${encodeURIComponent(teamLogo)}`,
    );
  };

  const goToMatch = (matchId: string) => {
    router.push(`/match/${matchId}`);
  };

  // ─── KNOCKOUT MODE ───
  if (isKnockout) {
    const loading = isSingleLeg ? singleRoundLoading : (firstLegLoading || secondLegLoading);
    if (loading) {
      return <View style={styles.center} />;
    }

    // For single-leg rounds (e.g. Final)
    if (isSingleLeg && singleRoundFixtures.length > 0) {
      return (
        <ScrollView horizontal={false} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
          <View style={[styles.roundHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.roundTitle, { color: theme.colors.primary }]}>
              {translateRound(round, i18n.language)}
            </Text>
          </View>
          {singleRoundFixtures.map((m) => (
            <KnockoutFixtureRow
              key={m.id}
              match={m}
              homeTeamId={homeTeamId}
              awayTeamId={awayTeamId}
              theme={theme}
              t={t}
              i18n={i18n}
              onPress={() => goToMatch(m.id)}
            />
          ))}
        </ScrollView>
      );
    }

    // For two-leg rounds: build matchups from first + second leg
    const matchups = buildMatchups(firstLegFixtures, secondLegFixtures);

    if (matchups.length === 0) {
      return (
        <View style={styles.center}>
          <Ionicons name="trophy-outline" size={48} color={theme.colors.textSecondary + "60"} />
          <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
            {t("standings.tableNotFound")}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView horizontal={false} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
        <View style={[styles.roundHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={[styles.roundTitle, { color: theme.colors.primary }]}>
            {translateRound(baseRound, i18n.language)}
          </Text>
        </View>
        {matchups.map((matchup, idx) => (
          <KnockoutMatchup
            key={idx}
            matchup={matchup}
            homeTeamId={homeTeamId}
            awayTeamId={awayTeamId}
            theme={theme}
            t={t}
            i18n={i18n}
            onMatchPress={goToMatch}
          />
        ))}
      </ScrollView>
    );
  }

  // ─── LEAGUE STANDINGS MODE ───
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isError && standings.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons
          name="trophy-outline"
          size={48}
          color={theme.colors.textSecondary + "60"}
        />
        <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
          {t("standings.tableNotFound")}
        </Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
          activeOpacity={0.8}
        >
          <Text style={styles.retryBtnText}>{t('common.retry') ?? 'Tekrar Dene'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (standings.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView horizontal={false} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
      {/* Group name header (e.g. Kırmızı Grup / Beyaz Grup) */}
      {!!groupName && (
        <View style={[styles.groupHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={[styles.groupHeaderText, { color: theme.colors.primary }]}>
            {groupName}
          </Text>
        </View>
      )}
      {/* Table header */}
      <View
        style={[
          styles.tableHeader,
          { backgroundColor: theme.colors.surfaceVariant },
        ]}
      >
        <Text style={[styles.thRank, { color: theme.colors.textSecondary }]} adjustsFontSizeToFit numberOfLines={1}>
          #
        </Text>
        <Text style={[styles.thTeam, { color: theme.colors.textSecondary }]}>
          {t("standings.team")}
        </Text>
        <Text style={[styles.thStat, { color: theme.colors.textSecondary }]} adjustsFontSizeToFit numberOfLines={1}>
          {t("standings.played")}
        </Text>
        <Text style={[styles.thStat, { color: theme.colors.textSecondary }]} adjustsFontSizeToFit numberOfLines={1}>
          {t("standings.win")}
        </Text>
        <Text style={[styles.thStat, { color: theme.colors.textSecondary }]} adjustsFontSizeToFit numberOfLines={1}>
          {t("standings.draw")}
        </Text>
        <Text style={[styles.thStat, { color: theme.colors.textSecondary }]} adjustsFontSizeToFit numberOfLines={1}>
          {t("standings.loss")}
        </Text>
        <Text style={[styles.thStat, { color: theme.colors.textSecondary }]} adjustsFontSizeToFit numberOfLines={1}>
          {t("standings.goalDiff")}
        </Text>
        <Text
          style={[styles.thPoints, { color: theme.colors.textSecondary }]}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {t("standings.points")}
        </Text>
        <Text style={[styles.thForm, { color: theme.colors.textSecondary }]}>
          {t("standings.form")}
        </Text>
      </View>

      {standings.map((row, index) => {
        const isHighlighted =
          row.team.id === homeTeamId || row.team.id === awayTeamId;

        return (
          <TouchableOpacity
            key={row.team.id ?? `row-${index}`}
            style={[
              styles.tableRow,
              {
                backgroundColor: isHighlighted
                  ? theme.colors.primary + "15"
                  : index % 2 === 0
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
                  { backgroundColor: getLeagueRankColor(leagueId, row.rank, standings.length, row.description) },
                ]}
              />
              <Text style={[styles.rank, { color: theme.colors.textPrimary }]} adjustsFontSizeToFit numberOfLines={1}>
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
                  {
                    color: theme.colors.textPrimary,
                    fontWeight: isHighlighted ? "700" : "600",
                  },
                ]}
                numberOfLines={1}
              >
                {row.team.name}
              </Text>
              {isLive && isHighlighted && homeScore != null && awayScore != null && (() => {
                const isHome = row.team.id === homeTeamId;
                const myScore = isHome ? homeScore : awayScore;
                const theirScore = isHome ? awayScore : homeScore;
                const badgeColor =
                  myScore > theirScore ? "#00C851" :
                  myScore < theirScore ? "#FF4444" :
                  "#FFC107";
                return (
                  <View style={[styles.liveBadge, { backgroundColor: badgeColor }]}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>
                      {`${myScore}-${theirScore}`}
                    </Text>
                  </View>
                );
              })()}
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
                    <Text style={styles.formDotText}>
                      {FORM_LETTER_MAP[i18n.language]?.[f] ?? f}
                    </Text>
                  </View>
                ))}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Legend */}
      <DynamicLegend rows={standings} leagueId={leagueId} language={i18n.language} theme={theme} />
    </ScrollView>
  );
}

// ─── Dynamic Legend ──────────────────────────────────────────────────────────

const TFF1_LEGEND = [
  { color: '#2E7D32', tr: 'Süper Lig\'e Yükselme',    en: 'Promotion to Süper Lig' },
  { color: '#00897B', tr: 'Play-off Final',             en: 'Play-off Final' },
  { color: '#F57C00', tr: 'Play-off Çeyrek Final',      en: 'Play-off Quarter-Final' },
  { color: '#FF4444', tr: 'Küme Düşme',                 en: 'Relegation' },
];

function DynamicLegend({
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
    // TFF 1. Lig için sabit açıklama listesi
    if (String(leagueId) === '204') {
      return TFF1_LEGEND.map(item => ({
        label: language === 'tr' ? item.tr : item.en,
        color: item.color,
      }));
    }
    // Diğer ligler: API description bazlı
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
    <View style={[legendStyles.wrapper, { borderTopColor: theme.colors.divider }]}>
      {items.map((item, i) => (
        <View key={i} style={legendStyles.item}>
          <View style={[legendStyles.dot, { backgroundColor: item.color }]} />
          <Text style={[legendStyles.text, { color: theme.colors.textSecondary }]}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const legendStyles = StyleSheet.create({
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

// ─── Knockout matchup types & helpers ───

interface Matchup {
  team1: { id: string; name: string; logoUrl: string };
  team2: { id: string; name: string; logoUrl: string };
  firstLeg: Match | null;
  secondLeg: Match | null;
  aggregate: { team1Goals: number; team2Goals: number } | null;
  advancer: "team1" | "team2" | null;
  penaltyScore?: string;
}

function buildMatchups(firstLeg: Match[], secondLeg: Match[]): Matchup[] {
  const matchups: Matchup[] = [];

  // Index second leg matches by sorted team IDs for quick lookup
  const secondLegMap = new Map<string, Match>();
  for (const m of secondLeg) {
    const key = [m.homeTeam.id, m.awayTeam.id].sort().join("-");
    secondLegMap.set(key, m);
  }

  const usedKeys = new Set<string>();

  for (const fl of firstLeg) {
    const key = [fl.homeTeam.id, fl.awayTeam.id].sort().join("-");
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);

    // team1 = home team in 1st leg
    const team1 = fl.homeTeam;
    const team2 = fl.awayTeam;
    const sl = secondLegMap.get(key) ?? null;

    let aggregate: Matchup["aggregate"] = null;
    let advancer: Matchup["advancer"] = null;
    let penaltyScore: string | undefined;

    if (fl.status === "finished" && sl?.status === "finished") {
      // team1 goals = home goals in 1st leg + away goals in 2nd leg
      const isTeam1HomeInSL = sl.homeTeam.id === team1.id;
      const t1Goals = (fl.homeScore ?? 0) + (isTeam1HomeInSL ? (sl.homeScore ?? 0) : (sl.awayScore ?? 0));
      const t2Goals = (fl.awayScore ?? 0) + (isTeam1HomeInSL ? (sl.awayScore ?? 0) : (sl.homeScore ?? 0));
      aggregate = { team1Goals: t1Goals, team2Goals: t2Goals };

      // Determine advancer from winner field
      if (sl.winner === "home") {
        advancer = sl.homeTeam.id === team1.id ? "team1" : "team2";
      } else if (sl.winner === "away") {
        advancer = sl.awayTeam.id === team1.id ? "team1" : "team2";
      } else if (t1Goals > t2Goals) {
        advancer = "team1";
      } else if (t2Goals > t1Goals) {
        advancer = "team2";
      }

      // Penalty info
      if (sl.scorePenalty?.home != null && sl.scorePenalty?.away != null) {
        const penHome = sl.scorePenalty.home;
        const penAway = sl.scorePenalty.away;
        if (isTeam1HomeInSL) {
          penaltyScore = `${penHome}-${penAway}`;
        } else {
          penaltyScore = `${penAway}-${penHome}`;
        }
      }
    }

    matchups.push({
      team1,
      team2,
      firstLeg: fl,
      secondLeg: sl,
      aggregate,
      advancer,
      penaltyScore,
    });
  }

  // Handle second leg matches without a first leg match
  for (const sl of secondLeg) {
    const key = [sl.homeTeam.id, sl.awayTeam.id].sort().join("-");
    if (usedKeys.has(key)) continue;
    usedKeys.add(key);
    matchups.push({
      team1: sl.homeTeam,
      team2: sl.awayTeam,
      firstLeg: null,
      secondLeg: sl,
      aggregate: null,
      advancer: null,
    });
  }

  return matchups;
}

// ─── Knockout fixture row (single-leg) ───

function KnockoutFixtureRow({
  match: m,
  homeTeamId,
  awayTeamId,
  theme,
  t,
  i18n,
  onPress,
}: {
  match: Match;
  homeTeamId: string;
  awayTeamId: string;
  theme: any;
  t: any;
  i18n: any;
  onPress: () => void;
}) {
  const isHighlighted = m.homeTeam.id === homeTeamId || m.homeTeam.id === awayTeamId ||
    m.awayTeam.id === homeTeamId || m.awayTeam.id === awayTeamId;
  const isFinished = m.status === "finished";
  const homeWinner = m.winner === "home";
  const awayWinner = m.winner === "away";

  return (
    <TouchableOpacity
      style={[
        styles.fixtureRow,
        {
          backgroundColor: isHighlighted ? theme.colors.primary + "10" : theme.colors.card,
          borderBottomColor: theme.colors.divider,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Home */}
      <View style={styles.fixtureTeam}>
        <Image source={{ uri: m.homeTeam.logoUrl }} style={styles.fixtureLogo} resizeMode="contain" />
        <Text
          style={[
            styles.fixtureTeamName,
            { color: theme.colors.textPrimary, fontWeight: homeWinner ? "800" : "600" },
          ]}
          numberOfLines={1}
        >
          {m.homeTeam.name}
        </Text>
        {isFinished && homeWinner && (
          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" style={{ marginLeft: 4 }} />
        )}
      </View>

      {/* Score */}
      <View style={styles.fixtureScore}>
        {m.status === "not_started" ? (
          <Text style={[styles.fixtureTime, { color: theme.colors.textSecondary }]}>
            {formatMatchTime(m.startTime)}
          </Text>
        ) : (
          <Text style={[styles.fixtureScoreText, { color: theme.colors.textPrimary }]}>
            {m.homeScore} - {m.awayScore}
          </Text>
        )}
        {m.scorePenalty?.home != null && m.scorePenalty?.away != null && (
          <Text style={[styles.fixturePen, { color: theme.colors.textSecondary }]}>
            ({t("matchDetail.pen")} {m.scorePenalty.home}-{m.scorePenalty.away})
          </Text>
        )}
      </View>

      {/* Away */}
      <View style={[styles.fixtureTeam, { justifyContent: "flex-end" }]}>
        {isFinished && awayWinner && (
          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" style={{ marginRight: 4 }} />
        )}
        <Text
          style={[
            styles.fixtureTeamName,
            { color: theme.colors.textPrimary, fontWeight: awayWinner ? "800" : "600", textAlign: "right" },
          ]}
          numberOfLines={1}
        >
          {m.awayTeam.name}
        </Text>
        <Image source={{ uri: m.awayTeam.logoUrl }} style={styles.fixtureLogo} resizeMode="contain" />
      </View>
    </TouchableOpacity>
  );
}

// ─── Knockout matchup (two-leg) ───

function KnockoutMatchup({
  matchup,
  homeTeamId,
  awayTeamId,
  theme,
  t,
  i18n,
  onMatchPress,
}: {
  matchup: Matchup;
  homeTeamId: string;
  awayTeamId: string;
  theme: any;
  t: any;
  i18n: any;
  onMatchPress: (id: string) => void;
}) {
  const { team1, team2, firstLeg, secondLeg, aggregate, advancer, penaltyScore } = matchup;
  const isHighlighted =
    team1.id === homeTeamId || team1.id === awayTeamId ||
    team2.id === homeTeamId || team2.id === awayTeamId;

  return (
    <View
      style={[
        styles.matchupCard,
        {
          backgroundColor: isHighlighted ? theme.colors.primary + "08" : theme.colors.card,
          borderColor: theme.colors.divider,
        },
      ]}
    >
      {/* Team rows */}
      <View style={styles.matchupTeams}>
        {/* Header row */}
        <View style={styles.matchupHeaderRow}>
          <View style={{ flex: 1 }} />
          <Text style={[styles.matchupLegLabel, { color: theme.colors.textSecondary }]}>
            {i18n.language === "tr" ? "1." : "1st"}
          </Text>
          <Text style={[styles.matchupLegLabel, { color: theme.colors.textSecondary }]}>
            {i18n.language === "tr" ? "2." : "2nd"}
          </Text>
          {aggregate && (
            <Text style={[styles.matchupAggLabel, { color: theme.colors.textSecondary }]}>
              {t("matchDetail.aggregate")}
            </Text>
          )}
        </View>

        {/* Team 1 row */}
        <TouchableOpacity
          style={styles.matchupTeamRow}
          onPress={() => firstLeg && onMatchPress(firstLeg.id)}
          activeOpacity={0.7}
        >
          <View style={styles.matchupTeamInfo}>
            <Image source={{ uri: team1.logoUrl }} style={styles.fixtureLogo} resizeMode="contain" />
            <Text
              style={[
                styles.matchupTeamName,
                {
                  color: theme.colors.textPrimary,
                  fontWeight: advancer === "team1" ? "800" : "600",
                },
              ]}
              numberOfLines={1}
            >
              {team1.name}
            </Text>
            {advancer === "team1" && (
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={[styles.matchupScore, { color: theme.colors.textPrimary }]}>
            {firstLeg?.status === "finished" ? (firstLeg.homeScore ?? "-") : "-"}
          </Text>
          <Text style={[styles.matchupScore, { color: theme.colors.textPrimary }]}>
            {secondLeg?.status === "finished"
              ? (secondLeg.homeTeam.id === team1.id ? (secondLeg.homeScore ?? "-") : (secondLeg.awayScore ?? "-"))
              : secondLeg?.status === "not_started"
                ? formatMatchTime(secondLeg.startTime)
                : "-"}
          </Text>
          {aggregate && (
            <Text style={[styles.matchupAgg, { color: theme.colors.primary, fontWeight: "800" }]}>
              {aggregate.team1Goals}
            </Text>
          )}
        </TouchableOpacity>

        {/* Team 2 row */}
        <TouchableOpacity
          style={styles.matchupTeamRow}
          onPress={() => (secondLeg ? onMatchPress(secondLeg.id) : firstLeg && onMatchPress(firstLeg.id))}
          activeOpacity={0.7}
        >
          <View style={styles.matchupTeamInfo}>
            <Image source={{ uri: team2.logoUrl }} style={styles.fixtureLogo} resizeMode="contain" />
            <Text
              style={[
                styles.matchupTeamName,
                {
                  color: theme.colors.textPrimary,
                  fontWeight: advancer === "team2" ? "800" : "600",
                },
              ]}
              numberOfLines={1}
            >
              {team2.name}
            </Text>
            {advancer === "team2" && (
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={[styles.matchupScore, { color: theme.colors.textPrimary }]}>
            {firstLeg?.status === "finished" ? (firstLeg.awayScore ?? "-") : "-"}
          </Text>
          <Text style={[styles.matchupScore, { color: theme.colors.textPrimary }]}>
            {secondLeg?.status === "finished"
              ? (secondLeg.homeTeam.id === team2.id ? (secondLeg.homeScore ?? "-") : (secondLeg.awayScore ?? "-"))
              : "-"}
          </Text>
          {aggregate && (
            <Text style={[styles.matchupAgg, { color: theme.colors.primary, fontWeight: "800" }]}>
              {aggregate.team2Goals}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Penalty info */}
      {penaltyScore && (
        <Text style={[styles.matchupPen, { color: theme.colors.textSecondary }]}>
          ({t("matchDetail.pen")} {penaltyScore})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Canlı projeksiyon banner
  liveProjectionBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    gap: 7,
  },
  liveDotBig: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FF4444",
  },
  liveProjectionText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Group name header (multi-group leagues)
  groupHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  groupHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
  teamName: { fontSize: 12, flex: 1 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    gap: 3,
    marginLeft: 2,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  liveBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
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

  // ─── Knockout styles ───

  roundHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  roundTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Single-leg fixture row
  fixtureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fixtureTeam: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fixtureLogo: { width: 20, height: 20 },
  fixtureTeamName: { fontSize: 12, flex: 1 },
  fixtureScore: {
    width: 70,
    alignItems: "center",
  },
  fixtureScoreText: { fontSize: 14, fontWeight: "800" },
  fixtureTime: { fontSize: 12, fontWeight: "600" },
  fixturePen: { fontSize: 10, marginTop: 2 },

  // Two-leg matchup card
  matchupCard: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  matchupTeams: { gap: 2 },
  matchupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  matchupLegLabel: { width: 36, fontSize: 10, fontWeight: "700", textAlign: "center" },
  matchupAggLabel: { width: 36, fontSize: 10, fontWeight: "700", textAlign: "center" },
  matchupTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  matchupTeamInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  matchupTeamName: { fontSize: 12, flex: 1 },
  matchupScore: { width: 36, fontSize: 13, fontWeight: "700", textAlign: "center" },
  matchupAgg: { width: 36, fontSize: 13, textAlign: "center" },
  matchupPen: { fontSize: 10, textAlign: "center", marginTop: 4 },
});
