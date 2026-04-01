import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { LineupPlayer, MatchLineup, PlayerMatchStats } from "../../types";

interface Props {
  lineup: MatchLineup;
  statsMap: Map<number, PlayerMatchStats>;
  events?: Array<{ player?: string; type: string; minute: number }>;
}

// ── Position grouping ─────────────────────────────────────────────────────────

const POS_GROUPS = [
  { key: "G", label: "KALECİ" },
  { key: "D", label: "DEFANS" },
  { key: "M", label: "ORTA SAHA" },
  { key: "F", label: "FORVET" },
] as const;

function resolveGroup(pos: string): "G" | "D" | "M" | "F" {
  const p = (pos ?? "").toUpperCase();
  if (["G", "GK"].includes(p)) return "G";
  if (["D", "CB", "LB", "RB", "LWB", "RWB", "WB", "SW"].includes(p)) return "D";
  if (["M", "CM", "DM", "AM", "LM", "RM", "CDM", "CAM", "LAM", "RAM", "MF"].includes(p)) return "M";
  return "F";
}

function groupByPos(players: LineupPlayer[]): Record<string, LineupPlayer[]> {
  const out: Record<string, LineupPlayer[]> = { G: [], D: [], M: [], F: [] };
  for (const p of players) out[resolveGroup(p.pos)].push(p);
  return out;
}

// ── Rating color ──────────────────────────────────────────────────────────────

function ratingColor(rating: number, primary: string): string {
  if (rating <= 0) return "#888";
  if (rating >= 8.0) return "#4CAF50";
  if (rating >= 7.0) return primary;
  if (rating >= 6.0) return "#FF9800";
  return "#FF5252";
}

// ── Event icon helpers ────────────────────────────────────────────────────────

const EVENT_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  goal:          { icon: "football",       color: "#4CAF50" },
  penalty:       { icon: "football",       color: "#4CAF50" },
  own_goal:      { icon: "football",       color: "#FF5252" },
  yellow_card:   { icon: "square",         color: "#FFD600" },
  red_card:      { icon: "square",         color: "#FF1744" },
  substitution:  { icon: "swap-horizontal",color: "#42A5F5" },
};

// ── Single player card ────────────────────────────────────────────────────────

interface CardProps {
  player: LineupPlayer;
  stats?: PlayerMatchStats;
  isSubstitute: boolean;
  align: "left" | "right";
  events?: Array<{ player?: string; type: string; minute: number }>;
}

function PlayerCard({ player, stats, isSubstitute, align, events = [] }: CardProps) {
  const theme = useAppTheme();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const isRight = align === "right";
  const isGK = resolveGroup(player.pos) === "G";

  const rating = stats?.rating ?? 0;
  const rc = ratingColor(rating, theme.colors.primary);

  const playerEvents = events.filter(
    (e) => e.player?.toLowerCase().trim() === player.name.toLowerCase().trim(),
  );

  function handlePress() {
    const targetId = stats?.playerId ?? player.id;
    router.push(`/player/${targetId}`);
  }

  // ── Compact stat chips ────────────────────────────────────────────────────

  const chips: { label: string; value: string }[] = [];

  if (isGK) {
    if ((stats?.saves ?? 0) > 0 || stats)
      chips.push({ label: "Krt", value: String(stats?.saves ?? 0) });
    if ((stats?.passesTotal ?? 0) > 0)
      chips.push({ label: "Pas", value: `${stats!.passesAccurate}/${stats!.passesTotal}` });
    if ((stats?.goalsConceded ?? 0) > 0)
      chips.push({ label: "Gol", value: String(stats!.goalsConceded) });
  } else {
    if ((stats?.passesTotal ?? 0) > 0)
      chips.push({ label: "Pas", value: `${stats!.passesAccurate}/${stats!.passesTotal}` });
    if ((stats?.shots ?? 0) > 0 || (stats?.shotsOnTarget ?? 0) > 0)
      chips.push({ label: "Şut", value: `${stats?.shots ?? 0}(${stats?.shotsOnTarget ?? 0})` });
    if ((stats?.duelsTotal ?? 0) > 0)
      chips.push({ label: "Müc", value: `${stats!.duelsWon}/${stats!.duelsTotal}` });
  }

  // ── Secondary stats (expandable) ─────────────────────────────────────────

  const secondary: { label: string; value: string }[] = [];
  if (!isGK && stats) {
    if ((stats.goals ?? 0) > 0)      secondary.push({ label: "Gol",     value: String(stats.goals) });
    if ((stats.assists ?? 0) > 0)    secondary.push({ label: "Asist",   value: String(stats.assists) });
    if ((stats.aerialTotal ?? 0) > 0)
      secondary.push({ label: "Hava",  value: `${stats.aerialWon}/${stats.aerialTotal}` });
    if ((stats.longBalls ?? 0) > 0)  secondary.push({ label: "Uzun",    value: String(stats.longBalls) });
  }

  const hasExtra = secondary.length > 0;

  return (
    <View style={[s.card, isSubstitute && s.subCard, { borderColor: theme.colors.divider }]}>
      {/* ── Top row: number / name / rating ── */}
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={[s.topRow, isRight && s.topRowReverse]}
      >
        <Text style={[s.number, { color: theme.colors.textSecondary }]}>{player.number}</Text>

        <Text
          style={[s.name, { color: isSubstitute ? theme.colors.textSecondary : theme.colors.textPrimary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {player.name}
          {isSubstitute ? " ·" : ""}
          {player.captain ? " ©" : ""}
        </Text>

        {/* Event icons */}
        {playerEvents.length > 0 && (
          <View style={[s.eventIcons, isRight && { marginLeft: 0, marginRight: 2 }]}>
            {playerEvents.map((e, i) => {
              const cfg = EVENT_ICONS[e.type];
              if (!cfg) return null;
              return (
                <Ionicons key={i} name={cfg.icon} size={9} color={cfg.color} style={{ marginHorizontal: 1 }} />
              );
            })}
          </View>
        )}

        {/* Rating badge */}
        {rating > 0 && (
          <View style={[s.ratingBadge, { backgroundColor: rc + "22", borderColor: rc + "55" }]}>
            <Text style={[s.ratingText, { color: rc }]}>{rating.toFixed(1)}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ── Chip row ── */}
      {chips.length > 0 && (
        <View style={[s.chipRow, isRight && s.chipRowReverse]}>
          {chips.map((c) => (
            <View key={c.label} style={[s.chip, { backgroundColor: theme.colors.surface }]}>
              <Text style={[s.chipLabel, { color: theme.colors.textSecondary }]}>{c.label}</Text>
              <Text style={[s.chipValue, { color: theme.colors.textPrimary }]}>{c.value}</Text>
            </View>
          ))}

          {/* Expand toggle */}
          {hasExtra && (
            <TouchableOpacity
              onPress={() => setExpanded((x) => !x)}
              activeOpacity={0.7}
              style={[s.chip, { backgroundColor: theme.colors.primary + "15" }]}
            >
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={9}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Expanded secondary stats ── */}
      {expanded && secondary.length > 0 && (
        <View style={[s.chipRow, isRight && s.chipRowReverse, s.secondaryRow]}>
          {secondary.map((c) => (
            <View key={c.label} style={[s.chip, { backgroundColor: theme.colors.surface }]}>
              <Text style={[s.chipLabel, { color: theme.colors.textSecondary }]}>{c.label}</Text>
              <Text style={[s.chipValue, { color: theme.colors.textPrimary }]}>{c.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function PlayerStatsSection({ lineup, statsMap, events = [] }: Props) {
  const theme = useAppTheme();

  const homeStartIds = new Set(lineup.home.startXI.map((p) => p.id));
  const awayStartIds = new Set(lineup.away.startXI.map((p) => p.id));

  const played = (id: number) => {
    const st = statsMap.get(id);
    return !st || st.minutes > 0;
  };

  const homeAll = [...lineup.home.startXI, ...lineup.home.substitutes].filter((p) => played(p.id));
  const awayAll = [...lineup.away.startXI, ...lineup.away.substitutes].filter((p) => played(p.id));

  const homeGroups = groupByPos(homeAll);
  const awayGroups = groupByPos(awayAll);

  return (
    <View style={s.root}>
      {POS_GROUPS.map(({ key, label }) => {
        const homePlayers = homeGroups[key] ?? [];
        const awayPlayers = awayGroups[key] ?? [];
        if (homePlayers.length === 0 && awayPlayers.length === 0) return null;

        const rowCount = Math.max(homePlayers.length, awayPlayers.length);

        return (
          <View key={key}>
            {/* ── Position group header ── */}
            <View style={[s.groupHeader, { backgroundColor: theme.colors.surface }]}>
              <View style={[s.groupLine, { backgroundColor: theme.colors.primary }]} />
              <Text style={[s.groupLabel, { color: theme.colors.primary }]}>{label}</Text>
              <View style={[s.groupLine, { backgroundColor: theme.colors.primary }]} />
            </View>

            {/* ── Player rows ── */}
            {Array.from({ length: rowCount }, (_, i) => {
              const hp = homePlayers[i];
              const ap = awayPlayers[i];
              return (
                <View key={i} style={s.playerRow}>
                  {/* Home (left) */}
                  <View style={s.col}>
                    {hp ? (
                      <PlayerCard
                        player={hp}
                        stats={statsMap.get(hp.id)}
                        isSubstitute={!homeStartIds.has(hp.id)}
                        align="left"
                        events={events}
                      />
                    ) : (
                      <View style={s.empty} />
                    )}
                  </View>

                  {/* Divider */}
                  <View style={[s.divider, { backgroundColor: theme.colors.divider }]} />

                  {/* Away (right) */}
                  <View style={s.col}>
                    {ap ? (
                      <PlayerCard
                        player={ap}
                        stats={statsMap.get(ap.id)}
                        isSubstitute={!awayStartIds.has(ap.id)}
                        align="right"
                        events={events}
                      />
                    ) : (
                      <View style={s.empty} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { paddingTop: 8 },

  // Group header
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
    gap: 8,
  },
  groupLine: { flex: 1, height: 1, opacity: 0.4 },
  groupLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  // Row layout
  playerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  col: { flex: 1 },
  divider: { width: 1, marginTop: 8, alignSelf: "stretch", opacity: 0.3 },
  empty: { flex: 1 },

  // Player card
  card: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
    marginHorizontal: 2,
    marginVertical: 2,
    gap: 4,
  },
  subCard: { opacity: 0.7 },

  // Top row
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  topRowReverse: { flexDirection: "row-reverse" },

  number: {
    fontSize: 9,
    fontWeight: "700",
    minWidth: 14,
    textAlign: "center",
  },
  name: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
  },

  // Event icons
  eventIcons: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 2,
  },

  // Rating badge
  ratingBadge: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 28,
    alignItems: "center",
  },
  ratingText: {
    fontSize: 10,
    fontWeight: "800",
  },

  // Chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    paddingLeft: 18,
  },
  chipRowReverse: {
    flexDirection: "row-reverse",
    paddingLeft: 0,
    paddingRight: 18,
  },
  secondaryRow: { opacity: 0.8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  chipLabel: {
    fontSize: 8,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  chipValue: {
    fontSize: 9,
    fontWeight: "700",
  },
});
