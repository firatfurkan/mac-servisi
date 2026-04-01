import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

export const AppFooter = () => {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>v.1.0.0</Text>
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>2026 MaçServisi</Text>
      <Text style={[styles.studio, { color: theme.colors.primary }]}>Lionx Studio</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 2,
    opacity: 0.8,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  studio: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
