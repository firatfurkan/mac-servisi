import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { LineupPlayer, MatchEvent, MatchLineup, PlayerMatchStats } from "../../types";
import { formatPlayerName } from "../../utils/matchUtils";

interface Props {
  lineup: MatchLineup;
  events?: MatchEvent[];
  statsMap?: Map<number, PlayerMatchStats>;
}

// ─── Team colors ──────────────────────────────────────────────────────────────

const TEAM_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "645": { bg: "#D4A017", border: "#FFD700", text: "#fff" },
  "611": { bg: "#0D1B5E", border: "#FFED00", text: "#fff" },
  "549": { bg: "#1A1A1A", border: "#E8E8E8", text: "#fff" },
  "607": { bg: "#6B1524", border: "#4EA4DC", text: "#fff" },
  "1005": { bg: "#F37021", border: "#1B3C73", text: "#fff" },
  "3573": { bg: "#0044AA", border: "#FF6B00", text: "#fff" },
  "3589": { bg: "#CC0000", border: "#fff", text: "#fff" },
  "50": { bg: "#6CABDD", border: "#fff", text: "#1C2C5B" },
  "40": { bg: "#C8102E", border: "#fff", text: "#fff" },
  "42": { bg: "#EF0107", border: "#fff", text: "#fff" },
  "33": { bg: "#DA291C", border: "#FBE122", text: "#fff" },
  "49": { bg: "#034694", border: "#fff", text: "#fff" },
  "47": { bg: "#132257", border: "#fff", text: "#fff" },
  "541": { bg: "#FEBE10", border: "#00529F", text: "#00529F" },
  "529": { bg: "#A50044", border: "#004D98", text: "#fff" },
  "530": { bg: "#CB3524", border: "#272E61", text: "#fff" },
  "157": { bg: "#DC052D", border: "#fff", text: "#fff" },
  "165": { bg: "#FDE100", border: "#000", text: "#000" },
  "496": { bg: "#000000", border: "#fff", text: "#fff" },
  "489": { bg: "#FB090B", border: "#000", text: "#fff" },
  "505": { bg: "#0068A8", border: "#000", text: "#fff" },
  "492": { bg: "#12A0D7", border: "#fff", text: "#fff" },
  "85": { bg: "#004170", border: "#DA291C", text: "#fff" },
};
const DEFAULT_HOME = { bg: "#1565C0", border: "#42A5F5", text: "#fff" };
const DEFAULT_AWAY = { bg: "#CC3333", border: "#FF5555", text: "#fff" };
function getTeamColor(teamId: string, isHome: boolean) {
  return TEAM_COLORS[teamId] ?? (isHome ? DEFAULT_HOME : DEFAULT_AWAY);
}

// ─── Rating color ─────────────────────────────────────────────────────────────

function ratingColor(r: number): string {
  if (r >= 8.0) return "#4CAF50";
  if (r >= 7.0) return "#03422d";
  if (r >= 6.0) return "#FF9800";
  return "#FF5252";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByRow(players: LineupPlayer[]): LineupPlayer[][] {
  const map: Record<string, LineupPlayer[]> = {};
  for (const p of players) {
    if (!p.grid) continue;
    const parts = p.grid.split(":");
    const rowKey = parts[0]; // keep as string to preserve "2.5" etc.
    if (__DEV__) console.log(`[groupByRow] ${p.name} grid=${p.grid} pos=${p.pos}`);
    if (!map[rowKey]) map[rowKey] = [];
    map[rowKey].push(p);
  }
  return Object.keys(map)
    .sort((a, b) => parseFloat(a) - parseFloat(b))
    .map((rowKey) =>
      map[rowKey].sort((a, b) => {
        const colA = parseFloat(a.grid!.split(":")[1]);
        const colB = parseFloat(b.grid!.split(":")[1]);
        return colA - colB;
      }),
    );
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function getPlayerEvents(player: LineupPlayer, events?: MatchEvent[]) {
  if (!events) return [];
  const normalizedName = normalizeName(player.name);
  const lastName = normalizedName.split(" ").pop() ?? normalizedName;
  return events.filter((e) => {
    if (player.id != null) {
      if (e.playerId != null && e.playerId === player.id) return true;
      if (e.substitutePlayerId != null && e.substitutePlayerId === player.id) return true;
    }
    const eventPlayer = normalizeName(e.player);
    const subPlayer = normalizeName(e.substitutePlayer || "");
    return (
      eventPlayer === normalizedName ||
      (lastName.length > 3 && eventPlayer.includes(lastName)) ||
      subPlayer === normalizedName ||
      (lastName.length > 3 && subPlayer.includes(lastName))
    );
  });
}

// ─── EventBadge ───────────────────────────────────────────────────────────────

function EventBadge({ event }: { event: MatchEvent }) {
  let icon: string | null = null;
  let color = "#fff";
  if (event.type === "goal" || event.type === "penalty") { icon = "football"; color = "#4CAF50"; }
  else if (event.type === "own_goal")  { icon = "football";       color = "#FF5252"; }
  else if (event.type === "yellow_card") { icon = "card";         color = "#FFD600"; }
  else if (event.type === "red_card")  { icon = "card";           color = "#FF1744"; }
  else if (event.type === "substitution") { icon = "swap-horizontal"; color = "#42A5F5"; }
  if (!icon) return null;
  return (
    <View style={s.eventBadge}>
      <Ionicons name={icon as any} size={9} color={color} />
      <Text style={[s.eventMinute, { color }]}>{event.minute}'</Text>
    </View>
  );
}

// ─── PlayerAvatar ─────────────────────────────────────────────────────────────

const PlayerAvatar = React.memo(function PlayerAvatar({
  player, color, size = 38, hasRedCard = false,
}: {
  player: LineupPlayer;
  color: { bg: string; border: string; text: string };
  size?: number;
  hasRedCard?: boolean;
}) {
  const [err, setErr] = useState(false);
  return (
    <View style={[s.jersey, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color.bg,
      borderColor: hasRedCard ? "#FF1744" : color.border,
      borderWidth: hasRedCard ? 3.5 : 2.5,
      overflow: "hidden",
    }]}>
      {!err ? (
        <Image
          source={{ uri: `https://media.api-sports.io/football/players/${player.id}.png` }}
          style={{ width: size - 5, height: size - 5, borderRadius: (size - 5) / 2 }}
          resizeMode="cover"
          fadeDuration={0}
          onError={() => setErr(true)}
        />
      ) : (
        <Text style={[s.jerseyNumber, { color: color.text, fontSize: size * 0.36 }]}>
          {player.number}
        </Text>
      )}
    </View>
  );
});

// ─── Player Stats Modal ───────────────────────────────────────────────────────

function PlayerStatsModal({
  player, stats, color, events, visible, onClose,
}: {
  player: LineupPlayer;
  stats?: PlayerMatchStats;
  color: { bg: string; border: string; text: string };
  events?: MatchEvent[];
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const router = useRouter();
  const [photoErr, setPhotoErr] = useState(false);
  const isGK = player.pos === "G" || stats?.position === "Goalkeeper";
  const playerEvents = getPlayerEvents(player, events);

  const rows: { icon: keyof typeof Ionicons.glyphMap; iconColor: string; label: string; value: string }[] = [];

  if (stats) {
    if ((stats.minutes ?? 0) > 0)
      rows.push({ icon: "time-outline", iconColor: theme.colors.textSecondary, label: "Süre", value: `${stats.minutes}'` });
    if (stats.goals > 0)
      rows.push({ icon: "football", iconColor: "#4CAF50", label: "Gol", value: String(stats.goals) });
    if ((stats.assists ?? 0) > 0)
      rows.push({ icon: "arrow-redo", iconColor: "#42A5F5", label: "Asist", value: String(stats.assists) });
    if (isGK) {
      if (stats.saves > 0)
        rows.push({ icon: "shield-checkmark", iconColor: "#03422d", label: "Kurtarış", value: String(stats.saves) });
      if (stats.goalsConceded > 0)
        rows.push({ icon: "close-circle", iconColor: "#FF5252", label: "Gol Yedi", value: String(stats.goalsConceded) });
    }
    if (stats.shots > 0)
      rows.push({ icon: "radio-button-on", iconColor: "#FF9800", label: "Şut", value: `${stats.shots} (${stats.shotsOnTarget} isab.)` });
    if (stats.passesTotal > 0)
      rows.push({ icon: "paper-plane", iconColor: "#42A5F5", label: "Pas", value: `${stats.passesAccurate}/${stats.passesTotal}` });
    if (stats.duelsTotal > 0)
      rows.push({ icon: "hand-left", iconColor: "#FF9800", label: "İkili Müc.", value: `${stats.duelsWon}/${stats.duelsTotal}` });
    if (stats.aerialTotal > 0)
      rows.push({ icon: "trending-up", iconColor: "#9C27B0", label: "Hava Topu", value: `${stats.aerialWon}/${stats.aerialTotal}` });
    if (stats.longBalls > 0)
      rows.push({ icon: "arrow-forward", iconColor: "#607D8B", label: "Uzun Top", value: String(stats.longBalls) });
  }

  const rating = stats?.rating ?? 0;
  const rc = rating > 0 ? ratingColor(rating) : theme.colors.textSecondary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.modalOverlay} onPress={onClose}>
        <Pressable
          style={[s.modalCard, { backgroundColor: theme.colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={s.modalHeader}>
            {/* Avatar */}
            <View style={[s.modalAvatar, {
              backgroundColor: color.bg,
              borderColor: color.border,
            }]}>
              {!photoErr ? (
                <Image
                  source={{ uri: `https://media.api-sports.io/football/players/${player.id}.png` }}
                  style={s.modalAvatarImg}
                  resizeMode="cover"
                  onError={() => setPhotoErr(true)}
                />
              ) : (
                <Text style={[s.modalAvatarNum, { color: color.text }]}>{player.number}</Text>
              )}
            </View>

            {/* Info */}
            <View style={s.modalInfo}>
              <Text style={[s.modalName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {player.name}
                {player.captain ? "  ©" : ""}
              </Text>
              <Text style={[s.modalMeta, { color: theme.colors.textSecondary }]}>
                #{player.number}  ·  {isGK ? "Kaleci" : player.pos === "D" ? "Defans" : player.pos === "M" ? "Orta Saha" : "Forvet"}
              </Text>
              {/* Rating */}
              {rating > 0 && (
                <View style={[s.modalRatingRow]}>
                  <View style={[s.modalRatingBadge, { backgroundColor: rc + "22", borderColor: rc }]}>
                    <Text style={[s.modalRatingText, { color: rc }]}>{rating.toFixed(1)}</Text>
                  </View>
                  <Text style={[s.modalRatingLabel, { color: theme.colors.textSecondary }]}>Puan</Text>
                </View>
              )}
            </View>

            {/* Events */}
            {playerEvents.length > 0 && (
              <View style={s.modalEvents}>
                {playerEvents.map((e, i) => <EventBadge key={i} event={e} />)}
              </View>
            )}

            {/* Close */}
            <TouchableOpacity onPress={onClose} style={s.modalClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={[s.modalDivider, { backgroundColor: theme.colors.divider }]} />

          {/* Stats grid */}
          {rows.length > 0 && (
            <View style={s.modalGrid}>
              {rows.map((row) => (
                <View key={row.label} style={[s.modalStatCell, { backgroundColor: theme.colors.background }]}>
                  <Ionicons name={row.icon} size={16} color={row.iconColor} />
                  <Text style={[s.modalStatValue, { color: theme.colors.textPrimary }]}>{row.value}</Text>
                  <Text style={[s.modalStatLabel, { color: theme.colors.textSecondary }]}>{row.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* No stats fallback */}
          {!stats && rows.length === 0 && (
            <Text style={[s.modalNoStats, { color: theme.colors.textSecondary }]}>
              Bu oyuncu maçta istatistik kaydı bulunmuyor
            </Text>
          )}

          {/* Profile link */}
          <TouchableOpacity
            style={[s.profileBtn, { borderColor: theme.colors.primary + "60", backgroundColor: theme.colors.primary + "12" }]}
            onPress={() => { onClose(); router.push(`/player/${stats?.playerId ?? player.id}`); }}
            activeOpacity={0.8}
          >
            <Ionicons name="person-outline" size={14} color={theme.colors.primary} />
            <Text style={[s.profileBtnText, { color: theme.colors.primary }]}>Oyuncu Profili</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── PlayerDot ────────────────────────────────────────────────────────────────

function PlayerDot({
  player, color, events, stats, playerSize,
}: {
  player: LineupPlayer;
  color: { bg: string; border: string; text: string };
  events?: MatchEvent[];
  stats?: PlayerMatchStats;
  playerSize: { avatarSize: number; wrapSize: number; paddingTop: number };
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const playerEvents = getPlayerEvents(player, events);

  const hasRedCard    = playerEvents.some((e) => e.type === "red_card");
  const hasYellowCard = playerEvents.some((e) => e.type === "yellow_card");
  const goalsScored   = playerEvents.filter((e) => e.type === "goal" || e.type === "penalty").length;
  const ownGoals      = playerEvents.filter((e) => e.type === "own_goal").length;
  const wasSubbed     = playerEvents.some((e) => e.type === "substitution");
  const rating        = stats?.rating ?? 0;

  return (
    <>
      <TouchableOpacity
        style={[s.playerWrapper, { paddingTop: playerSize.paddingTop }]}
        onPress={() => setModalOpen(true)}
        activeOpacity={0.75}
      >
        {/* ── Avatar + surrounding event badges ── */}
        <View style={[s.avatarWrap, { width: playerSize.wrapSize, height: playerSize.wrapSize }]}>
          <PlayerAvatar player={player} color={color} size={playerSize.avatarSize} hasRedCard={hasRedCard} />

          {/* Rating — top center (above circle) */}
          {rating > 0 && (
            <View style={[s.ratingBadge, { backgroundColor: ratingColor(rating) }]}>
              <Text style={s.ratingBadgeText}>{rating.toFixed(1)}</Text>
            </View>
          )}

          {/* Goal — top left */}
          {(goalsScored > 0 || ownGoals > 0) && (
            <View style={[s.cornerBadge, s.topLeft,
              { backgroundColor: ownGoals > 0 && goalsScored === 0 ? "#FF5252" : "#4CAF50", borderColor: "#fff" }]}>
              {(goalsScored + ownGoals) > 1
                ? <Text style={s.goalCount}>{goalsScored + ownGoals}</Text>
                : <Ionicons name="football" size={8} color="#fff" />
              }
            </View>
          )}

          {/* Card — top right (kırmızı sarıyı ezer) */}
          {(hasRedCard || hasYellowCard) && (
            <View style={[s.cornerBadge, s.topRight,
              { backgroundColor: hasRedCard ? "#FF1744" : "#FFD600",
                borderColor: hasRedCard ? "#fff" : "rgba(0,0,0,0.3)" }]}>
              <Ionicons name="card" size={8} color={hasRedCard ? "#fff" : "#000"} />
            </View>
          )}

          {/* Substitution — bottom left */}
          {wasSubbed && (
            <View style={[s.cornerBadge, s.bottomLeft,
              { backgroundColor: "#E65100", borderColor: "#fff" }]}>
              <Ionicons name="swap-horizontal" size={8} color="#fff" />
            </View>
          )}

          {/* Number badge — bottom right (always) */}
          <View style={[s.numberBadge, { backgroundColor: color.bg, borderColor: color.border }]}>
            <Text style={[s.numberBadgeText, { color: color.text }]}>{player.number}</Text>
          </View>
        </View>

        {/* Name — stats varsa tam isim (firstname+lastname), yoksa lineup ismi */}
        <Text style={s.playerName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{formatPlayerName(stats?.playerName ?? player.name, stats?.nationality)}</Text>
      </TouchableOpacity>

      <PlayerStatsModal
        player={player}
        stats={stats}
        color={color}
        events={events}
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

// ─── TeamHalf ─────────────────────────────────────────────────────────────────

const TeamHalf = React.memo(function TeamHalf({
  players, color, isTop, events, statsMap, fieldHeight,
}: {
  players: LineupPlayer[];
  color: { bg: string; border: string; text: string };
  isTop: boolean;
  events?: MatchEvent[];
  statsMap?: Map<number, PlayerMatchStats>;
  fieldHeight: number;
}) {
  const visiblePlayers = statsMap
    ? players.filter((p) => {
        const st = statsMap.get(p.id);
        return !st || st.minutes > 0;
      })
    : players;

  const rows = groupByRow(visiblePlayers);
  const orderedRows = isTop ? rows : [...rows].reverse();
  const rowCount = Math.max(1, orderedRows.length);

  // Zone: her yarı sahanın %49'unu kullanır, ortada %2 boşluk
  const zoneTop    = fieldHeight * (isTop ? 0.01 : 0.50);
  const zoneHeight = fieldHeight * 0.49;
  const padTop     = 4;
  const padBottom  = 4;
  const usableH    = zoneHeight - padTop - padBottom;

  // Her satıra düşen yükseklik
  const rowH = usableH / rowCount;

  // İsim (~12px) + rozetler (~10px badge padding) her zaman sığmalı
  // Avatar boyutunu satır yüksekliğine göre hesapla: rowH - isim(12) - badgePad(8) - margins(4)
  const nameH     = 12;
  const marginH   = 4;
  const available  = rowH - nameH - marginH;
  const wrapSize   = Math.round(Math.min(44, Math.max(24, available - 8)));
  const avatarSize = Math.round(Math.max(18, wrapSize - 6));
  const badgePad   = Math.max(6, Math.round(wrapSize * 0.22));
  const playerSize = { avatarSize, wrapSize, paddingTop: badgePad };

  return (
    <View style={{
      position: "absolute",
      top: zoneTop,
      left: 0,
      right: 0,
      height: zoneHeight,
      flexDirection: "column",
      justifyContent: "space-evenly",
      paddingTop: padTop,
      paddingBottom: padBottom,
      zIndex: 1,
    }}>
      {orderedRows.map((row, i) => {
        // Away (isTop): mirror x-axis so RB appears on the right from away's perspective
        const displayRow = isTop ? [...row].reverse() : row;
        return (
          <View key={i} style={s.row}>
            {displayRow.map((p) => (
              <PlayerDot
                key={p.id}
                player={p}
                color={color}
                events={events}
                stats={statsMap?.get(p.id)}
                playerSize={playerSize}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

function FootballPitch({ lineup, events, statsMap }: Props) {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { home, away } = lineup;
  const homeColor = getTeamColor(home.team.id, true);
  const awayColor = getTeamColor(away.team.id, false);
  const [fieldHeight, setFieldHeight] = useState(720);

  // Oyuncu fotoğraflarını arka planda batch halinde yükle (render'ı bloklamaması için)
  useEffect(() => {
    let cancelled = false;
    const allPlayers = [...home.startXI, ...home.substitutes, ...away.startXI, ...away.substitutes];
    (async () => {
      const batchSize = 4;
      for (let i = 0; i < allPlayers.length; i += batchSize) {
        if (cancelled) break;
        const batch = allPlayers.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map((p) => p.id ? Image.prefetch(`https://media.api-sports.io/football/players/${p.id}.png`) : Promise.resolve()),
        );
      }
    })();
    return () => { cancelled = true; };
  }, [lineup]);

  const goToTeam = (id: string, name: string, logo: string) =>
    router.push(`/team/${id}?name=${encodeURIComponent(name)}&logo=${encodeURIComponent(logo)}`);

  const lc = theme.dark ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.7)";

  const onPitchLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== fieldHeight) setFieldHeight(h);
  };

  return (
    <View style={s.pitchOuter}>
      {/* Pitch */}
      <View
        style={[s.pitch, {
          backgroundColor: theme.dark ? "#1a2e1a" : "#2E7D32",
          borderColor: theme.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
        }]}
        onLayout={onPitchLayout}
      >
        {/* Field markings — tüm çizgiler aynı renk ve kalınlık */}
        <View style={[s.centerLine,       { backgroundColor: lc }]} />
        <View style={[s.centerCircle,     { borderColor: lc }]} />
        <View style={[s.centerDot,        { backgroundColor: lc }]} />
        <View style={[s.penaltyTop,       { borderColor: lc }]} />
        <View style={[s.penaltyBottom,    { borderColor: lc }]} />
        <View style={[s.goalAreaTop,      { borderColor: lc }]} />
        <View style={[s.goalAreaBottom,   { borderColor: lc }]} />
        <View style={[s.goalTop,          { borderColor: lc }]} />
        <View style={[s.goalBottom,       { borderColor: lc }]} />
        <Text style={s.watermark}>Maç Servisi</Text>

        {/* Away — üst yarı: fieldHeight*0.05 → fieldHeight*0.48 */}
        <TeamHalf players={away.startXI} color={awayColor} isTop={true}  events={events} statsMap={statsMap} fieldHeight={fieldHeight} />
        {/* Home — alt yarı: fieldHeight*0.52 → fieldHeight*0.95 */}
        <TeamHalf players={home.startXI} color={homeColor} isTop={false} events={events} statsMap={statsMap} fieldHeight={fieldHeight} />
      </View>

      {/* Manager Bar */}
      <View style={[s.managerBar, { backgroundColor: theme.colors.card }]}>
        {/* Sol: Ev sahibi TD */}
        <TouchableOpacity style={s.managerSide} onPress={() => goToTeam(home.team.id, home.team.name, home.team.logoUrl)} activeOpacity={0.7}>
          <Image source={{ uri: home.team.logoUrl }} style={s.managerLogo} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={[s.formationText, { color: theme.colors.primary }]} numberOfLines={1}>
              {home.formation || "—"}
            </Text>
            <Text style={[s.managerName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {home.coach && home.coach.trim() ? home.coach : t("pitch.unknown")}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Orta: vs */}
        <View style={s.vsCenter}>
          <Text style={[s.formationVs, { color: theme.colors.textSecondary }]}>vs</Text>
        </View>

        {/* Sağ: Deplasman TD */}
        <TouchableOpacity style={[s.managerSide, { flexDirection: "row-reverse" }]} onPress={() => goToTeam(away.team.id, away.team.name, away.team.logoUrl)} activeOpacity={0.7}>
          <Image source={{ uri: away.team.logoUrl }} style={s.managerLogo} resizeMode="contain" />
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={[s.formationText, { color: theme.colors.primary }]} numberOfLines={1}>
              {away.formation || "—"}
            </Text>
            <Text style={[s.managerName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {away.coach && away.coach.trim() ? away.coach : t("pitch.unknown")}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Substitutes */}
      <SubstitutesSection home={home} away={away} homeColor={homeColor} awayColor={awayColor} theme={theme} events={events} statsMap={statsMap} router={router} t={t} />
    </View>
  );
}

export default React.memo(FootballPitch);

// ─── Substitutes Section ─────────────────────────────────────────────────────

function SubstitutesSection({ home, away, homeColor, awayColor, theme, events, statsMap, router, t }: any) {
  return (
    <View style={s.subsSection}>
      <Text style={[s.subsMainTitle, { color: theme.colors.textSecondary }]}>{t("pitch.substitutes")}</Text>
      <View style={s.subsColumns}>
        <SubstitutesList team={home} color={homeColor} theme={theme} events={events} statsMap={statsMap} side="left" />
        <View style={[s.subsColumnDivider, { backgroundColor: theme.colors.divider }]} />
        <SubstitutesList team={away} color={awayColor} theme={theme} events={events} statsMap={statsMap} side="right" />
      </View>
    </View>
  );
}

function SubRow({ p, color, theme, events, statsMap, isRight }: {
  p: LineupPlayer;
  color: { bg: string; border: string; text: string };
  theme: any;
  events?: MatchEvent[];
  statsMap?: Map<number, PlayerMatchStats>;
  isRight: boolean;
}) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const st = statsMap?.get(p.id);
  const playerEvents = getPlayerEvents(p, events);
  const played = st ? st.minutes > 0 : false;

  return (
    <>
      <TouchableOpacity
        style={[s.subRow, { backgroundColor: theme.colors.card, opacity: played ? 1 : 0.55 }, isRight && { flexDirection: "row-reverse" }]}
        onPress={() => setModalOpen(true)}
        activeOpacity={0.75}
      >
        <View style={[s.subJersey, { backgroundColor: color.bg, borderColor: color.border }]}>
          <Text style={[s.subNumber, { color: color.text }]}>{p.number}</Text>
        </View>
        <View style={[s.subInfo, isRight && { alignItems: "flex-end" }]}>
          <Text style={[s.subName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{formatPlayerName(st?.playerName ?? p.name, st?.nationality)}</Text>
          <View style={[s.subMeta, isRight && { flexDirection: "row-reverse" }]}>
            <Text style={[s.subPos, { color: theme.colors.textSecondary }]}>
              {p.pos === "G" ? t("pitch.goalkeeper") : p.pos === "D" ? t("pitch.defender") : p.pos === "M" ? t("pitch.midfielder") : t("pitch.forward")}
            </Text>
            {st && st.minutes > 0 && (
              <Text style={[s.subMinutes, { color: theme.colors.primary }]}>{st.minutes}'</Text>
            )}
            {st && st.rating > 0 && (
              <View style={[s.subRating, { backgroundColor: ratingColor(st.rating) }]}>
                <Text style={s.subRatingText}>{st.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
        {playerEvents.length > 0 && (
          <View style={s.subEvents}>
            {playerEvents.map((e, i) => <EventBadge key={i} event={e} />)}
          </View>
        )}
      </TouchableOpacity>

      <PlayerStatsModal
        player={p}
        stats={st}
        color={color}
        events={events}
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

function SubstitutesList({ team, color, theme, events, statsMap, side }: {
  team: MatchLineup["home"];
  color: { bg: string; border: string; text: string };
  theme: any;
  events?: MatchEvent[];
  statsMap?: Map<number, PlayerMatchStats>;
  side: "left" | "right";
}) {
  if (!team.substitutes.length) return null;
  const isRight = side === "right";

  return (
    <View style={s.subsColumn}>
      <View style={[s.subsTeamHeader, isRight && { flexDirection: "row-reverse" }]}>
        <Image source={{ uri: team.team.logoUrl }} style={s.subsTeamLogo} resizeMode="contain" />
        <Text style={[s.subsTeamName, { color: theme.colors.textPrimary }, isRight && { textAlign: "right" }]} numberOfLines={1}>
          {team.team.name}
        </Text>
      </View>
      {team.substitutes.map((p) => (
        <SubRow key={p.id} p={p} color={color} theme={theme} events={events} statsMap={statsMap} isRight={isRight} />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  pitchOuter: { paddingBottom: 16 },

  // Pitch
  pitch: {
    marginHorizontal: 8, borderRadius: 16, overflow: "hidden",
    paddingVertical: 0, paddingHorizontal: 8,
    position: "relative", height: 720,
    flexDirection: "column",
    borderWidth: 1,
  },
  centerLine:    { position: "absolute", left: 20, right: 20, top: "50%", height: 1.5, marginTop: -0.75, zIndex: 2 },
  centerCircle:  { position: "absolute", width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, alignSelf: "center", top: "50%", marginTop: -40 },
  centerDot:     { position: "absolute", width: 8, height: 8, borderRadius: 4, alignSelf: "center", top: "50%", marginTop: -4 },
  penaltyTop:    { position: "absolute", top: 0, left: "20%", right: "20%", height: "15%", borderWidth: 1.5, borderTopWidth: 0 },
  penaltyBottom: { position: "absolute", bottom: 0, left: "20%", right: "20%", height: "15%", borderWidth: 1.5, borderBottomWidth: 0 },
  goalAreaTop:   { position: "absolute", top: 0, left: "32%", right: "32%", height: "6%", borderWidth: 1.5, borderTopWidth: 0 },
  goalAreaBottom:{ position: "absolute", bottom: 0, left: "32%", right: "32%", height: "6%", borderWidth: 1.5, borderBottomWidth: 0 },
  goalTop:       { position: "absolute", top: 0, left: "36%", right: "36%", height: 10, borderWidth: 1.5, borderTopWidth: 0, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  goalBottom:    { position: "absolute", bottom: 0, left: "36%", right: "36%", height: 10, borderWidth: 1.5, borderBottomWidth: 0, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  watermark:     { position: "absolute", bottom: 10, right: 12, fontSize: 13, fontWeight: "700", color: "#03422d", letterSpacing: 0.5 },

  // Row — her iki takım için de kullanılır (TeamHalf absolute container içinde)
  row:  { flexDirection: "row", justifyContent: "space-evenly", alignItems: "center", paddingHorizontal: 2 },

  // Player on pitch
  playerWrapper: { alignItems: "center", width: 68, minHeight: 0 },

  // Avatar container (width/height override edilir TeamHalf'tan)
  avatarWrap: { position: "relative", alignItems: "center", justifyContent: "center" },

  jersey: {
    alignItems: "center", justifyContent: "center", borderWidth: 2.5,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 5,
  },
  jerseyNumber: { fontWeight: "900" },
  playerName: {
    color: "#ffffff", fontSize: 8, fontWeight: "800",
    marginTop: 1, textAlign: "center", lineHeight: 11,
    textShadowColor: "#000000", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
    maxWidth: 68,
  },

  // Rating badge — top center, just above avatar
  ratingBadge: {
    position: "absolute", top: -9, alignSelf: "center", left: "50%", marginLeft: -12,
    borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2,
    minWidth: 24, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.5)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.85, shadowRadius: 4, elevation: 8,
  },
  ratingBadgeText: { fontSize: 9, fontWeight: "900", color: "#fff" },

  // Generic corner badge
  cornerBadge: {
    position: "absolute", width: 13, height: 13, borderRadius: 7, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.5, shadowRadius: 1, elevation: 3,
  },
  topLeft:     { top: -1, left: -1 },
  topRight:    { top: -1, right: -1 },
  bottomLeft:  { bottom: -1, left: -1, width: "auto", height: 13, paddingHorizontal: 2 },
  bottomRight: { bottom: -1, right: -1 },

  goalEmoji:  { fontSize: 9 },
  goalCount:  { fontSize: 8, fontWeight: "900", color: "#fff" },

  // Number badge (bottom-right when not substituted)
  numberBadge: {
    position: "absolute", bottom: -1, right: -1,
    width: 14, height: 14, borderRadius: 7, borderWidth: 1,
    justifyContent: "center", alignItems: "center",
  },
  numberBadgeText: { fontSize: 7, fontWeight: "900" },

  // Modal event badge (used inside modal header)
  eventBadge: {
    flexDirection: "row", alignItems: "center", gap: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 3, paddingVertical: 1, borderRadius: 4,
  },
  eventMinute: { fontSize: 8, fontWeight: "700" },

  // Manager bar
  managerBar:      { flexDirection: "row", alignItems: "center", marginHorizontal: 8, marginTop: 8, borderRadius: 12, padding: 12, minHeight: 60, zIndex: 5 },
  managerSide:     { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  managerLogo:     { width: 24, height: 24 },
  managerName:     { fontSize: 12, fontWeight: "700", marginTop: 2 },
  vsCenter:        { paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  formationText:   { fontSize: 13, fontWeight: "800" },
  formationVs:     { fontSize: 11, fontWeight: "700" },

  // Substitutes
  subsSection:       { marginTop: 16, paddingHorizontal: 8 },
  subsMainTitle:     { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, paddingHorizontal: 4 },
  subsColumns:       { flexDirection: "row", gap: 1 },
  subsColumn:        { flex: 1, gap: 4 },
  subsColumnDivider: { width: 1, marginHorizontal: 4 },
  subsTeamHeader:    { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4, paddingHorizontal: 4 },
  subsTeamLogo:      { width: 16, height: 16 },
  subsTeamName:      { fontSize: 12, fontWeight: "700", flex: 1 },
  subRow:            { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 8 },
  subJersey:         { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  subNumber:         { fontSize: 10, fontWeight: "900" },
  subInfo:           { flex: 1 },
  subName:           { fontSize: 11, fontWeight: "700" },
  subMeta:           { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  subPos:            { fontSize: 9, fontWeight: "600" },
  subMinutes:        { fontSize: 9, fontWeight: "700" },
  subRating:         { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  subRatingText:     { fontSize: 9, fontWeight: "900", color: "#fff" },
  subEvents:         { flexDirection: "column", alignItems: "flex-end", gap: 2 },

  // Modal
  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard:      { width: "100%", maxWidth: 360, borderRadius: 20, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 16 },
  modalHeader:    { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  modalAvatar:    { width: 56, height: 56, borderRadius: 28, borderWidth: 3, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  modalAvatarImg: { width: 51, height: 51, borderRadius: 25 },
  modalAvatarNum: { fontSize: 20, fontWeight: "900" },
  modalInfo:      { flex: 1 },
  modalName:      { fontSize: 15, fontWeight: "800", marginBottom: 2 },
  modalMeta:      { fontSize: 11, fontWeight: "600" },
  modalRatingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  modalRatingBadge: { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 8, paddingVertical: 3 },
  modalRatingText:  { fontSize: 16, fontWeight: "900" },
  modalRatingLabel: { fontSize: 11, fontWeight: "600" },
  modalEvents:    { flexDirection: "column", gap: 3, alignItems: "flex-end" },
  modalClose:     { padding: 4 },
  modalDivider:   { height: 1, marginBottom: 12 },
  modalGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  modalStatCell:  { width: "30%", flexGrow: 1, borderRadius: 10, padding: 10, alignItems: "center", gap: 4 },
  modalStatValue: { fontSize: 14, fontWeight: "800", textAlign: "center" },
  modalStatLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, textAlign: "center" },
  modalNoStats:   { textAlign: "center", fontSize: 13, paddingVertical: 20 },
  profileBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 10 },
  profileBtnText: { fontSize: 13, fontWeight: "700" },
});
