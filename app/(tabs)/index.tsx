import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { HomeScreenSkeleton } from "../../src/components/common/SkeletonLoader";
import DateStrip from "../../src/components/home/DateStrip";
import LeagueSection from "../../src/components/home/LeagueSection";
import MatchCard from "../../src/components/home/MatchCard";
import SearchBar from "../../src/components/home/SearchBar";
import { AppFooter } from "../../src/components/AppFooter";
import { useAppTheme } from "../../src/hooks/useAppTheme";
import { useMatches } from "../../src/hooks/useMatches";
import { useFavoritesStore } from "../../src/stores/favoritesStore";
import { useMatchStore } from "../../src/stores/matchStore";
import { groupMatchesByLeague, PRIORITY_LEAGUES } from "../../src/utils/matchUtils";

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const theme = useAppTheme();
  const { selectedDate } = useMatchStore();
  const { favoriteTeamIds } = useFavoritesStore();
  const [liveOnly, setLiveOnly] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const {
    data: matches = [],
    isLoading,
    isError,
    refetch,
  } = useMatches(selectedDate);

  const handleManualRefresh = async () => {
    setManualRefreshing(true);
    await refetch();
    setManualRefreshing(false);
  };

  let filtered = liveOnly
    ? matches.filter((m) => m.status === "live" || m.status === "half_time")
    : matches;

  const grouped = groupMatchesByLeague(filtered);

  // Favori maçları ayırıp özel alanda göstereceğiz (asıl listeden silmiyoruz)
  const favoriteMatches = matches.filter(
    (m) =>
      favoriteTeamIds.includes(m.homeTeam.id) ||
      favoriteTeamIds.includes(m.awayTeam.id),
  );

  // Sort leagues: priority leagues first (in order), then rest by start time.
  // Key format: "leagueId" or "leagueId__round".
  // Önce key prefix'ten ID al; bulunamazsa gerçek match.league.id'yi dene (API bazen
  // kupa eleme turlarında farklı ID döner, bu fallback onu yakalar).
  const leagueIdOf = (key: string) => {
    const fromKey = key.split("__")[0];
    if (PRIORITY_LEAGUES.includes(fromKey)) return fromKey;
    const realId = String(grouped[key]?.[0]?.league?.id ?? "");
    return realId || fromKey;
  };

  const sortedLeagueIds = Object.keys(grouped).sort((a, b) => {
    const aPriority = PRIORITY_LEAGUES.indexOf(leagueIdOf(a));
    const bPriority = PRIORITY_LEAGUES.indexOf(leagueIdOf(b));
    const aIsPriority = aPriority !== -1;
    const bIsPriority = bPriority !== -1;

    if (aIsPriority && bIsPriority) return aPriority - bPriority;
    if (aIsPriority) return -1;
    if (bIsPriority) return 1;
    const aFirst = grouped[a][0]?.startTime || "";
    const bFirst = grouped[b][0]?.startTime || "";
    return new Date(aFirst).getTime() - new Date(bFirst).getTime();
  });

  const liveCount = matches.filter(
    (m) => m.status === "live" || m.status === "half_time",
  ).length;


  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <DateStrip />
      <SearchBar matches={matches} />

      {/* Filter bar */}
      <View
        style={[
          styles.filterBar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.divider,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setLiveOnly(!liveOnly)}
          style={[
            styles.liveBtn,
            {
              backgroundColor: liveOnly
                ? theme.colors.liveBadge
                : "transparent",
              borderColor: theme.colors.liveBadge,
            },
          ]}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.liveDot,
              { backgroundColor: liveOnly ? "#fff" : theme.colors.liveBadge },
            ]}
          />
          <Text
            style={[
              styles.liveBtnText,
              { color: liveOnly ? "#fff" : theme.colors.liveBadge },
            ]}
            maxFontSizeMultiplier={1.1}
          >
            {t("home.live")}
            {liveCount > 0 && ` (${liveCount})`}
          </Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {/* Match count summary */}
        <Text
          style={[styles.matchSummary, { color: theme.colors.textSecondary }]}
          maxFontSizeMultiplier={1.1}
        >
          {matches.length} maç
          {liveCount > 0 && ` • ${liveCount} canlı`}
        </Text>
      </View>

      {isLoading ? (
        <HomeScreenSkeleton />
      ) : isError ? (
        <View style={styles.center}>
          <Text
            style={[styles.errorText, { color: theme.colors.textSecondary }]}
          >
            Veriler yüklenirken hata oluştu
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedLeagueIds}
          keyExtractor={(id) => id}
          renderItem={({ item: key }) => {
            const leagueMatches = grouped[key];
            const realLeagueId = key.split("__")[0];

            return (
              <React.Fragment key={key}>
                <LeagueSection
                  leagueId={realLeagueId}
                  leagueName={leagueMatches[0].league.name}
                  leagueLogo={leagueMatches[0].league.logoUrl}
                  leagueCountry={leagueMatches[0].league.country}
                  matches={leagueMatches}
                />
              </React.Fragment>
            );
          }}
          ListHeaderComponent={
            favoriteMatches.length > 0 ? (
              <View style={{ marginBottom: 6 }}>
                <View
                  style={[
                    styles.favoriteHeader,
                    { backgroundColor: theme.colors.primary + "15" },
                  ]}
                >
                  <Ionicons
                    name="star"
                    color={theme.colors.primary}
                    size={14}
                  />
                  <Text
                    style={[
                      styles.favoriteHeaderText,
                      { color: theme.colors.primary },
                    ]}
                    maxFontSizeMultiplier={1.0}
                  >
                    Favori Takımların Maçları
                  </Text>
                </View>
                <View style={{ backgroundColor: theme.colors.card }}>
                  {favoriteMatches.map((match, i) => (
                    <View key={match.id}>
                      {i > 0 && (
                        <View
                          style={[
                            styles.divider,
                            { backgroundColor: theme.colors.divider },
                          ]}
                        />
                      )}
                      <MatchCard match={match} />
                    </View>
                  ))}
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 40 }}>⚽</Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {liveOnly ? t("home.noLiveMatches") : t("home.noMatches")}
              </Text>
            </View>
          }
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          initialNumToRender={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={manualRefreshing}
              onRefresh={handleManualRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
          ListFooterComponent={<AppFooter />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden", maxWidth: "100%" },
  filterBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
  },
  liveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 28,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  list: { flex: 1 },
  listContent: { paddingVertical: 6, paddingBottom: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: { fontSize: 15 },
  matchSummary: { fontSize: 12, fontWeight: "500" },
  errorText: { fontSize: 14 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "600" },
  favoriteHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  favoriteHeaderText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
    opacity: 0.1,
  },
});
