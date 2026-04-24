import React from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ValueQuizGame from '../../src/components/game/ValueQuizGame';
import { useAppTheme } from '../../src/hooks/useAppTheme';

export default function ArenaScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />

      <View style={styles.gameArea}>
        <ValueQuizGame theme={theme} />
      </View>

     
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gameArea: {
    flex: 1,
  },
  adContainer: {
    paddingBottom: Platform.OS === 'web' ? 0 : 0,
  },
});
