import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../src/hooks/useAppTheme";
import { useMatches } from "../../src/hooks/useMatches";
import { apiService } from "../../src/services/api";
import { useFavoritesStore } from "../../src/stores/favoritesStore";
import { useMatchStore } from "../../src/stores/matchStore";
import { Team } from "../../src/types";

// Popular teams to suggest when favorites are empty
const POPULAR_TEAMS = [
  { id: "645", name: "Galatasaray", logo: "https://media.api-sports.io/football/teams/645.png", country: "TR" },
  { id: "611", name: "Fenerbahce", logo: "https://media.api-sports.io/football/teams/611.png", country: "TR" },
  { id: "549", name: "Beşiktaş", logo: "https://media.api-sports.io/football/teams/549.png", country: "TR" },
  { id: "998", name: "Trabzonspor", logo: "https://media.api-sports.io/football/teams/998.png", country: "TR" },
  { id: "541", name: "Real Madrid", logo: "https://media.api-sports.io/football/teams/541.png", country: "ES" },
  { id: "529", name: "Barcelona", logo: "https://media.api-sports.io/football/teams/529.png", country: "ES" },
  { id: "33", name: "Manchester United", logo: "https://media.api-sports.io/football/teams/33.png", country: "GB" },
  { id: "50", name: "Manchester City", logo: "https://media.api-sports.io/football/teams/50.png", country: "GB" },
  { id: "40", name: "Liverpool", logo: "https://media.api-sports.io/football/teams/40.png", country: "GB" },
  { id: "157", name: "Bayern Munich", logo: "https://media.api-sports.io/football/teams/157.png", country: "DE" },
  { id: "85", name: "PSG", logo: "https://media.api-sports.io/football/teams/85.png", country: "FR" },
  { id: "496", name: "Juventus", logo: "https://media.api-sports.io/football/teams/496.png", country: "IT" },
];

function getTeamInfo(teamId: string, favoriteTeams: any[], popularTeams: typeof POPULAR_TEAMS) {
  return favoriteTeams.find((t) => t.id === teamId) ||
    popularTeams.find((t) => t.id === teamId) ||
    { id: teamId, name: teamId, logo: "" };
}

export default function FavoritesScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { favoriteTeamIds, favoriteTeams, toggleFavorite, isFavorite } = useFavoritesStore();
  const { selectedDate } = useMatchStore();
  const { data: matches = [] } = useMatches(selectedDate);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Team[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let cancelled = false;
    if (searchQuery.trim().length > 2) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      setIsSearching(true);
      const query = searchQuery.trim();
      searchTimeout.current = setTimeout(() => {
        apiService
          .searchTeams(query)
          .then((results) => {
            if (!cancelled) {
              setSearchResults(results);
              setIsSearching(false);
            }
          })
          .catch(() => {
            if (!cancelled) {
              setSearchResults([]);
              setIsSearching(false);
            }
          });
      }, 500);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
    return () => {
      cancelled = true;
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  // Filter matches involving favorite teams
  const favoriteMatches = matches.filter(
    (m) =>
      favoriteTeamIds.includes(m.homeTeam.id) ||
      favoriteTeamIds.includes(m.awayTeam.id),
  );

  const goToTeam = (id: string, name: string, logo: string) => {
    router.push(
      `/team/${id}?name=${encodeURIComponent(name)}&logo=${encodeURIComponent(logo)}`,
    );
  };

  const handleToggleFavorite = (team: { id: string; name: string; logo?: string; logoUrl?: string }) => {
    const logo = team.logo || (team as any).logoUrl || "";
    toggleFavorite(team.id, team.name, logo);
  };

  // Merge search results with popular teams for display
  const displayTeams = searchQuery.length > 2
    ? searchResults.map((t) => ({ id: t.id, name: t.name, logo: t.logoUrl || "" }))
    : POPULAR_TEAMS;

  if (favoriteTeamIds.length === 0) {
    return (
      <ScrollView
        horizontal={false}
        scrollEventThrottle={16}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.emptyContent}
      >
        <Ionicons name="heart-outline" size={48} color={theme.colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
          {t('favorites.title')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          {t('favorites.subtitle')}
        </Text>
        <Text style={[styles.deleteInstruction, { color: theme.colors.textSecondary }]}>
          Favori takımınızı silmek için üstte yer alan alanda takımınıza basılı tutun.
        </Text>

        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.divider },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder={t('favorites.searchPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary + "80"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          
        </View>

        <Text style={[styles.suggestTitle, { color: theme.colors.textSecondary }]}>
          {searchQuery.length > 2 ? t('favorites.searchResults') : t('favorites.popularTeams')}
        </Text>

        <View style={styles.teamsGrid}>
          {displayTeams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={[
                styles.teamChip,
                {
                  backgroundColor: isFavorite(team.id) ? theme.colors.primary + "20" : theme.colors.card,
                  borderColor: isFavorite(team.id) ? theme.colors.primary : theme.colors.divider,
                },
              ]}
              onPress={() => handleToggleFavorite(team)}
              activeOpacity={0.7}
            >
              {team.logo ? (
                <Image source={{ uri: team.logo }} style={styles.teamChipLogo} resizeMode="contain" />
              ) : (
                <View style={[styles.teamChipLogo, { backgroundColor: theme.colors.surfaceVariant }]} />
              )}
              <Text
                style={[
                  styles.teamChipName,
                  { color: isFavorite(team.id) ? theme.colors.primary : theme.colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {team.name}
              </Text>
              <Ionicons
                name={isFavorite(team.id) ? "heart" : "heart-outline"}
                size={16}
                color={isFavorite(team.id) ? theme.colors.primary : theme.colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  const handleAddPress = () => {
    // Scroll to search area and focus input
    scrollRef.current?.scrollToEnd({ animated: true });
    setTimeout(() => searchInputRef.current?.focus(), 300);
  };

  // Has favorites — show their matches
  const allFavTeams = favoriteTeamIds.map((id) => getTeamInfo(id, favoriteTeams, POPULAR_TEAMS));

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.colors.background }]}>
    <ScrollView
      ref={scrollRef}
      horizontal={false}
      scrollEventThrottle={16}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Favorite teams strip */}
      <ScrollView
        horizontal={true}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        style={styles.teamStrip}
        contentContainerStyle={styles.teamStripContent}
      >
        {allFavTeams.map((team) => (
          <TouchableOpacity
            key={team.id}
            style={[styles.teamBubble, { backgroundColor: theme.colors.card }]}
            onPress={() => goToTeam(team.id, team.name, team.logo)}
            onLongPress={() => toggleFavorite(team.id)}
            activeOpacity={0.7}
          >
            {team.logo ? (
              <Image source={{ uri: team.logo }} style={styles.teamBubbleLogo} resizeMode="contain" />
            ) : (
              <View style={[styles.teamBubbleLogo, { backgroundColor: theme.colors.surfaceVariant }]} />
            )}
            <Text
              style={[styles.teamBubbleName, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {team.name}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[
            styles.addBubble,
            { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.divider },
          ]}
          onPress={handleAddPress}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>

      {/* Today's matches for favorite teams */}
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
        {t('favorites.todayMatches')}
      </Text>

      {favoriteMatches.length === 0 ? (
        <View style={[styles.noMatchCard, { backgroundColor: theme.colors.card }]}>
          <Text style={{ fontSize: 32 }}>📅</Text>
          <Text style={[styles.noMatchText, { color: theme.colors.textSecondary }]}>
            {t('favorites.noMatchesToday')}
          </Text>
        </View>
      ) : (
        favoriteMatches.map((match) => (
          <TouchableOpacity
            key={match.id}
            style={[styles.matchRow, { backgroundColor: theme.colors.card }]}
            onPress={() => router.push(`/match/${match.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.matchTeams}>
              <View style={styles.matchTeamRow}>
                <Image source={{ uri: match.homeTeam.logoUrl }} style={styles.matchLogo} resizeMode="contain" />
                <Text
                  style={[styles.matchTeamName, { color: theme.colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {match.homeTeam.name}
                </Text>
                <Text
                  style={[
                    styles.matchScore,
                    { color: match.status === "live" ? theme.colors.liveBadge : theme.colors.textPrimary },
                  ]}
                >
                  {match.homeScore ?? "-"}
                </Text>
              </View>
              <View style={styles.matchTeamRow}>
                <Image source={{ uri: match.awayTeam.logoUrl }} style={styles.matchLogo} resizeMode="contain" />
                <Text
                  style={[styles.matchTeamName, { color: theme.colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {match.awayTeam.name}
                </Text>
                <Text
                  style={[
                    styles.matchScore,
                    { color: match.status === "live" ? theme.colors.liveBadge : theme.colors.textPrimary },
                  ]}
                >
                  {match.awayScore ?? "-"}
                </Text>
              </View>
            </View>
            <View style={[styles.matchMeta, { borderTopColor: theme.colors.divider }]}>
              <Image source={{ uri: match.league.logoUrl }} style={styles.leagueMiniLogo} resizeMode="contain" />
              <Text
                style={[styles.leagueMiniName, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {match.league.name}
              </Text>
              {(match.status === "live" || match.status === "half_time") && (
                <View style={[styles.livePill, { backgroundColor: theme.colors.liveBadge }]}>
                  <Text style={styles.livePillText}>
                    {match.status === "half_time" ? "HT" : `${match.minute}'`}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Search and manage teams */}
      <Text
        style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 20 }]}
      >
        {t('favorites.searchOrEdit')}
      </Text>

      <View
        style={[
          styles.searchContainer,
          {
            marginHorizontal: 12,
            marginBottom: 12,
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.divider,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          ref={searchInputRef}
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          placeholder={t('favorites.searchPlaceholder')}
          placeholderTextColor={theme.colors.textSecondary + "80"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        
      </View>

      <View style={styles.teamsGrid}>
        {displayTeams.map((team) => (
          <TouchableOpacity
            key={team.id}
            style={[
              styles.teamChip,
              {
                backgroundColor: isFavorite(team.id) ? theme.colors.primary + "20" : theme.colors.card,
                borderColor: isFavorite(team.id) ? theme.colors.primary : theme.colors.divider,
              },
            ]}
            onPress={() => handleToggleFavorite(team)}
            activeOpacity={0.7}
          >
            {team.logo ? (
              <Image source={{ uri: team.logo }} style={styles.teamChipLogo} resizeMode="contain" />
            ) : (
              <View style={[styles.teamChipLogo, { backgroundColor: theme.colors.surfaceVariant }]} />
            )}
            <Text
              style={[
                styles.teamChipName,
                { color: isFavorite(team.id) ? theme.colors.primary : theme.colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {team.name}
            </Text>
            <Ionicons
              name={isFavorite(team.id) ? "heart" : "heart-outline"}
              size={16}
              color={isFavorite(team.id) ? theme.colors.primary : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, overflow: "hidden" },
  container: { flex: 1, overflow: "hidden", maxWidth: "100%" },
  content: { paddingBottom: 24 },
   emptyContent: {
    flexGrow: 1, // KİLİTLENMEYİ VE KAYDIRAMAMAYI ÇÖZEN KISIM
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },

  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 8 },
  emptySubtitle: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    marginTop: 16,
    width: "100%",
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 14 },
  suggestTitle: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  teamsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 12,
  },
  teamChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    width: "47%" as any,
  },
  teamChipLogo: { width: 22, height: 22, borderRadius: 4 },
  teamChipName: { flex: 1, fontSize: 12, fontWeight: "500" },
  teamStrip: { maxHeight: 80 },
  teamStripContent: { paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  teamBubble: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    width: 72,
  },
  teamBubbleLogo: { width: 32, height: 32, borderRadius: 4 },
  teamBubbleName: { fontSize: 10, fontWeight: "500", textAlign: "center" },
  addBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    alignSelf: "center",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  noMatchCard: {
    marginHorizontal: 12,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  noMatchText: { fontSize: 13, textAlign: "center" },
  matchRow: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  matchTeams: { padding: 12, gap: 8 },
  matchTeamRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  matchLogo: { width: 24, height: 24, borderRadius: 4 },
  matchTeamName: { flex: 1, fontSize: 13, fontWeight: "500" },
  matchScore: {
    fontSize: 14,
    fontWeight: "700",
    minWidth: 20,
    textAlign: "right",
  },
  matchMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  leagueMiniLogo: { width: 14, height: 14, borderRadius: 3 },
  leagueMiniName: { flex: 1, fontSize: 11 },
  livePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  livePillText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  deleteInstruction: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
    paddingHorizontal: 20,
  },
});
