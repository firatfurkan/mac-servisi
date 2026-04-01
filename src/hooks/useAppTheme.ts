import { useColorScheme } from 'react-native';
import { useThemeStore } from '../stores/themeStore';
import { darkTheme, lightTheme } from '../theme/tokens';

export function useAppTheme() {
  const systemScheme = useColorScheme();
  const { mode } = useThemeStore();

  const activeScheme = mode === 'system' ? (systemScheme ?? 'light') : mode;
  return activeScheme === 'dark' ? darkTheme : lightTheme;
}
