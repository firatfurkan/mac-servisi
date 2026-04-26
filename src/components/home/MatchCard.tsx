import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Image,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";
import {
  cancelMatchReminder,
  scheduleMatchReminder,
} from "../../services/goalTracker";
import { registerMatchPush, unregisterMatchPush } from "../../services/pushService";
import { useFavoritesStore } from "../../stores/favoritesStore";
import { useNotificationStore } from "../../stores/notificationStore";
import { normalizeTeamName, useRedCardStore } from "../../stores/redCardStore";
import { Match, MatchEvent } from "../../types";
import { formatMatchTime, getAggregateAdvancer, isKnockoutRound, isLive, isSingleLegKnockout } from "../../utils/matchUtils";

interface Props {
  match: Match;
  events?: MatchEvent[];
  pairedMatch?: Match; // Aynı turdaki diğer ayak maçı (aggregate için)
}

const LIVE_RED = "#FF4444";
const UNFINISHED_GRAY = "#9E9E9E";

const IOS_LINK     = "https://apps.apple.com/app/mac-servisi/id6761078600";
const ANDROID_LINK = "https://play.google.com/store/apps/details?id=com.furkanf.asist";
const LINE = "━━━━━━━━━━━━━━━━━━━━━━";

function buildShareMessage(match: Match, events?: MatchEvent[]): string {
  const hasScore = match.homeScore != null && match.awayScore != null;
  const isLiveMatch = match.status === "live" || match.status === "half_time";
  const isFinished = match.status === "finished";
  const isPostponed = match.status === "postponed";
  const isCancelled = match.status === "cancelled";

  // Maç saati (UTC+3)
  const dateObj = new Date(match.startTime);
  const pad = (n: number) => String(n).padStart(2, "0");
  const timeStr = `${pad(dateObj.getUTCHours() + 3 > 23 ? dateObj.getUTCHours() + 3 - 24 : dateObj.getUTCHours() + 3)}:${pad(dateObj.getUTCMinutes())}`;
  const dateStr = `${pad(dateObj.getUTCDate())}.${pad(dateObj.getUTCMonth() + 1)}.${dateObj.getUTCFullYear()}`;

  // Durum etiketi
  const statusLabel = isLiveMatch
    ? `🔴 CANLI${match.minute ? ` · ${match.minute}'` : ""}`
    : isFinished  ? "✅ MAÇ SONUCU"
    : isPostponed ? "⏸ ERTELENDİ"
    : isCancelled ? "❌ İPTAL"
    : `🕐 ${dateStr} · ${timeStr}`;

  // Skor satırı
  const homeW = hasScore && match.homeScore! > match.awayScore!;
  const awayW = hasScore && match.awayScore! > match.homeScore!;
  const scoreLine = hasScore
    ? `⚽ ${homeW ? "𝗚 " : ""}${match.homeTeam.name}  ${match.homeScore} — ${match.awayScore}  ${match.awayTeam.name}${awayW ? " 𝗚" : ""}`
    : `⚽ ${match.homeTeam.name}  vs  ${match.awayTeam.name}`;

  // Goller
  const goals = (events ?? []).filter(
    (e) => e.type === "goal" || e.type === "penalty" || e.type === "own_goal",
  );
  const homeGoals = goals.filter((e) => e.team === match.homeTeam.id);
  const awayGoals = goals.filter((e) => e.team === match.awayTeam.id);
  const goalLines = [
    ...homeGoals.map((g) => `  ⚽ ${g.player} ${g.minute}' (${match.homeTeam.name})`),
    ...awayGoals.map((g) => `  ⚽ ${g.player} ${g.minute}' (${match.awayTeam.name})`),
  ]
    .sort((a, b) => {
      const mA = parseInt(a.match(/(\d+)'/)?.[1] ?? "0");
      const mB = parseInt(b.match(/(\d+)'/)?.[1] ?? "0");
      return mA - mB;
    })
    .join("\n");

  let msg = `${LINE}\n`;
  msg += `🏆 ${match.league.name}\n`;
  msg += `${LINE}\n\n`;
  msg += `${statusLabel}\n\n`;
  msg += `${scoreLine}\n`;

  if (goalLines) {
    msg += `\n${goalLines}\n`;
  }

  msg += `\n${LINE}\n`;
  msg += `Maç Servisi ile maçı canlı takip et, gol bildirimlerini kaçırma! 🔔\n\n`;
  msg += `📥 Hemen İndir:\n`;
  msg += `🍎 iOS: ${IOS_LINK}\n`;
  msg += `🤖 Android: ${ANDROID_LINK}`;

  return msg;
}

function MatchCard({ match, events, pairedMatch }: Props) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const live = isLive(match);
  const finished = match.status === "finished";
  const notStarted = match.status === "not_started";
  const unfinished =
    match.status === "postponed" || match.status === "cancelled";

  // Get red cards from background queue (no API call)
  const allRedCardEvents = useRedCardStore((s) => s.events);
  const redCardEvents = useMemo(
    () => allRedCardEvents.filter((e) => e.matchId === match.id),
    [allRedCardEvents, match.id]
  );
  const normHome = normalizeTeamName(match.homeTeam.name);
  const normAway = normalizeTeamName(match.awayTeam.name);
  const homeRedCards = redCardEvents.filter((e) => normalizeTeamName(e.playerTeam) === normHome).length;
  const awayRedCards = redCardEvents.filter((e) => normalizeTeamName(e.playerTeam) === normAway).length;

  // Aggregate hesaplama: paired maç varsa ve bu maç 2. ayaksa
  const isSecondLeg = !!pairedMatch &&
    new Date(match.startTime).getTime() >= new Date(pairedMatch.startTime).getTime();
  const pairedFinished = pairedMatch?.status === "finished";

  // Tur atlayan: tek maçlık → winner, iki bacaklı 2. ayak → aggregate
  // Paired match yoksa ve knockout turuysa tek maç olarak kabul et (WC elemeleri vb.)
  const advancer = finished
    ? (isSecondLeg && pairedFinished
        ? getAggregateAdvancer(match, pairedMatch)
        : (isSingleLegKnockout(match.league.round) || (!pairedMatch && isKnockoutRound(match.league.round))
            ? (match.winner ?? null)
            : null))
    : null;
  const pulse = useRef(new Animated.Value(1)).current;

  const isNotified = useNotificationStore((s) =>
    s.notifiedMatchIds.includes(match.id),
  );
  const toggleNotificationRaw = useNotificationStore(
    (s) => s.toggleMatchNotification,
  );
  const removeNotification = useNotificationStore((s) => s.removeMatchNotification);
  const toggleNotification = useCallback(() => {
    toggleNotificationRaw({
      id: match.id,
      startTime: match.startTime,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
    });
  }, [match, toggleNotificationRaw]);
  const isFavHome = useFavoritesStore((s) =>
    s.favoriteTeamIds.includes(match.homeTeam.id),
  );
  const isFavAway = useFavoritesStore((s) =>
    s.favoriteTeamIds.includes(match.awayTeam.id),
  );
  const isFavMatch = isFavHome || isFavAway;

  // Biten maçlarda zili kapat ve aboneliği temizle
  useEffect(() => {
    if (finished && isNotified) {
      removeNotification(match.id);
      unregisterMatchPush(match.id).catch(() => {});
      cancelMatchReminder(match.id).catch(() => {});
    }
  }, [finished, isNotified, match.id, removeNotification]);

  // Favori takım maçlarını otomatik kaydet
  useEffect(() => {
    // Biten maçlar: hiçbir şey yapma
    if (finished || unfinished) return;

    // Sadece isFavMatch true ise ve bildirimlerde henüz yoksa ekle.
    if (isFavMatch && !isNotified) {
      toggleNotificationRaw({
        id: match.id,
        startTime: match.startTime,
        homeTeamName: match.homeTeam.name,
        awayTeamName: match.awayTeam.name,
      });
      registerMatchPush(match.id, match.startTime).catch(() => {});
      if (notStarted) {
        scheduleMatchReminder(match).catch(() => {});
      }
    }
    // NOT: Kullanıcı manuel bildirim açtığında bu useEffect'in 
    // onu geri silmemesi için "else if" kısmını tamamen kaldırdık!
  }, [match.id, isFavMatch, isNotified, finished, unfinished, notStarted, toggleNotificationRaw]);

  // Zil aktif mi görsel kontrolü: Artık doğrudan kullanıcının zili açıp açmadığına bakıyoruz
  const bellActive = !finished && !unfinished && isNotified;


   const handleBellPress = useCallback(
    (e: any) => {
      e.stopPropagation?.();
      const wasNotified = isNotified;
      const willEnable = !isNotified;
      toggleNotification();
      
      // Bildirim hatırlatmalarını planla veya iptal et
      if (notStarted) {
        if (willEnable) {
          scheduleMatchReminder(match).catch(() => {});
        } else {
          cancelMatchReminder(match.id).catch(() => {});
        }
      }
      
      // Sunucu tarafında anlık push aboneliğini kaydet veya sil
      if (!wasNotified) {
        registerMatchPush(match.id, match.startTime).catch(() => {});
      } else if (wasNotified) {
        unregisterMatchPush(match.id).catch(() => {});
      }
    },
    [match, isNotified, notStarted, toggleNotification],
  );


  useEffect(() => {
    if (!live) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.25,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [live]);

  const startHour = formatMatchTime(match.startTime);

  const timeLabel =
    notStarted || finished
      ? startHour
      : match.status === "half_time"
        ? t("matchStatus.halfTime")
        : live
          ? match.extra
            ? `${match.minute ?? 0}+${match.extra}'`
            : `${match.minute ?? 0}'`
          : match.status === "postponed"
            ? "Ert."
            : match.status === "cancelled"
              ? "İpt."
              : t("matchStatus.finished");

  const goToTeam = (id: string, name: string, logo: string) => {
    router.push(
      `/team/${id}?name=${encodeURIComponent(name)}&logo=${encodeURIComponent(logo)}`,
    );
  };

  return (
    <TouchableOpacity
      onPress={() => router.push(`/match/${match.id}`)}
      activeOpacity={0.75}
      style={[
        styles.card,
        {
          backgroundColor: live ? LIVE_RED + "08" : theme.colors.card,
          borderLeftWidth: 3,
          borderLeftColor: live ? LIVE_RED : "transparent",
          opacity: unfinished ? 0.6 : 1,
        },
      ]}
    >
      {/* Paylaş butonu — sol taraf */}
      {!unfinished ? (
        <TouchableOpacity
          onPress={() => Share.share({ message: buildShareMessage(match, events) })}
          activeOpacity={0.6}
          style={styles.sideBtn}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Ionicons name="share-social-outline" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.sideBtn} />
      )}

      {/* Home team */}
      <TouchableOpacity
        style={styles.teamSide}
        onPress={() =>
          goToTeam(
            match.homeTeam.id,
            match.homeTeam.name,
            match.homeTeam.logoUrl,
          )
        }
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 0 }}
      >
        <Image
          source={{ uri: match.homeTeam.logoUrl }}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.teamNameRow}>
          <Text
            style={[
              styles.teamName,
              {
                color: finished
                  ? theme.colors.textSecondary
                  : theme.colors.textPrimary,
                fontWeight: advancer === "home" ? "800" : "600",
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.2}
          >
            {match.homeTeam.name}
          </Text>
          <View style={styles.badgesRow}>
            {homeRedCards > 0 && (
              <View style={styles.redCardBadge}>
                {homeRedCards > 1 && <View style={[styles.redCardRect, styles.redCardRectBack]} />}
                <View style={styles.redCardRect} />
              </View>
            )}
            {advancer === "home" && (
              <Ionicons name="checkmark-circle" size={13} color="#4CAF50" style={styles.advancerIcon} />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Center: score + status */}
      <View style={styles.center}>
        {notStarted || unfinished ? (
          <Text
            style={[styles.timeOnly, {
              color: unfinished ? UNFINISHED_GRAY : theme.colors.textSecondary,
            }]}
            maxFontSizeMultiplier={1.0}
          >
            {unfinished
              ? (match.status === "postponed" ? "Ertelendi" : "İptal")
              : timeLabel}
          </Text>
        ) : (
          <>
            {/* Bu maçın skoru */}
            <Text
              style={[
                styles.score,
                { color: live ? LIVE_RED : theme.colors.textPrimary },
              ]}
              maxFontSizeMultiplier={1.1}
            >
              {`${match.homeScore ?? 0} - ${match.awayScore ?? 0}`}
            </Text>
            <View style={styles.statusRow}>
              {live && (
                <Animated.View
                  style={[
                    styles.liveDot,
                    { backgroundColor: LIVE_RED, opacity: pulse },
                  ]}
                />
              )}
              <Text
                style={[
                  styles.statusLabel,
                  {
                    color: live
                      ? LIVE_RED
                      : unfinished
                        ? UNFINISHED_GRAY
                        : theme.colors.textSecondary,
                  },
                  live && { fontWeight: "700" },
                ]}
                maxFontSizeMultiplier={1.0}
              >
                {unfinished
                  ? (match.status === "postponed" ? "Ert." : "İpt.")
                  : finished
                    ? t("matchStatus.finished")
                    : timeLabel}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Away team */}
      <TouchableOpacity
        style={[styles.teamSide, styles.teamSideRight]}
        onPress={() =>
          goToTeam(
            match.awayTeam.id,
            match.awayTeam.name,
            match.awayTeam.logoUrl,
          )
        }
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 0, right: 4 }}
      >
        <View style={[styles.teamNameRow, { flexDirection: "row-reverse" }]}>
          <Text
            style={[
              styles.teamName,
              styles.teamNameRight,
              {
                color: finished
                  ? theme.colors.textSecondary
                  : theme.colors.textPrimary,
                fontWeight: advancer === "away" ? "800" : "600",
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.2}
          >
            {match.awayTeam.name}
          </Text>
          <View style={[styles.badgesRow, { flexDirection: "row-reverse" }]}>
            {awayRedCards > 0 && (
              <View style={styles.redCardBadge}>
                {awayRedCards > 1 && <View style={[styles.redCardRect, styles.redCardRectBack]} />}
                <View style={styles.redCardRect} />
              </View>
            )}
            {advancer === "away" && (
              <Ionicons name="checkmark-circle" size={13} color="#4CAF50" style={styles.advancerIcon} />
            )}
          </View>
        </View>
        <Image
          source={{ uri: match.awayTeam.logoUrl }}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Zil butonu — sağ taraf (biten/ertelenen/iptal maçlarda gizli) */}
      {finished || unfinished ? (
        <View style={styles.sideBtn} />
      ) : (
        <TouchableOpacity
          onPress={handleBellPress}
          activeOpacity={0.6}
          style={styles.sideBtn}
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

export default memo(MatchCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 6,
    minHeight: 46,
    overflow: "hidden",
    maxWidth: "100%",
  },
  teamSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  teamSideRight: {
    justifyContent: "flex-end",
    gap: 4,
  },
  logo: {
    width: 18,
    height: 18,
    borderRadius: 4,
    flexShrink: 0,
  },
  teamNameRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  teamName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  teamNameRight: {
    textAlign: "right",
  },
  advancerIcon: {
    flexShrink: 0,
  },
  center: {
    minWidth: 68,
    width: 72,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    paddingHorizontal: 2,
    flexShrink: 0,
  },
  score: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  timeOnly: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  sideBtn: {
    width: 28,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  // Kırmızı kart ikonu: fiziksel kart dikdörtgeni, 2+ kartta üst üste kayık
  redCardBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  redCardRect: {
    width: 7,
    height: 10,
    backgroundColor: "#FF1744",
    borderRadius: 1.5,
  },
  redCardRectBack: {
    marginRight: -3,
    opacity: 0.45,
  },
});
