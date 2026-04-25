import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, increment, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
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
import { db } from "../../services/firebase";
import { MatchEvent, MatchLineup } from "../../types";

const MOTM_COLOR = "#03422d";
// Cihazın bu maç için oyunu AsyncStorage'da saklıyoruz (hızlı UI kilidi için)
const LOCAL_VOTE_KEY = (matchId: string) => `@asist_motm_vote_${matchId}`;

interface Player {
  id: number;
  name: string;
  number: number;
  teamId: string;
  teamName: string;
}

interface VoteMap {
  [playerId: string]: number;
}

interface Props {
  matchId: string;
  lineup: MatchLineup;
  events?: MatchEvent[];
}

export default function ManOfTheMatch({ matchId, lineup, events = [] }: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();

  const [myVote, setMyVote] = useState<string | null>(null);
  const [votes, setVotes] = useState<VoteMap>({});
  const [loading, setLoading] = useState(true);

  // Maça giren tüm oyuncular: 11'ler + sahaya giren yedekler
  // events listesindeki substitution olaylarından gerçekten giren yedekleri bul
  const substitutedInIds = new Set(
    events
      .filter(e => e.type === "substitution" && e.substitutePlayerId)
      .map(e => e.substitutePlayerId as number),
  );

  const buildPlayers = (teamLineup: typeof lineup.home, teamId: string, teamName: string): Player[] => {
    const starters = teamLineup.startXI.map(p => ({
      id: p.id, name: p.name, number: p.number, teamId, teamName,
    }));
    const usedSubs = teamLineup.substitutes
      .filter(p => substitutedInIds.has(p.id))
      .map(p => ({ id: p.id, name: p.name, number: p.number, teamId, teamName }));
    return [...starters, ...usedSubs];
  };

  const players: Player[] = [
    ...buildPlayers(lineup.home, lineup.home.team.id, lineup.home.team.name),
    ...buildPlayers(lineup.away, lineup.away.team.id, lineup.away.team.name),
  ];

  useEffect(() => {
    if (!matchId) return;

    let unsubscribe: (() => void) | null = null;

    // 1. Cihazda daha önce oy verilmiş mi? (hızlı UI kilidi)
    AsyncStorage.getItem(LOCAL_VOTE_KEY(matchId))
      .then(stored => {
        if (stored) setMyVote(stored);
      })
      .catch(() => {});

    // 2. Firestore'dan gerçek zamanlı oy sayılarını dinle
    // onSnapshot'ı doğrudan çağır (async wrapper yok = cleanup zamanında listener kesin açılmış olur)
    const ref = doc(db, "motmVotes", matchId);
    unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setVotes((data.votes as VoteMap) ?? {});
        }
        setLoading(false);
      },
      () => {
        // Firestore erişim hatası → loading'i kaldır
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [matchId]);

  const handleVote = useCallback(async (player: Player) => {
    if (myVote) return;
    const playerId = String(player.id);

    // Optimistik UI güncellemesi
    setMyVote(playerId);
    setVotes(prev => ({ ...prev, [playerId]: (prev[playerId] ?? 0) + 1 }));

    try {
      // Cihazda kaydet (double-vote önlemi)
      await AsyncStorage.setItem(LOCAL_VOTE_KEY(matchId), playerId);

      // Firestore'da atomic increment ile güncelle
      const ref = doc(db, "motmVotes", matchId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, { [`votes.${playerId}`]: increment(1) });
      } else {
        await setDoc(ref, { votes: { [playerId]: 1 } });
      }
    } catch {
      // Firebase yazma başarısız → optimistik UI olarak kalır, AsyncStorage'da kayıtlı
    }

  }, [myVote, matchId]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
        <ActivityIndicator color={MOTM_COLOR} />
      </View>
    );
  }

  const totalVotes = Object.values(votes).reduce((s, v) => s + v, 0);

  // En çok oy alan oyuncu
  let topPlayer: Player | null = null;
  if (totalVotes > 0) {
    const topId = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
    topPlayer = players.find((p) => String(p.id) === topId) ?? null;
  }

  const topPct = topPlayer && totalVotes > 0
    ? Math.round(((votes[String(topPlayer.id)] ?? 0) / totalVotes) * 100)
    : 0;

  const homeTeam = lineup.home.team;
  const awayTeam = lineup.away.team;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      {/* Başlık */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: MOTM_COLOR }]}>
          <Ionicons name="star" size={13} color="#FFD700" />
          <Text style={styles.badgeText}>
            {t("matchDetail.manOfTheMatch")}
          </Text>
        </View>
        <Text style={[styles.headerSub, { color: theme.colors.textSecondary }]}>
          {t("matchDetail.motmSubtitle")}
        </Text>
      </View>

      {/* Kazanan gösterimi (oy verildiyse) */}
      {topPlayer && myVote && (
        <View style={styles.winner}>
          <Image
            source={{
              uri: `https://media.api-sports.io/football/players/${topPlayer.id}.png`,
            }}
            style={styles.winnerPhoto}
            resizeMode="contain"
          />
          <View style={styles.winnerInfo}>
            <Text style={[styles.winnerName, { color: theme.colors.textPrimary }]}>
              {topPlayer.name}
            </Text>
            <Text style={[styles.winnerTeam, { color: theme.colors.textSecondary }]}>
              {topPlayer.teamName}
            </Text>
            <View style={styles.pctRow}>
              <View style={[styles.pctBar, { backgroundColor: theme.colors.divider }]}>
                <View
                  style={[
                    styles.pctFill,
                    { width: `${topPct}%` as any, backgroundColor: MOTM_COLOR },
                  ]}
                />
              </View>
              <Text style={[styles.pctText, { color: MOTM_COLOR }]}>
                %{topPct}
              </Text>
            </View>
          </View>
          <Ionicons name="star" size={22} color="#FFD700" />
        </View>
      )}

      {/* Oy verme arayüzü */}
      {!myVote && (
        <>
          <Text style={[styles.prompt, { color: theme.colors.textSecondary }]}>
            {t("matchDetail.motmPrompt")}
          </Text>

          {/* Ev Sahibi */}
          <Text style={[styles.teamLabel, { color: theme.colors.textSecondary }]}>
            {homeTeam.name}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.playerList}
          >
            {players.filter(p => p.teamId === homeTeam.id).map((p) => (
              <PlayerChip
                key={p.id}
                player={p}
                onVote={handleVote}
                theme={theme}
              />
            ))}
          </ScrollView>

          {/* Deplasman */}
          <Text style={[styles.teamLabel, { color: theme.colors.textSecondary, marginTop: 8 }]}>
            {awayTeam.name}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.playerList}
          >
            {players.filter(p => p.teamId === awayTeam.id).map((p) => (
              <PlayerChip
                key={p.id}
                player={p}
                onVote={handleVote}
                theme={theme}
              />
            ))}
          </ScrollView>
        </>
      )}

      {/* Zaten oy verildi ama topPlayer henüz hesaplanmadı — koruma */}
      {myVote && !topPlayer && (
        <Text style={[styles.prompt, { color: theme.colors.textSecondary }]}>
          {t("matchDetail.motmVoted")}
        </Text>
      )}
    </View>
  );
}

function PlayerChip({
  player,
  onVote,
  theme,
}: {
  player: Player;
  onVote: (p: Player) => void;
  theme: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: theme.colors.surfaceVariant }]}
      onPress={() => onVote(player)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: `https://media.api-sports.io/football/players/${player.id}.png` }}
        style={styles.chipPhoto}
        resizeMode="contain"
      />
      <Text style={[styles.chipNumber, { color: MOTM_COLOR }]}>
        {player.number}
      </Text>
      <Text style={[styles.chipName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
        {player.name.split(" ").slice(-1)[0]}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  headerSub: {
    fontSize: 10,
    flexShrink: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Kazanan
  winner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  winnerPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#00000010",
  },
  winnerInfo: { flex: 1 },
  winnerName: { fontSize: 15, fontWeight: "700" },
  winnerTeam: { fontSize: 12, marginTop: 2 },
  pctRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  pctBar: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  pctFill: { height: "100%", borderRadius: 3 },
  pctText: { fontSize: 13, fontWeight: "800", minWidth: 42, textAlign: "right", flexShrink: 0 },

  // Oy verme
  prompt: { fontSize: 13, marginBottom: 10 },
  teamLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 },
  playerList: { gap: 8, paddingBottom: 4 },

  // Oyuncu chip
  chip: {
    alignItems: "center",
    borderRadius: 10,
    padding: 8,
    width: 70,
    gap: 4,
  },
  chipPhoto: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#00000010" },
  chipNumber: { fontSize: 10, fontWeight: "800" },
  chipName: { fontSize: 10, fontWeight: "600", textAlign: "center" },
});
