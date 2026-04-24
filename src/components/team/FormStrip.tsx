import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from 'react-i18next';
import { Match } from '../../types';
import { getMatchResultForTeam } from '../../utils/matchUtils';

interface Props {
  teamId: string;
  matches: Match[];
}

function FormStrip({ teamId, matches }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  // Get last 5 finished matches sorted by most recent first
  const finished = matches
    .filter(m => m.status === 'finished')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 5)
    .reverse();

  if (finished.length === 0) return null;

  const colorMap = { W: '#00C851', D: '#FFBB33', L: '#FF4444' };
  const labelMap = { W: t('team.win'), D: t('team.draw'), L: t('team.loss') };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('matchDetail.form')}</Text>
      <View style={styles.dots}>
        {finished.map((m, i) => {
          const result = getMatchResultForTeam(m, teamId) ?? 'D';
          return (
            <View key={m.id} style={[styles.dot, { backgroundColor: colorMap[result] }]}>
              <Text style={styles.dotText}>{labelMap[result]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default memo(FormStrip);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
});
