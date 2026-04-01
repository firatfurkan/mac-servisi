import React, { useState, useMemo } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../src/hooks/useAppTheme';

interface LeagueItem {
  id: string;
  name: string;
  country: string;
  logo: string;
  flag: string;
  category: 'top5' | 'europe' | 'turkiye' | 'other';
}

const LEAGUES: LeagueItem[] = [
  // Türkiye
  { id: '203', name: 'Trendyol Süper Lig', country: 'Türkiye', logo: 'https://media.api-sports.io/football/leagues/203.png', flag: '🇹🇷', category: 'turkiye' },
  { id: '204', name: 'Trendyol 1. Lig', country: 'Türkiye', logo: 'https://media.api-sports.io/football/leagues/204.png', flag: '🇹🇷', category: 'turkiye' },
  { id: '205', name: 'Nesine 2. Lig', country: 'Türkiye', logo: 'https://media.api-sports.io/football/leagues/205.png', flag: '🇹🇷', category: 'turkiye' },
  { id: '552', name: 'Nesine 3. Lig Grup 1', country: 'Türkiye', logo: 'https://media.api-sports.io/football/leagues/552.png', flag: '🇹🇷', category: 'turkiye' },
  { id: '553', name: 'Nesine 3. Lig Grup 2', country: 'Türkiye', logo: 'https://media.api-sports.io/football/leagues/553.png', flag: '🇹🇷', category: 'turkiye' },
  { id: '554', name: 'Nesine 3. Lig Grup 3', country: 'Türkiye', logo: 'https://media.api-sports.io/football/leagues/554.png', flag: '🇹🇷', category: 'turkiye' },
  { id: '1027', name: 'Nesine 3. Lig Grup 4', country: 'Türkiye', logo: 'https://media.api-sports.io/football/leagues/1027.png', flag: '🇹🇷', category: 'turkiye' },
  { id: '1007', name: '3. Lig Play-off', country: 'Türkiye', logo: 'https://media.api-sports.io/football/leagues/1007.png', flag: '🇹🇷', category: 'turkiye' },
  { id: '206', name: 'Türkiye Kupası', country: 'Türkiye', logo: 'https://media.api-sports.io/football/leagues/206.png', flag: '🇹🇷', category: 'turkiye' },
  { id: '551', name: 'Süper Kupa', country: 'Türkiye', logo: 'https://media.api-sports.io/football/leagues/551.png', flag: '🇹🇷', category: 'turkiye' },
  // Top 5 Leagues
  { id: '39', name: 'Premier League', country: 'İngiltere', logo: 'https://media.api-sports.io/football/leagues/39.png', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', category: 'top5' },
  { id: '140', name: 'La Liga', country: 'İspanya', logo: 'https://media.api-sports.io/football/leagues/140.png', flag: '🇪🇸', category: 'top5' },
  { id: '78', name: 'Bundesliga', country: 'Almanya', logo: 'https://media.api-sports.io/football/leagues/78.png', flag: '🇩🇪', category: 'top5' },
  { id: '135', name: 'Serie A', country: 'İtalya', logo: 'https://media.api-sports.io/football/leagues/135.png', flag: '🇮🇹', category: 'top5' },
  { id: '61', name: 'Ligue 1', country: 'Fransa', logo: 'https://media.api-sports.io/football/leagues/61.png', flag: '🇫🇷', category: 'top5' },
  // European competitions
  { id: '2', name: 'UEFA Champions League', country: 'Avrupa', logo: 'https://media.api-sports.io/football/leagues/2.png', flag: '🏆', category: 'europe' },
  { id: '3', name: 'UEFA Europa League', country: 'Avrupa', logo: 'https://media.api-sports.io/football/leagues/3.png', flag: '🏆', category: 'europe' },
  { id: '848', name: 'UEFA Conference League', country: 'Avrupa', logo: 'https://media.api-sports.io/football/leagues/848.png', flag: '🏆', category: 'europe' },
  // Other popular
  { id: '40', name: 'Championship', country: 'İngiltere', logo: 'https://media.api-sports.io/football/leagues/40.png', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', category: 'other' },
  { id: '79', name: '2. Bundesliga', country: 'Almanya', logo: 'https://media.api-sports.io/football/leagues/79.png', flag: '🇩🇪', category: 'other' },
  { id: '136', name: 'Serie B', country: 'İtalya', logo: 'https://media.api-sports.io/football/leagues/136.png', flag: '🇮🇹', category: 'other' },
  { id: '141', name: 'Segunda División', country: 'İspanya', logo: 'https://media.api-sports.io/football/leagues/141.png', flag: '🇪🇸', category: 'other' },
  { id: '144', name: 'Jupiler Pro League', country: 'Belçika', logo: 'https://media.api-sports.io/football/leagues/144.png', flag: '🇧🇪', category: 'other' },
  { id: '88', name: 'Eredivisie', country: 'Hollanda', logo: 'https://media.api-sports.io/football/leagues/88.png', flag: '🇳🇱', category: 'other' },
  { id: '94', name: 'Primeira Liga', country: 'Portekiz', logo: 'https://media.api-sports.io/football/leagues/94.png', flag: '🇵🇹', category: 'other' },
  { id: '179', name: 'Premiership', country: 'İskoçya', logo: 'https://media.api-sports.io/football/leagues/179.png', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', category: 'other' },
  { id: '71', name: 'Serie A', country: 'Brezilya', logo: 'https://media.api-sports.io/football/leagues/71.png', flag: '🇧🇷', category: 'other' },
  { id: '128', name: 'Liga Profesional', country: 'Arjantin', logo: 'https://media.api-sports.io/football/leagues/128.png', flag: '🇦🇷', category: 'other' },
  { id: '98', name: 'J1 League', country: 'Japonya', logo: 'https://media.api-sports.io/football/leagues/98.png', flag: '🇯🇵', category: 'other' },
  { id: '253', name: 'MLS', country: 'ABD', logo: 'https://media.api-sports.io/football/leagues/253.png', flag: '🇺🇸', category: 'other' },
  { id: '1', name: 'FIFA World Cup', country: 'Dünya', logo: 'https://media.api-sports.io/football/leagues/1.png', flag: '🌍', category: 'europe' },
];

const CATEGORY_KEYS = [
  { key: 'turkiye', i18nKey: 'leagues.turkey' },
  { key: 'top5', i18nKey: 'leagues.top5' },
  { key: 'europe', i18nKey: 'leagues.europe' },
  { key: 'other', i18nKey: 'leagues.other' },
] as const;

export default function LeaguesScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const goToStandings = (league: LeagueItem) => {
    router.push(
      `/standings/${league.id}?name=${encodeURIComponent(league.name)}&logo=${encodeURIComponent(league.logo)}&season=2025`
    );
  };

  const filteredLeagues = useMemo(() => {
    if (!search.trim()) return LEAGUES;
    const q = search.toLowerCase();
    return LEAGUES.filter(
      (l) => l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q)
    );
  }, [search]);

  const groupedByCategory = useMemo(() => {
    const map: Record<string, LeagueItem[]> = {};
    for (const l of filteredLeagues) {
      if (!map[l.category]) map[l.category] = [];
      map[l.category].push(l);
    }
    return map;
  }, [filteredLeagues]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.divider }]}>
        <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
        <TextInput
          placeholder={t('leagues.searchPlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal={false} scrollEventThrottle={16} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {search.trim() ? (
          // Flat filtered list
          filteredLeagues.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {t('leagues.noResults')}
              </Text>
            </View>
          ) : (
            filteredLeagues.map((league) => (
              <TouchableOpacity
                key={league.id}
                style={[styles.leagueRow, { backgroundColor: theme.colors.card }]}
                onPress={() => goToStandings(league)}
                activeOpacity={0.7}
              >
                <Image source={{ uri: league.logo }} style={styles.logo} resizeMode="contain" />
                <View style={styles.info}>
                  <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{league.name}</Text>
                  <Text style={[styles.country, { color: theme.colors.textSecondary }]}>
                    {league.flag} {league.country}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))
          )
        ) : (
          // Categorized list
          CATEGORY_KEYS.map((cat) => {
            const leagues = groupedByCategory[cat.key];
            if (!leagues || leagues.length === 0) return null;
            return (
              <View key={cat.key} style={styles.categorySection}>
                <Text style={[styles.categoryTitle, { color: theme.colors.textSecondary }]}>
                  {t(cat.i18nKey)}
                </Text>
                {leagues.map((league) => (
                  <TouchableOpacity
                    key={league.id}
                    style={[styles.leagueRow, { backgroundColor: theme.colors.card }]}
                    onPress={() => goToStandings(league)}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: league.logo }} style={styles.logo} resizeMode="contain" />
                    <View style={styles.info}>
                      <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{league.name}</Text>
                      <Text style={[styles.country, { color: theme.colors.textSecondary }]}>
                        {league.flag} {league.country}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden", maxWidth: "100%" },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },
  content: { padding: 12, paddingBottom: 24, gap: 6 },
  categorySection: { marginBottom: 8 },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    marginBottom: 8,
    marginTop: 8,
  },
  leagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 6,
  },
  logo: { width: 36, height: 36, borderRadius: 4 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600' },
  country: { fontSize: 12 },
  emptyWrap: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14 },
});
