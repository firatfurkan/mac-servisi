import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, TextInput, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../src/hooks/useAppTheme';
import { useFavoritesStore } from '../src/stores/favoritesStore';
import { useThemeStore } from '../src/stores/themeStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { apiService } from '../src/services/api';
import { Team } from '../src/types';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = '@asist_onboarding_done';
const POPULAR_TEAMS = [
  { id: '645', name: 'Galatasaray' },
  { id: '611', name: 'Fenerbahçe' },
  { id: '549', name: 'Beşiktaş' },
  { id: '998', name: 'Trabzonspor' },
  { id: '50', name: 'Man City' },
  { id: '40', name: 'Liverpool' },
  { id: '42', name: 'Arsenal' },
  { id: '541', name: 'Real Madrid' },
  { id: '529', name: 'Barcelona' },
  { id: '157', name: 'Bayern' },
  { id: '489', name: 'Milan' },
  { id: '85', name: 'PSG' },
];
export default function OnboardingScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const { favoriteTeamIds, toggleFavorite } = useFavoritesStore();
  const { mode, setMode } = useThemeStore();
  const { language, setLanguage } = useSettingsStore();
  // Team search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Team[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await apiService.searchTeams(text);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  }, []);
  const goNext = () => {
    if (page < 2) {
      scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * (page + 1), animated: true });
      setPage(page + 1);
    } else {
      finishOnboarding();
    }
  };
  const finishOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)');
  };
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        ref={scrollRef}
        horizontal={true}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
      >
        {/* Page 1: Welcome */}
        <View style={[styles.page, { width: SCREEN_WIDTH, paddingTop: insets.top + 24 }]}>
          <View style={styles.welcomeContent}>
            <Text style={{ fontSize: 64 }}>⚽</Text>
            <Text style={[styles.welcomeTitle, { color: theme.colors.textPrimary }]}>
              {t('onboarding.welcomeTitle')}
            </Text>
            <Text style={[styles.welcomeDesc, { color: theme.colors.textSecondary }]}>
              {t('onboarding.welcomeDesc')}
            </Text>
          </View>
        </View>
        {/* Page 2: Favorite teams */}
        <View style={[styles.page, { width: SCREEN_WIDTH, paddingTop: insets.top + 24 }]}>
          <Text style={[styles.pageTitle, { color: theme.colors.textPrimary }]}>
            {t('onboarding.selectTeams')}
          </Text>
          <Text style={[styles.pageDesc, { color: theme.colors.textSecondary }]}>
            {t('onboarding.selectTeamsDesc')}
          </Text>
          {/* Search input */}
          <View style={[styles.searchBox, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.textPrimary }]}
              placeholder={t('onboarding.searchTeam')}
              placeholderTextColor={theme.colors.textSecondary + '80'}
              value={searchQuery}
              onChangeText={handleSearch}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          {/* Search results */}
          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.slice(0, 6).map((team) => {
                const selected = favoriteTeamIds.includes(team.id);
                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[
                      styles.searchResultItem,
                      { backgroundColor: selected ? theme.colors.primary + '20' : theme.colors.surfaceVariant },
                      selected && { borderColor: theme.colors.primary, borderWidth: 1.5 },
                    ]}
                    onPress={() => toggleFavorite(team.id)}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: team.logoUrl }} style={styles.searchResultLogo} resizeMode="contain" />
                    <Text style={[styles.searchResultName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {team.name}
                    </Text>
                    {selected && <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <ScrollView horizontal={false} scrollEventThrottle={16} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.teamsGrid}>
            {POPULAR_TEAMS.map((team) => {
              const selected = favoriteTeamIds.includes(team.id);
              return (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamItem,
                    { backgroundColor: selected ? theme.colors.primary + '20' : theme.colors.surfaceVariant },
                    selected && { borderColor: theme.colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => toggleFavorite(team.id)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: `https://media.api-sports.io/football/teams/${team.id}.png` }}
                    style={styles.teamLogo}
                    resizeMode="contain"
                  />
                  <Text style={[styles.teamName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {team.name}
                  </Text>
                  {selected && (
                    <View style={[styles.checkBadge, { backgroundColor: theme.colors.primary }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          </ScrollView>
        </View>
        {/* Page 3: Theme & Language */}
        <View style={[styles.page, { width: SCREEN_WIDTH, paddingTop: insets.top + 24 }]}>
          <Text style={[styles.pageTitle, { color: theme.colors.textPrimary }]}>
            {t('onboarding.setPreferences')}
          </Text>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>{t('settings.theme')}</Text>
          <View style={styles.optionRow}>
            {(['light', 'dark', 'system'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.optionBtn,
                  { backgroundColor: mode === m ? theme.colors.primary : theme.colors.surfaceVariant },
                ]}
                onPress={() => setMode(m)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={m === 'light' ? 'sunny' : m === 'dark' ? 'moon' : 'phone-portrait-outline'}
                  size={18}
                  color={mode === m ? '#fff' : theme.colors.textPrimary}
                />
                <Text style={[styles.optionText, { color: mode === m ? '#fff' : theme.colors.textPrimary }]}>
                  {m === 'light' ? t('settings.themeLight') : m === 'dark' ? t('settings.themeDark') : t('settings.themeSystem')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary, marginTop: 24 }]}>{t('settings.language')}</Text>
          <View style={styles.optionRow}>
            {(['tr', 'en'] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.optionBtn,
                  { backgroundColor: language === lang ? theme.colors.primary : theme.colors.surfaceVariant },
                ]}
                onPress={() => setLanguage(lang)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 20 }}>{lang === 'tr' ? '🇹🇷' : '🇬🇧'}</Text>
                <Text style={[styles.optionText, { color: language === lang ? '#fff' : theme.colors.textPrimary }]}>
                  {lang === 'tr' ? 'Türkçe' : 'English'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
      {/* Bottom navigation */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Page dots */}
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === page ? theme.colors.primary : theme.colors.divider },
                i === page && styles.dotActive,
              ]}
            />
          ))}
        </View>
        <View style={styles.bottomBtns}>
          {page < 2 && (
            <TouchableOpacity onPress={finishOnboarding} activeOpacity={0.7}>
              <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>{t('onboarding.skip')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: theme.colors.primary }]}
            onPress={goNext}
            activeOpacity={0.7}
          >
            <Text style={styles.nextBtnText}>
              {page === 2 ? t('onboarding.start') : t('onboarding.next')}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  page: {
    flex: 1,
    paddingHorizontal: 24,
  },
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 120,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  welcomeDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  pageDesc: {
    fontSize: 14,
    marginBottom: 24,
  },
  teamsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  teamItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
    position: 'relative',
  },
  teamLogo: { width: 36, height: 36 },
  teamName: { fontSize: 11, fontWeight: '600' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchResults: {
    gap: 6,
    marginBottom: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 10,
  },
  searchResultLogo: { width: 24, height: 24 },
  searchResultName: { flex: 1, fontSize: 13, fontWeight: '600' },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
  },
  bottomBtns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginLeft: 'auto',
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
