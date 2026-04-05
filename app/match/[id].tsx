import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/tr";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import BannerAd from "../../src/components/ads/BannerAd";
import BrandMark from "../../src/components/common/BrandMark";
import EventTimeline from "../../src/components/match/EventTimeline";
import FootballPitch from "../../src/components/match/FootballPitch";
import StatBar from "../../src/components/match/StatBar";
import TimeRangeSelector from "../../src/components/match/TimeRangeSelector";
import { useAppTheme } from "../../src/hooks/useAppTheme";
import { useH2H } from "../../src/hooks/useH2H";
import { useInjuries } from "../../src/hooks/useInjuries";
import { useLineup } from "../../src/hooks/useLineup";
import { useMatchDetail } from "../../src/hooks/useMatchDetail";
import { usePlayerMatchStats } from "../../src/hooks/usePlayerMatchStats";
import { usePredictions } from "../../src/hooks/usePredictions";
import { translatePrediction, translateH2H } from "../../src/utils/matchUtils";
import {
    useTeamLastAwayMatches,
    useTeamLastHomeMatches,
} from "../../src/hooks/useTeamLastMatches";
import { PlayerMatchStats } from "../../src/types";
import { getStatusText, getFirstLegRound, getAggregateAdvancer, getRoundBase, isKnockoutRound, isLive, isSecondLeg, isSingleLegKnockout, translateRound } from "../../src/utils/matchUtils";
import { useRoundFixtures } from "../../src/hooks/useRoundFixtures";
import ForumTab from "../../src/components/match/ForumTab";
import StandingsTab from "../../src/components/match/StandingsTab";
import ManOfTheMatch from "../../src/components/match/ManOfTheMatch";

type Tab = "summary" | "statistics" | "lineup" | "h2h" | "standings" | "analysis" | "forum";

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [startMinute, setStartMinute] = useState(0);
  const [endMinute, setEndMinute] = useState(90);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [h2hSubTab, setH2hSubTab] = useState<"h2h" | "home" | "away">("h2h");

  const { data: match, isLoading, isError } = useMatchDetail(id ?? "");

  // Uzatma/penaltı tespiti:
  // - Penaltıya giden maçlar (scorePenalty mevcut)
  // - Eleme turu maçları (kupa → uzatmaya gidebilir)
  const hasExtraTime = match != null && (
    match.scorePenalty != null ||
    isKnockoutRound(match.league.round)
  );
  const maxMinute = hasExtraTime ? 120 : 90;
  useEffect(() => {
    setStartMinute(0);
    setEndMinute(maxMinute);
  }, [maxMinute]);

  // Lineup ve stats verisini sayfa açılır açılmaz fetch et (tab geçişinde bekleme olmasın)
  const { data: lineup, isLoading: lineupLoading } = useLineup(id ?? "", !!id);
  const { data: h2hMatches = [], isLoading: h2hLoading } = useH2H(
    match?.homeTeam.id ?? "",
    match?.awayTeam.id ?? "",
    activeTab === "h2h" && !!match,
  );
  const { data: lastHomeMatches = [], isLoading: lastHomeLoading } =
    useTeamLastHomeMatches(
      match?.homeTeam.id ?? "",
      activeTab === "h2h" && !!match,
    );
  const { data: lastAwayMatches = [], isLoading: lastAwayLoading } =
    useTeamLastAwayMatches(
      match?.awayTeam.id ?? "",
      activeTab === "h2h" && !!match,
    );
  const { data: predictions, isLoading: predictionsLoading } = usePredictions(
    id ?? "",
    !!id && activeTab === "analysis",
  );
  const { data: injuries = [], isLoading: injuriesLoading } = useInjuries(
    id ?? "",
    !!id && activeTab === "summary",
  );
  const { data: playerMatchStats = [] } = usePlayerMatchStats(id ?? "", !!id);

  // Knockout maçlarda eşleşen diğer ayak maçını bul (1st/2nd leg)
  const isKnockout = isKnockoutRound(match?.league.round);
  const isSingleLeg = isSingleLegKnockout(match?.league.round);
  const needsPairedMatch = isKnockout && !isSingleLeg && !!match;

  // Round adında "2nd Leg" varsa 1st Leg round'unu, yoksa aynı round'u kullan
  const is2ndLeg = isSecondLeg(match?.league.round);
  const pairedRound = React.useMemo(() => {
    if (!match?.league.round || !needsPairedMatch) return "";
    if (is2ndLeg) return getFirstLegRound(match.league.round!);
    // Round adında leg yoksa aynı round'u kullan (API aynı round altında iki maç döner)
    return match.league.round!;
  }, [match?.league.round, needsPairedMatch, is2ndLeg]);

  // 1) Round fixtures'dan ara
  const { data: pairedRoundFixtures = [] } = useRoundFixtures(
    match?.league.id ?? "",
    match?.league.season ?? "",
    pairedRound,
    needsPairedMatch,
  );

  // 2) Fallback: H2H'den ara (round fixtures'da bulunamazsa, farklı round adı olabilir)
  const roundPairedFound = React.useMemo(() => {
    if (!match || pairedRoundFixtures.length === 0) return false;
    const teamIds = new Set([match.homeTeam.id, match.awayTeam.id]);
    return pairedRoundFixtures.some(
      (fl) => fl.id !== match.id && teamIds.has(fl.homeTeam.id) && teamIds.has(fl.awayTeam.id)
    );
  }, [match, pairedRoundFixtures]);

  const { data: h2hForPaired = [] } = useH2H(
    match?.homeTeam.id ?? "",
    match?.awayTeam.id ?? "",
    needsPairedMatch && !roundPairedFound && !!match,
  );

  // Eşleşen maçı bul: önce round fixtures, sonra h2h fallback
  const pairedMatch = React.useMemo(() => {
    if (!match) return null;
    const teamIds = new Set([match.homeTeam.id, match.awayTeam.id]);
    const roundBase = getRoundBase(match.league.round ?? "");

    // Round fixtures'dan bu maçın kendisi hariç aynı takımlar arasındaki maçı bul
    const fromRound = pairedRoundFixtures.find(
      (fl) => fl.id !== match.id && teamIds.has(fl.homeTeam.id) && teamIds.has(fl.awayTeam.id)
    );
    if (fromRound) return fromRound;

    // H2H fallback: aynı lig, aynı sezon, aynı round base'deki maçı bul
    if (h2hForPaired.length > 0) {
      const fromH2H = h2hForPaired.find((h) => {
        if (h.id === match.id) return false;
        if (h.league.id !== match.league.id) return false;
        if (h.league.season !== match.league.season) return false;
        const hRoundBase = getRoundBase(h.league.round ?? "");
        return hRoundBase === roundBase;
      });
      if (fromH2H) return fromH2H;
    }

    return null;
  }, [match, pairedRoundFixtures, h2hForPaired]);

  // firstLegMatch: daha önce oynanan maç (aggregate gösterimi için)
  const firstLegMatch = React.useMemo(() => {
    if (!match || !pairedMatch) return null;
    const matchDate = new Date(match.startTime).getTime();
    const pairedDate = new Date(pairedMatch.startTime).getTime();
    return pairedDate < matchDate ? pairedMatch : null;
  }, [match, pairedMatch]);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "summary", label: t("matchDetail.summary"), icon: "list-outline" },
    {
      key: "statistics",
      label: t("matchDetail.statistics"),
      icon: "stats-chart-outline",
    },
    { key: "lineup", label: t("matchDetail.lineup"), icon: "people-outline" },
    {
      key: "analysis",
      label: t("matchDetail.analysis"),
      icon: "analytics-outline",
    },
    {
      key: "h2h",
      label: t("matchDetail.h2h"),
      icon: "swap-horizontal-outline",
    },
    {
      key: "standings",
      label: t("matchDetail.standings"),
      icon: "trophy-outline",
    },
    { key: "forum", label: "Forum", icon: "chatbubbles-outline" },
  ];

  // Create a map of player ID -> match stats for quick lookup
  const statsMap = React.useMemo(() => {
    const map = new Map<number, PlayerMatchStats>();
    for (const stat of playerMatchStats) {
      map.set(stat.playerId, stat);
    }
    return map;
  }, [playerMatchStats]);

  // Name -> playerId fallback map for EventTimeline (API sometimes omits playerId in events)
  const playerIdsFromName = React.useMemo(() => {
    const map = new Map<string, number>();
    statsMap.forEach((stat) => {
      if (stat.playerName && stat.playerId) {
        map.set(stat.playerName, stat.playerId);
      }
    });
    return map;
  }, [statsMap]);

  // Lineup cross-reference: yanlış team düzelt + eksik isim/ID tamamla
  const correctedEvents = React.useMemo(() => {
    if (!match?.events) return [];
    if (!lineup) return match.events;

    // Oyuncu ID → { team, name } map
    const playerTeamMap = new Map<number, "home" | "away">();
    const playerNameMap = new Map<number, string>();
    const addPlayers = (players: typeof lineup.home.startXI, side: "home" | "away") => {
      for (const p of players) {
        if (p.id) {
          playerTeamMap.set(p.id, side);
          playerNameMap.set(p.id, p.name);
        }
      }
    };
    addPlayers(lineup.home.startXI, "home");
    addPlayers(lineup.home.substitutes, "home");
    addPlayers(lineup.away.startXI, "away");
    addPlayers(lineup.away.substitutes, "away");

    // İlk 11'deki oyuncuları takım bazlı tut
    const homeStartIds = new Set(lineup.home.startXI.map((p) => p.id));
    const awayStartIds = new Set(lineup.away.startXI.map((p) => p.id));

    // Zaten çıkan oyuncuları takip et (aynı kişiyi iki kez göstermemek için)
    const alreadySubbedOut = new Set<number>();

    // Bilinen tüm sub-out ID'lerini kaydet
    for (const ev of match.events) {
      if (ev.type === "substitution" && ev.playerId) {
        alreadySubbedOut.add(ev.playerId);
      }
    }

    // Sahada olan takımı takip et (her takım için)
    const homeOnField = new Set(homeStartIds);
    const awayOnField = new Set(awayStartIds);

    // Olayları dakika sırasına göre işle
    const sorted = [...match.events]
      .map((ev, idx) => ({ ev, idx }))
      .sort((a, b) => a.ev.minute - b.ev.minute);

    // İlk pass: bilinen sub'ları uygulayarak sahayı güncelle
    const inferredOutMap = new Map<number, { playerId: number; playerName: string }>();

    for (const { ev, idx } of sorted) {
      if (ev.type !== "substitution") continue;

      // Takımı düzelt
      const correctedBySub = ev.substitutePlayerId ? playerTeamMap.get(ev.substitutePlayerId) : undefined;
      const correctedByPlayer = ev.playerId ? playerTeamMap.get(ev.playerId) : undefined;
      const team = correctedByPlayer ?? correctedBySub ?? ev.team;
      const onField = team === "home" ? homeOnField : awayOnField;

      if (ev.playerId) {
        // Çıkan oyuncu biliniyor → sahadan çıkar
        onField.delete(ev.playerId);
        if (ev.substitutePlayerId) onField.add(ev.substitutePlayerId);
      } else if (ev.substitutePlayerId && !ev.playerId) {
        // Çıkan oyuncu BİLİNMİYOR → stats'tan dakika bazlı çıkar
        // Sahada olan oyuncuların stats'larına bak, bu dakikaya en yakın süreyi bulan çıkandır
        let bestId: number | null = null;
        let bestDiff = Infinity;

        for (const pid of onField) {
          // Zaten başka bir event'te çıkan olarak kayıtlıysa atla
          if (alreadySubbedOut.has(pid)) continue;
          const st = statsMap.get(pid);
          if (!st || st.minutes <= 0) continue;
          const diff = Math.abs(st.minutes - ev.minute);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestId = pid;
          }
        }

        if (bestId != null && bestDiff <= 5) {
          // Eşleşme bulundu — orijinal event index'i ile kaydet
          const name = playerNameMap.get(bestId) ?? statsMap.get(bestId)?.playerName ?? "";
          inferredOutMap.set(idx, { playerId: bestId, playerName: name });
          onField.delete(bestId);
          alreadySubbedOut.add(bestId);
        }

        if (ev.substitutePlayerId) onField.add(ev.substitutePlayerId);
      }
    }

    return match.events.map((ev, idx) => {
      let updated = { ...ev };

      // 1) Yanlış team düzelt
      const correctedByPlayer = ev.playerId ? playerTeamMap.get(ev.playerId) : undefined;
      const correctedBySub = ev.substitutePlayerId ? playerTeamMap.get(ev.substitutePlayerId) : undefined;
      const correctedTeam = correctedByPlayer ?? correctedBySub;
      if (correctedTeam && correctedTeam !== ev.team) {
        updated.team = correctedTeam;
      }

      if (ev.type === "substitution") {
        // 2) Çıkan oyuncu ismi boşsa → playerId varsa lineup/stats'tan, yoksa inference'den al
        if (!ev.player?.trim()) {
          if (ev.playerId) {
            updated.player =
              playerNameMap.get(ev.playerId) ??
              statsMap.get(ev.playerId)?.playerName ?? "";
          } else {
            const inferred = inferredOutMap.get(idx);
            if (inferred) {
              updated.player = inferred.playerName;
              updated.playerId = inferred.playerId;
            }
          }
        }

        // 3) Giren oyuncu ismi boşsa → substitutePlayerId'den tamamla
        if (!ev.substitutePlayer?.trim() && ev.substitutePlayerId) {
          updated.substitutePlayer =
            playerNameMap.get(ev.substitutePlayerId) ??
            statsMap.get(ev.substitutePlayerId)?.playerName ?? "";
        }
      }

      return updated;
    });
  }, [match?.events, lineup, statsMap]);

  const goToTeam = (id: string, name: string, logo: string) => {
    router.push(
      `/team/${id}?name=${encodeURIComponent(name)}&logo=${encodeURIComponent(logo)}`,
    );
  };

  if (!id || isLoading) {
    return (
      <View
        style={[styles.center, { backgroundColor: theme.colors.background }]}
      >
        <Stack.Screen options={{ headerShown: false }} />
      </View>
    );
  }

  if (isError || !match) {
    return (
      <View
        style={[styles.center, { backgroundColor: theme.colors.background }]}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={theme.colors.textSecondary + "60"}
        />
        <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
          {t("matchDetail.matchLoadError")}
        </Text>
      </View>
    );
  }

  const live = isLive(match);
  const advancer = getAggregateAdvancer(match, pairedMatch);
  const matchTime = dayjs.utc(match.startTime)
    .utcOffset(3 * 60)
    .locale(i18n.language)
    .format("HH:mm");
  const matchDate = dayjs.utc(match.startTime)
    .utcOffset(3 * 60)
    .locale(i18n.language)
    .format("DD MMM YYYY");

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        horizontal={false}
        scrollEventThrottle={16}
        style={activeTab === "forum" ? { flexGrow: 0 } : { flex: 1 }}
        scrollEnabled={activeTab !== "forum"}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header with back button ─── */}
        <View
          style={[styles.header, { backgroundColor: theme.colors.surface }]}
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
          <View style={styles.leagueRow}>
            <Image
              source={{ uri: match.league.logoUrl }}
              style={styles.leagueLogo}
              resizeMode="contain"
            />
            <View>
              <Text
                style={[styles.leagueName, { color: theme.colors.textPrimary }]}
              >
                {match.league.name}
              </Text>
              <Text
                style={[
                  styles.leagueDate,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {matchDate} • {matchTime}
                {match.league.round && ` • ${translateRound(match.league.round, i18n.language)}`}
              </Text>
            </View>
          </View>
          <BrandMark />
        </View>

        {/* ─── Score Hero ─── */}
        <View
          style={[styles.scoreHero, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.teamsRow}>
            {/* Home team — tappable */}
            <TouchableOpacity
              style={styles.teamCol}
              onPress={() =>
                goToTeam(
                  match.homeTeam.id,
                  match.homeTeam.name,
                  match.homeTeam.logoUrl,
                )
              }
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: match.homeTeam.logoUrl }}
                style={styles.teamLogo}
                resizeMode="contain"
              />
              <Text
                style={[styles.teamName, { color: theme.colors.textPrimary, fontWeight: advancer === "home" ? "800" : "700" }]}
                numberOfLines={2}
              >
                {match.homeTeam.name}
              </Text>
              {advancer === "home" && (
                <View style={styles.advancerBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                  <Text style={styles.advancerText}>Tur Atlıyor</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.scoreCol}>
              {match.status === "not_started" ? (
                <Text
                  style={[styles.vsText, { color: theme.colors.textSecondary }]}
                >
                  vs
                </Text>
              ) : (
                <View style={styles.scoreBox}>
                  <Text
                    style={[
                      styles.scoreText,
                      {
                        color: live
                          ? theme.colors.liveBadge
                          : theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {match.homeScore}
                  </Text>
                  <Text
                    style={[
                      styles.scoreDash,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    -
                  </Text>
                  <Text
                    style={[
                      styles.scoreText,
                      {
                        color: live
                          ? theme.colors.liveBadge
                          : theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {match.awayScore}
                  </Text>
                </View>
              )}

              {/* Status */}
              <View
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: live
                      ? theme.colors.liveBadge + "18"
                      : match.status === "finished"
                        ? theme.colors.primary + "15"
                        : theme.colors.divider + "80",
                  },
                ]}
              >
                {live && (
                  <View
                    style={[
                      styles.liveDot,
                      { backgroundColor: theme.colors.liveBadge },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: live
                        ? theme.colors.liveBadge
                        : match.status === "finished"
                          ? theme.colors.primary
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {match.status === "not_started" ? matchTime : getStatusText(match, t)}
                </Text>
              </View>
            </View>

            {/* Away team — tappable */}
            <TouchableOpacity
              style={styles.teamCol}
              onPress={() =>
                goToTeam(
                  match.awayTeam.id,
                  match.awayTeam.name,
                  match.awayTeam.logoUrl,
                )
              }
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: match.awayTeam.logoUrl }}
                style={styles.teamLogo}
                resizeMode="contain"
              />
              <Text
                style={[styles.teamName, { color: theme.colors.textPrimary, fontWeight: advancer === "away" ? "800" : "700" }]}
                numberOfLines={2}
              >
                {match.awayTeam.name}
              </Text>
              {advancer === "away" && (
                <View style={styles.advancerBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                  <Text style={styles.advancerText}>Tur Atlıyor</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Penaltı skoru — tek maçlık senaryoda (2. ayak değil) */}
          {!firstLegMatch && match.status === "finished" &&
           match.scorePenalty?.home != null && match.scorePenalty?.away != null && (
            <View style={styles.penaltyRow}>
              <Text style={[styles.penaltyLabel, { color: theme.colors.textSecondary }]}>
                {t("matchDetail.pen")}
              </Text>
              <Text style={[styles.penaltyScore, { color: theme.colors.primary }]}>
                {match.scorePenalty.home} - {match.scorePenalty.away}
              </Text>
            </View>
          )}

          {/* First leg score for 2nd leg knockout matches */}
          {firstLegMatch && firstLegMatch.status === "finished" && (
            <View style={styles.firstLegRow}>
              <Text style={[styles.firstLegLabel, { color: theme.colors.textSecondary }]}>
                {t("matchDetail.firstLeg")}:
              </Text>
              <Text style={[styles.firstLegScore, { color: theme.colors.textPrimary }]}>
                {firstLegMatch.homeTeam.id === match.awayTeam.id
                  ? `${firstLegMatch.homeTeam.name} ${firstLegMatch.homeScore}-${firstLegMatch.awayScore} ${firstLegMatch.awayTeam.name}`
                  : `${firstLegMatch.homeTeam.name} ${firstLegMatch.homeScore}-${firstLegMatch.awayScore} ${firstLegMatch.awayTeam.name}`}
              </Text>
              {(() => {
                // Calculate aggregate
                if (!firstLegMatch || match.status === "not_started") return null;
                const fl = firstLegMatch;
                const currentHomeIsFlHome = match.homeTeam.id === fl.homeTeam.id;
                const aggHome = (currentHomeIsFlHome ? (fl.homeScore ?? 0) : (fl.awayScore ?? 0)) + (match.homeScore ?? 0);
                const aggAway = (currentHomeIsFlHome ? (fl.awayScore ?? 0) : (fl.homeScore ?? 0)) + (match.awayScore ?? 0);
                return (
                  <Text style={[styles.firstLegAgg, { color: theme.colors.primary }]}>
                    {t("matchDetail.aggregate")}: {aggHome}-{aggAway}
                    {match.scorePenalty?.home != null && match.scorePenalty?.away != null
                      ? ` (${t("matchDetail.pen")} ${match.scorePenalty.home}-${match.scorePenalty.away})`
                      : ""}
                  </Text>
                );
              })()}
            </View>
          )}
        </View>

        {/* ─── Tab Bar ─── */}
        <View
          style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}
        >
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
                  size={18}
                  color={
                    active ? theme.colors.primary : theme.colors.textSecondary
                  }
                />
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
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

        {/* ─── Tab Content ─── */}
        {activeTab !== "forum" && <View style={styles.tabContent}>
          {activeTab === "summary" && (
            <View>
              {match.venue && (
                <View
                  style={[
                    styles.venueSection,
                    { backgroundColor: theme.colors.card },
                  ]}
                >
                  <View style={styles.sectionHeader}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {t("matchDetail.venueInfo")}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.venueText,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {match.venue.name}
                  </Text>
                  <Text
                    style={[
                      styles.venueSubText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {match.venue.city}
                  </Text>
                </View>
              )}

              {(match.referee || (match.assistantReferees && match.assistantReferees.length > 0)) && (
                <View
                  style={[
                    styles.venueSection,
                    { backgroundColor: theme.colors.card },
                  ]}
                >
                  <View style={styles.sectionHeader}>
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {t("matchDetail.referee")}
                    </Text>
                  </View>
                  {match.referee && (
                    <Text
                      style={[
                        styles.venueText,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {typeof match.referee === "string"
                        ? match.referee
                        : match.referee.name}
                    </Text>
                  )}
                  {match.assistantReferees && match.assistantReferees.length > 0 && (
                    <View style={{ marginTop: match.referee ? 6 : 0 }}>
                      <Text
                        style={[
                          styles.sectionTitle,
                          { color: theme.colors.textSecondary, marginBottom: 3 },
                        ]}
                      >
                        {t("matchDetail.assistantReferees")}
                      </Text>
                      {match.assistantReferees.map((ref, idx) => (
                        <Text
                          key={idx}
                          style={[
                            styles.venueSubText,
                            { color: theme.colors.textPrimary, marginBottom: 2 },
                          ]}
                        >
                          {ref.name}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {match.status === "finished" && lineup && (
                <ManOfTheMatch matchId={match.id} lineup={lineup} events={correctedEvents} />
              )}

              {match.broadcast && match.broadcast.length > 0 && (
                <View
                  style={[
                    styles.venueSection,
                    { backgroundColor: theme.colors.card },
                  ]}
                >
                  <View style={styles.sectionHeader}>
                    <Ionicons
                      name="tv-outline"
                      size={18}
                      color={theme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {t("matchDetail.broadcast")}
                    </Text>
                  </View>
                  <View style={styles.broadcastList}>
                    {match.broadcast.map((channel, index) => (
                      <Text
                        key={index}
                        style={[
                          styles.venueText,
                          { color: theme.colors.textPrimary },
                        ]}
                      >
                        {channel}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {match.events.length === 0 ? (
                <EmptyState
                  icon="document-text-outline"
                  text={t("matchDetail.noEventsYet")}
                  theme={theme}
                />
              ) : (
                <EventTimeline
                  events={correctedEvents}
                  homeTeamName={match.homeTeam.shortName}
                  awayTeamName={match.awayTeam.shortName}
                  playerIds={playerIdsFromName}
                  hasPenaltyShootout={
                    match.scorePenalty?.home != null &&
                    match.scorePenalty?.away != null
                  }
                />
              )}

              {injuries.length > 0 && (
                <View
                  style={[
                    styles.injurySection,
                    { backgroundColor: theme.colors.card },
                  ]}
                >
                  <View style={styles.sectionHeader}>
                    <Ionicons name="medkit-outline" size={20} color="#FF4444" />
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {t("matchDetail.injuries")}
                    </Text>
                  </View>
                  <View style={styles.injuryColumns}>
                    {/* Ev Sahibi */}
                    <View style={styles.injuryColumn}>
                      <View style={styles.injuryColHeader}>
                        <Image
                          source={{ uri: match.homeTeam.logoUrl }}
                          style={{ width: 18, height: 18 }}
                          resizeMode="contain"
                        />
                        <Text
                          style={[
                            styles.injuryColTitle,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {match.homeTeam.shortName}
                        </Text>
                      </View>
                      {injuries
                        .filter(
                          (inj) => String(inj.team.id) === match.homeTeam.id,
                        )
                        .map((injury, idx) => (
                          <View key={idx} style={styles.injuryItem}>
                            <Image
                              source={{ uri: injury.player.photo }}
                              style={styles.injuryPlayerPhoto}
                            />
                            <View style={styles.injuryInfo}>
                              <Text
                                style={[
                                  styles.injuryPlayerName,
                                  { color: theme.colors.textPrimary },
                                ]}
                                numberOfLines={1}
                              >
                                {injury.player.name}
                              </Text>
                              <Text
                                style={[
                                  styles.injuryReason,
                                  { color: theme.colors.textSecondary },
                                ]}
                                numberOfLines={1}
                              >
                                {injury.player.reason}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.injuryTypeChip,
                                {
                                  backgroundColor:
                                    injury.player.type === "Injured"
                                      ? "#FF444415"
                                      : "#FFBB3315",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.injuryTypeText,
                                  {
                                    color:
                                      injury.player.type === "Injured"
                                        ? "#FF4444"
                                        : "#FFBB33",
                                  },
                                ]}
                              >
                                {injury.player.type === "Injured"
                                  ? t("matchDetail.injured")
                                  : t("matchDetail.doubtful")}
                              </Text>
                            </View>
                          </View>
                        ))}
                      {injuries.filter(
                        (inj) => String(inj.team.id) === match.homeTeam.id,
                      ).length === 0 && (
                        <Text
                          style={[
                            styles.injuryEmpty,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {t("matchDetail.noAbsentPlayers")}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.injuryDivider,
                        { backgroundColor: theme.colors.divider },
                      ]}
                    />
                    {/* Deplasman - sağa hizalı */}
                    <View
                      style={[styles.injuryColumn, { alignItems: "flex-end" }]}
                    >
                      <View
                        style={[
                          styles.injuryColHeader,
                          { flexDirection: "row-reverse" },
                        ]}
                      >
                        <Image
                          source={{ uri: match.awayTeam.logoUrl }}
                          style={{ width: 18, height: 18 }}
                          resizeMode="contain"
                        />
                        <Text
                          style={[
                            styles.injuryColTitle,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {match.awayTeam.shortName}
                        </Text>
                      </View>
                      {injuries
                        .filter(
                          (inj) => String(inj.team.id) === match.awayTeam.id,
                        )
                        .map((injury, idx) => (
                          <View
                            key={idx}
                            style={[
                              styles.injuryItem,
                              {
                                flexDirection: "row-reverse",
                                alignSelf: "stretch",
                              },
                            ]}
                          >
                            <Image
                              source={{ uri: injury.player.photo }}
                              style={styles.injuryPlayerPhoto}
                            />
                            <View
                              style={[
                                styles.injuryInfo,
                                { alignItems: "flex-end" },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.injuryPlayerName,
                                  {
                                    color: theme.colors.textPrimary,
                                    textAlign: "right",
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {injury.player.name}
                              </Text>
                              <Text
                                style={[
                                  styles.injuryReason,
                                  {
                                    color: theme.colors.textSecondary,
                                    textAlign: "right",
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {injury.player.reason}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.injuryTypeChip,
                                {
                                  backgroundColor:
                                    injury.player.type === "Injured"
                                      ? "#FF444415"
                                      : "#FFBB3315",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.injuryTypeText,
                                  {
                                    color:
                                      injury.player.type === "Injured"
                                        ? "#FF4444"
                                        : "#FFBB33",
                                  },
                                ]}
                              >
                                {injury.player.type === "Injured"
                                  ? t("matchDetail.injured")
                                  : t("matchDetail.doubtful")}
                              </Text>
                            </View>
                          </View>
                        ))}
                      {injuries.filter(
                        (inj) => String(inj.team.id) === match.awayTeam.id,
                      ).length === 0 && (
                        <Text
                          style={[
                            styles.injuryEmpty,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {t("matchDetail.noAbsentPlayers")}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {activeTab === "statistics" && (
            <View style={styles.statsContainer}>
              <TimeRangeSelector
                startMinute={startMinute}
                endMinute={endMinute}
                maxMinute={maxMinute}
                onChangeStart={setStartMinute}
                onChangeEnd={setEndMinute}
              />
              <View style={styles.statsHeader}>
                <TouchableOpacity
                  style={styles.statsTeamCol}
                  onPress={() =>
                    goToTeam(
                      match.homeTeam.id,
                      match.homeTeam.name,
                      match.homeTeam.logoUrl,
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: match.homeTeam.logoUrl }}
                    style={styles.statsTeamLogo}
                    resizeMode="contain"
                  />
                  <Text
                    style={[
                      styles.statsTeamName,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {match.homeTeam.shortName}
                  </Text>
                </TouchableOpacity>
                <Text
                  style={[
                    styles.statsTitle,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t("matchDetail.statistics")}
                </Text>
                <TouchableOpacity
                  style={styles.statsTeamCol}
                  onPress={() =>
                    goToTeam(
                      match.awayTeam.id,
                      match.awayTeam.name,
                      match.awayTeam.logoUrl,
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: match.awayTeam.logoUrl }}
                    style={styles.statsTeamLogo}
                    resizeMode="contain"
                  />
                  <Text
                    style={[
                      styles.statsTeamName,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {match.awayTeam.shortName}
                  </Text>
                </TouchableOpacity>
              </View>

{(() => {
                const filtered = match.events.filter(
                  (e) => e.minute >= startMinute && e.minute <= endMinute,
                );
                const count = (team: "home" | "away", ...types: string[]) =>
                  filtered.filter(
                    (e) => e.team === team && types.includes(e.type),
                  ).length;
                const homeGoals = count("home", "goal", "penalty") + count("away", "own_goal");
                const awayGoals = count("away", "goal", "penalty") + count("home", "own_goal");
                const homeYellow = count("home", "yellow_card");
                const awayYellow = count("away", "yellow_card");
                const homeRed = count("home", "red_card");
                const awayRed = count("away", "red_card");

                const isFullMatch = startMinute === 0 && endMinute === maxMinute;

                if (isFullMatch) {
                  const s = match.statistics;
                  return [
                    { label: t("matchDetail.possession"),    home: s.home.possession,    away: s.away.possession,    pct: true },
                    { label: t("matchDetail.goals"),         home: homeGoals,            away: awayGoals },
                    { label: t("matchDetail.xg"),            home: s.home.xg,            away: s.away.xg },
                    { label: t("matchDetail.shotsOnTarget"), home: s.home.shotsOnTarget, away: s.away.shotsOnTarget },
                    { label: t("matchDetail.shots"),         home: s.home.shots,         away: s.away.shots },
                    { label: t("matchDetail.shotsOffTarget"),home: s.home.shotsOffTarget,away: s.away.shotsOffTarget },
                    { label: t("matchDetail.passAccuracy"),  home: s.home.passAccuracy,  away: s.away.passAccuracy,  pct: true },
                    { label: t("matchDetail.totalPasses"),   home: s.home.totalPasses,   away: s.away.totalPasses },
                    { label: t("matchDetail.accuratePasses"),home: s.home.accuratePasses,away: s.away.accuratePasses },
                    { label: t("matchDetail.corners"),       home: s.home.corners,       away: s.away.corners },
                    { label: t("matchDetail.fouls"),         home: s.home.fouls,         away: s.away.fouls },
                    { label: t("matchDetail.offsides"),      home: s.home.offsides,      away: s.away.offsides },
                    { label: t("matchDetail.yellowCards"),   home: homeYellow,           away: awayYellow },
                    { label: t("matchDetail.redCards"),      home: homeRed,              away: awayRed },
                  ].map((stat) => (
                    <StatBar
                      key={stat.label}
                      label={stat.label}
                      homeValue={stat.home}
                      awayValue={stat.away}
                      isPercentage={stat.pct}
                    />
                  ));
                }

                // Kısmi aralık: yalnızca olaylardan hesaplanabilen istatistikler
                return [
                  { label: t("matchDetail.goals"),       home: homeGoals,  away: awayGoals },
                  { label: t("matchDetail.yellowCards"), home: homeYellow, away: awayYellow },
                  { label: t("matchDetail.redCards"),    home: homeRed,    away: awayRed },
                ].map((stat) => (
                  <StatBar
                    key={stat.label}
                    label={stat.label}
                    homeValue={stat.home}
                    awayValue={stat.away}
                  />
                ));
              })()}


            </View>
          )}

          {activeTab === "lineup" &&
            (lineup ? (
              <FootballPitch lineup={lineup} events={match?.events} statsMap={statsMap} />
            ) : (
              <EmptyState
                icon="people-outline"
                text={t("matchDetail.lineupNotFound")}
                theme={theme}
              />
            ))}

          {activeTab === "h2h" && (
            <View style={styles.h2hContainer}>
              {/* Sub-tab buttons: H2H | Ev | Deplasman */}
              <View
                style={[
                  styles.h2hSubTabBar,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                {[
                  {
                    key: "h2h" as const,
                    label: t("matchDetail.matchesBetween"),
                  },
                  { key: "home" as const, label: t("matchDetail.home") },
                  { key: "away" as const, label: t("matchDetail.away") },
                ].map((tab) => {
                  const active = h2hSubTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      onPress={() => setH2hSubTab(tab.key)}
                      style={[
                        styles.h2hSubTabBtn,
                        {
                          backgroundColor: active
                            ? theme.colors.primary + "18"
                            : "transparent",
                          borderColor: active
                            ? theme.colors.primary
                            : theme.colors.divider,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.h2hSubTabText,
                          {
                            color: active
                              ? theme.colors.primary
                              : theme.colors.textSecondary,
                            fontWeight: active ? "700" : "500",
                          },
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* H2H Content */}
              {h2hSubTab === "h2h" &&
                (h2hMatches.length === 0 ? (
                  <EmptyState
                    icon="swap-horizontal-outline"
                    text={t("matchDetail.encounterNotFound")}
                    theme={theme}
                  />
                ) : (
                  <View>
                    {/* H2H Summary */}
                    {(() => {
                      const homeId = match!.homeTeam.id;
                      let homeWins = 0,
                        awayWins = 0,
                        draws = 0;
                      h2hMatches.forEach((m) => {
                        if (m.homeScore === null || m.awayScore === null)
                          return;
                        if (m.homeScore === m.awayScore) {
                          draws++;
                          return;
                        }
                        const winnerId =
                          m.homeScore > m.awayScore
                            ? m.homeTeam.id
                            : m.awayTeam.id;
                        if (winnerId === homeId) homeWins++;
                        else awayWins++;
                      });
                      const total = homeWins + awayWins + draws;
                      return (
                        <View
                          style={[
                            styles.h2hSummary,
                            { backgroundColor: theme.colors.card },
                          ]}
                        >
                          <View style={styles.h2hSummaryRow}>
                            <View style={styles.h2hSummaryTeamLeft}>
                              <Image
                                source={{ uri: match!.homeTeam.logoUrl }}
                                style={styles.h2hSummaryLogo}
                                resizeMode="contain"
                              />
                              <Text
                                style={[
                                  styles.h2hSummaryTeamName,
                                  { color: theme.colors.textPrimary },
                                ]}
                                numberOfLines={1}
                              >
                                {match!.homeTeam.name}
                              </Text>
                            </View>
                            <View style={styles.h2hSummaryTeamRight}>
                              <Text
                                style={[
                                  styles.h2hSummaryTeamName,
                                  {
                                    color: theme.colors.textPrimary,
                                    textAlign: "right",
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {match!.awayTeam.name}
                              </Text>
                              <Image
                                source={{ uri: match!.awayTeam.logoUrl }}
                                style={styles.h2hSummaryLogo}
                                resizeMode="contain"
                              />
                            </View>
                          </View>
                          <View style={styles.h2hStatsRow}>
                            <View style={styles.h2hStatCol}>
                              <Text
                                style={[
                                  styles.h2hSummaryCount,
                                  { color: "#00C851" },
                                ]}
                              >
                                {homeWins}
                              </Text>
                              <Text
                                style={[
                                  styles.h2hSummaryLabel,
                                  { color: theme.colors.textSecondary },
                                ]}
                              >
                                {t("matchDetail.win")}
                              </Text>
                            </View>
                            <View style={styles.h2hStatCol}>
                              <Text
                                style={[
                                  styles.h2hSummaryCount,
                                  { color: theme.colors.textSecondary },
                                ]}
                              >
                                {draws}
                              </Text>
                              <Text
                                style={[
                                  styles.h2hSummaryLabel,
                                  { color: theme.colors.textSecondary },
                                ]}
                              >
                                {t("matchDetail.draw")}
                              </Text>
                            </View>
                            <View style={styles.h2hStatCol}>
                              <Text
                                style={[
                                  styles.h2hSummaryCount,
                                  { color: "#FF4444" },
                                ]}
                              >
                                {awayWins}
                              </Text>
                              <Text
                                style={[
                                  styles.h2hSummaryLabel,
                                  { color: theme.colors.textSecondary },
                                ]}
                              >
                                {t("matchDetail.win")}
                              </Text>
                            </View>
                          </View>
                          {total > 0 && (
                            <View style={styles.h2hBar}>
                              <View
                                style={[
                                  styles.h2hBarSegment,
                                  {
                                    flex: homeWins || 0.1,
                                    backgroundColor: "#00C851",
                                    borderTopLeftRadius: 3,
                                    borderBottomLeftRadius: 3,
                                  },
                                ]}
                              />
                              <View
                                style={[
                                  styles.h2hBarSegment,
                                  {
                                    flex: draws || 0.1,
                                    backgroundColor: "#FFBB33",
                                  },
                                ]}
                              />
                              <View
                                style={[
                                  styles.h2hBarSegment,
                                  {
                                    flex: awayWins || 0.1,
                                    backgroundColor: "#FF4444",
                                    borderTopRightRadius: 3,
                                    borderBottomRightRadius: 3,
                                  },
                                ]}
                              />
                            </View>
                          )}
                          <Text
                            style={[
                              styles.h2hSummaryTotal,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {total} {t("matchDetail.encounters")}
                          </Text>
                        </View>
                      );
                    })()}
                    {h2hMatches
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.startTime).getTime() -
                          new Date(a.startTime).getTime(),
                      )
                      .map((m) => {
                        const dateStr = dayjs.utc(m.startTime)
                          .utcOffset(3 * 60)
                          .locale(i18n.language)
                          .format("DD MMM YYYY");
                        return (
                          <TouchableOpacity
                            key={m.id}
                            style={[
                              styles.h2hRow,
                              { backgroundColor: theme.colors.card },
                            ]}
                            onPress={() => router.push(`/match/${m.id}`)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.h2hDate,
                                { color: theme.colors.textSecondary },
                              ]}
                            >
                              {dateStr}
                            </Text>
                            <View style={styles.h2hTeams}>
                              <View style={styles.h2hTeamSide}>
                                <Image
                                  source={{ uri: m.homeTeam.logoUrl }}
                                  style={styles.h2hTeamLogo}
                                  resizeMode="contain"
                                />
                                <Text
                                  style={[
                                    styles.h2hTeamName,
                                    { color: theme.colors.textPrimary },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {m.homeTeam.name}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.h2hScoreBox,
                                  {
                                    backgroundColor:
                                      theme.colors.divider + "60",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.h2hScore,
                                    { color: theme.colors.textPrimary },
                                  ]}
                                >
                                  {m.homeScore ?? "-"} - {m.awayScore ?? "-"}
                                </Text>
                              </View>
                              <View style={styles.h2hTeamSideRight}>
                                <Text
                                  style={[
                                    styles.h2hTeamName,
                                    {
                                      color: theme.colors.textPrimary,
                                      textAlign: "right",
                                    },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {m.awayTeam.name}
                                </Text>
                                <Image
                                  source={{ uri: m.awayTeam.logoUrl }}
                                  style={styles.h2hTeamLogo}
                                  resizeMode="contain"
                                />
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                ))}

              {/* Home matches content */}
              {h2hSubTab === "home" &&
                (lastHomeMatches.length === 0 ? (
                  <EmptyState
                    icon="home-outline"
                    text={t("matchDetail.encounterNotFound")}
                    theme={theme}
                  />
                ) : (
                  <View>
                    <Text
                      style={[
                        styles.h2hSectionTitle,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {t("matchDetail.lastHomeMatches", {
                        name: match!.homeTeam.name,
                      })}
                    </Text>
                    {lastHomeMatches
                      .sort(
                        (a, b) =>
                          new Date(b.startTime).getTime() -
                          new Date(a.startTime).getTime(),
                      )
                      .map((m) => {
                        const dateStr = dayjs.utc(m.startTime)
                          .utcOffset(3 * 60)
                          .locale(i18n.language)
                          .format("DD MMM YYYY");
                        return (
                          <TouchableOpacity
                            key={m.id}
                            style={[
                              styles.h2hRow,
                              { backgroundColor: theme.colors.card },
                            ]}
                            onPress={() => router.push(`/match/${m.id}`)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.h2hDate,
                                { color: theme.colors.textSecondary },
                              ]}
                            >
                              {dateStr}
                            </Text>
                            <View style={styles.h2hTeams}>
                              <View style={styles.h2hTeamSide}>
                                <Image
                                  source={{ uri: m.homeTeam.logoUrl }}
                                  style={styles.h2hTeamLogo}
                                  resizeMode="contain"
                                />
                                <Text
                                  style={[
                                    styles.h2hTeamName,
                                    { color: theme.colors.textPrimary },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {m.homeTeam.name}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.h2hScoreBox,
                                  {
                                    backgroundColor:
                                      theme.colors.divider + "60",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.h2hScore,
                                    { color: theme.colors.textPrimary },
                                  ]}
                                >
                                  {m.homeScore ?? "-"} - {m.awayScore ?? "-"}
                                </Text>
                              </View>
                              <View style={styles.h2hTeamSideRight}>
                                <Text
                                  style={[
                                    styles.h2hTeamName,
                                    {
                                      color: theme.colors.textPrimary,
                                      textAlign: "right",
                                    },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {m.awayTeam.name}
                                </Text>
                                <Image
                                  source={{ uri: m.awayTeam.logoUrl }}
                                  style={styles.h2hTeamLogo}
                                  resizeMode="contain"
                                />
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                ))}

              {/* Away matches content */}
              {h2hSubTab === "away" &&
                (lastAwayMatches.length === 0 ? (
                  <EmptyState
                    icon="airplane-outline"
                    text={t("matchDetail.encounterNotFound")}
                    theme={theme}
                  />
                ) : (
                  <View>
                    <Text
                      style={[
                        styles.h2hSectionTitle,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {t("matchDetail.lastAwayMatches", {
                        name: match!.awayTeam.name,
                      })}
                    </Text>
                    {lastAwayMatches
                      .sort(
                        (a, b) =>
                          new Date(b.startTime).getTime() -
                          new Date(a.startTime).getTime(),
                      )
                      .map((m) => {
                        const dateStr = dayjs.utc(m.startTime)
                          .utcOffset(3 * 60)
                          .locale(i18n.language)
                          .format("DD MMM YYYY");
                        return (
                          <TouchableOpacity
                            key={m.id}
                            style={[
                              styles.h2hRow,
                              { backgroundColor: theme.colors.card },
                            ]}
                            onPress={() => router.push(`/match/${m.id}`)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.h2hDate,
                                { color: theme.colors.textSecondary },
                              ]}
                            >
                              {dateStr}
                            </Text>
                            <View style={styles.h2hTeams}>
                              <View style={styles.h2hTeamSide}>
                                <Image
                                  source={{ uri: m.homeTeam.logoUrl }}
                                  style={styles.h2hTeamLogo}
                                  resizeMode="contain"
                                />
                                <Text
                                  style={[
                                    styles.h2hTeamName,
                                    { color: theme.colors.textPrimary },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {m.homeTeam.name}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.h2hScoreBox,
                                  {
                                    backgroundColor:
                                      theme.colors.divider + "60",
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.h2hScore,
                                    { color: theme.colors.textPrimary },
                                  ]}
                                >
                                  {m.homeScore ?? "-"} - {m.awayScore ?? "-"}
                                </Text>
                              </View>
                              <View style={styles.h2hTeamSideRight}>
                                <Text
                                  style={[
                                    styles.h2hTeamName,
                                    {
                                      color: theme.colors.textPrimary,
                                      textAlign: "right",
                                    },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {m.awayTeam.name}
                                </Text>
                                <Image
                                  source={{ uri: m.awayTeam.logoUrl }}
                                  style={styles.h2hTeamLogo}
                                  resizeMode="contain"
                                />
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                ))}
            </View>
          )}

          {activeTab === "analysis" && (
            <View style={styles.analysisContainer}>
              {predictions ? (
                <>
                  {/* AI Tahmini - Büyük Sonuç Kartı */}
                  <View
                    style={[
                      styles.predictionCard,
                      { backgroundColor: theme.colors.card },
                    ]}
                  >
                    <View style={styles.aiHeader}>
                      <Ionicons
                        name="sparkles"
                        size={18}
                        color={theme.colors.primary}
                      />
                      <Text
                        style={[
                          styles.predictionTitle,
                          { color: theme.colors.primary },
                        ]}
                      >
                        {t("matchDetail.aiPrediction")}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.predictionAdvice,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {translatePrediction(
                        predictions.advice,
                        i18n.language,
                        predictions.homeTeamName ?? match!.homeTeam.name,
                        predictions.awayTeamName ?? match!.awayTeam.name,
                      )}
                    </Text>

                    {/* Winner Section */}
                    {predictions.winner && (
                      <View
                        style={[
                          styles.winnerSection,
                          {
                            borderTopColor: theme.colors.divider,
                            borderTopWidth: 1,
                            marginTop: 16,
                            paddingTop: 16,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.winnerLabel,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {t("matchDetail.winner")}
                        </Text>
                        <View style={styles.winnerTeamRow}>
                          <Image
                            source={{
                              uri:
                                predictions.winner === "home"
                                  ? match!.homeTeam.logoUrl
                                  : predictions.winner === "away"
                                    ? match!.awayTeam.logoUrl
                                    : undefined,
                            }}
                            style={styles.winnerTeamLogo}
                            resizeMode="contain"
                          />
                          <Text
                            style={[
                              styles.winnerTeamName,
                              { color: theme.colors.textPrimary },
                            ]}
                          >
                            {predictions.winner === "home"
                              ? match!.homeTeam.name
                              : predictions.winner === "away"
                                ? match!.awayTeam.name
                                : "-"}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Olasılık Kartları - 3'lü Grid */}
                  <View style={styles.probGrid}>
                    {[
                      {
                        label: match!.homeTeam.shortName,
                        value: predictions.probabilities.home,
                        color: theme.colors.primary,
                        icon: "home",
                      },
                      {
                        label: t("matchDetail.draw"),
                        value: predictions.probabilities.draw,
                        color: theme.colors.textSecondary,
                        icon: "remove",
                      },
                      {
                        label: match!.awayTeam.shortName,
                        value: predictions.probabilities.away,
                        color: "#FF4444",
                        icon: "airplane",
                      },
                    ].map((item, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.probCard,
                          { backgroundColor: theme.colors.card },
                        ]}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={16}
                          color={item.color}
                        />
                        <Text
                          style={[styles.probCardValue, { color: item.color }]}
                        >
                          %{item.value}
                        </Text>
                        <Text
                          style={[
                            styles.probCardLabel,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {item.label}
                        </Text>
                        {/* Mini bar */}
                        <View
                          style={[
                            styles.probMiniBarBg,
                            { backgroundColor: theme.colors.divider },
                          ]}
                        >
                          <View
                            style={[
                              styles.probMiniBarFill,
                              {
                                width: `${item.value}%`,
                                backgroundColor: item.color,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Takım Karşılaştırma Tablosu */}
                  <View
                    style={[
                      styles.comparisonCard,
                      { backgroundColor: theme.colors.card },
                    ]}
                  >
                    <Text
                      style={[
                        styles.compCardTitle,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {t("matchDetail.teamComparison")}
                    </Text>
                    {/* Takım logoları */}
                    <View style={styles.compTeamRow}>
                      <View style={styles.compTeamSide}>
                        <Image
                          source={{ uri: match!.homeTeam.logoUrl }}
                          style={{ width: 20, height: 20 }}
                          resizeMode="contain"
                        />
                        <Text
                          style={[
                            styles.compTeamName,
                            { color: theme.colors.textPrimary },
                          ]}
                        >
                          {match!.homeTeam.shortName}
                        </Text>
                      </View>
                      <Text
                        style={[
                          { fontSize: 10, color: theme.colors.textSecondary },
                        ]}
                      >
                        VS
                      </Text>
                      <View
                        style={[
                          styles.compTeamSide,
                          { alignItems: "flex-end" },
                        ]}
                      >
                        <Image
                          source={{ uri: match!.awayTeam.logoUrl }}
                          style={{ width: 20, height: 20 }}
                          resizeMode="contain"
                        />
                        <Text
                          style={[
                            styles.compTeamName,
                            { color: theme.colors.textPrimary },
                          ]}
                        >
                          {match!.awayTeam.shortName}
                        </Text>
                      </View>
                    </View>
                    {[
                      {
                        label: t("matchDetail.form"),
                        home: predictions.comparison.form.home,
                        away: predictions.comparison.form.away,
                        icon: "trending-up",
                      },
                      {
                        label: t("matchDetail.attack"),
                        home: predictions.comparison.att.home,
                        away: predictions.comparison.att.away,
                        icon: "flash",
                      },
                      {
                        label: t("matchDetail.defense"),
                        home: predictions.comparison.def.home,
                        away: predictions.comparison.def.away,
                        icon: "shield",
                      },
                    ].map((item, idx) => {
                      const homeNum = parseInt(item.home) || 50;
                      const awayNum = parseInt(item.away) || 50;
                      const total = homeNum + awayNum || 1;
                      return (
                        <View key={idx} style={styles.compRow}>
                          <Text
                            style={[
                              styles.compRowValue,
                              {
                                color:
                                  homeNum >= awayNum
                                    ? theme.colors.primary
                                    : theme.colors.textPrimary,
                                fontWeight: homeNum >= awayNum ? "800" : "500",
                              },
                            ]}
                          >
                            {item.home}
                          </Text>
                          <View style={styles.compBarArea}>
                            <View style={styles.compBarRow}>
                              <View
                                style={[
                                  styles.compBarLeft,
                                  {
                                    flex: homeNum,
                                    backgroundColor:
                                      theme.colors.primary +
                                      (homeNum >= awayNum ? "" : "40"),
                                  },
                                ]}
                              />
                              <View
                                style={[
                                  styles.compBarRight,
                                  {
                                    flex: awayNum,
                                    backgroundColor:
                                      "#FF4444" +
                                      (awayNum > homeNum ? "" : "40"),
                                  },
                                ]}
                              />
                            </View>
                            <View style={styles.compBarLabelRow}>
                              <Ionicons
                                name={item.icon as any}
                                size={11}
                                color={theme.colors.textSecondary}
                              />
                              <Text
                                style={[
                                  styles.compBarLabel,
                                  { color: theme.colors.textSecondary },
                                ]}
                              >
                                {item.label}
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.compRowValue,
                              {
                                color:
                                  awayNum > homeNum
                                    ? "#FF4444"
                                    : theme.colors.textPrimary,
                                fontWeight: awayNum > homeNum ? "800" : "500",
                              },
                            ]}
                          >
                            {item.away}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Saha İçi Analiz */}
                  <View
                    style={[
                      styles.h2hInfoCard,
                      { backgroundColor: theme.colors.card },
                    ]}
                  >
                    <View style={styles.aiHeader}>
                      <Ionicons
                        name="football"
                        size={16}
                        color={theme.colors.primary}
                      />
                      <Text
                        style={[
                          styles.compCardTitle,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {t("matchDetail.fieldAnalysis")}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.h2hText,
                        { color: theme.colors.textPrimary },
                      ]}
                    >
                      {translateH2H(predictions.h2h, i18n.language)}
                    </Text>
                  </View>

                  {/* Disclaimer */}
                  <View
                    style={[
                      styles.disclaimerContainer,
                      {
                        backgroundColor: theme.colors.card,
                        borderTopColor: theme.colors.divider,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.disclaimerText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Bu analiz; takım form grafikleri, karşılıklı maç
                      istatistikleri ve sezon performans verileri temel alınarak
                      oluşturulmuştur. Sonuçlar istatistiksel olasılıkları
                      yansıtmakta olup kesin bir öngörü niteliği
                      taşımamaktadır.
                    </Text>
                  </View>
                </>
              ) : (
                <EmptyState
                  icon="analytics-outline"
                  text={t("matchDetail.analysisNotFound")}
                  theme={theme}
                />
              )}
            </View>
          )}

          {activeTab === "standings" && match && (
            <StandingsTab
              leagueId={match.league.id}
              season={match.league.season}
              homeTeamId={match.homeTeam.id}
              awayTeamId={match.awayTeam.id}
              isLive={isLive(match)}
              isFinished={match.status === "finished"}
              homeScore={match.homeScore}
              awayScore={match.awayScore}
              round={match.league.round}
            />
          )}

        </View>}
      </ScrollView>
      {activeTab === "forum" && (
        <ForumTab matchId={id as string} />
      )}
      <BannerAd />
      </View>
    </>
  );
}

function EmptyState({
  icon,
  text,
  theme,
}: {
  icon: string;
  text: string;
  theme: any;
}) {
  return (
    <View style={styles.emptyState}>
      <Ionicons
        name={icon as any}
        size={40}
        color={theme.colors.textSecondary + "60"}
      />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden", maxWidth: "100%" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  leagueRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  leagueLogo: { width: 26, height: 26, borderRadius: 4 },
  leagueName: { fontSize: 13, fontWeight: "700" },
  leagueDate: { fontSize: 11, marginTop: 1 },

  // Score Hero
  scoreHero: {
    paddingBottom: 20,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 4,
  },
  teamCol: { flex: 1, alignItems: "center", gap: 10 },
  teamLogo: { width: 64, height: 64 },
  teamName: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
  advancerBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    marginTop: 4,
  },
  penaltyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 6,
    paddingBottom: 2,
  },
  penaltyLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  penaltyScore: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  firstLegRow: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
    gap: 2,
  },
  firstLegLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  firstLegScore: {
    fontSize: 11,
    fontWeight: "700",
  },
  firstLegAgg: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  advancerText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4CAF50",
  },
  scoreCol: {
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  scoreBox: { flexDirection: "row", alignItems: "center", gap: 8 },
  scoreText: { fontSize: 44, fontWeight: "800", lineHeight: 52 },
  scoreDash: { fontSize: 28, fontWeight: "300" },
  vsText: { fontSize: 20, fontWeight: "300", fontStyle: "italic" },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "600" },

  // Tab Bar
  tabBar: { flexDirection: "row", marginTop: 6, paddingTop: 4 },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 3,
    position: "relative",
  },
  tabText: { fontSize: 10, fontWeight: "500" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    borderRadius: 2,
  },

  // Tab Content
  tabContent: { paddingBottom: 60, minHeight: 300 },
  loadingBox: { paddingTop: 60, alignItems: "center" },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: { fontSize: 14 },

  // Statistics
  statsContainer: { padding: 16 },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 14,
  },
  statsTeamCol: { alignItems: "center", gap: 4, flex: 1 },
  statsTeamLogo: { width: 24, height: 24 },
  statsTeamName: { fontSize: 13, fontWeight: "700" },
  statsTitle: {
    fontSize: 12,
    flex: 2,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // H2H
  h2hContainer: { padding: 12, gap: 8 },
  h2hSubTabBar: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  h2hSubTabBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  h2hSubTabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  h2hSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  h2hRow: { borderRadius: 12, padding: 12, gap: 8 },
  h2hDate: { fontSize: 11 },
  h2hTeams: { flexDirection: "row", alignItems: "center", gap: 8 },
  h2hTeamSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  h2hTeamSideRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
  },
  h2hTeamLogo: { width: 20, height: 20, borderRadius: 4 },
  h2hTeamName: { flex: 1, fontSize: 13, fontWeight: "600" },
  h2hScoreBox: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center" as const,
  },
  h2hScore: { fontSize: 14, fontWeight: "800" },

  // H2H Summary
  h2hSummary: { borderRadius: 12, padding: 16, marginBottom: 12, gap: 14 },
  h2hSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  h2hSummaryTeamLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  h2hSummaryTeamRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "flex-end",
  },
  h2hSummaryLogo: { width: 28, height: 28 },
  h2hSummaryTeamName: { fontSize: 13, fontWeight: "700", flex: 1 },
  h2hStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  h2hStatCol: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  h2hSummaryCount: { fontSize: 24, fontWeight: "800" },
  h2hSummaryLabel: { fontSize: 10, fontWeight: "600" },
  h2hSummaryTotal: { fontSize: 11, textAlign: "center" },
  h2hBar: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  h2hBarSegment: { height: "100%" },

  // Analysis
  analysisContainer: { padding: 12, gap: 12, paddingBottom: 8 },
  disclaimerContainer: {
    marginTop: 4,
    marginHorizontal: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  predictionCard: { borderRadius: 14, padding: 16, gap: 10 },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  predictionTitle: {
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  predictionAdvice: { fontSize: 13, lineHeight: 20, fontWeight: "500" },
  probGrid: { flexDirection: "row", gap: 8 },
  probCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  probCardValue: { fontSize: 22, fontWeight: "900" },
  probCardLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  probMiniBarBg: { width: "100%", height: 4, borderRadius: 2, marginTop: 4 },
  probMiniBarFill: { height: "100%", borderRadius: 2 },
  comparisonCard: { borderRadius: 14, padding: 16, gap: 10 },
  compCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  compTeamRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  compTeamSide: { flexDirection: "row", alignItems: "center", gap: 8 },
  compTeamName: { fontSize: 12, fontWeight: "700" },
  compRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  compRowValue: { width: 36, textAlign: "center", fontSize: 13 },
  compBarArea: { flex: 1, gap: 3 },
  compBarRow: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  compBarLeft: {
    height: "100%",
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  compBarRight: {
    height: "100%",
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  compBarLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  compBarLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase" },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  h2hInfoCard: { borderRadius: 14, padding: 16, gap: 8 },
  h2hText: { fontSize: 13, lineHeight: 20 },

  // Commentary
  commentaryContainer: { padding: 16 },
  commentaryItem: { flexDirection: "row", gap: 12 },
  commentaryTimeLine: { alignItems: "center", width: 20 },
  timeDot: { width: 10, height: 10, borderRadius: 5, zIndex: 1 },
  timeLine: { width: 2, flex: 1, marginTop: -5, marginBottom: -5 },
  commentaryContent: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  commentaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  commentaryMinute: { fontSize: 13, fontWeight: "700" },
  commentaryText: { fontSize: 13, lineHeight: 18 },

  // Venue Section
  venueSection: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  venueText: {
    fontSize: 13,
    fontWeight: "600",
  },
  venueSubText: {
    fontSize: 12,
  },
  broadcastList: {
    gap: 3,
  },

  // Injury Section
  injurySection: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  injuryColumns: {
    flexDirection: "row",
    gap: 0,
  },
  injuryColumn: {
    flex: 1,
    gap: 6,
  },
  injuryDivider: {
    width: 1,
    marginHorizontal: 8,
  },
  injuryColHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  injuryColTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  injuryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 6,
  },
  injuryPlayerPhoto: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#00000010",
  },
  injuryInfo: {
    flex: 1,
    gap: 1,
  },
  injuryPlayerName: {
    fontSize: 11,
    fontWeight: "600",
  },
  injuryReason: {
    fontSize: 9,
  },
  injuryTypeChip: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  injuryTypeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  injuryEmpty: {
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },


  // H2H Empty Text
  h2hEmptyText: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
    fontStyle: "italic",
  },

  // Winner Section
  winnerSection: {
    gap: 10,
  },
  winnerLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  winnerTeamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  winnerTeamLogo: {
    width: 32,
    height: 32,
  },
  winnerTeamName: {
    fontSize: 14,
    fontWeight: "700",
  },
});
