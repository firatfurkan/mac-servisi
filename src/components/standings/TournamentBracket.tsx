import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import React, { useMemo } from "react";
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
import { useBracket } from "../../hooks/useBracket";
import { BracketMatchup, BracketRound, BracketTeamEntry } from "../../types";
import { translateRound } from "../../utils/matchUtils";

// ─── Layout constants ─────────────────────────────────────────────────────────
const CARD_W = 210;
const CARD_H = 118; // team rows + dividers + agg footer
const CARD_GAP = 22;
const COL_GAP = 58;
const HDR_H = 30;
const HDR_MB = 12;
const TOP_PAD = HDR_H + HDR_MB;
const PITCH = CARD_H + CARD_GAP;

// ─── Types ────────────────────────────────────────────────────────────────────
type ConnMode = "classic" | "seeded";

const isTBDTeam = (t: BracketTeamEntry | undefined | null): boolean =>
  !t || t.id === "__tbd__";

// ─── Universal Layout Engine ──────────────────────────────────────────────────

/**
 * Detects the connector mode between two consecutive rounds.
 *
 * classic : currCount * 2 === prevCount  → 2-to-1 tree (standard knockout)
 * seeded  : currCount === prevCount      → 1-to-1 (play-off / seeded draw)
 */
function detectMode(prev: BracketRound, curr: BracketRound): ConnMode {
  const pc = prev?.matchups?.length ?? 0;
  const cc = curr?.matchups?.length ?? 0;
  if (cc > 0 && cc === pc) return "seeded";
  return "classic";
}

/**
 * Computes absolute Y-positions for every matchup in every round.
 * Handles classic (2→1), seeded (1→1), and the Final (1 match → centred).
 */
function computeYPos(rounds: BracketRound[]): number[][] {
  if (!rounds.length) return [];

  const yPos: number[][] = [];
  yPos.push((rounds[0]?.matchups ?? []).map((_, i) => TOP_PAD + i * PITCH));

  for (let r = 1; r < rounds.length; r++) {
    const prev = yPos[r - 1];
    const items = rounds[r]?.matchups ?? [];
    const mode = detectMode(rounds[r - 1], rounds[r]);

    yPos.push(
      items.map((_, i) => {
        // Single-match round (Final): vertically centre over the whole bracket
        if (items.length === 1 && prev.length > 1) {
          return (prev[0] + prev[prev.length - 1]) / 2;
        }
        if (mode === "seeded") {
          // 1-to-1: same Y as the corresponding previous match
          return prev[i] ?? TOP_PAD;
        }
        // Classic: midpoint between two feeder matches
        const yTop = prev[i * 2] ?? prev[0] ?? TOP_PAD;
        const yBot = prev[i * 2 + 1] ?? yTop;
        return (yTop + yBot) / 2;
      }),
    );
  }
  return yPos;
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function TournamentBracket({
  leagueId,
  season,
  theme,
  onMatchPress,
}: {
  leagueId: string;
  season: string;
  theme: any;
  onMatchPress: (matchId: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const { data: rawRounds, isLoading, isError } = useBracket(leagueId, season);

  if (isLoading) {
    return (
      <View
        style={[styles.center, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Defensive normalisation — never crash on bad API data
  const safeRounds: BracketRound[] = Array.isArray(rawRounds)
    ? rawRounds.filter(
        (r): r is BracketRound => r != null && Array.isArray(r.matchups),
      )
    : [];

  // Leagues where we only show the late knockout rounds (clean pro look).
  // Türkiye Kupası returns dozens of early rounds tagged oddly — keep only the final 3.
  const LATE_STAGE_ONLY = new Set(["206"]);
  const isLateStageOnly = LATE_STAGE_ONLY.has(leagueId);

  // Keep only the 5 canonical main-draw stages.
  // "Play-offs" is already normalised → "Round of 32" in the API layer.
  const CANONICAL_KEYS = isLateStageOnly
    ? ["quarter-finals", "semi-finals", "final"]
    : [
        "round of 32",
        "round of 16",
        "quarter-finals",
        "semi-finals",
        "final",
      ];
  const mainRounds = safeRounds.filter((r) => {
    const k = r.key?.toLowerCase() ?? "";
    return (
      !k.includes("3rd") &&
      !k.includes("league stage") &&
      !k.includes("group stage") &&
      !k.includes("qualifying") &&
      !k.includes("preliminary") &&
      CANONICAL_KEYS.some((c) => k === c)
    );
  });

  if (isError || mainRounds.length === 0) {
    return (
      <View
        style={[styles.center, { backgroundColor: theme.colors.background }]}
      >
        <Ionicons
          name="git-branch-outline"
          size={48}
          color={theme.colors.textSecondary + "50"}
        />
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          {t("bracket.noBracket")}
        </Text>
      </View>
    );
  }

  // Nested scroll: outer = vertical, inner = horizontal
  // This lets the user scroll right to see more rounds AND down to see more matches
  return (
    <ScrollView
      horizontal={false}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        nestedScrollEnabled
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
      >
        <BracketCanvas
          rounds={mainRounds}
          theme={theme}
          lang={i18n.language}
          onMatchPress={onMatchPress}
        />
      </ScrollView>
    </ScrollView>
  );
}

// ─── BracketCanvas ────────────────────────────────────────────────────────────

function BracketCanvas({
  rounds,
  theme,
  lang,
  onMatchPress,
}: {
  rounds: BracketRound[];
  theme: any;
  lang: string;
  onMatchPress: (id: string) => void;
}) {
  const yPos = useMemo(() => computeYPos(rounds), [rounds]);
  if (!yPos.length) return null;

  const firstCount = rounds[0]?.matchups?.length ?? 0;
  const totalH = TOP_PAD + firstCount * PITCH + CARD_GAP;
  const totalW = rounds.length * (CARD_W + COL_GAP) - COL_GAP;

  return (
    <View style={{ width: totalW, height: totalH }}>
      {rounds.map((round, ri) => {
        if (!round?.matchups) return null;

        const colX = ri * (CARD_W + COL_GAP);
        const positions = yPos[ri] ?? [];
        const nextPositions = yPos[ri + 1];
        const isLast = ri === rounds.length - 1;
        const mode: ConnMode = !isLast
          ? detectMode(round, rounds[ri + 1])
          : "classic";
        // Always translate from round.key — displayName may come back wrong
        // (API sometimes tags early rounds as "Final" which breaks the header).
        const label = translateRound(round.key, lang).toUpperCase();

        return (
          <React.Fragment key={round.key ?? `r${ri}`}>
            {/* ── Round Header ── */}
            <View style={[styles.hdrContainer, { left: colX, width: CARD_W }]}>
              <Text
                style={[styles.hdrText, { color: theme.colors.primary }]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>

            {/* ── Match Cards + Connectors ── */}
            {round.matchups.map((mu, mi) => {
              if (!mu) return null;
              const cardY = positions[mi];
              if (cardY == null) return null;

              const nextIdx = mode === "seeded" ? mi : Math.floor(mi / 2);
              const endY =
                nextPositions?.[nextIdx] != null
                  ? nextPositions[nextIdx] + CARD_H / 2
                  : cardY + CARD_H / 2;

              return (
                <React.Fragment key={`${mu.id ?? "mu"}-${ri}-${mi}`}>
                  <MatchCard
                    matchup={mu}
                    theme={theme}
                    style={{
                      position: "absolute",
                      top: cardY,
                      left: colX,
                      width: CARD_W,
                      height: CARD_H,
                    }}
                    onPress={onMatchPress}
                  />

                  {!isLast && nextPositions && (
                    <Connector
                      theme={theme}
                      mode={mode}
                      startX={colX + CARD_W}
                      startY={cardY + CARD_H / 2}
                      endX={colX + CARD_W + COL_GAP}
                      endY={endY}
                      isTop={mi % 2 === 0}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── MatchCard ────────────────────────────────────────────────────────────────

const LIVE_STATUSES = new Set(["live", "half_time"]);

function MatchCard({
  matchup,
  theme,
  style,
  onPress,
}: {
  matchup: BracketMatchup;
  theme: any;
  style: any;
  onPress: (id: string) => void;
}) {
  const { t } = useTranslation();
  if (!matchup) return null;

  const isTBD = !!matchup.isTBD;
  const isDouble = !matchup.isSingleLeg;
  const hasWinner = matchup.winner != null;
  const hasPenalty =
    matchup.leg1?.penHome != null || matchup.leg2?.penHome != null;

  const leg1Live = LIVE_STATUSES.has(matchup.leg1?.status ?? "");
  const leg2Live = LIVE_STATUSES.has(matchup.leg2?.status ?? "");

  // ── TBD Placeholder ──────────────────────────────────────────────────────
  if (isTBD) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.divider,
            borderStyle: "dashed",
            justifyContent: "center",
            alignItems: "center",
          },
          style,
        ]}
      >
        <View
          style={[
            styles.tbdBadge,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.divider,
            },
          ]}
        >
          <Ionicons
            name="time-outline"
            size={11}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.tbdText, { color: theme.colors.textSecondary }]}>
            {t("bracket.tbd", "TBD")}
          </Text>
        </View>
      </View>
    );
  }

  // ── Team Row ─────────────────────────────────────────────────────────────
  const renderRow = (isTeam1: boolean) => {
    const team = isTeam1 ? matchup.team1 : matchup.team2;
    if (!team) return null;

    const tbd = isTBDTeam(team);
    const isWinner =
      hasWinner &&
      ((isTeam1 && matchup.winner === "team1") ||
        (!isTeam1 && matchup.winner === "team2"));
    const isElim = hasWinner && !isWinner;

    // team1 = home in leg1 / away in leg2
    // team2 = away in leg1 / home in leg2
    const l1 = isTeam1 ? matchup.leg1?.homeScore : matchup.leg1?.awayScore;
    const l2 = isTeam1 ? matchup.leg2?.awayScore : matchup.leg2?.homeScore;

    return (
      <View style={[styles.teamRow, isElim && { opacity: 0.35 }]}>
        {/* Logo */}
        {tbd || !team.logoUrl ? (
          <View
            style={[
              styles.logoPlaceholder,
              {
                borderColor: theme.colors.divider,
                backgroundColor: theme.colors.surfaceVariant,
              },
            ]}
          >
            <Ionicons
              name="help-outline"
              size={7}
              color={theme.colors.textSecondary}
            />
          </View>
        ) : (
          <Image
            source={{ uri: team.logoUrl }}
            style={styles.logo}
            resizeMode="contain"
          />
        )}

        {/* Name */}
        <Text
          style={[
            styles.teamName,
            {
              color: tbd
                ? theme.colors.textSecondary
                : isWinner
                  ? theme.colors.primary
                  : theme.colors.textPrimary,
              fontWeight: isWinner ? "700" : "400",
            },
          ]}
          numberOfLines={1}
        >
          {tbd ? t("bracket.tbd", "TBD") : team.name}
        </Text>

        {/* Scores — fixed-width column for alignment */}
        <View style={styles.scoresBlock}>
          {isDouble ? (
            <>
              <LegChip
                value={l1}
                matchId={matchup.leg1?.matchId}
                winner={isWinner}
                live={leg1Live}
                theme={theme}
                onPress={onPress}
              />
              <LegChip
                value={l2}
                matchId={matchup.leg2?.matchId}
                winner={isWinner}
                live={leg2Live}
                theme={theme}
                onPress={onPress}
              />
            </>
          ) : (
            <SingleChip
              value={l1}
              matchId={matchup.leg1?.matchId}
              winner={isWinner}
              live={leg1Live}
              theme={theme}
              onPress={onPress}
            />
          )}
          {isWinner ? (
            <Ionicons
              name="checkmark-circle"
              size={11}
              color={theme.colors.primary}
              style={styles.checkIcon}
            />
          ) : (
            <View style={styles.checkIcon} />
          )}
        </View>
      </View>
    );
  };

  // ── Aggregate footer ──────────────────────────────────────────────────────
  const renderAgg = () => {
    if (!isDouble) return null;
    const a1 = matchup.aggTeam1;
    const a2 = matchup.aggTeam2;
    if (a1 == null && a2 == null) return null;

    const pen = hasPenalty ? " (Pen)" : "";
    const winnerTeam =
      matchup.winner === "team1"
        ? matchup.team1
        : matchup.winner === "team2"
          ? matchup.team2
          : null;
    const winnerName =
      winnerTeam && !isTBDTeam(winnerTeam) ? winnerTeam.name : null;

    return (
      <View style={styles.aggSection}>
        <View
          style={[
            styles.aggDivider,
            { backgroundColor: theme.colors.divider + "40" },
          ]}
        />
        <View style={styles.aggBody}>
          <Text
            style={[styles.aggTotal, { color: theme.colors.textSecondary }]}
          >
            {`Toplam  ${a1 ?? "–"} – ${a2 ?? "–"}${pen}`}
          </Text>
          {winnerName && (
            <Text
              style={[styles.aggWinner, { color: theme.colors.primary }]}
              numberOfLines={1}
            >
              {`${winnerName}  tur atladı ✓`}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // ── Upcoming date badge ───────────────────────────────────────────────────
  const showDate =
    !hasWinner && !!matchup.leg1?.date && matchup.leg1?.homeScore == null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.divider,
        },
        style,
      ]}
    >
      {renderRow(true)}
      <View
        style={[
          styles.rowDivider,
          { backgroundColor: theme.colors.divider + "50" },
        ]}
      />
      {renderRow(false)}
      {renderAgg()}

      {showDate && (
        <View
          style={[
            styles.dateBadge,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Text
            style={[styles.dateText, { color: theme.colors.textSecondary }]}
          >
            {dayjs(matchup.leg1!.date).format("DD MMM")}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Score sub-components ─────────────────────────────────────────────────────

/**
 * Tappable chip for one leg of a two-legged tie.
 * Clean square: score only, no label — position implies leg order (left = 1, right = 2).
 * Winner  → primary tint bg + primary border + primary score
 * Live    → live-red tint bg + live-red border + live-red score
 * Neutral → surfaceVariant bg
 */
function LegChip({
  value,
  matchId,
  winner,
  live,
  theme,
  onPress,
}: {
  value: number | null | undefined;
  matchId: string | undefined;
  winner: boolean;
  live: boolean;
  theme: any;
  onPress: (id: string) => void;
}) {
  const hasScore = value != null;

  const bg = live
    ? "#FF4444" + "18"
    : winner
      ? theme.colors.primary + "20"
      : theme.colors.surfaceVariant;

  const border = live
    ? "#FF4444" + "55"
    : winner
      ? theme.colors.primary + "50"
      : "transparent";

  const scoreColor = live
    ? "#FF4444"
    : winner
      ? theme.colors.primary
      : hasScore
        ? theme.colors.textPrimary
        : theme.colors.textSecondary;

  const chip = (
    <View style={[styles.legChip, { backgroundColor: bg, borderColor: border }]}>
      <Text
        style={[
          styles.legVal,
          { color: scoreColor, fontWeight: winner || live ? "700" : "600" },
        ]}
      >
        {hasScore ? String(value) : "–"}
      </Text>
    </View>
  );

  if (!matchId) return chip;
  return (
    <TouchableOpacity onPress={() => onPress(matchId)} activeOpacity={0.65}>
      {chip}
    </TouchableOpacity>
  );
}

/**
 * Single-leg score chip (Final, one-off knockout, etc.)
 */
function SingleChip({
  value,
  matchId,
  winner,
  live,
  theme,
  onPress,
}: {
  value: number | null | undefined;
  matchId: string | undefined;
  winner: boolean;
  live: boolean;
  theme: any;
  onPress: (id: string) => void;
}) {
  const hasScore = value != null;

  const bg = live
    ? "#FF4444" + "18"
    : winner
      ? theme.colors.primary + "20"
      : theme.colors.surfaceVariant;

  const border = live
    ? "#FF4444" + "55"
    : winner
      ? theme.colors.primary + "50"
      : "transparent";

  const scoreColor = live
    ? "#FF4444"
    : winner
      ? theme.colors.primary
      : hasScore
        ? theme.colors.textPrimary
        : theme.colors.textSecondary;

  const chip = (
    <View
      style={[styles.singleChip, { backgroundColor: bg, borderColor: border }]}
    >
      <Text
        style={[
          styles.singleVal,
          { color: scoreColor, fontWeight: winner || live ? "700" : "600" },
        ]}
      >
        {hasScore ? String(value) : "–"}
      </Text>
    </View>
  );

  if (!matchId) return chip;
  return (
    <TouchableOpacity onPress={() => onPress(matchId)} activeOpacity={0.65}>
      {chip}
    </TouchableOpacity>
  );
}

// ─── Connector ────────────────────────────────────────────────────────────────

function Connector({
  theme,
  mode,
  startX,
  startY,
  endX,
  endY,
  isTop,
}: {
  theme: any;
  mode: ConnMode;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isTop: boolean;
}) {
  const color = theme.colors.divider + "AA";
  const midX = startX + (endX - startX) * 0.5;
  const LINE = 1.5;

  if (mode === "seeded") {
    // 1-to-1: straight or gently bent connector
    const dy = Math.abs(endY - startY);
    if (dy < 1) {
      return (
        <View
          style={[
            styles.line,
            {
              left: startX,
              top: startY - LINE / 2,
              width: endX - startX,
              height: LINE,
              backgroundColor: color,
            },
          ]}
        />
      );
    }
    // Bent: horizontal → vertical → horizontal
    return (
      <>
        <View
          style={[
            styles.line,
            {
              left: startX,
              top: startY - LINE / 2,
              width: midX - startX,
              height: LINE,
              backgroundColor: color,
            },
          ]}
        />
        <View
          style={[
            styles.line,
            {
              left: midX - LINE / 2,
              top: Math.min(startY, endY),
              width: LINE,
              height: dy,
              backgroundColor: color,
            },
          ]}
        />
        <View
          style={[
            styles.line,
            {
              left: midX,
              top: endY - LINE / 2,
              width: endX - midX,
              height: LINE,
              backgroundColor: color,
            },
          ]}
        />
      </>
    );
  }

  // ── Classic 2-to-1 connector ──
  //
  // Each card (top or bottom) draws:
  //   1. Horizontal from card edge → midX (at its own Y)
  //   2. Vertical spine at midX (top draws down to endY; bottom draws up to endY)
  //   3. Top card only draws the final horizontal midX → endX at endY
  //      (avoids drawing the same line twice)

  return (
    <>
      {/* 1. Horizontal from card to midpoint */}
      <View
        style={[
          styles.line,
          {
            left: startX,
            top: startY - LINE / 2,
            width: midX - startX,
            height: LINE,
            backgroundColor: color,
          },
        ]}
      />

      {/* 2. Vertical spine segment */}
      <View
        style={[
          styles.line,
          {
            left: midX - LINE / 2,
            top: isTop ? startY : endY,
            width: LINE,
            height: Math.abs(endY - startY),
            backgroundColor: color,
          },
        ]}
      />

      {/* 3. Horizontal from midpoint to next card (top card only) */}
      {isTop && (
        <View
          style={[
            styles.line,
            {
              left: midX,
              top: endY - LINE / 2,
              width: endX - midX,
              height: LINE,
              backgroundColor: color,
            },
          ]}
        />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Layout helpers
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  emptyText: { fontSize: 13 },

  // ── Round header
  hdrContainer: {
    position: "absolute",
    top: 0,
    height: HDR_H,
    justifyContent: "flex-end",
    paddingBottom: 5,
  },
  hdrText: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },

  // ── Card shell
  card: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 0, // footer handles its own bottom padding
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },

  // ── Team row
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 27,
  },
  logo: { width: 16, height: 16 },
  logoPlaceholder: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  teamName: {
    flex: 1,
    fontSize: 10.5,
    marginHorizontal: 6,
  },

  // ── Fixed-width scores column (keeps scores aligned regardless of name length)
  scoresBlock: {
    flexDirection: "row",
    alignItems: "center",
    width: 72, // 2×chip(26) + gap(3) + check(13) = 68 → 72 with slack
    justifyContent: "flex-end",
    gap: 3,
  },
  checkIcon: {
    width: 13,
    alignItems: "center",
  },

  // ── Leg chips (two-legged) — clean square, score only
  legChip: {
    width: 26,
    height: 26,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  legVal: {
    fontSize: 11.5,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
  },

  // ── Single-leg chip
  singleChip: {
    width: 30,
    height: 28,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  singleVal: {
    fontSize: 12,
    textAlign: "center",
  },

  // ── Row divider (between team1 and team2)
  rowDivider: { height: 1, marginVertical: 4 },

  // ── Aggregate footer
  aggSection: { marginTop: 2 },
  aggDivider: { height: 1, marginBottom: 4 },
  aggBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingBottom: 7,
    gap: 4,
  },
  aggTotal: {
    fontSize: 8,
    fontWeight: "600",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  aggWinner: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.2,
    flexShrink: 1,
    textAlign: "right",
  },

  // ── Date badge (upcoming)
  dateBadge: {
    position: "absolute",
    top: 5,
    right: 8,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  dateText: { fontSize: 7, fontWeight: "600" },

  // ── TBD placeholder
  tbdBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  tbdText: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },

  // ── Connector lines
  line: { position: "absolute" },
});
