import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { memo, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  LayoutAnimation,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useRoundFixtures } from "../../hooks/useRoundFixtures";
import { Match } from "../../types";
import {
  getFirstLegRound,
  isKnockoutRound,
  isSecondLeg,
  isSingleLegKnockout,
  translateRound,
} from "../../utils/matchUtils";
import MatchCard from "./MatchCard";

interface Props {
  leagueName: string;
  leagueLogo: string;
  leagueCountry: string;
  leagueId: string;
  matches: Match[];
}

function LeagueSection({
  leagueName,
  leagueLogo,
  leagueCountry,
  leagueId,
  matches,
}: Props) {
  const theme = useAppTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const liveCount = matches.filter(
    (m) => m.status === "live" || m.status === "half_time",
  ).length;

  // Round label — use the first match's round; show if it's a knockout round
  const round = matches[0]?.league?.round;
  const roundLabel = round ? translateRound(round, i18n.language) : "";
  const showRound = !!roundLabel && isKnockoutRound(round);

  // İki bacaklı eleme turlarında paired maçı bul (1st/2nd leg eşleşmesi)
  const season = matches[0]?.league?.season ?? "";
  const isTwoLeggedKnockout = isKnockoutRound(round) && !isSingleLegKnockout(round);
  const is2ndLegRound = isSecondLeg(round);
  const pairedRound = isTwoLeggedKnockout
    ? (is2ndLegRound ? getFirstLegRound(round!) : (round ?? ""))
    : "";

  const { data: roundFixtures = [] } = useRoundFixtures(
    leagueId,
    season,
    pairedRound,
    isTwoLeggedKnockout && !!pairedRound,
  );

  // matchId → paired leg maçı
  const pairedMatchMap = useMemo(() => {
    const map = new Map<string, Match>();
    if (!isTwoLeggedKnockout || roundFixtures.length === 0) return map;
    for (const match of matches) {
      const teamIds = new Set([match.homeTeam.id, match.awayTeam.id]);
      const paired = roundFixtures.find(
        (f) => f.id !== match.id &&
               teamIds.has(f.homeTeam.id) &&
               teamIds.has(f.awayTeam.id),
      );
      if (paired) map.set(match.id, paired);
    }
    return map;
  }, [matches, roundFixtures, isTwoLeggedKnockout]);

   const goToStandings = () => {
    const matchSeason = matches[0]?.league?.season;
    const currentSeason = matchSeason || String(new Date().getFullYear() - 1);

    // TFF 2. Lig: Beyaz/Kırmızı grup bilgisini URL'e ekle
    let groupParam = "";
    if (leagueId === "205") {
      if (leagueName.includes("Beyaz")) groupParam = "&group=beyaz";
      else if (leagueName.includes("rmizi")) groupParam = "&group=kirmizi"; // Kırmızı veya Kirmizi
    }

    router.push(
      `/standings/${leagueId}?name=${encodeURIComponent(leagueName)}&logo=${encodeURIComponent(leagueLogo)}&season=${currentSeason}${groupParam}`,
    );
  };


  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: "#15ab6f",
          },
        ]}
      >
        {/* League name — tappable → standings */}
        <TouchableOpacity
          style={styles.leaguePress}
          onPress={goToStandings}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: leagueLogo }}
            style={styles.leagueLogo}
            resizeMode="contain"
          />
          <View style={styles.leagueInfo}>
            <Text
              style={[styles.leagueName, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.1}
            >
              {leagueName}
            </Text>
            {showRound ? (
              <View style={[styles.roundBadge, {
                backgroundColor: isKnockoutRound(round)
                  ? theme.colors.primary + "20"
                  : theme.colors.divider + "60",
              }]}>
                <Text
                  style={[styles.roundText, {
                    color: isKnockoutRound(round)
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                  }]}
                  maxFontSizeMultiplier={1.0}
                >
                  {roundLabel}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.countryName,
                  { color: theme.dark ? "#FFFFFF" : "#000000" },
                ]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.1}
              >
                {leagueCountry}
              </Text>
            )}
          </View>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={theme.colors.primary}
            style={{ marginRight: 4 }}
          />
        </TouchableOpacity>

        {liveCount > 0 && (
          <View
            style={[
              styles.liveBadge,
              { backgroundColor: theme.colors.liveBadge + "20" },
            ]}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: theme.colors.liveBadge,
              }}
            />
            <Text
              style={[styles.liveBadgeText, { color: theme.colors.liveBadge }]}
              maxFontSizeMultiplier={1.0}
            >
              {liveCount}
            </Text>
          </View>
        )}

        {/* Collapse toggle */}
        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            setCollapsed(!collapsed);
          }}
          activeOpacity={0.7}
          style={styles.chevronWrap}
        >
          <Ionicons
            name={collapsed ? "chevron-down" : "chevron-up"}
            size={16}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {!collapsed && (
        <View
          style={[styles.matchList, { backgroundColor: theme.colors.card }]}
        >
          {matches.map((match, index) => (
            <View key={match.id ?? `match-${index}`}>
              {index > 0 && (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.divider },
                  ]}
                />
              )}
              <MatchCard
                match={match}
                pairedMatch={pairedMatchMap.get(match.id)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default memo(LeagueSection);

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
    overflow: "hidden",
    maxWidth: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 36,
    gap: 4,
  },
  leaguePress: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  leagueLogo: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  leagueInfo: {
    flex: 1,
  },
  leagueName: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  countryName: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    opacity: 1,
    marginTop: 0,
  },
  roundBadge: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginTop: 2,
  },
  roundText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  chevronWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 4,
  },
  matchList: {
    borderRadius: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
    opacity: 0.08,
  },
});
