import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { MatchEvent } from "../../types";

const eventConfig: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  goal: { icon: "⚽", color: "#00C851", label: "GOL" },
  yellow_card: { icon: "🟨", color: "#FFBB33", label: "" },
  red_card: { icon: "🟥", color: "#FF3B5C", label: "" },
  substitution: { icon: "🔄", color: "#2196F3", label: "" },
  own_goal: { icon: "⚽", color: "#FF3B5C", label: "K.K." },
  penalty: { icon: "⚽", color: "#00C851", label: "PEN" },
  missed_penalty: { icon: "❌", color: "#FF3B5C", label: "KAÇTI" },
};

interface Props {
  events: MatchEvent[];
  homeTeamName: string;
  awayTeamName: string;
  playerIds?: Map<string, number>;
  hasPenaltyShootout?: boolean;
}

export default function EventTimeline({
  events,
  homeTeamName,
  awayTeamName,
  playerIds,
  hasPenaltyShootout,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  // Normal maç event'leri ve shootout event'lerini ayır.
  // isShootout flag'ı API comments alanına bağlı — her zaman dolmuyor.
  // hasPenaltyShootout (scorePenalty varlığından gelir) true ise,
  // minute >= 120 olan penalty/missed_penalty event'lerini de shootout kabul et.
  const SHOOTOUT_TYPES = new Set(["penalty", "missed_penalty"]);
  const normalEvents: MatchEvent[] = [];
  const shootoutEvents: MatchEvent[] = [];
  for (const e of events) {
    const isShootoutEvent =
      e.isShootout ||
      (hasPenaltyShootout && SHOOTOUT_TYPES.has(e.type) && (e.minute ?? 0) >= 120);
    if (isShootoutEvent) {
      shootoutEvents.push(e);
    } else {
      normalEvents.push(e);
    }
  }
  normalEvents.sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  // API bireysel shootout event'i döndürmüyorsa bölümü gösterme
  const hasShootout = shootoutEvents.length > 0;

  return (
    <View style={styles.container}>
      {/* Team headers */}
      <View
        style={[styles.headerRow, { borderBottomColor: theme.colors.divider }]}
      >
        <Text
          style={[styles.headerTeam, { color: theme.colors.textSecondary }]}
        >
          {homeTeamName}
        </Text>
        <Text
          style={[styles.headerMin, { color: theme.colors.textSecondary }]}
        ></Text>
        <Text
          style={[
            styles.headerTeam,
            styles.headerRight,
            { color: theme.colors.textSecondary },
          ]}
        >
          {awayTeamName}
        </Text>
      </View>

      {/* ── Normal maç event'leri ── */}
      {normalEvents.map((event, index) => {
        const config =
          (eventConfig as any)[event.type] ?? (eventConfig as any).goal;
        const isHome = event.team === "home";
        const isGoalType =
          event.type === "goal" ||
          event.type === "penalty" ||
          event.type === "missed_penalty" ||
          event.type === "own_goal";
        const isCard =
          event.type === "yellow_card" || event.type === "red_card";

        return (
          <View key={event.id ?? `event-${index}`}>
            <View style={styles.eventRow}>
              {/* Home side (left) */}
              <View style={[styles.side, styles.sideLeft]}>
                {isHome && (
                  <EventContent
                    event={event}
                    config={config}
                    isGoalType={isGoalType}
                    isCard={isCard}
                    theme={theme}
                    alignRight
                    playerIds={playerIds}
                  />
                )}
              </View>

              {/* Center: minute + icon */}
              <View style={styles.centerCol}>
                <View
                  style={[
                    styles.minuteBox,
                    { backgroundColor: config.color + "18" },
                  ]}
                >
                  <Text style={[styles.minuteText, { color: config.color }]}>
                    {event.minute}'
                  </Text>
                </View>
                <Text style={styles.icon}>{config.icon}</Text>
              </View>

              {/* Away side (right) */}
              <View style={[styles.side, styles.sideRight]}>
                {!isHome && (
                  <EventContent
                    event={event}
                    config={config}
                    isGoalType={isGoalType}
                    isCard={isCard}
                    theme={theme}
                    playerIds={playerIds}
                  />
                )}
              </View>
            </View>

            {index < normalEvents.length - 1 && (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.divider },
                ]}
              />
            )}
          </View>
        );
      })}

      {/* ── SERİ PENALTİ ATIŞLARI ── */}
      {hasShootout && (
        <>
          <View
            style={[
              styles.shootoutHeader,
              {
                backgroundColor: theme.colors.surfaceVariant,
                borderColor: theme.colors.primary + "40",
              },
            ]}
          >
            <Text
              style={[
                styles.shootoutHeaderText,
                { color: theme.colors.primary },
              ]}
            >
              ⚽  SERİ PENALTİ ATIŞLARI
            </Text>
          </View>

          {shootoutEvents.map((event, index) => {
            const isHome = event.team === "home";
            const scored = event.type === "penalty";
            const iconText = scored ? "✅" : "❌";
            const color = scored ? "#00C851" : "#FF3B5C";

            return (
              <View key={`shootout-${event.id ?? index}`}>
                <View style={styles.eventRow}>
                  {/* Home side */}
                  <View style={[styles.side, styles.sideLeft]}>
                    {isHome && (
                      <ShootoutContent
                        event={event}
                        scored={scored}
                        color={color}
                        alignRight
                        playerIds={playerIds}
                      />
                    )}
                  </View>

                  {/* Center: icon */}
                  <View style={styles.centerCol}>
                    <View
                      style={[
                        styles.minuteBox,
                        { backgroundColor: color + "18" },
                      ]}
                    >
                      <Text style={[styles.shootoutIcon]}>{iconText}</Text>
                    </View>
                  </View>

                  {/* Away side */}
                  <View style={[styles.side, styles.sideRight]}>
                    {!isHome && (
                      <ShootoutContent
                        event={event}
                        scored={scored}
                        color={color}
                        playerIds={playerIds}
                      />
                    )}
                  </View>
                </View>

                {index < shootoutEvents.length - 1 && (
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: theme.colors.divider },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

function ShootoutContent({
  event,
  scored,
  color,
  alignRight,
  playerIds,
}: {
  event: MatchEvent;
  scored: boolean;
  color: string;
  alignRight?: boolean;
  playerIds?: Map<string, number>;
}) {
  const router = useRouter();
  const align = alignRight ? "flex-end" : "flex-start";
  const textAlign = alignRight ? ("right" as const) : ("left" as const);

  const navigateToPlayer = () => {
    let id = event.playerId;
    if (!id && event.player && playerIds) {
      id = playerIds.get(event.player);
    }
    if (!id) return;
    router.push(`/player/${id}`);
  };

  return (
    <View style={{ alignItems: align }}>
      <TouchableOpacity onPress={navigateToPlayer} activeOpacity={0.7}>
        <Text
          style={[
            styles.player,
            { color, textAlign, fontWeight: "700" },
          ]}
        >
          {event.player}
          <Text style={{ fontSize: 10, color }}>
            {" "}
            ({scored ? "GOL" : "KAÇTI"})
          </Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function EventContent({
  event,
  config,
  isGoalType,
  isCard,
  theme,
  alignRight,
  playerIds,
}: {
  event: MatchEvent;
  config: { icon: string; color: string; label: string };
  isGoalType: boolean;
  isCard: boolean;
  theme: any;
  alignRight?: boolean;
  playerIds?: Map<string, number>;
}) {
  const router = useRouter();
  const align = alignRight ? "flex-end" : "flex-start";
  const textAlign = alignRight ? ("right" as const) : ("left" as const);

  const navigateToPlayer = (id?: number, fallbackName?: string) => {
    let finalId = id;
    if (!finalId && fallbackName && playerIds) {
      finalId = playerIds.get(fallbackName);
    }
    if (!finalId) return;
    router.push(`/player/${finalId}`);
  };

  if (event.type === "substitution") {
    const subInName = event.substitutePlayer?.trim();
    const subOutName = event.player?.trim();
    return (
      <View style={{ alignItems: align }}>
        {!!subInName && (
          <TouchableOpacity
            onPress={() =>
              navigateToPlayer(event.substitutePlayerId, event.substitutePlayer)
            }
            activeOpacity={0.7}
          >
            <Text style={[styles.subIn, { textAlign }]}>▲ {subInName}</Text>
          </TouchableOpacity>
        )}
        {!!subOutName && (
          <TouchableOpacity
            onPress={() => navigateToPlayer(event.playerId, event.player)}
            activeOpacity={0.7}
          >
            <Text style={[styles.subOut, { textAlign }]}>▼ {subOutName}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (isCard) {
    return (
      <View style={{ alignItems: align }}>
        <TouchableOpacity
          onPress={() => navigateToPlayer(event.playerId, event.player)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.player,
              { color: config.color, textAlign, fontWeight: "600" },
            ]}
          >
            {event.player}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ alignItems: align }}>
      <TouchableOpacity
        onPress={() => navigateToPlayer(event.playerId, event.player)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.player,
            { color: theme.colors.textPrimary, textAlign },
            isGoalType && { fontWeight: "700", color: config.color },
          ]}
        >
          {event.player}
          {config.label ? (
            <Text style={{ fontSize: 10, color: config.color }}>
              {" "}
              ({config.label})
            </Text>
          ) : null}
        </Text>
      </TouchableOpacity>
      {event.assistPlayer && (
        <TouchableOpacity
          onPress={() =>
            navigateToPlayer(event.assistPlayerId, event.assistPlayer)
          }
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.assist,
              { color: theme.colors.textSecondary, textAlign },
            ]}
          >
            ↳ {event.assistPlayer}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTeam: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerRight: { textAlign: "right" },
  headerMin: { width: 76 },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  side: {
    flex: 1,
    justifyContent: "center",
  },
  sideLeft: {
    alignItems: "flex-end",
    paddingRight: 8,
  },
  sideRight: {
    alignItems: "flex-start",
    paddingLeft: 8,
  },
  centerCol: {
    width: 76,
    alignItems: "center",
    gap: 3,
  },
  minuteBox: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 36,
    alignItems: "center",
  },
  minuteText: {
    fontSize: 11,
    fontWeight: "800",
  },
  icon: {
    fontSize: 16,
  },
  shootoutIcon: {
    fontSize: 16,
  },
  player: {
    fontSize: 13,
    fontWeight: "500",
  },
  assist: {
    fontSize: 10,
    fontStyle: "italic",
    marginTop: 2,
  },
  subIn: {
    fontSize: 12,
    fontWeight: "600",
    color: "#00C851",
  },
  subOut: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF3B5C",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
  },
  shootoutHeader: {
    marginTop: 10,
    marginBottom: 4,
    marginHorizontal: -8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  shootoutHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
