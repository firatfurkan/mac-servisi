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
import { Team } from '../../types';

// ─── Full-screen search overlay ───────────────────────────────────────────────
function SearchOverlay({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
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
    if (visible) {
      setQuery('');
      setTeams([]);
      setSearched(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    // Türkçe karakterleri ASCII'ye çevir — API-Sports Türkçe karakterleri tanımıyor
    const ascii = trimmed
      .replace(/[ğ]/gi, 'g')
      .replace(/[ü]/gi, 'u')
      .replace(/[ş]/gi, 's')
      .replace(/[ı]/g, 'i').replace(/[İ]/g, 'I')
      .replace(/[ö]/gi, 'o')
      .replace(/[ç]/gi, 'c');

    if (trimmed.length < 3) {
      setTeams([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Önce takımları getir, sonra oyuncuları — rate limit'i aşmamak için sıralı
      const teamResults = await apiService.searchTeams(ascii).catch(() => [] as Team[]);
      setTeams(teamResults.slice(0, 8));
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 450);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  const handleSelectTeam = (team: Team) => {
    onClose();
    router.push(`/team/${team.id}`);
  };

  const hasResults = teams.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>

        {/* ─── Üst bar ─── */}
        <View style={[styles.overlayHeader, { borderBottomColor: theme.colors.divider }]}>
          <View style={[styles.overlayInput, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
            <TextInput
              ref={inputRef}
              style={[styles.overlayTextInput, { color: theme.colors.textPrimary }]}
              placeholder="Takım ara..."
              placeholderTextColor={theme.colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={Keyboard.dismiss}
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

        {/* ─── İçerik ─── */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>Aranıyor...</Text>
          </View>
        ) : searched && !hasResults ? (
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
          <ScrollView
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          >
            {teams.map((team) => (
              <TouchableOpacity
                key={team.id}
                style={[styles.row, { borderBottomColor: theme.colors.divider }]}
                onPress={() => handleSelectTeam(team)}
                activeOpacity={0.7}
              >
                {team.logoUrl ? (
                  <Image source={{ uri: team.logoUrl }} style={styles.teamLogo} resizeMode="contain" />
                ) : (
                  <View style={[styles.teamLogo, { backgroundColor: theme.colors.surface, borderRadius: 6 }]} />
                )}
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

// ─── Ana arama çubuğu (sadece açma tetikleyicisi) ─────────────────────────────
function SearchBar() {
  const theme = useAppTheme();
  const [overlayVisible, setOverlayVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setOverlayVisible(true)}
        style={[styles.container, { backgroundColor: '#03422d', borderColor: '#045e41' }]}
      >
        <Ionicons name="search" size={18} color="#ffffff" />
        <Text style={styles.placeholderText}>Takım ara...</Text>
      </TouchableOpacity>

      <SearchOverlay
        visible={overlayVisible}
        onClose={() => setOverlayVisible(false)}
      />
    </>
  );
}

export default memo(SearchBar);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
  },
  placeholderText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  // ─── Overlay ───
  overlay: {
    flex: 1,
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  overlayInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  overlayTextInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  cancelBtn: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 60,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '500',
  },
  hintText: {
    fontSize: 13,
    opacity: 0.7,
  },
  // ─── Satır ───
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  teamLogo: {
    width: 36,
    height: 36,
  },
  playerPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  rowName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
