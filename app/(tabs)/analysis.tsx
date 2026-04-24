import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../src/hooks/useAppTheme";
import {
  addPendingAnalysis,
  approveAnalysis,
  autoCheckAllAnalysisOutcomes,
  deleteFromLive,
  deletePendingAnalysis,
  fetchEditorMetadata,
  rejectAnalysis,
  selectTopEditor,
  setAnalysisOutcome,
  subscribeAllPending,
  subscribeEditorAnalyses,
  subscribePublicAnalyses,
  updatePendingAnalysis,
  type LiveAnalysis,
  type PendingAnalysis
} from "../../src/services/analysisService";
import { apiService } from "../../src/services/api";
import { useEditorStore } from "../../src/stores/editorStore";
import type { League, Match } from "../../src/types";
import { sortLeaguesByPriority } from "../../src/utils/matchUtils";

// ─── Analiz Merkezi ikonu: football (Maçlar ile aynı) + trending-up overlay ────
function AnalysisIcon({ size, color }: { size: number; color: string }) {
  return (
    <View style={{ width: size, height: size }}>
      <Ionicons name="football" size={size} color={color} />
      <Ionicons
        name="trending-up"
        size={Math.round(size * 0.56)}
        color="rgba(255,255,255,0.95)"
        style={{ position: "absolute", bottom: 1, right: 0 }}
      />
    </View>
  );
}

// ─── Zaman formatı ────────────────────────────────────────────────────────────
function timeAgo(ts: any, lang: string): string {
  if (!ts?.toDate) return "";
  const diff = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
  if (diff < 60) return lang === "tr" ? "Az önce" : "Just now";
  if (diff < 3600)
    return lang === "tr"
      ? `${Math.floor(diff / 60)} dk önce`
      : `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)
    return lang === "tr"
      ? `${Math.floor(diff / 3600)} sa önce`
      : `${Math.floor(diff / 3600)}h ago`;
  return lang === "tr"
    ? `${Math.floor(diff / 86400)} gün önce`
    : `${Math.floor(diff / 86400)}d ago`;
}

// ─── Durum rozeti ─────────────────────────────────────────────────────────────
function StatusBadge({ status, isTr }: { status: string; isTr: boolean }) {
  const config = {
    pending: {
      color: "#F59E0B",
      bg: "#F59E0B18",
      icon: "time-outline" as const,
      label: isTr ? "Onay Bekliyor" : "Pending",
    },
    approved: {
      color: "#10B981",
      bg: "#10B98118",
      icon: "checkmark-circle-outline" as const,
      label: isTr ? "Onaylandı" : "Approved",
    },
    rejected: {
      color: "#EF4444",
      bg: "#EF444418",
      icon: "close-circle-outline" as const,
      label: isTr ? "Reddedildi" : "Rejected",
    },
  }[status] ?? {
    color: "#9E9E9E",
    bg: "#9E9E9E18",
    icon: "help-circle-outline" as const,
    label: status,
  };

  return (
    <View style={[badgeStyles.wrap, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={11} color={config.color} />
      <Text style={[badgeStyles.label, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  label: { fontSize: 11, fontWeight: "700" },
});

// ─── Editör Profili tip tanımı ────────────────────────────────────────────────
interface EditorProfile {
  displayName: string;
  editorUsername: string;
  editorUid?: string;
  order: number; // Firestore users.order alanından
  analyses: LiveAnalysis[];
  correct: number;
  incorrect: number;
  successRate?: number; // Kümülatif başarı oranı (%)
  totalPredictions?: number; // Toplam tahmin sayısı
}

// ─── Avatar rengi + ikon (kullanıcı adı hash'ine göre deterministik) ──────────
const AVATAR_PALETTE = [
  "#0ECDB9",
  "#00897b",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#3B82F6",
  "#EC4899",
  "#10B981",
];
const EDITOR_ICONS: Array<
  | "football"
  | "trophy"
  | "stats-chart"
  | "trending-up"
  | "flash"
  | "star"
  | "ribbon"
  | "medal"
  | "analytics"
  | "podium"
  | "flag"
  | "flame"
> = [
  "football",
  "trophy",
  "stats-chart",
  "trending-up",
  "flash",
  "star",
  "ribbon",
  "medal",
  "analytics",
  "podium",
  "flag",
  "flame",
];

function editorHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}
function avatarColor(name: string): string {
  return AVATAR_PALETTE[editorHash(name) % AVATAR_PALETTE.length];
}
function editorIcon(name: string): (typeof EDITOR_ICONS)[number] {
  return EDITOR_ICONS[editorHash(name) % EDITOR_ICONS.length];
}

// ─── Başarı Oranı Badge (renkli) ──────────────────────────────────────────────
function SuccessRateBadge({ rate, totalPredictions, isTr }: { rate: number; totalPredictions: number; isTr: boolean }) {
  if (totalPredictions === 0) return null;

  let bgColor: string, textColor: string, icon: 'checkmark-circle-outline' | 'alert-circle-outline' | 'close-circle-outline';

  if (rate >= 70) {
    bgColor = '#10B98120';
    textColor = '#059669';
    icon = 'checkmark-circle-outline';
  } else if (rate >= 40) {
    bgColor = '#F59E0B20';
    textColor = '#D97706';
    icon = 'alert-circle-outline';
  } else {
    bgColor = '#EF444420';
    textColor = '#DC2626';
    icon = 'close-circle-outline';
  }

  return (
    <View style={[editorCardStyles.successBadge, { backgroundColor: bgColor }]}>
      <Ionicons name={icon} size={14} color={textColor} />
      <Text style={[editorCardStyles.successText, { color: textColor }]}>
        {Math.round(rate)}%
      </Text>
    </View>
  );
}

// ─── Editör Kartı (simplified row layout) ────────────────────────────────────
function EditorCardSimple({
  profile,
  theme,
  isTr,
  onPress,
  resolvedName,
}: {
  profile: EditorProfile;
  theme: any;
  isTr: boolean;
  onPress: () => void;
  resolvedName?: string;
}) {
  const color = avatarColor(profile.editorUsername);
  const icon = editorIcon(profile.editorUsername);
  const displayName = resolvedName || profile.displayName || profile.editorUsername;
  const analysisCount = profile.analyses.length;
  const successRate = profile.successRate ?? 0;
  const totalPredictions = profile.totalPredictions ?? 0;

  return (
    <TouchableOpacity
      style={[
        editorCardStyles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.divider,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Avatar */}
      <View style={[editorCardStyles.avatar, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      {/* Name + Stats */}
      <View style={editorCardStyles.middle}>
        <Text style={[editorCardStyles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {displayName}
        </Text>
        {totalPredictions > 0 && (
          <Text style={[editorCardStyles.statsText, { color: theme.colors.textSecondary }]}>
            {totalPredictions} {isTr ? "tahmin" : "prediction"}
          </Text>
        )}
      </View>

      {/* Başarı Oranı Badge */}
      <SuccessRateBadge rate={successRate} totalPredictions={totalPredictions} isTr={isTr} />

      {/* Analysis count — sağ taraf */}
      <View style={editorCardStyles.countBadge}>
        <Text style={[editorCardStyles.countText, { color: theme.colors.textSecondary }]}>
          {analysisCount} {isTr ? "analiz" : "ana."}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const editorCardStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  middle: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
  },
  statsText: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  successText: {
    fontSize: 13,
    fontWeight: "700",
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 0,
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

// ─── Editör karşılama ekranı (hiç analiz yoksa) ───────────────────────────────
function EditorWelcome({
  theme,
  isTr,
  onAdd,
}: {
  theme: any;
  isTr: boolean;
  onAdd: () => void;
}) {
  return (
    <View style={welcomeStyles.wrap}>
      <View
        style={[
          welcomeStyles.iconCircle,
          { backgroundColor: theme.colors.primary + "15" },
        ]}
      >
        <AnalysisIcon size={52} color={theme.colors.primary} />
      </View>
      <Text style={[welcomeStyles.title, { color: theme.colors.textPrimary }]}>
        {isTr ? "Hoşgeldin, Editör!" : "Welcome, Editor!"}
      </Text>
      <Text
        style={[welcomeStyles.subtitle, { color: theme.colors.textSecondary }]}
      >
        {isTr
          ? "Henüz bir analiz paylaşmadın.\nİlk tahmininizi şimdi paylaşın!"
          : "You haven't shared an analysis yet.\nShare your first prediction now!"}
      </Text>
      <TouchableOpacity
        style={[
          welcomeStyles.addBtn,
          { backgroundColor: theme.colors.primary },
        ]}
        onPress={onAdd}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={welcomeStyles.addBtnText}>
          {isTr ? "Yeni Analiz Ekle" : "Add New Analysis"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Editör Vitrin Kartı (Showcase) ───────────────────────────────────────────
function EditorShowcase({
  editor,
  theme,
  isTr,
  onPress,
}: {
  editor: EditorProfile;
  theme: any;
  isTr: boolean;
  onPress: () => void;
}) {
  const color = avatarColor(editor.editorUsername);
  const icon = editorIcon(editor.editorUsername);
  const displayName = editor.displayName || editor.editorUsername;
  const rate = Math.round(editor.successRate);

  return (
    <TouchableOpacity
      style={[
        showcaseStyles.card,
        { backgroundColor: theme.colors.card, borderColor: '#D4AF37' },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Altın ışıltı arka plan */}
      <View style={showcaseStyles.glow} />

      {/* Avatar + Bilgi */}
      <View style={showcaseStyles.content}>
        <View style={[showcaseStyles.avatar, { backgroundColor: color + '25', borderColor: color + '50', borderWidth: 2 }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>

        <View style={showcaseStyles.text}>
          <Text style={[showcaseStyles.label, { color: '#D4AF37' }]}>
            ✨ {isTr ? "BAŞARILI EDİTÖR" : "TOP EDITOR"}
          </Text>
          <Text style={[showcaseStyles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[showcaseStyles.desc, { color: theme.colors.textSecondary }]}>
            {isTr ? `Son analizlerde ${rate}% başarı!` : `${rate}% success rate!`}
          </Text>
        </View>
      </View>

      {/* Sağ taraf: Açılı ok */}
      <Ionicons name="chevron-forward" size={20} color={'#D4AF37'} />
    </TouchableOpacity>
  );
}

const showcaseStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 2,
    overflow: "hidden",
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  glow: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    backgroundColor: "#D4AF3720",
    borderRadius: 75,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  text: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  desc: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
});

const welcomeStyles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 56, paddingHorizontal: 32 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 28,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

// ─── Boş durum ────────────────────────────────────────────────────────────────
function EmptyState({ theme, message }: { theme: any; message: string }) {
  return (
    <View style={emptyStyles.wrap}>
      <View
        style={[
          emptyStyles.iconCircle,
          { backgroundColor: theme.colors.primary + "18" },
        ]}
      >
        <AnalysisIcon size={40} color={theme.colors.primary} />
      </View>
      <Text style={[emptyStyles.text, { color: theme.colors.textSecondary }]}>
        {message}
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 56, paddingHorizontal: 32 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  text: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});

// ─── Canlı analiz kartı (public + admin Yayında) ──────────────────────────────
function LiveCard({
  item,
  theme,
  lang,
  isAdmin,
  resolvedName,
  onDelete,
  onSetOutcome,
}: {
  item: LiveAnalysis;
  theme: any;
  lang: string;
  isAdmin: boolean;
  resolvedName?: string; // Firestore'dan çekilen güncel displayName
  onDelete: () => void;
  onSetOutcome?: (outcome: "correct" | "incorrect" | null) => void;
}) {
  const isTr = lang === "tr";
  const displayName = resolvedName || item.displayName || item.editorUsername;
  return (
    <View
      style={[
        cardStyles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.primary + "22",
          shadowColor: theme.colors.primary,
        },
      ]}
    >
      <View style={cardStyles.header}>
      {item.outcome && (
  <Ionicons
    name={item.outcome === "correct" ? "checkmark-circle" : "close-circle"}
    size={20}
    color={item.outcome === "correct" ? "#4CAF50" : "#F44336"}
  />
)}

        
        <Text
          style={[cardStyles.timeAgo, { color: theme.colors.textSecondary }]}
        >
          {timeAgo(item.approvedAt, lang)}
        </Text>
        {isAdmin && (
          <TouchableOpacity
            onPress={onDelete}
            style={cardStyles.actionBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
      <Text
        style={[cardStyles.matchLabel, { color: theme.colors.textPrimary }]}
        numberOfLines={1}
      >
        <Ionicons
          name="football-outline"
          size={14}
          color={theme.colors.textSecondary}
        />{" "}
        {item.matchLabel}
      </Text>
      <View
        style={[
          cardStyles.predictionBand,
          {
            backgroundColor: theme.colors.primary + "12",
            borderColor: theme.colors.primary + "30",
          },
        ]}
      >
        <Ionicons
          name="stats-chart-outline"
          size={14}
          color={theme.colors.primary}
        />
        <Text
          style={[
            cardStyles.predictionLabel,
            { color: theme.colors.textSecondary },
          ]}
        >
          {isTr ? "Tahmin:" : "Prediction:"}
        </Text>
        <Text
          style={[cardStyles.predictionValue, { color: theme.colors.primary }]}
        >
          {item.prediction}
        </Text>
      </View>
      <Text style={[cardStyles.comment, { color: theme.colors.textSecondary }]}>
        {item.comment}
      </Text>

      {/* ── Admin Manuel Müdahale Butonları ── */}
{isAdmin && (
  <View style={{ 
    flexDirection: 'row', 
    gap: 8, 
    marginTop: 12, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: theme.colors.divider 
  }}>
    <TouchableOpacity
      style={{ 
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingVertical: 6, borderRadius: 8, backgroundColor: item.outcome === 'correct' ? '#10B981' : theme.colors.surface,
        borderWidth: 1, borderColor: '#10B981'
      }}
      onPress={() => onSetOutcome?.('correct')}
    >
      <Ionicons name="checkmark-circle" size={14} color={item.outcome === 'correct' ? '#fff' : '#10B981'} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: item.outcome === 'correct' ? '#fff' : '#10B981' }}>Doğru</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={{ 
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        paddingVertical: 6, borderRadius: 8, backgroundColor: item.outcome === 'incorrect' ? '#EF4444' : theme.colors.surface,
        borderWidth: 1, borderColor: '#EF4444'
      }}
      onPress={() => onSetOutcome?.('incorrect')}
    >
      <Ionicons name="close-circle" size={14} color={item.outcome === 'incorrect' ? '#fff' : '#EF4444'} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: item.outcome === 'incorrect' ? '#fff' : '#EF4444' }}>Yanlış</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={{ 
        paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center',
        paddingVertical: 6, borderRadius: 8, backgroundColor: theme.colors.surface,
        borderWidth: 1, borderColor: theme.colors.textSecondary
      }}
      onPress={() => onSetOutcome?.(null)}
    >
      <Ionicons name="refresh-outline" size={14} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  </View>
)}

    </View>
  );
}

// ─── Bekleyen analiz kartı (editor kendi, admin tümü) ─────────────────────────
function PendingCard({
  item,
  theme,
  lang,
  isOwner,
  isAdmin,
  resolvedName,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: {
  item: PendingAnalysis;
  theme: any;
  lang: string;
  isOwner: boolean;
  isAdmin: boolean;
  resolvedName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isTr = lang === "tr";
  const displayName = resolvedName || item.displayName || item.editorUsername;
  const isLocked = item.status === "approved"; // Admin onayladıktan sonra kilitli

  return (
    <View
      style={[
        cardStyles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor:
            item.status === "rejected"
              ? "#EF444430"
              : isLocked
                ? "#10B98130"
                : theme.colors.primary + "22",
          shadowColor: theme.colors.primary,
        },
      ]}
    >
      <View style={cardStyles.header}>
        
        <StatusBadge status={item.status} isTr={isTr} />

        {/* Kilit göstergesi — onaylandıktan sonra düzenlenemez */}
        {isOwner && isLocked && (
          <View style={[badgeStyles.wrap, { backgroundColor: "#10B98112" }]}>
            <Ionicons name="lock-closed" size={10} color="#10B981" />
            <Text style={[badgeStyles.label, { color: "#10B981" }]}>
              {isTr ? "Kilitli" : "Locked"}
            </Text>
          </View>
        )}

        <Text
          style={[cardStyles.timeAgo, { color: theme.colors.textSecondary }]}
        >
          {timeAgo(item.timestamp, lang)}
        </Text>
        {(isOwner || isAdmin) && item.status === "pending" && (
          <View style={cardStyles.ownerActions}>
            {isOwner && (
              <TouchableOpacity
                onPress={onEdit}
                style={cardStyles.actionBtn}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="pencil-outline"
                  size={15}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onDelete}
              style={cardStyles.actionBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text
        style={[cardStyles.matchLabel, { color: theme.colors.textPrimary }]}
        numberOfLines={1}
      >
        <Ionicons
          name="football-outline"
          size={14}
          color={theme.colors.textSecondary}
        />{" "}
        {item.matchLabel}
      </Text>
      <View
        style={[
          cardStyles.predictionBand,
          {
            backgroundColor: theme.colors.primary + "12",
            borderColor: theme.colors.primary + "30",
          },
        ]}
      >
        <Ionicons
          name="stats-chart-outline"
          size={14}
          color={theme.colors.primary}
        />
        <Text
          style={[
            cardStyles.predictionLabel,
            { color: theme.colors.textSecondary },
          ]}
        >
          {isTr ? "Tahmin:" : "Prediction:"}
        </Text>
        <Text
          style={[cardStyles.predictionValue, { color: theme.colors.primary }]}
        >
          {item.prediction}
        </Text>
       

      </View>
      <Text style={[cardStyles.comment, { color: theme.colors.textSecondary }]}>
        {item.comment}
      </Text>

      {/* Red nedeni */}
      {item.status === "rejected" && item.rejectionReason && (
        <View
          style={[cardStyles.rejectionRow, { backgroundColor: "#EF444412" }]}
        >
          <Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
          <Text style={[cardStyles.rejectionText, { color: "#EF4444" }]}>
            {item.rejectionReason}
          </Text>
        </View>
      )}

      {/* Admin onay/red butonları (sadece pending) */}
      {isAdmin && item.status === "pending" && (
        <View style={cardStyles.adminActions}>
          <TouchableOpacity
            style={[cardStyles.approveBtn, { backgroundColor: "#10B981" }]}
            onPress={onApprove}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-outline" size={14} color="#fff" />
            <Text style={cardStyles.adminBtnText}>
              {isTr ? "Onayla" : "Approve"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              cardStyles.rejectBtn,
              { backgroundColor: "#EF444420", borderColor: "#EF444440" },
            ]}
            onPress={onReject}
            activeOpacity={0.8}
          >
            <Ionicons name="close-outline" size={14} color="#EF4444" />
            <Text style={[cardStyles.adminBtnText, { color: "#EF4444" }]}>
              {isTr ? "Reddet" : "Reject"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
    flexWrap: "wrap",
  },
  editorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  editorName: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  timeAgo: { fontSize: 11, flex: 1 },
  ownerActions: { flexDirection: "row", gap: 4 },
  actionBtn: { padding: 4 },
  matchLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  predictionBand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  predictionLabel: { fontSize: 12, fontWeight: "500", flex: 1 },
  predictionValue: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  comment: { fontSize: 14, lineHeight: 21, letterSpacing: 0.1 },
  rejectionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  rejectionText: { fontSize: 12, flex: 1, lineHeight: 17 },
  adminActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  adminBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});

// ─── Tahmin buton grupları ─────────────────────────────────────────────────────
const PRED_ROWS = [
  ["MS1", "MS X", "MS2"],
  ["2.5 Alt", "2.5 Üst"],
  ["KG Var", "KG Yok"],
  ["ÇŞ 1X", "ÇŞ 12", "ÇŞ X2"],
];


// ─── 3-Adımlı Editör Formu ────────────────────────────────────────────────────
function EditorForm({
  theme,
  isTr,
  editorUid,
  editorUsername,
  displayName,
  editingItem,
  onSaved,
  onCancel,
}: {
  theme: any;
  isTr: boolean;
  editorUid: string;
  editorUsername: string;
  displayName: string;
  editingItem: PendingAnalysis | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(editingItem ? 3 : 1);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [groupedLeagues, setGroupedLeagues] = useState<
    { league: League; matches: Match[] }[]
  >([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [leagueMatches, setLeagueMatches] = useState<Match[]>([]);
  const [matchLabel, setMatchLabel] = useState(editingItem?.matchLabel ?? "");
  const [matchId, setMatchId] = useState<string | undefined>(
    editingItem?.matchId,
  );
  const [leagueId, setLeagueId] = useState<string | undefined>(
    editingItem?.leagueId,
  );
  const [prediction, setPrediction] = useState(editingItem?.prediction ?? "");
  const [comment, setComment] = useState(editingItem?.comment ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingItem) return;
    setLoadingMatches(true);
    const todayDate = new Date();
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const todayStr = todayDate.toISOString().split("T")[0];
    const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

    const dayAfterDate = new Date(tomorrowDate);
    dayAfterDate.setDate(dayAfterDate.getDate() + 1);
    const dayAfterStr = dayAfterDate.toISOString().split("T")[0];

    Promise.all([
      apiService.getMatchesByDate(todayStr).catch(() => [] as Match[]),
      apiService.getMatchesByDate(tomorrowStr).catch(() => [] as Match[]),
      apiService.getMatchesByDate(dayAfterStr).catch(() => [] as Match[]),
    ])
      .then(([d0, d1, d2]) => {
        // Sadece henüz başlamamış maçları (not_started) filtrele
        const allMatches = [...d0, ...d1, ...d2].filter(
          (m) => m.status === "not_started",
        );
        const map = new Map<string, { league: League; matches: Match[] }>();
        allMatches.forEach((m) => {
          if (!map.has(m.league.id))
            map.set(m.league.id, { league: m.league, matches: [] });
          map.get(m.league.id)!.matches.push(m);
        });
        const raw = Array.from(map.values());
        const sorted = sortLeaguesByPriority(
          raw.map((item) => ({
            leagueId: item.league.id,
            firstMatchTime: item.matches[0]?.startTime,
            league: item.league,
            matches: item.matches,
          })),
        );
        setGroupedLeagues(
          sorted.map(({ league, matches }) => ({ league, matches })),
        );
      })
      .finally(() => setLoadingMatches(false));
  }, []);

  const handleLeagueSelect = (item: { league: League; matches: Match[] }) => {
    setSelectedLeague(item.league);
    setLeagueMatches(item.matches);
    setStep(2);
  };

  const handleMatchSelect = (match: Match) => {
    setMatchLabel(`${match.homeTeam.name} - ${match.awayTeam.name}`);
    setMatchId(match.id);
    setLeagueId(match.league.id);
    setStep(3);
  };

  const isValid =
    matchLabel.trim().length > 0 &&
    prediction.trim().length > 0 &&
    comment.trim().length > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      if (editingItem) {
        await updatePendingAnalysis(editingItem.id, {
          matchLabel: matchLabel.trim(),
          prediction: prediction.trim(),
          comment: comment.trim(),
        });
      } else {
        await addPendingAnalysis({
          matchLabel: matchLabel.trim(),
          matchId,
          leagueId,
          editorUid,
          editorUsername,
          displayName,
          prediction: prediction.trim(),
          comment: comment.trim(),
        });
      }
      onSaved();
    } catch {
      Alert.alert(
        isTr ? "Hata" : "Error",
        isTr
          ? "Kaydedilemedi. Bağlantıyı kontrol edin."
          : "Could not save. Check connection.",
      );
    } finally {
      setSaving(false);
    }
  };

  const stepTitle = editingItem
    ? isTr
      ? "Düzenle"
      : "Edit"
    : step === 1
      ? isTr
        ? "Lig Seç"
        : "Select League"
      : step === 2
        ? isTr
          ? "Maç Seç"
          : "Select Match"
        : isTr
          ? "Analiz Yaz"
          : "Write Analysis";

  return (
    <View
      style={[
        formStyles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.primary + "30",
        },
      ]}
    >
      {/* ── Header ── */}
      <View style={formStyles.formHeader}>
        {step > 1 && !editingItem && (
          <TouchableOpacity
            onPress={() => setStep((step - 1) as 1 | 2 | 3)}
            style={formStyles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        )}
        <View
          style={[
            formStyles.headerBadge,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Ionicons name="create-outline" size={14} color="#fff" />
          <Text style={formStyles.headerBadgeText}>{stepTitle}</Text>
        </View>
        {!editingItem && (
          <Text
            style={[
              formStyles.stepCounter,
              { color: theme.colors.textSecondary },
            ]}
          >
            {step}/3
          </Text>
        )}
        <View style={[formStyles.reviewNote, { backgroundColor: "#F59E0B18" }]}>
          <Ionicons name="time-outline" size={11} color="#F59E0B" />
          <Text style={formStyles.reviewNoteText}>
            {isTr ? "Onay bekler" : "Awaits review"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onCancel}
          style={formStyles.cancelX}
          activeOpacity={0.7}
        >
          <Ionicons
            name="close-circle"
            size={22}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* ── ADIM 1: Lig Seçimi ── */}
      {step === 1 && (
        <>
          {loadingMatches && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              style={{ marginVertical: 24 }}
            />
          )}
          {!loadingMatches && groupedLeagues.length === 0 && (
            <Text
              style={[
                formStyles.emptyNote,
                { color: theme.colors.textSecondary },
              ]}
            >
              {isTr
                ? "Şu an aktif maç bulunamadı."
                : "No active matches found."}
            </Text>
          )}
          {!loadingMatches && (
            <ScrollView
              style={formStyles.pickerList}
              horizontal={false}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {groupedLeagues.map((item) => (
                <TouchableOpacity
                  key={item.league.id}
                  style={[
                    formStyles.leagueRow,
                    { borderColor: theme.colors.divider },
                  ]}
                  onPress={() => handleLeagueSelect(item)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.league.logoUrl }}
                    style={formStyles.leagueLogo}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        formStyles.leagueName,
                        { color: theme.colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {item.league.name}
                    </Text>
                    <Text
                      style={[
                        formStyles.leagueSub,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {item.matches.length} {isTr ? "maç" : "matches"}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}

              {/* Manuel giriş seçeneği — her zaman en altta */}
              <TouchableOpacity
                style={[
                  formStyles.manualEntryRow,
                  {
                    borderColor: theme.colors.primary + "40",
                    backgroundColor: theme.colors.primary + "08",
                  },
                ]}
                onPress={() => {
                  setMatchLabel("");
                  setStep(3);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="create-outline"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text
                  style={[
                    formStyles.manualEntryText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {isTr
                    ? "Aradığın maçı bulamadın mı? Elle gir"
                    : "Can't find the match? Enter manually"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </ScrollView>
          )}
        </>
      )}

      {/* ── ADIM 2: Maç Seçimi ── */}
      {step === 2 && (
        <>
          {selectedLeague && (
            <View
              style={[
                formStyles.selectedLeagueBanner,
                { backgroundColor: theme.colors.primary + "10" },
              ]}
            >
              <Image
                source={{ uri: selectedLeague.logoUrl }}
                style={formStyles.leagueLogo}
              />
              <Text
                style={[formStyles.leagueName, { color: theme.colors.primary }]}
                numberOfLines={1}
              >
                {selectedLeague.name}
              </Text>
            </View>
          )}
          <ScrollView
            style={formStyles.pickerList}
            horizontal={false}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {leagueMatches.map((match) => {
              const matchDate = new Date(match.startTime);
              const now = new Date();
              const diffDays = Math.round(
                (matchDate.setHours(0, 0, 0, 0) -
                  new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate(),
                  ).getTime()) /
                  86400000,
              );
              const timeBase = new Date(match.startTime).toLocaleTimeString(
                "tr-TR",
                { hour: "2-digit", minute: "2-digit" },
              );
              const dayLabel =
                diffDays === 0
                  ? timeBase
                  : diffDays === 1
                    ? isTr
                      ? `Yarın ${timeBase}`
                      : `Tmr ${timeBase}`
                    : isTr
                      ? `+2g ${timeBase}`
                      : `+2d ${timeBase}`;
              return (
                <TouchableOpacity
                  key={match.id}
                  style={[
                    formStyles.matchRow,
                    { borderColor: theme.colors.divider },
                  ]}
                  onPress={() => handleMatchSelect(match)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        formStyles.matchTeams,
                        { color: theme.colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {match.homeTeam.name} — {match.awayTeam.name}
                    </Text>
                    <Text
                      style={[
                        formStyles.matchTime,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {dayLabel}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* ── ADIM 3: Tahmin + Analiz ── */}
      {step === 3 && (
        <>
          {/* Manuel modda maç adı girişi */}
          {!matchLabel && !editingItem && (
            <>
              <Text
                style={[
                  formStyles.label,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {isTr ? "Maç" : "Match"}
              </Text>
              <TextInput
                style={[
                  formStyles.matchInput,
                  {
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.divider,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                value={matchLabel}
                onChangeText={setMatchLabel}
                placeholder={
                  isTr
                    ? "örn. Galatasaray - Fenerbahçe"
                    : "e.g. Man City - Liverpool"
                }
                placeholderTextColor={theme.colors.textSecondary}
                autoFocus
              />
            </>
          )}

          {/* Seçilen maç etiketi (liste'den seçilmişse) */}
          {matchLabel ? (
            <View
              style={[
                formStyles.matchBanner,
                {
                  backgroundColor: theme.colors.primary + "12",
                  borderColor: theme.colors.primary + "30",
                },
              ]}
            >
              <Ionicons
                name="football-outline"
                size={13}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  formStyles.matchBannerText,
                  { color: theme.colors.primary },
                ]}
                numberOfLines={1}
              >
                {matchLabel}
              </Text>
            </View>
          ) : null}

          {/* Tahmin butonları */}
          <Text
            style={[formStyles.label, { color: theme.colors.textSecondary }]}
          >
            {isTr ? "Tahmin" : "Prediction"}
          </Text>
          {PRED_ROWS.map((row, ri) => (
            <View key={ri} style={formStyles.predRow}>
              {row.map((btn) => (
                <TouchableOpacity
                  key={btn}
                  style={[
                    formStyles.predBtn,
                    prediction === btn
                      ? {
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.primary,
                        }
                      : {
                          backgroundColor: "transparent",
                          borderColor: theme.colors.divider,
                        },
                  ]}
                  onPress={() => setPrediction(btn)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      formStyles.predBtnText,
                      {
                        color:
                          prediction === btn
                            ? "#fff"
                            : theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {btn}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Analiz metni */}
          <Text
            style={[
              formStyles.label,
              { color: theme.colors.textSecondary, marginTop: 10 },
            ]}
          >
            {isTr ? "Analiz Metni" : "Analysis Text"}
          </Text>
          <TextInput
            style={[
              formStyles.textArea,
              {
                color: theme.colors.textPrimary,
                borderColor: theme.colors.divider,
                backgroundColor: theme.colors.background,
              },
            ]}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            placeholder={
              isTr
                ? "Maç analizinizi buraya yazın..."
                : "Write your match analysis here..."
            }
            placeholderTextColor={theme.colors.textSecondary}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[
              formStyles.saveBtn,
              {
                backgroundColor: isValid
                  ? theme.colors.primary
                  : theme.colors.primary + "50",
              },
            ]}
            onPress={handleSave}
            disabled={!isValid || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={16} color="#fff" />
                <Text style={formStyles.saveBtnText}>
                  {isTr ? "Onaya Gönder" : "Submit for Review"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const formStyles = StyleSheet.create({
  card: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
    flexWrap: "wrap",
  },
  backBtn: { padding: 2 },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  headerBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stepCounter: { fontSize: 12, fontWeight: "600" },
  reviewNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  reviewNoteText: { color: "#F59E0B", fontSize: 10, fontWeight: "600" },
  cancelX: { marginLeft: "auto" as any, padding: 2 },
  emptyNote: { textAlign: "center", fontSize: 13, paddingVertical: 20 },
  pickerList: { maxHeight: 320 },
  manualEntryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  manualEntryText: { flex: 1, fontSize: 13, fontWeight: "600" },
  matchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  leagueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leagueLogo: { width: 28, height: 28, resizeMode: "contain" },
  leagueName: { fontSize: 13, fontWeight: "600" },
  leagueSub: { fontSize: 11, marginTop: 1 },
  selectedLeagueBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  matchRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
  },
  matchTeams: { fontSize: 13, fontWeight: "600" },
  matchTime: { fontSize: 11, marginTop: 2 },
  matchBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  matchBannerText: { fontSize: 13, fontWeight: "600", flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  predRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  predBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  predBtnText: { fontSize: 13, fontWeight: "700" },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
    minHeight: 100,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

// ─── Admin sekme çubuğu ───────────────────────────────────────────────────────
function AdminTabBar({
  activeTab,
  onChange,
  pendingCount,
  theme,
  isTr,
}: {
  activeTab: "pending" | "live";
  onChange: (t: "pending" | "live") => void;
  pendingCount: number;
  theme: any;
  isTr: boolean;
}) {
  return (
    <View
      style={[
        tabBarStyles.bar,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.divider,
        },
      ]}
    >
      {(["pending", "live"] as const).map((t) => {
        const active = activeTab === t;
        const label =
          t === "pending"
            ? isTr
              ? "Bekleyenler"
              : "Pending"
            : isTr
              ? "Yayında"
              : "Live";
        return (
          <TouchableOpacity
            key={t}
            style={tabBarStyles.tab}
            onPress={() => onChange(t)}
            activeOpacity={0.7}
          >
            <View style={tabBarStyles.labelRow}>
              <Text
                style={[
                  tabBarStyles.label,
                  {
                    color: active
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                    fontWeight: active ? "700" : "500",
                  },
                ]}
              >
                {label}
              </Text>
              {t === "pending" && pendingCount > 0 && (
                <View
                  style={[tabBarStyles.badge, { backgroundColor: "#F59E0B" }]}
                >
                  <Text style={tabBarStyles.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
            {active && (
              <View
                style={[
                  tabBarStyles.indicator,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  bar: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 14 },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  indicator: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2 },
});

// ─── Ana Ekran ────────────────────────────────────────────────────────────────
export default function AnalysisScreen() {
  const { i18n } = useTranslation();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const isTr = i18n.language === "tr";
  const lang = i18n.language;

  const {
    uid,
    loggedInEditor,
    displayName,
    role,
    restore,
    logout,
    initialized,
  } = useEditorStore();
  const isEditor = role === "editor";
  const isAdmin = role === "admin";

  // Restore Firebase Auth session on mount
  useEffect(() => {
    const unsub = restore();
    return unsub;
  }, []);

  // ── Public state ──────────────────────────────────────────────────────────
  const [liveAnalyses, setLiveAnalyses] = useState<LiveAnalysis[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);

  // ── Editör metadata cache (editorUid → displayName + order) ────────────────
  const [editorMetadata, setEditorMetadata] = useState<
    Record<string, { displayName: string; order: number }>
  >({});

  useEffect(() => {
    const uids = [
      ...new Set(
        liveAnalyses.map((a) => a.editorUid).filter((u): u is string => !!u),
      ),
    ];
    const missing = uids.filter((u) => !editorMetadata[u]);
    if (missing.length === 0) return;
    fetchEditorMetadata(missing).then((metadata) =>
      setEditorMetadata((prev) => ({ ...prev, ...metadata })),
    );
  }, [liveAnalyses]);

  // ── Editor state ──────────────────────────────────────────────────────────
  const [editorAnalyses, setEditorAnalyses] = useState<PendingAnalysis[]>([]);
  const [editorLoading, setEditorLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PendingAnalysis | null>(null);

  // ── Admin state ───────────────────────────────────────────────────────────
  const [adminTab, setAdminTab] = useState<"pending" | "live">("pending");
  const [allPending, setAllPending] = useState<PendingAnalysis[]>([]);
  const [adminPendingLoading, setAdminPendingLoading] = useState(false);

  const unsubPublicRef = useRef<(() => void) | null>(null);
  const unsubEditorRef = useRef<(() => void) | null>(null);
  const unsubAdminRef = useRef<(() => void) | null>(null);

  // Public subscription (always)
  const subscribePublic = useCallback(() => {
    unsubPublicRef.current?.();
    setLiveLoading(true);
    unsubPublicRef.current = subscribePublicAnalyses((data) => {
      setLiveAnalyses(data);
      setLiveLoading(false);
    });
  }, []);

  // Editor subscription
  const subscribeEditor = useCallback((editorUid: string) => {
    unsubEditorRef.current?.();
    setEditorLoading(true);
    unsubEditorRef.current = subscribeEditorAnalyses(editorUid, (data) => {
      setEditorAnalyses(data);
      setEditorLoading(false);
    });
  }, []);

  // Admin subscription
  const subscribeAdmin = useCallback(() => {
    unsubAdminRef.current?.();
    setAdminPendingLoading(true);
    unsubAdminRef.current = subscribeAllPending((data) => {
      setAllPending(data);
      setAdminPendingLoading(false);
    });
  }, []);

   useEffect(() => {
    subscribePublic();
    if (isEditor && uid) subscribeEditor(uid);
    if (isAdmin) {
      subscribeEditor(uid!);
      subscribeAdmin();
    }
    return () => {
      unsubPublicRef.current?.();
      unsubPublicRef.current = null;
      unsubEditorRef.current?.();
      unsubEditorRef.current = null;
      unsubAdminRef.current?.();
      unsubAdminRef.current = null;
    };
  }, [subscribePublic, subscribeEditor, subscribeAdmin, isEditor, isAdmin, uid]);


  // ── Outcome automation: trigger when admin opens "Yayında" tab ──────────────
  useEffect(() => {
    if (!isAdmin || adminTab !== "live" || liveAnalyses.length === 0) return;

    const checkOutcomes = async () => {
      try {
        // Fetch matches for past 7 days to check outcomes for all analyses
        const today = new Date();
        const dateStrings = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
          dateStrings.push(d.toISOString().split("T")[0]);
        }

        const matchResults = await Promise.all(
          dateStrings.map((dateStr) =>
            apiService.getMatchesByDate(dateStr).catch(() => [] as Match[]),
          ),
        );

        const matchesMap = new Map<string, Match>();
        matchResults.flat().forEach((m) => {
          matchesMap.set(m.id, m);
        });

        // Auto-check all analyses and update outcomes
        await autoCheckAllAnalysisOutcomes(matchesMap);
      } catch (err) {
        if (__DEV__) console.log("[Analysis] Outcome auto-check failed:", err);
      }
    };

    checkOutcomes();
  }, [isAdmin, adminTab, liveAnalyses.length]);

  const handleLogout = () => {
    Alert.alert(
      isTr ? "Çıkış Yap" : "Log Out",
      isTr
        ? "Editör oturumunu kapatmak istiyor musunuz?"
        : "Do you want to log out?",
      [
        { text: isTr ? "Vazgeç" : "Cancel", style: "cancel" },
        { text: isTr ? "Çıkış" : "Log Out", onPress: () => logout() },
      ],
    );
  };

  const handleDeleteLive = (item: LiveAnalysis) => {
    Alert.alert(
      isTr ? "Yayından Kaldır" : "Remove from Live",
      isTr
        ? "Bu analizi yayından kaldırmak istiyor musunuz?"
        : "Remove this analysis from live feed?",
      [
        { text: isTr ? "Vazgeç" : "Cancel", style: "cancel" },
        {
          text: isTr ? "Kaldır" : "Remove",
          style: "destructive",
          onPress: () => deleteFromLive(item.id),
        },
      ],
    );
  };

  const handleDeletePending = (item: PendingAnalysis) => {
    Alert.alert(
      isTr ? "Analizi Sil" : "Delete Analysis",
      isTr ? "Bu analizi silmek istiyor musunuz?" : "Delete this analysis?",
      [
        { text: isTr ? "Vazgeç" : "Cancel", style: "cancel" },
        {
          text: isTr ? "Sil" : "Delete",
          style: "destructive",
          onPress: () => deletePendingAnalysis(item.id),
        },
      ],
    );
  };

  const handleApprove = (item: PendingAnalysis) => {
    Alert.alert(
      isTr ? "Onayla" : "Approve",
      isTr
        ? `"${item.matchLabel}" analizini onaylıyor musunuz?`
        : `Approve analysis for "${item.matchLabel}"?`,
      [
        { text: isTr ? "Vazgeç" : "Cancel", style: "cancel" },
        {
          text: isTr ? "Onayla" : "Approve",
          onPress: async () => {
            try {
              await approveAnalysis(item);
            } catch {
              Alert.alert(
                isTr ? "Hata" : "Error",
                isTr ? "Onaylama başarısız." : "Approval failed.",
              );
            }
          },
        },
      ],
    );
  };

  const handleReject = (item: PendingAnalysis) => {
    Alert.prompt?.(
      isTr ? "Reddet" : "Reject",
      isTr
        ? "Red nedeni girin (opsiyonel):"
        : "Enter rejection reason (optional):",
      async (reason) => {
        try {
          await rejectAnalysis(item.id, reason ?? "");
        } catch {
          Alert.alert(
            isTr ? "Hata" : "Error",
            isTr ? "Red işlemi başarısız." : "Rejection failed.",
          );
        }
      },
      "plain-text",
    ) ?? rejectAnalysis(item.id, ""); // Android: no Alert.prompt, reject without reason
  };

  const handleOutcome = async (
    item: LiveAnalysis,
    outcome: "correct" | "incorrect" | null,
  ) => {
    try {
      await setAnalysisOutcome(item.id, outcome);
    } catch {
      Alert.alert(
        isTr ? "Hata" : "Error",
        isTr ? "Sonuç güncellenemedi." : "Could not update outcome.",
      );
    }
  };

  // ── Public view: seçili editör (null = profil listesi) ──────────────────────
  const [selectedEditor, setSelectedEditor] = useState<string | null>(null);

  // ── Android back button handler ────────────────────────────────────────────
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (selectedEditor) {
          // If inside editor profile, go back to list
          handleGoBackToList();
          return true;
        }
        // Allow default behavior (exit app)
        return false;
      },
    );

    return () => backHandler.remove();
  }, [selectedEditor]);

  // ── Handle going back with smooth animation ────────────────────────────────
  const handleGoBackToList = useCallback(() => {
    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          300,
          LayoutAnimation.Types.easeInEaseOut,
          LayoutAnimation.Properties.opacity,
        ),
      );
    }
    setSelectedEditor(null);
  }, []);

  // ── Swipe back gesture tracking ────────────────────────────────────────────
  const touchStartXRef = useRef(0);
  const handleDetailTouchStart = (e: any) => {
    touchStartXRef.current = e.nativeEvent.pageX;
  };
  const handleDetailTouchEnd = (e: any) => {
    const touchEndX = e.nativeEvent.pageX;
    const diffX = touchEndX - touchStartXRef.current;
    // Swipe right by 50px+ to go back
    if (diffX > 50) {
      handleGoBackToList();
    }
  };

  // ── Editör profilleri — liveAnalyses'den türet ────────────────────────────
  const editorProfiles = useMemo<EditorProfile[]>(() => {
    const map = new Map<string, EditorProfile>();
    liveAnalyses.forEach((a) => {
      const key = a.editorUsername;
      if (!map.has(key)) {
        // Firestore metadata'dan order, successRate ve totalPredictions'ı al
        const metadata = a.editorUid ? editorMetadata[a.editorUid] : undefined;
        map.set(key, {
          displayName: a.displayName || a.editorUsername,
          editorUsername: key,
          editorUid: a.editorUid,
          order: metadata?.order ?? 999,
          successRate: metadata?.successRate ?? 0,
          totalPredictions: metadata?.totalPredictions ?? 0,
          analyses: [],
          correct: 0,
          incorrect: 0,
        });
      }
      const p = map.get(key)!;
      p.analyses.push(a);
      if (a.outcome === "correct") p.correct++;
      if (a.outcome === "incorrect") p.incorrect++;
      // Update editorUid if found
      if (a.editorUid) p.editorUid = a.editorUid;
    });

    // Firestore verisi yoksa, mevcut analizlerden hesapla (fallback)
    const profiles = Array.from(map.values());
    profiles.forEach((p) => {
      if (p.totalPredictions === 0 && p.analyses.length > 0) {
        // Outcome'ları belirlenen analizlerden hesapla
        const withOutcome = p.analyses.filter((a) => a.outcome !== null);
        if (withOutcome.length > 0) {
          p.totalPredictions = withOutcome.length;
          p.successRate = (p.correct / withOutcome.length) * 100;
        }
      }
    });

    // Sort by 'order' alanına göre (küçükten büyüğe)
    return profiles.sort((a, b) => a.order - b.order);
  }, [liveAnalyses, editorMetadata]);

  // Seçili editörün analizleri
  const selectedEditorAnalyses = useMemo(
    () =>
      selectedEditor
        ? liveAnalyses.filter((a) => a.editorUsername === selectedEditor)
        : [],
    [liveAnalyses, selectedEditor],
  );

  // Seçili editörün displayName'i (header için) — Firestore'dan çekilen güncel ad
  const selectedEditorDisplay = useMemo(() => {
    const profile = editorProfiles.find((p) => p.editorUsername === selectedEditor);
    if (!profile) return selectedEditor;
    // Firestore'dan çekilen güncel displayName kullan (editorMetadata cache'i)
    return profile.editorUid && editorMetadata[profile.editorUid]
      ? editorMetadata[profile.editorUid].displayName
      : profile.displayName ?? selectedEditor;
  }, [editorProfiles, selectedEditor, editorMetadata]);

  // ── Pending sayısı (sadece 'pending' statuslular) ─────────────────────────
  const pendingOnlyCount = allPending.filter(
    (a) => a.status === "pending",
  ).length;

  // ── Rol yüklenene kadar yükleniyor ekranı ──────────────────────────────────
  if (!initialized) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.background,
          }}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={{
              color: theme.colors.textSecondary,
              marginTop: 12,
              fontSize: 13,
            }}
          >
            {isTr ? "Yükleniyor..." : "Loading..."}
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ── Header ── */}
        <View
          style={[
            headerStyles.bar,
            {
              backgroundColor: theme.colors.surface,
              paddingTop: insets.top + 10,
              paddingBottom: !isEditor && !isAdmin && selectedEditor ? 12 : 8,
              borderBottomColor: theme.colors.divider,
              minHeight: !isEditor && !isAdmin && selectedEditor ? 75 : 60,
              justifyContent: "center",
            },
          ]}
        >
          {/* NORMAL MODE: Analiz Merkezi + Icon + (Editor/Admin sağ menüsü) */}
          {!(!isEditor && !isAdmin && selectedEditor) && (
            <View style={headerStyles.titleRow}>
              <View
                style={[
                  headerStyles.iconWrap,
                  { backgroundColor: theme.colors.primary + "18" },
                ]}
              >
                <AnalysisIcon size={20} color={theme.colors.primary} />
              </View>

              <Text
                style={[
                  headerStyles.title,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {isTr ? "Analiz Merkezi" : "Analysis Center"}
              </Text>

              <View style={{ flex: 1 }} />

              {(isEditor || isAdmin) && (
                <View style={headerStyles.editorRight}>
                  <View
                    style={[
                      headerStyles.roleBadge,
                      {
                        backgroundColor: isAdmin
                          ? "#F59E0B18"
                          : theme.colors.primary + "15",
                        borderColor: isAdmin
                          ? "#F59E0B40"
                          : theme.colors.primary + "40",
                      },
                    ]}
                  >
                    <Ionicons
                      name={isAdmin ? "shield-outline" : "shield-checkmark"}
                      size={12}
                      color={isAdmin ? "#F59E0B" : theme.colors.primary}
                    />
                    <Text
                      style={[
                        headerStyles.roleBadgeText,
                        { color: isAdmin ? "#F59E0B" : theme.colors.primary },
                      ]}
                    >
                      {isAdmin ? "Admin" : displayName}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleLogout}
                    style={headerStyles.logoutBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="log-out-outline"
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Admin sekme çubuğu ── */}
        {isAdmin && (
          <AdminTabBar
            activeTab={adminTab}
            onChange={setAdminTab}
            pendingCount={pendingOnlyCount}
            theme={theme}
            isTr={isTr}
          />
        )}

        <View style={{ flex: 1 }}>
          <ScrollView
            horizontal={false}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: insets.bottom + 32,
              paddingTop: 16,
            }}
          >
          {/* ── Floating Back Button (Drill-down modunda ScrollView içinde) ── */}
          {!isEditor && !isAdmin && selectedEditor && (
            <View
              style={{
                marginHorizontal: 16,
                marginBottom: 24,
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: theme.colors.primary + "08",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.primary + "20",
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  handleGoBackToList();
                }}
                style={{
                  padding: 8,
                  marginLeft: -8,
                  flexShrink: 0,
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Ionicons
                  name="arrow-back"
                  size={26}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    {
                      fontSize: 16,
                      fontWeight: "800",
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {selectedEditorDisplay}
                </Text>
                <Text
                  style={[
                    {
                      fontSize: 12,
                      fontWeight: "500",
                      color: theme.colors.textSecondary,
                      marginTop: 2,
                    },
                  ]}
                >
                  {isTr ? "Maçları" : "Matches"}
                </Text>
              </View>
            </View>
          )}

          {/* ── Editör formu ── */}
          {(isEditor || isAdmin) && showForm && (
            <EditorForm
              theme={theme}
              isTr={isTr}
              editorUid={uid!}
              editorUsername={loggedInEditor!}
              displayName={displayName!}
              editingItem={editingItem}
              onSaved={() => {
                setShowForm(false);
                setEditingItem(null);
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingItem(null);
              }}
            />
          )}

          {/* ──────── PUBLIC VIEW ──────── */}
          {!isEditor && !isAdmin && (
            <>
              {liveLoading && (
                <View style={{ alignItems: "center", paddingVertical: 48 }}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                  />
                </View>
              )}

              {/* Liderlik tablosu (editör seçilmemişken) */}
              {!liveLoading && !selectedEditor && (
                <>
                  {editorProfiles.length === 0 ? (
                    <EmptyState
                      theme={theme}
                      message={
                        isTr
                          ? "Editörlerimiz yakında maç analizlerini paylaşacak."
                          : "Our editors will soon share match analyses."
                      }
                    />
                  ) : (
                    <>
                      {/* Vitrin Kartı — En başarılı editör */}
                      {editorProfiles.length > 0 && (() => {
                        const topEditor = selectTopEditor(
                          editorProfiles.map((p) => ({
                            displayName: p.displayName,
                            successRate: p.successRate || 0,
                            totalPredictions: p.totalPredictions || 0,
                            editorUid: p.editorUid,
                          })),
                        );
                        if (topEditor && topEditor.totalPredictions > 0) {
                          const profile = editorProfiles.find(
                            (p) => p.displayName === topEditor.displayName,
                          );
                          if (profile) {
                            return (
                              <EditorShowcase
                                editor={profile}
                                theme={theme}
                                isTr={isTr}
                                onPress={() => setSelectedEditor(profile.editorUsername)}
                              />
                            );
                          }
                        }
                        return null;
                      })()}

                      <Text
                        style={[
                          publicStyles.sectionTitle,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {isTr ? "Editörlerimiz" : "Our Editors"}
                      </Text>
                      <View style={{ paddingVertical: 8 }}>
                        {editorProfiles.map((profile) => (
                          <EditorCardSimple
                            key={profile.editorUsername}
                            profile={profile}
                            theme={theme}
                            isTr={isTr}
                            resolvedName={
                              profile.editorUid && editorMetadata[profile.editorUid]
                                ? editorMetadata[profile.editorUid].displayName
                                : undefined
                            }
                            onPress={() =>
                              setSelectedEditor(profile.editorUsername)
                            }
                          />
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}

              {/* Seçili editörün analizleri (drill-down) — swipe back supported */}
              {!liveLoading && selectedEditor && (
                <View
                  onTouchStart={handleDetailTouchStart}
                  onTouchEnd={handleDetailTouchEnd}
                  style={{}}
                >
                  {selectedEditorAnalyses.length === 0 ? (
                    <EmptyState
                      theme={theme}
                      message={
                        isTr
                          ? "Bu editörün yayında analizi yok."
                          : "No live analyses from this editor."
                      }
                    />
                  ) : (
                    selectedEditorAnalyses.map((item) => (
                      <LiveCard
                        key={item.id}
                        item={item}
                        theme={theme}
                        lang={lang}
                        isAdmin={false}
                        resolvedName={
                          item.editorUid && editorMetadata[item.editorUid]
                            ? editorMetadata[item.editorUid].displayName
                            : undefined
                        }
                        onDelete={() => {}}
                      />
                    ))
                  )}
                </View>
              )}
            </>
          )}

          {/* ──────── EDITOR VIEW ──────── */}
          {isEditor && (
            <>
              {/* Sabit "Yeni Analiz Ekle" butonu */}
              <TouchableOpacity
                style={[
                  editorPanelStyles.addBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    marginHorizontal: 16,
                    marginVertical: 16,
                  },
                ]}
                onPress={() => {
                  setShowForm(true);
                  setEditingItem(null);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={editorPanelStyles.addBtnText}>
                  {isTr ? "Yeni Analiz Ekle" : "Add New Analysis"}
                </Text>
              </TouchableOpacity>

              {editorLoading && (
                <View style={{ alignItems: "center", paddingVertical: 48 }}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                  />
                </View>
              )}

              {!editorLoading && editorAnalyses.filter((a) => a.status !== "approved").length === 0 && !showForm && (
                <EmptyState
                  theme={theme}
                  message={
                    isTr
                      ? "Tüm analizlerin onaylandı! 🎉"
                      : "All analyses approved! 🎉"
                  }
                />
              )}

              {!editorLoading &&
                editorAnalyses
                  .filter((a) => a.status !== "approved")
                  .map((item) => (
                    <PendingCard
                      key={item.id}
                      item={item}
                      theme={theme}
                      lang={lang}
                      isOwner
                      isAdmin={false}
                      onEdit={() => {
                        setEditingItem(item);
                        setShowForm(true);
                      }}
                      onDelete={() => handleDeletePending(item)}
                      onApprove={() => {}}
                      onReject={() => {}}
                    />
                  ))}

              {/* En alta başarı oranı — editorün yayında maçları */}
              {!editorLoading && (
                <View
                  style={[
                    editorPanelStyles.statsFooter,
                    {
                      backgroundColor: theme.colors.primary + "10",
                      borderColor: theme.colors.primary + "20",
                    },
                  ]}
                >
                  <Text style={[editorPanelStyles.statsLabel, { color: theme.colors.textPrimary }]}>
                    {isTr ? "Yayında Maçlar" : "Live Analyses"}
                  </Text>
                  <Text style={[editorPanelStyles.statsValue, { color: theme.colors.primary }]}>
                    {liveAnalyses.filter((a) => a.editorUid === uid).filter((a) => a.outcome === "correct").length}
                    <Text style={[editorPanelStyles.statsTotal, { color: theme.colors.textSecondary }]}>
                      /{liveAnalyses.filter((a) => a.editorUid === uid).length}
                    </Text>
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ──────── ADMIN VIEW ──────── */}
          {isAdmin && (
            <>
              {/* Bekleyenler sekmesi */}
              {adminTab === "pending" && (
                <>
                  {adminPendingLoading && (
                    <View style={{ alignItems: "center", paddingVertical: 48 }}>
                      <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                      />
                    </View>
                  )}
                  {!adminPendingLoading && pendingOnlyCount === 0 && (
                    <EmptyState
                      theme={theme}
                      message={
                        isTr
                          ? "Onay bekleyen analiz yok."
                          : "No analyses awaiting approval."
                      }
                    />
                  )}
                  {!adminPendingLoading &&
                    allPending
                      .filter((a) => a.status === "pending")
                      .map((item) => (
                        <PendingCard
                          key={item.id}
                          item={item}
                          theme={theme}
                          lang={lang}
                          isOwner={item.editorUid === uid}
                          isAdmin
                          onEdit={() => {
                            setEditingItem(item);
                            setShowForm(true);
                          }}
                          onDelete={() => handleDeletePending(item)}
                          onApprove={() => handleApprove(item)}
                          onReject={() => handleReject(item)}
                        />
                      ))}
                </>
              )}

              {/* Yayında sekmesi */}
              {adminTab === "live" && (
                <>
                  {liveLoading && (
                    <View style={{ alignItems: "center", paddingVertical: 48 }}>
                      <ActivityIndicator
                        size="large"
                        color={theme.colors.primary}
                      />
                    </View>
                  )}
                  {!liveLoading && liveAnalyses.length === 0 && (
                    <EmptyState
                      theme={theme}
                      message={
                        isTr ? "Yayında analiz yok." : "No live analyses."
                      }
                    />
                  )}
                  {!liveLoading &&
                    liveAnalyses.map((item) => (
                      <LiveCard
                        key={item.id}
                        item={item}
                        theme={theme}
                        lang={lang}
                        isAdmin
                        resolvedName={
                          item.editorUid && editorMetadata[item.editorUid]
                            ? editorMetadata[item.editorUid].displayName
                            : undefined
                        }
                        onDelete={() => handleDeleteLive(item)}
                        onSetOutcome={(outcome) => handleOutcome(item, outcome)}
                      />
                    ))}
                </>
              )}
            </>
          )}

          </ScrollView>

       
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const editorPanelStyles = StyleSheet.create({
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  statsFooter: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statsLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  statsValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statsTotal: {
    fontSize: 14,
    fontWeight: "500",
  },
});

const publicStyles = StyleSheet.create({
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginHorizontal: 16,
    marginBottom: 12,
  },
});

const headerStyles = StyleSheet.create({
  bar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "flex-start",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 12, fontWeight: "500", marginTop: 1 },

  drilldownHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 4,
  },
  drilldownBackBtn: {
    padding: 8,
    marginLeft: -8,
    flexShrink: 0,
  },
  drilldownTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  editorBreadcrumb: { flex: 1 },
  breadcrumbName: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  breadcrumbSub: { fontSize: 12, fontWeight: "500" },
  editorRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: "auto",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleBadgeText: { fontSize: 12, fontWeight: "700" },
  logoutBtn: { padding: 6 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 20,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
