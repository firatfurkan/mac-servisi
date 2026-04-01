import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/tr";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FormStrip from "../../src/components/team/FormStrip";
import { MatchCardSkeleton } from "../../src/components/common/SkeletonLoader";
import { useAppTheme } from "../../src/hooks/useAppTheme";
import { useTeamDetail } from "../../src/hooks/useTeamDetail";
import { useTeamMatches, useNationalTeamMatches, NATIONAL_MIN_SEASON } from "../../src/hooks/useTeamMatches";
import { useTeamSquad } from "../../src/hooks/useTeamSquad";
import { useStandings } from "../../src/hooks/useStandings";
import { useFavoritesStore } from "../../src/stores/favoritesStore";
import { useNotificationStore } from "../../src/stores/notificationStore";
import { cancelMatchReminder, scheduleMatchReminder } from "../../src/services/goalTracker";
import { registerMatchPush, unregisterMatchPush } from "../../src/services/pushService";
import { Match, SquadPlayer, StandingRow } from "../../src/types";

type TeamTab = "matches" | "squad" | "standings";

const CURRENT_YEAR = new Date().getFullYear();
// api-football seasons: 2025 = 2025/26, current is last year's
const CURRENT_SEASON = String(CURRENT_YEAR - 1);
// API-Sports puan durumu 2012'den itibaren mevcut
const FIRST_SEASON = 2012;
const SEASONS = Array.from(
  { length: CURRENT_YEAR - 1 - FIRST_SEASON + 1 },
  (_, i) => String(CURRENT_YEAR - 1 - i),
);

function getResult(match: Match, teamId: string): "W" | "D" | "L" | null {
  if (match.status !== "finished") return null;
  if (match.homeScore === null || match.awayScore === null) return null;
  const isHome = match.homeTeam.id === teamId;
  const my = isHome ? match.homeScore : match.awayScore;
  const opp = isHome ? match.awayScore : match.homeScore;
  if (my > opp) return "W";
  if (my === opp) return "D";
  return "L";
}

interface MatchRowProps {
  match: Match;
  teamId: string;
}

function MatchRow({ match, teamId }: MatchRowProps) {
  const router = useRouter();
  const { i18n } = useTranslation();
  const theme = useAppTheme();
  const result = getResult(match, teamId);
  const isHome = match.homeTeam.id === teamId;
  const notStarted = match.status === "not_started";
  const live = match.status === "live" || match.status === "half_time";
  const finished = match.status === "finished";
  const unfinished = match.status === "postponed" || match.status === "cancelled";

  // Notification logic (same as MatchCard)
  const isNotified = useNotificationStore((s) => s.notifiedMatchIds.includes(match.id));
  const toggleNotificationRaw = useNotificationStore((s) => s.toggleMatchNotification);
  const removeNotification = useNotificationStore((s) => s.removeMatchNotification);
  const isFavHome = useFavoritesStore((s) => s.favoriteTeamIds.includes(match.homeTeam.id));
  const isFavAway = useFavoritesStore((s) => s.favoriteTeamIds.includes(match.awayTeam.id));
  const isFavMatch = isFavHome || isFavAway;

  useEffect(() => {
    if (finished && isNotified) {
      removeNotification(match.id);
      unregisterMatchPush(match.id).catch(() => {});
      cancelMatchReminder(match.id).catch(() => {});
    }
  }, [finished, isNotified, match.id, removeNotification]);

  useEffect(() => {
    if (!isFavMatch || finished || unfinished || isNotified) return;
    toggleNotificationRaw({ id: match.id, startTime: match.startTime, homeTeamName: match.homeTeam.name, awayTeamName: match.awayTeam.name });
    registerMatchPush(match.id, match.startTime).catch(() => {});
    if (notStarted) scheduleMatchReminder(match).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id, isFavMatch]);

  const bellActive = !finished && !unfinished && (isNotified || isFavMatch);

  const handleBellPress = useCallback((e: any) => {
    e.stopPropagation?.();
    const wasNotified = isNotified;
    const willEnable = !isNotified && !isFavMatch;
    toggleNotificationRaw({ id: match.id, startTime: match.startTime, homeTeamName: match.homeTeam.name, awayTeamName: match.awayTeam.name });
    if (notStarted) {
      if (willEnable || isFavMatch) scheduleMatchReminder(match).catch(() => {});
      else cancelMatchReminder(match.id).catch(() => {});
    }
    if (!wasNotified && !isFavMatch) registerMatchPush(match.id, match.startTime).catch(() => {});
    else if (wasNotified) unregisterMatchPush(match.id).catch(() => {});
  }, [match, isNotified, isFavMatch, notStarted, toggleNotificationRaw]);

  const dateStr = dayjs.utc(match.startTime)
    .utcOffset(3 * 60)
    .locale(i18n.language)
    .format("DD MMM YYYY");
  const timeStr = dayjs.utc(match.startTime)
    .utcOffset(3 * 60)
    .format("HH:mm");

  const resultColor =
    result === "W"
      ? "#00C851"
      : result === "D"
        ? "#888"
        : result === "L"
          ? "#FF4444"
          : "transparent";

  const resultLabel =
    result === "W"
      ? i18n.language === "tr"
        ? "G"
        : "W"
      : result === "D"
        ? i18n.language === "tr"
          ? "B"
          : "D"
        : result === "L"
          ? i18n.language === "tr"
            ? "M"
            : "L"
          : "";

  return (
    <TouchableOpacity
      onPress={() => router.push(`/match/${match.id}`)}
      activeOpacity={0.75}
      style={[
        styles.matchRow,
        {
          backgroundColor: theme.colors.card,
          borderBottomColor: theme.colors.divider,
        },
      ]}
    >
      {/* Result badge */}
      <View
        style={[
          styles.resultBadge,
          { backgroundColor: result ? resultColor + "22" : "transparent" },
        ]}
      >
        <Text
          style={[
            styles.resultText,
            { color: result ? resultColor : "transparent" },
          ]}
        >
          {resultLabel}
        </Text>
      </View>

      {/* Teams & score */}
      <View style={styles.matchCenter}>
        {/* League */}
        <View style={styles.leagueRow}>
          <Image
            source={{ uri: match.league.logoUrl }}
            style={styles.leagueLogo}
            resizeMode="contain"
          />
          <Text
            style={[styles.leagueName, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {match.league.name}
          </Text>
          <Text
            style={[styles.dateText, { color: theme.colors.textSecondary }]}
          >
            {notStarted ? `${dateStr} ${timeStr}` : dateStr}
          </Text>
        </View>

        {/* Match teams row */}
        <View style={styles.teamsRow}>
          {/* Home */}
          <View style={[styles.teamInline, isHome && styles.ourTeam]}>
            <Image
              source={{ uri: match.homeTeam.logoUrl }}
              style={styles.teamLogo}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.teamInlineName,
                { color: theme.colors.textPrimary },
                isHome && { fontWeight: "700" },
              ]}
              numberOfLines={1}
            >
              {match.homeTeam.name}
            </Text>
          </View>

          {/* Score */}
          <View style={styles.scoreBox}>
            {notStarted ? (
              <Text style={[styles.scoreText, { color: theme.colors.textSecondary }]}>
                {timeStr}
              </Text>
            ) : unfinished ? (
              <Text style={[styles.scoreText, { color: "#888", fontSize: 11, fontWeight: "700" }]}>
                {match.status === "postponed" ? "Ert." : "İpt."}
              </Text>
            ) : (
              <Text
                style={[
                  styles.scoreText,
                  { color: live ? "#00C851" : theme.colors.textPrimary },
                  { fontWeight: "800" },
                ]}
              >
                {`${match.homeScore ?? 0} - ${match.awayScore ?? 0}`}
              </Text>
            )}
          </View>

          {/* Away */}
          <View
            style={[
              styles.teamInline,
              styles.teamInlineRight,
              !isHome && styles.ourTeam,
            ]}
          >
            <Text
              style={[
                styles.teamInlineName,
                styles.teamInlineNameRight,
                { color: theme.colors.textPrimary },
                !isHome && { fontWeight: "700" },
              ]}
              numberOfLines={1}
            >
              {match.awayTeam.name}
            </Text>
            <Image
              source={{ uri: match.awayTeam.logoUrl }}
              style={styles.teamLogo}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>

      {/* Zil butonu */}
      {finished || unfinished ? (
        <View style={styles.bellPlaceholder} />
      ) : (
        <TouchableOpacity
          onPress={handleBellPress}
          activeOpacity={0.6}
          style={styles.bellBtn}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Ionicons
            name={bellActive ? "notifications" : "notifications-outline"}
            size={16}
            color={bellActive ? theme.colors.primary : theme.colors.textSecondary + "80"}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const POSITION_ORDER: Record<string, number> = {
  Goalkeeper: 0,
  Defender: 1,
  Midfielder: 2,
  Attacker: 3,
};
const POSITION_LABELS: Record<string, { tr: string; en: string }> = {
  Goalkeeper: { tr: "Kaleciler", en: "Goalkeepers" },
  Defender: { tr: "Defans", en: "Defenders" },
  Midfielder: { tr: "Orta Saha", en: "Midfielders" },
  Attacker: { tr: "Forvet", en: "Attackers" },
};

function SquadList({
  squad,
  theme,
  router,
}: {
  squad: SquadPlayer[];
  theme: any;
  router: any;
}) {
  const { i18n } = useTranslation();
  const lang = i18n.language as "tr" | "en";

  // Group by position
  const grouped = useMemo(() => {
    const groups: Record<string, SquadPlayer[]> = {};
    for (const p of squad) {
      const pos = p.position || "Midfielder";
      if (!groups[pos]) groups[pos] = [];
      groups[pos].push(p);
    }
    return Object.entries(groups).sort(
      ([a], [b]) => (POSITION_ORDER[a] ?? 9) - (POSITION_ORDER[b] ?? 9),
    );
  }, [squad]);

  const goToPlayer = (p: SquadPlayer) => {
    router.push(
      `/player/${p.id}?name=${encodeURIComponent(p.name)}&photo=${encodeURIComponent(p.photo)}` as any,
    );
  };

  return (
    <View style={{ paddingBottom: 24 }}>
      {grouped.map(([position, players]) => (
        <View key={position}>
          {/* Position header */}
          <View
            style={[
              styles.posHeader,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Text
              style={[
                styles.posHeaderText,
                { color: theme.colors.textPrimary },
              ]}
            >
              {POSITION_LABELS[position]?.[lang] ?? position}
            </Text>
            <Text
              style={[styles.posCount, { color: theme.colors.textSecondary }]}
            >
              {players.length}
            </Text>
          </View>
          {/* Stat header row */}
          <View
            style={[
              styles.squadStatHeader,
              { backgroundColor: theme.colors.surfaceVariant + "80" },
            ]}
          >
            <View style={styles.squadPlayerCol} />
            {position === "Goalkeeper" ? (
              <>
                <Text style={styles.sqThEmoji}>👕</Text>
                <Text style={styles.sqThEmoji}>⏸</Text>
                <Text style={styles.sqThEmojiWide}>⏱</Text>
                <Text style={styles.sqThEmoji}>🥅</Text>
                <Text style={styles.sqThEmoji}>🧤</Text>
                <Text style={styles.sqThEmoji}>🛡️</Text>
                <Text style={[styles.sqThRating, { color: theme.colors.textSecondary }]}>Puan</Text>
              </>
            ) : (
              <>
                <Text style={styles.sqThEmoji}>👕</Text>
                <Text style={styles.sqThEmoji}>⏸</Text>
                <Text style={styles.sqThEmojiWide}>⏱</Text>
                <Text style={styles.sqThEmoji}>⚽</Text>
                <Text style={styles.sqThEmoji}>🎯</Text>
                <Text style={styles.sqThEmoji}>🟨</Text>
                <Text style={styles.sqThEmoji}>🟥</Text>
                <Text style={[styles.sqThRating, { color: theme.colors.textSecondary }]}>Puan</Text>
              </>
            )}
          </View>
          {/* Players */}
          {players.map((player, idx) => {
            const ratingVal = parseFloat(player.rating);
            const ratingColor = !isNaN(ratingVal)
              ? ratingVal >= 7.0
                ? "#00C851"
                : ratingVal >= 6.5
                  ? theme.colors.textPrimary
                  : theme.colors.textSecondary
              : theme.colors.textSecondary;
            return (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.squadRow,
                  {
                    backgroundColor:
                      idx % 2 === 0 ? theme.colors.card : theme.colors.background,
                  },
                ]}
                onPress={() => goToPlayer(player)}
                activeOpacity={0.7}
              >
                <View style={styles.squadPlayerCol}>
                  <Image
                    source={{ uri: player.photo }}
                    style={styles.squadPhoto}
                    defaultSource={{ uri: "https://media.api-sports.io/football/players/0.png" }}
                  />
                  <View style={styles.squadPlayerInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {player.number ? (
                        <View style={[styles.squadNumberBadge, { backgroundColor: theme.colors.primary + "22" }]}>
                          <Text style={[styles.squadNumber, { color: theme.colors.primary }]}>
                            {player.number}
                          </Text>
                        </View>
                      ) : null}
                      <Text
                        style={[styles.squadName, { color: theme.colors.textPrimary, flex: 1 }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {player.name}
                      </Text>
                    </View>
                    <Text style={[styles.squadMeta, { color: theme.colors.textSecondary }]}>
                      🎂 {player.age} · {player.nationality}
                    </Text>
                  </View>
                </View>
                {position === "Goalkeeper" ? (
                  <>
                    <Text style={[styles.sqStat, { color: theme.colors.textPrimary }]}>
                      {player.matches}
                    </Text>
                    <Text style={[styles.sqStat, { color: theme.colors.textSecondary }]}>
                      {player.starts}
                    </Text>
                    <Text style={[styles.sqStatWide, { color: theme.colors.textSecondary }]}>
                      {player.minutes || "-"}
                    </Text>
                    <Text style={[styles.sqStat, { color: (player.goalsConceded ?? 0) > 0 ? "#FF4444" : theme.colors.textSecondary }]}>
                      {player.goalsConceded ?? "-"}
                    </Text>
                    <Text style={[styles.sqStat, { color: (player.saves ?? 0) > 0 ? "#2196F3" : theme.colors.textSecondary }]}>
                      {player.saves ?? "-"}
                    </Text>
                    <Text style={[styles.sqStat, { color: (player.cleanSheets ?? 0) > 0 ? "#00C851" : theme.colors.textSecondary }]}>
                      {player.cleanSheets ?? "-"}
                    </Text>
                    <Text style={[styles.sqRating, { color: ratingColor }]}>
                      {player.rating}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.sqStat, { color: theme.colors.textPrimary }]}>
                      {player.matches}
                    </Text>
                    <Text style={[styles.sqStat, { color: theme.colors.textSecondary }]}>
                      {player.starts}
                    </Text>
                    <Text style={[styles.sqStatWide, { color: theme.colors.textSecondary }]}>
                      {player.minutes || "-"}
                    </Text>
                    <Text style={[styles.sqStat, { color: player.goals > 0 ? "#00C851" : theme.colors.textSecondary }]}>
                      {player.goals}
                    </Text>
                    <Text style={[styles.sqStat, { color: player.assists > 0 ? "#2196F3" : theme.colors.textSecondary }]}>
                      {player.assists}
                    </Text>
                    <Text style={[styles.sqStat, { color: player.yellowCards > 0 ? "#FFBB33" : theme.colors.textSecondary }]}>
                      {player.yellowCards}
                    </Text>
                    <Text style={[styles.sqStat, { color: player.redCards > 0 ? "#FF4444" : theme.colors.textSecondary }]}>
                      {player.redCards}
                    </Text>
                    <Text style={[styles.sqRating, { color: ratingColor }]}>
                      {player.rating}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function TeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const params = useLocalSearchParams<{ name: string; logo: string }>();
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const teamNameParam = params.name ? decodeURIComponent(params.name) : "";
  const teamLogoParam = params.logo ? decodeURIComponent(params.logo) : "";

  const [season, setSeason] = useState(CURRENT_SEASON);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TeamTab>("matches");
  const [sortMode, setSortMode] = useState<"date" | "league">("date");
  // National teams use calendar years, not football seasons.
  // Start with current year + previous year so we catch matches on both sides of the season boundary.
  const [nationalSeasons, setNationalSeasons] = useState<string[]>(
    [String(CURRENT_YEAR), CURRENT_SEASON]
  );
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const { data: teamDetail } = useTeamDetail(id ?? "");
  const isNational = teamDetail?.national ?? false;

  // Club team matches
  const { data: clubMatches = [], isLoading: clubLoading, isError: clubError } = useTeamMatches(
    id ?? "", season
  );
  // National team matches — lazy-loaded by season
  const {
    data: nationalMatches = [],
    isLoadingInitial: nationalLoadingInitial,
    isFetchingMore: nationalFetchingMore,
  } = useNationalTeamMatches(id ?? "", isNational ? nationalSeasons : []);

  const matches = isNational ? nationalMatches : clubMatches;
  const isLoading = isNational ? nationalLoadingInitial : clubLoading;
  const isError = isNational ? false : clubError;

  const { data: squad = [], isLoading: squadLoading } = useTeamSquad(
    id ?? "",
    season,
    activeTab === "squad",
  );

  // URL param yoksa API verisinden al (ör. arama olmadan direkt URL ile girildiğinde)
  const teamName = teamNameParam || teamDetail?.name || "";
  const teamLogo = teamLogoParam || teamDetail?.logoUrl || "";

  // Get primary league from matches for standings
  // For national teams: prioritize competitive tournaments (skip friendlies)
  const primaryLeagueId = useMemo(() => {
    if (matches.length === 0) return "";
    const isNational = teamDetail?.national ?? false;

    const leagueCounts: Record<string, number> = {};
    for (const m of matches) {
      // For national teams, skip friendly matches (no league ID or specific patterns)
      if (isNational && (m.league.id === "0" || m.league.name?.includes("Friendly"))) {
        continue;
      }
      leagueCounts[m.league.id] = (leagueCounts[m.league.id] ?? 0) + 1;
    }

    if (Object.keys(leagueCounts).length === 0) return "";
    return Object.entries(leagueCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  }, [matches, teamDetail?.national]);

  const { data: standingsData, isLoading: standingsLoading } = useStandings(
    primaryLeagueId,
    season,
    undefined,
    undefined,
    id as string,
  );
  const standings = standingsData?.rows ?? [];

  const sorted = useMemo(() => {
    const copy = [...matches];
    // National teams: always newest first (already sorted by hook)
    if (isNational) return copy;
    if (sortMode === "league") {
      copy.sort((a, b) => {
        const cmp = a.league.name.localeCompare(b.league.name, undefined, { sensitivity: "base" });
        if (cmp !== 0) return cmp;
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      });
    } else {
      copy.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    }
    return copy;
  }, [matches, sortMode, isNational]);

  const formatSeason = (s: string) => `${s}-${parseInt(s) + 1}`;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        horizontal={false}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        onScroll={isNational && activeTab === "matches" ? ({ nativeEvent: e }) => {
          const nearBottom = e.layoutMeasurement.height + e.contentOffset.y >= e.contentSize.height - 200;
          if (!nearBottom || nationalFetchingMore || nationalLoadingInitial) return;
          const oldest = parseInt(nationalSeasons[nationalSeasons.length - 1]);
          if (oldest > NATIONAL_MIN_SEASON) {
            const next = String(oldest - 1);
            setNationalSeasons(prev => prev.includes(next) ? prev : [...prev, next]);
          }
        } : undefined}
      >
        {/* Nav bar */}
        <View style={[styles.navBar, { backgroundColor: theme.colors.surface, paddingTop: insets.top + 4 }]}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}
            style={styles.navBackBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => id && toggleFavorite(id, teamName, teamLogo)}
            activeOpacity={0.6}
            style={styles.navBackBtn}
          >
            <Ionicons
              name={id && isFavorite(id) ? "heart" : "heart-outline"}
              size={22}
              color={id && isFavorite(id) ? theme.colors.accent : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Team header */}
        <View style={[styles.teamHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider }]}>
          <Image source={{ uri: teamLogo }} style={styles.teamHeaderLogo} resizeMode="contain" />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.teamHeaderName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
              {teamName}
            </Text>
            {teamDetail?.coach && (
              <View style={styles.coachRow}>
                <Ionicons name="person-circle-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.coachText, { color: theme.colors.textSecondary }]}>
                  {teamDetail.coach.name}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Venue Card */}
        {teamDetail?.venue?.name && (
          <View
            style={[
              styles.venueCard,
              {
                backgroundColor: theme.colors.surface,
                borderBottomColor: theme.colors.divider,
              },
            ]}
          >
            <View style={styles.venueInfo}>
              {/* Stad adı — tam genişlik, ikon solda sabit */}
              <View style={styles.venueName}>
                <View style={[styles.venueIconBox, { backgroundColor: theme.colors.primary + "18" }]}>
                  <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
                </View>
                <Text style={[styles.venueTitle, { color: theme.colors.textPrimary }]}>
                  {teamDetail.venue.name}
                </Text>
              </View>
              {/* Şehir + detaylar — pill satırı */}
              <View style={styles.venueDetails}>
                {teamDetail.venue.city ? (
                  <View style={[styles.venuePill, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.venuePillText, { color: theme.colors.textSecondary }]}>
                      📍 {teamDetail.venue.city}
                    </Text>
                  </View>
                ) : null}
                {teamDetail.venue.capacity ? (
                  <View style={[styles.venuePill, { backgroundColor: theme.colors.surface }]}>
                    <Ionicons name="people-outline" size={12} color={theme.colors.primary} />
                    <Text style={[styles.venuePillText, { color: theme.colors.textSecondary }]}>
                      {teamDetail.venue.capacity.toLocaleString()}
                    </Text>
                  </View>
                ) : null}
                {teamDetail.venue.surface ? (
                  <View style={[styles.venuePill, { backgroundColor: theme.colors.surface }]}>
                    <Ionicons name="leaf-outline" size={12} color={theme.colors.primary} />
                    <Text style={[styles.venuePillText, { color: theme.colors.textSecondary }]}>
                      {(() => {
                        const s = (teamDetail.venue.surface ?? '').toLowerCase();
                        if (s === 'natural grass' || s === 'grass') return i18n.language === 'tr' ? 'Çim' : 'Grass';
                        if (s === 'artificial turf') return i18n.language === 'tr' ? 'Suni Çim' : 'Artificial Turf';
                        if (s.includes('hybrid')) return i18n.language === 'tr' ? 'Hibrit Çim' : 'Hybrid';
                        return teamDetail.venue.surface;
                      })()}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {/* Season selector button — hidden for national teams */}
        {!teamDetail?.national && (
          <>
            <TouchableOpacity
            onPress={() => setShowSeasonModal(true)}
            activeOpacity={0.7}
            style={[
              styles.seasonBtn,
              {
                backgroundColor: theme.colors.surface,
                borderBottomColor: theme.colors.divider,
              },
            ]}
          >
          <Text
            style={[
              styles.seasonBtnLabel,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t("team.season")}
          </Text>
          <View
            style={[
              styles.seasonBtnValue,
              { backgroundColor: theme.colors.primary + "18" },
            ]}
          >
            <Text
              style={[
                styles.seasonBtnValueText,
                { color: theme.colors.primary },
              ]}
            >
              {formatSeason(season)}
            </Text>
          </View>
          <Text
            style={[
              styles.seasonBtnChevron,
              { color: theme.colors.textSecondary },
            ]}
          >
            ▾
          </Text>
          </TouchableOpacity>

          {/* Season Modal */}
          <Modal
            visible={showSeasonModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowSeasonModal(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowSeasonModal(false)}
            >
            <View
              style={[
                styles.modalSheet,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[styles.modalTitle, { color: theme.colors.textPrimary }]}
              >
                {i18n.language === "tr" ? "Sezon Seçin" : "Select Season"}
              </Text>
              <ScrollView
                horizontal={false}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: Dimensions.get('window').height * 0.5 }}
              >
                <View style={styles.seasonGrid}>
                  {SEASONS.map((s) => {
                    const selected = s === season;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => {
                          setSeason(s);
                          setShowSeasonModal(false);
                        }}
                        activeOpacity={0.7}
                        style={[
                          styles.seasonGridItem,
                          selected
                            ? { backgroundColor: theme.colors.primary }
                            : { backgroundColor: theme.colors.surfaceVariant },
                        ]}
                      >
                        <Text
                          style={[
                            styles.seasonGridText,
                            {
                              color: selected
                                ? "#fff"
                                : theme.colors.textPrimary,
                            },
                            selected && { fontWeight: "800" },
                          ]}
                        >
                          {formatSeason(s)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
            </TouchableOpacity>
          </Modal>
          </>
        )}

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
              key: "matches" as TeamTab,
              label: t("team.matches"),
              icon: "football-outline",
            },
            {
              key: "squad" as TeamTab,
              label: t("team.squad"),
              icon: "people-outline",
            },
            {
              key: "standings" as TeamTab,
              label: t("standings.table"),
              icon: "trophy-outline",
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

        {activeTab === "matches" ? (
          <>
            {/* Form strip + sort toggle — hidden for national teams */}
            {sorted.length > 0 && !isNational && (
              <View style={styles.formRow}>
                <FormStrip teamId={id ?? ""} matches={sorted} />
                <View style={styles.sortToggle}>
                  <TouchableOpacity
                    onPress={() => setSortMode("date")}
                    style={[
                      styles.sortBtn,
                      sortMode === "date" && { backgroundColor: theme.colors.primary },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sortBtnText, { color: sortMode === "date" ? "#fff" : theme.colors.textSecondary }]}>
                      {i18n.language === "tr" ? "Tarih" : "Date"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSortMode("league")}
                    style={[
                      styles.sortBtn,
                      sortMode === "league" && { backgroundColor: theme.colors.primary },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sortBtnText, { color: sortMode === "league" ? "#fff" : theme.colors.textSecondary }]}>
                      {i18n.language === "tr" ? "Lig" : "League"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Match list */}
            {isLoading ? (
              <View style={{ backgroundColor: theme.colors.background }}>
                {[...Array(6)].map((_, i) => (
                  <View key={i}>
                    <MatchCardSkeleton />
                    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.divider, marginHorizontal: 12 }} />
                  </View>
                ))}
              </View>
            ) : isError ? (
              <View style={styles.center}>
                <Text
                  style={{ color: theme.colors.textSecondary, fontSize: 14 }}
                >
                  {t("team.loadError")}
                </Text>
              </View>
            ) : sorted.length === 0 ? (
              <View style={styles.center}>
                <Text style={{ fontSize: 32 }}>⚽</Text>
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t("team.noMatches")}
                </Text>
              </View>
            ) : (
              <View style={styles.listContent}>
                {sorted.map((item, index) => (
                  <View key={item.id ?? `match-${index}`}>
                    <MatchRow match={item} teamId={id ?? ""} />
                    {index < sorted.length - 1 && (
                      <View
                        style={{
                          height: StyleSheet.hairlineWidth,
                          backgroundColor: theme.colors.divider,
                        }}
                      />
                    )}
                  </View>
                ))}
                {/* National team: load more indicator */}
                {isNational && (
                  nationalFetchingMore ? (
                    <View style={{ backgroundColor: theme.colors.background }}>
                      {[...Array(3)].map((_, i) => (
                        <View key={i}>
                          <MatchCardSkeleton />
                          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.divider, marginHorizontal: 12 }} />
                        </View>
                      ))}
                    </View>
                  ) : parseInt(nationalSeasons[nationalSeasons.length - 1]) <= NATIONAL_MIN_SEASON ? (
                    <View style={{ paddingVertical: 20, alignItems: "center" }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                        {i18n.language === "tr" ? `${NATIONAL_MIN_SEASON}'den itibaren tüm maçlar gösterildi` : `All matches since ${NATIONAL_MIN_SEASON} loaded`}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ paddingVertical: 20, alignItems: "center" }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                        {i18n.language === "tr" ? "↓ Daha eski maçlar için kaydır" : "↓ Scroll for older matches"}
                      </Text>
                    </View>
                  )
                )}
              </View>
            )}
          </>
        ) : activeTab === "squad" ? (
          /* Squad Tab */
          squadLoading ? (
            <View style={styles.center}>
            </View>
          ) : squad.length === 0 ? (
            <View style={styles.center}>
              <Ionicons
                name="people-outline"
                size={48}
                color={theme.colors.textSecondary + "60"}
              />
              <Text
                style={{ color: theme.colors.textSecondary, marginTop: 12 }}
              >
                {t("team.squadNotFound")}
              </Text>
            </View>
          ) : (
            <SquadList squad={squad} theme={theme} router={router} />
          )
        ) : /* Standings Tab */
        standingsLoading ? (
          <View style={styles.center}>
          </View>
        ) : standings.length === 0 ? (
          <View style={styles.center}>
            <Ionicons
              name="trophy-outline"
              size={48}
              color={theme.colors.textSecondary + "60"}
            />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 12, textAlign: "center", paddingHorizontal: 24 }}>
              {teamDetail?.national ? t("standings.noStandingsThisSeason") : t("standings.tableNotFound")}
            </Text>
          </View>
        ) : (
          <View>
            {/* Standings table header */}
            <View style={[styles.standingsHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={[styles.stRank, { color: theme.colors.textSecondary }]}>#</Text>
              <Text style={[styles.stTeam, { color: theme.colors.textSecondary }]}>{t("standings.team")}</Text>
              <Text style={[styles.stStat, { color: theme.colors.textSecondary }]}>{t("standings.played")}</Text>
              <Text style={[styles.stStat, { color: theme.colors.textSecondary }]}>{t("standings.win")}</Text>
              <Text style={[styles.stStat, { color: theme.colors.textSecondary }]}>{t("standings.draw")}</Text>
              <Text style={[styles.stStat, { color: theme.colors.textSecondary }]}>{t("standings.loss")}</Text>
              <Text style={[styles.stStat, { color: theme.colors.textSecondary }]}>{t("standings.goalDiff")}</Text>
              <Text style={[styles.stPoints, { color: theme.colors.textSecondary }]}>{t("standings.points")}</Text>
            </View>
            {standings.map((row: StandingRow, index: number) => {
              const isOurTeam = row.team.id === id;
              return (
                <TouchableOpacity
                  key={row.team.id ?? `standing-${index}`}
                  style={[
                    styles.standingsRow,
                    {
                      backgroundColor: isOurTeam
                        ? theme.colors.primary + "18"
                        : index % 2 === 0
                          ? theme.colors.card
                          : theme.colors.background,
                    },
                  ]}
                  onPress={() => {
                    if (!isOurTeam) {
                      router.push(
                        `/team/${row.team.id}?name=${encodeURIComponent(row.team.name)}&logo=${encodeURIComponent(row.team.logoUrl)}` as any,
                      );
                    }
                  }}
                  activeOpacity={isOurTeam ? 1 : 0.7}
                >
                  <Text style={[styles.stRankText, { color: theme.colors.textPrimary, fontWeight: isOurTeam ? "800" : "700" }]}>{row.rank}</Text>
                  <View style={styles.stTeamCol}>
                    <Image source={{ uri: row.team.logoUrl }} style={styles.stTeamLogo} resizeMode="contain" />
                    <Text
                      style={[styles.stTeamName, { color: theme.colors.textPrimary, fontWeight: isOurTeam ? "800" : "600" }]}
                      numberOfLines={1}
                    >
                      {row.team.name}
                    </Text>
                  </View>
                  <Text style={[styles.stStatText, { color: theme.colors.textSecondary }]}>{row.played}</Text>
                  <Text style={[styles.stStatText, { color: theme.colors.textPrimary }]}>{row.won}</Text>
                  <Text style={[styles.stStatText, { color: theme.colors.textSecondary }]}>{row.drawn}</Text>
                  <Text style={[styles.stStatText, { color: theme.colors.textSecondary }]}>{row.lost}</Text>
                  <Text style={[styles.stStatText, { color: row.goalDifference > 0 ? "#00C851" : row.goalDifference < 0 ? "#FF4444" : theme.colors.textSecondary }]}>
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </Text>
                  <Text style={[styles.stPointsText, { color: theme.colors.textPrimary, fontWeight: isOurTeam ? "900" : "800" }]}>{row.points}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 24 }} />
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden", maxWidth: "100%" },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  navBackBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  teamHeaderLogo: {
    width: 56,
    height: 56,
    borderRadius: 6,
  },
  teamHeaderName: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  coachRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  coachText: {
    fontSize: 12,
    fontWeight: "500",
  },
  venueCard: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  venueInfo: {
    padding: 16,
    gap: 10,
  },
  venueName: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  venueIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  venueTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  venueDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  venuePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  venuePillText: {
    fontSize: 12,
    fontWeight: "500",
  },
  seasonBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  seasonBtnLabel: {
    fontSize: 13,
    flex: 1,
  },
  seasonBtnValue: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  seasonBtnValueText: {
    fontSize: 14,
    fontWeight: "700",
  },
  seasonBtnChevron: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalSheet: {
    width: "80%",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
  },
  seasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  seasonGridItem: {
    width: 90,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  seasonGridText: {
    fontSize: 14,
    fontWeight: "600",
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 10,
    gap: 10,
    overflow: "hidden",
    maxWidth: "100%",
  },
  bellBtn: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  bellPlaceholder: {
    width: 28,
  },
  resultBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  resultText: {
    fontSize: 12,
    fontWeight: "800",
  },
  matchCenter: {
    flex: 1,
    gap: 5,
  },
  leagueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  leagueLogo: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  leagueName: {
    fontSize: 11,
    flex: 1,
  },
  dateText: {
    fontSize: 11,
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  teamInline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  teamInlineRight: {
    flexDirection: "row-reverse",
  },
  ourTeam: {},
  teamLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
    flexShrink: 0,
  },
  teamInlineName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  teamInlineNameRight: {
    textAlign: "right",
  },
  scoreBox: {
    width: 64,
    alignItems: "center",
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 16,
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

  // Squad
  posHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  posHeaderText: { fontSize: 14, fontWeight: "800", flex: 1 },
  posCount: { fontSize: 12, fontWeight: "600" },
  squadStatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  squadPlayerCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sqTh: { width: 24, fontSize: 10, fontWeight: "700", textAlign: "center" },
  sqThWide: { width: 36, fontSize: 10, fontWeight: "700", textAlign: "center" },
  sqThEmoji: { width: 24, fontSize: 13, textAlign: "center" },
  sqThEmojiWide: { width: 36, fontSize: 13, textAlign: "center" },
  sqThRating: {
    width: 34,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  squadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  squadPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ddd",
  },
  squadPlayerInfo: { flex: 1, gap: 2 },
  squadNumberBadge: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  squadNumber: { fontSize: 10, fontWeight: "800", minWidth: 14, textAlign: "center" },
  squadName: { fontSize: 12, fontWeight: "600" },
  squadMeta: { fontSize: 10 },
  sqStat: { width: 24, fontSize: 12, fontWeight: "600", textAlign: "center" },
  sqStatWide: { width: 36, fontSize: 12, fontWeight: "600", textAlign: "center" },
  sqRating: { width: 34, fontSize: 13, fontWeight: "700", textAlign: "center" },

  // Back bar
  // Standings
  standingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  stRank: { width: 28, fontSize: 10, fontWeight: "700", textAlign: "center" },
  stTeam: { flex: 1, fontSize: 10, fontWeight: "700" },
  stStat: { width: 26, fontSize: 10, fontWeight: "700", textAlign: "center" },
  stPoints: { width: 28, fontSize: 10, fontWeight: "700", textAlign: "center" },
  standingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  stRankText: { width: 28, fontSize: 12, textAlign: "center" },
  stTeamCol: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  stTeamLogo: { width: 18, height: 18 },
  stTeamName: { fontSize: 12, flex: 1 },
  stStatText: { width: 26, fontSize: 12, textAlign: "center" },
  stPointsText: { width: 28, fontSize: 13, textAlign: "center" },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 12,
  },
  sortToggle: {
    flexDirection: "row",
    gap: 4,
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
