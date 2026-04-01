import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';

interface Props {
  label: string;
  homeValue: number;
  awayValue: number;
  isPercentage?: boolean;
}

export default function StatBar({ label, homeValue, awayValue, isPercentage }: Props) {
  const theme = useAppTheme();
  const total = homeValue + awayValue || 1;
  const homeWidth = (homeValue / total) * 100;
  const awayWidth = (awayValue / total) * 100;
  const homeWins = homeValue > awayValue;
  const awayWins = awayValue > homeValue;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.row}>
        <Text style={[
          styles.value,
          { color: homeWins ? theme.colors.primary : theme.colors.textPrimary },
          homeWins && { fontWeight: '800' },
        ]}>
          {isPercentage ? `${homeValue}%` : homeValue}
        </Text>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
        <Text style={[
          styles.value,
          { color: awayWins ? theme.colors.primary : theme.colors.textPrimary },
          awayWins && { fontWeight: '800' },
        ]}>
          {isPercentage ? `${awayValue}%` : awayValue}
        </Text>
      </View>
      <View style={styles.barContainer}>
        <View style={[styles.barRow, { backgroundColor: theme.colors.divider + '40' }]}>
          <View
            style={[
              styles.barHome,
              {
                width: `${homeWidth}%`,
                backgroundColor: homeWins ? theme.colors.primary : theme.colors.textSecondary + '60',
              },
            ]}
          />
          <View
            style={[
              styles.barAway,
              {
                width: `${awayWidth}%`,
                backgroundColor: awayWins ? theme.colors.primary : theme.colors.textSecondary + '60',
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    width: 44,
    textAlign: 'center',
  },
  barContainer: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barRow: {
    flexDirection: 'row',
    flex: 1,
    borderRadius: 3,
  },
  barHome: {
    height: '100%',
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  barAway: {
    height: '100%',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
});
