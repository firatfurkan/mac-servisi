import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/useAppTheme';
import { apiService } from '../../services/api';
import { Match, Team } from '../../types';

// ─── Türkçe normalize (zırhlı versiyon) ───────────────────────
// Step 1: Turkish-specific transformations (before toLowerCase)
// Step 2: Convert to lowercase
// Step 3: Replace special chars with ASCII equivalents
function normalizeTR(s: string): string {
  return s
    .replace(/İ/g, 'i').replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c');
}

// ─── Takım Arama Overlay ──────────────────────────────────────
function TeamSearchOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) { setQuery(''); setTeams([]); setSearched(false); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [visible]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    const ascii = normalizeTR(trimmed);
    if (trimmed.length < 3) { setTeams([]); setSearched(false); setLoading(false); return; }
    setLoading(true);
    try {
      const results = await apiService.searchTeams(ascii).catch(() => [] as Team[]);
      setTeams(results.slice(0, 8));
      setSearched(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 450);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  const handleSelectTeam = (team: Team) => { onClose(); router.push(`/team/${team.id}`); };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={[styles.overlayHeader, { borderBottomColor: theme.colors.divider }]}>
          <View style={[styles.overlayInput, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
            <TextInput
              ref={inputRef}
              style={[styles.overlayTextInput, { color: theme.colors.textPrimary }]}
              placeholder="Takım ara..."
              placeholderTextColor={theme.colors.textSecondary}
              value={query} onChangeText={setQuery}
              autoCorrect={false} returnKeyType="search" onSubmitEditing={Keyboard.dismiss}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.6} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: theme.colors.primary }]}>İptal</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>Aranıyor...</Text>
          </View>
        ) : searched && teams.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="search-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>Sonuç bulunamadı</Text>
            <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>En az 3 harf girin</Text>
          </View>
        ) : !searched ? (
          <View style={styles.centerBox}>
            <Ionicons name="shield-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>Takım adı girin</Text>
          </View>
        ) : (
          <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            {teams.map((team) => (
              <TouchableOpacity key={team.id} style={[styles.row, { borderBottomColor: theme.colors.divider }]}
                onPress={() => handleSelectTeam(team)} activeOpacity={0.7}>
                {team.logoUrl
                  ? <Image source={{ uri: team.logoUrl }} style={styles.teamLogo} resizeMode="contain" />
                  : <View style={[styles.teamLogo, { backgroundColor: theme.colors.surface, borderRadius: 6 }]} />}
                <Text style={[styles.rowName, { color: theme.colors.textPrimary }]} numberOfLines={1}>{team.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── Maç Arama Overlay ────────────────────────────────────────
function MatchSearchOverlay({ visible, onClose, matches }: { visible: boolean; onClose: () => void; matches: Match[] }) {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [visible]);

  const filtered = query.trim().length === 0
    ? matches
    : matches.filter((m) => {
        const q = normalizeTR(query);
        return (
          normalizeTR(m.homeTeam.name).includes(q) ||
          normalizeTR(m.awayTeam.name).includes(q) ||
          normalizeTR(m.league.name).includes(q)
        );
      });

  const handleSelect = (match: Match) => { onClose(); router.push(`/match/${match.id}`); };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch { return ''; }
  };

  const statusLabel = (m: Match) => {
    if (m.status === 'live') return { text: `${m.elapsed ?? ''}′`, color: '#EF4444' };
    if (m.status === 'half_time') return { text: 'HT', color: '#EF4444' };
    if (m.status === 'finished') return { text: 'MS', color: theme.colors.textSecondary };
    if (m.status === 'postponed') return { text: 'Ert.', color: theme.colors.textSecondary };
    if (m.status === 'cancelled') return { text: 'İpt.', color: theme.colors.textSecondary };
    return { text: formatTime(m.startTime), color: theme.colors.textSecondary };
  };

  const scoreText = (m: Match) => {
    if (m.status === 'not_started') return null;
    if (m.status === 'postponed' || m.status === 'cancelled') return null;
    return `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`;
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={[styles.overlayHeader, { borderBottomColor: theme.colors.divider }]}>
          <View style={[styles.overlayInput, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="football" size={17} color={theme.colors.textSecondary} />
            <TextInput
              ref={inputRef}
              style={[styles.overlayTextInput, { color: theme.colors.textPrimary }]}
              placeholder="Takım veya lig adı..."
              placeholderTextColor={theme.colors.textSecondary}
              value={query} onChangeText={setQuery}
              autoCorrect={false} returnKeyType="search" onSubmitEditing={Keyboard.dismiss}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.6} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: theme.colors.primary }]}>İptal</Text>
          </TouchableOpacity>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="football-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
              {query.trim().length > 0 ? 'Maç bulunamadı' : 'Bugün maç yok'}
            </Text>
          </View>
        ) : (
          <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
            {filtered.map((m) => {
              const sl = statusLabel(m);
              const score = scoreText(m);
              const isLive = m.status === 'live' || m.status === 'half_time';
              return (
                <TouchableOpacity key={m.id} style={[styles.matchRow, { borderBottomColor: theme.colors.divider }]}
                  onPress={() => handleSelect(m)} activeOpacity={0.7}>
                  {/* Sol: saat / durum */}
                  <View style={styles.matchTime}>
                    <Text style={[styles.matchTimeText, { color: isLive ? '#EF4444' : theme.colors.textSecondary }]}>
                      {sl.text}
                    </Text>
                  </View>
                  {/* Orta: takımlar */}
                  <View style={styles.matchTeams}>
                    <Text style={[styles.matchLeague, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {m.league.name}
                    </Text>
                    <Text style={[styles.matchTeamName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {m.homeTeam.name}
                    </Text>
                    <Text style={[styles.matchTeamName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {m.awayTeam.name}
                    </Text>
                  </View>
                  {/* Sağ: skor */}
                  {score && (
                    <Text style={[styles.matchScore, { color: isLive ? '#EF4444' : theme.colors.textPrimary }]}>
                      {score}
                    </Text>
                  )}
                  <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── Ana SearchBar ────────────────────────────────────────────
function SearchBar({ matches = [] }: { matches?: Match[] }) {
  const theme = useAppTheme();
  const [teamOpen, setTeamOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);

  return (
    <>
      <View style={styles.row2}>
        {/* Takım Ara */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setTeamOpen(true)}
          style={[styles.teamBtn, { backgroundColor: '#03422d', borderColor: '#045e41' }]}
        >
          <Ionicons name="search" size={16} color="#ffffff" />
          <Text style={styles.placeholderText}>Takım ara...</Text>
        </TouchableOpacity>

        {/* Maç Ara */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setMatchOpen(true)}
          style={[styles.matchBtn, { backgroundColor: '#03422d', borderColor: '#045e41' }]}
        >
          <Ionicons name="football" size={15} color="#ffffff" />
          <Text style={styles.matchBtnText}>Maç ara</Text>
        </TouchableOpacity>
      </View>

      <TeamSearchOverlay visible={teamOpen} onClose={() => setTeamOpen(false)} />
      <MatchSearchOverlay visible={matchOpen} onClose={() => setMatchOpen(false)} matches={matches} />
    </>
  );
}

export default memo(SearchBar);

const styles = StyleSheet.create({
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 6,
    gap: 8,
  },
  teamBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
  },
  matchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
  },
  placeholderText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  matchBtnText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
  },
  // ─── Overlay ───
  overlay: { flex: 1 },
  overlayHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  overlayInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 8,
  },
  overlayTextInput: { flex: 1, fontSize: 15, padding: 0 },
  cancelBtn: { paddingHorizontal: 4, paddingVertical: 6 },
  cancelText: { fontSize: 15, fontWeight: '600' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 },
  statusText: { fontSize: 15, fontWeight: '500' },
  hintText: { fontSize: 13, opacity: 0.7 },
  // ─── Takım satırı ───
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  teamLogo: { width: 36, height: 36 },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600' },
  // ─── Maç satırı ───
  matchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  matchTime: { width: 36, alignItems: 'center' },
  matchTimeText: { fontSize: 12, fontWeight: '700' },
  matchTeams: { flex: 1, gap: 2 },
  matchLeague: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  matchTeamName: { fontSize: 13, fontWeight: '600' },
  matchScore: { fontSize: 14, fontWeight: '800', minWidth: 36, textAlign: 'center' },
});
