import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/useAppTheme';

export type NotifType = 'goal' | 'halftime' | 'start' | 'end' | 'second_half' | 'reminder' | 'info';

export interface BannerData {
  title: string;
  body: string;
  matchId: string | null;
  type: NotifType;
}

interface Props {
  data: BannerData | null;
  onDismiss: () => void;
}

const TYPE_CONFIG: Record<NotifType, { icon: string; color: string; label: string }> = {
  goal:        { icon: 'football',           color: '#16C784', label: 'GOL' },
  halftime:    { icon: 'time-outline',        color: '#FFBB33', label: 'DEVRE ARASI' },
  start:       { icon: 'play-circle',         color: '#22C55E', label: 'MAÇ BAŞLADI' },
  end:         { icon: 'flag',                color: '#8ba9a7', label: 'MAÇ BİTTİ' },
  second_half: { icon: 'play-forward-circle', color: '#2196F3', label: 'İKİNCİ DEVRE' },
  reminder:    { icon: 'alarm-outline',       color: '#FFBB33', label: 'HATIRLATICI' },
  info:        { icon: 'notifications',       color: '#0ECDB9', label: 'BİLDİRİM' },
};

const AUTO_DISMISS_MS = 6000;

export function detectNotifType(title: string): NotifType {
  if (title.includes('GOL') || title.includes('⚽')) return 'goal';
  if (title.includes('Devre Arası') || title.includes('⏱')) return 'halftime';
  if (title.includes('Maç Başladı') || title.includes('🟢')) return 'start';
  if (title.includes('Maç Bitti') || title.includes('🏁')) return 'end';
  if (title.includes('İkinci Devre') || title.includes('▶')) return 'second_half';
  if (title.includes('⏰')) return 'reminder';
  return 'info';
}

/**
 * "Galatasaray 2 - 0 Fenerbahçe 45'" → { home, homeScore, awayScore, away, minute }
 * "Galatasaray - Fenerbahçe" (no score yet) → { home, away }
 */
function parseMatchBody(body: string): {
  home: string; away: string;
  homeScore: string | null; awayScore: string | null;
  minute: string | null;
} {
  // With score: "Team A 2 - 0 Team B 45'"
  const withScore = body.match(/^(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s+(.+?)(?:\s+(\d+)')?$/);
  if (withScore) {
    return {
      home: withScore[1].trim(),
      homeScore: withScore[2],
      awayScore: withScore[3],
      away: withScore[4].trim(),
      minute: withScore[5] ?? null,
    };
  }
  // Without score: "Team A - Team B"
  const noScore = body.match(/^(.+?)\s*[-–]\s*(.+)$/);
  if (noScore) {
    return { home: noScore[1].trim(), away: noScore[2].trim(), homeScore: null, awayScore: null, minute: null };
  }
  return { home: body, away: '', homeScore: null, awayScore: null, minute: null };
}

export default function InAppNotificationBanner({ data, onDismiss }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const translateY = useRef(new Animated.Value(-160)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (data) {
      progressAnim.setValue(1);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 200,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Progress bar countdown
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: AUTO_DISMISS_MS,
        useNativeDriver: false,
      }).start();

      dismissTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    } else {
      dismissTimer.current && clearTimeout(dismissTimer.current);
    }
    return () => { dismissTimer.current && clearTimeout(dismissTimer.current); };
  }, [data]);

  function dismiss() {
    dismissTimer.current && clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -160, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }

  function handleTap() {
    if (data?.matchId) router.push(`/match/${data.matchId}`);
    dismiss();
  }

  if (!data) return null;

  const cfg = TYPE_CONFIG[data.type];
  const match = parseMatchBody(data.body);
  const hasScore = match.homeScore !== null && match.awayScore !== null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { top: insets.top + (Platform.OS === 'android' ? 8 : 4), transform: [{ translateY }], opacity },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handleTap}
        style={[
          styles.card,
          {
            backgroundColor: theme.dark ? 'rgba(18,32,29,0.98)' : 'rgba(255,255,255,0.98)',
            shadowColor: theme.dark ? '#000' : '#012219',
            borderColor: cfg.color + '44',
          },
        ]}
      >
        {/* Üst satır: tip etiketi + dakika + kapat */}
        <View style={styles.topRow}>
          <View style={[styles.typePill, { backgroundColor: cfg.color + '22' }]}>
            <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
            <Text style={[styles.typeLabel, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          {match.minute && (
            <Text style={[styles.minute, { color: cfg.color }]}>{match.minute}'</Text>
          )}
          <TouchableOpacity
            onPress={dismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={15} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Maç satırı: Ev takımı — Skor — Deplasman */}
        <View style={styles.matchRow}>
          <Text
            style={[styles.teamName, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {match.home}
          </Text>

          <View style={[styles.scoreBox, { borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
            {hasScore ? (
              <Text style={[styles.scoreText, { color: theme.colors.textPrimary }]}>
                {match.homeScore}
                <Text style={{ color: theme.colors.textSecondary, fontWeight: '400' }}> – </Text>
                {match.awayScore}
              </Text>
            ) : (
              <Text style={[styles.vsText, { color: theme.colors.textSecondary }]}>vs</Text>
            )}
          </View>

          <Text
            style={[styles.teamName, styles.teamRight, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {match.away}
          </Text>
        </View>

        {/* Alt: maç detayı linki */}
        {data.matchId && (
          <Text style={[styles.tapHint, { color: cfg.color }]}>
            Maç detayına git →
          </Text>
        )}

        {/* Progress bar */}
        <View style={[styles.progressTrack, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: cfg.color,
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 11,
    paddingHorizontal: 14,
    paddingBottom: 0,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 12,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  minute: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  closeBtn: {
    padding: 2,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  teamRight: {
    textAlign: 'right',
  },
  scoreBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 52,
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tapHint: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: 4,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginHorizontal: -14,
    marginBottom: 0,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
  },
});
