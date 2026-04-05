import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

const isExpoGo = Constants.appOwnership === 'expo';
import { Rajdhani_400Regular, Rajdhani_500Medium, Rajdhani_600SemiBold, Rajdhani_700Bold, useFonts } from '@expo-google-fonts/rajdhani';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';

if (Text.defaultProps == null) Text.defaultProps = {};
Text.defaultProps.maxFontSizeMultiplier = 1.3;
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';
import InAppNotificationBanner, { BannerData, detectNotifType } from '../src/components/common/InAppNotificationBanner';
import BannerAd from '../src/components/ads/BannerAd';
import { LoadingProvider } from '../src/context/LoadingContext';
import { useAppTheme } from '../src/hooks/useAppTheme';
import { useNotifiedMatchTracker } from '../src/hooks/useNotifiedMatchTracker';
import '../src/i18n/config';
import { initSounds } from '../src/services/soundManager';
import { syncPushSubscriptions } from '../src/services/pushService';
import { useFavoritesStore } from '../src/stores/favoritesStore';
import { useNotificationStore } from '../src/stores/notificationStore';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useThemeStore } from '../src/stores/themeStore';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Push notifications from Cloud Function — show alert, play sound
    // Sound is already handled by the OS for push notifications;
    // for foreground, we let the handler play it too
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ONBOARDING_KEY = '@asist_onboarding_done';

export default function RootLayout() {
  const theme = useAppTheme();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [banner, setBanner] = useState<BannerData | null>(null);
  const onboardingChecked = useRef(false);

  const [fontsLoaded, fontsError] = useFonts({
    Rajdhani_400Regular,
    Rajdhani_500Medium,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
  });

  useNotifiedMatchTracker();

  useEffect(() => {
    let sub: any = null;

    const init = async () => {
      const { loadFavorites } = useFavoritesStore.getState();
      const { loadNotifications } = useNotificationStore.getState();
      const { initializeTheme } = useThemeStore.getState();
      const { initializeLanguage } = useSettingsStore.getState();

      // Android notification channels (must exist before first push arrives)
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('match-goal-sound', {
          name: 'Maç Bildirimleri — Gol Sesi',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'gol.mp3',
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0ECDB9',
        }).catch(() => {});
        Notifications.setNotificationChannelAsync('match-alerts', {
          name: 'Maç Bildirimleri — Devre / Başlangıç',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'duduk.wav',
          vibrationPattern: [0, 150, 100, 150],
        }).catch(() => {});
      }

      try {
        // Paralel çalıştır — sıralı await yerine hepsi aynı anda başlar
        await Promise.all([
          initializeTheme(),
          initializeLanguage(),
          loadFavorites(),
          loadNotifications(),
        ]);
        // Sync all stored notification subscriptions to Firestore
        const { notifiedMatches } = useNotificationStore.getState();
        if (notifiedMatches.length > 0) {
          syncPushSubscriptions(
            notifiedMatches.map(m => ({ id: m.id, startTime: m.startTime }))
          ).catch(() => {});
        }
      } catch {}

      // Arka planda çalışacak işlemler — splash screen bunları beklemiyor
      initSounds().catch(() => {});
      if (!isExpoGo && Platform.OS !== 'web') {
        (async () => {
          try {
            const { default: mobileAds } = await import('react-native-google-mobile-ads');
            await mobileAds().initialize();
          } catch {}
        })();
      }

      setReady(true);

      // OTA update check — sadece production build'lerde çalışır
      if (!__DEV__ && Platform.OS !== 'web') {
        Updates.checkForUpdateAsync()
          .then(async ({ isAvailable }) => {
            if (isAvailable) {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            }
          })
          .catch(() => {});
      }

      try {
        if (Platform.OS !== 'web') {
          Notifications.requestPermissionsAsync().catch(() => {});
        }
        // Bildirime dokunulduğunda maç detayına git
        sub = Notifications.addNotificationResponseReceivedListener((response) => {
          const matchId = response.notification.request.content.data?.matchId;
          if (matchId && typeof matchId === 'string') {
            router.push(`/match/${matchId}`);
          }
        });
        // Uygulama ön plandayken gelen bildirimler → in-app banner
        if (Platform.OS !== 'web') {
          Notifications.addNotificationReceivedListener((notification) => {
            const { title, body, data } = notification.request.content;
            if (!title) return;
            setBanner({
              title,
              body: body ?? '',
              matchId: (data?.matchId as string) ?? null,
              type: detectNotifType(title),
            });
          });
        }
      } catch {}
    };

    init();
    return () => { sub?.remove(); };
  }, []);

  // Onboarding kontrolü Stack mount olduktan SONRA çalışır
  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    if (onboardingChecked.current) return;
    onboardingChecked.current = true;

    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((done) => {
        if (!done) router.replace('/onboarding');
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    if ((fontsLoaded || fontsError) && ready) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontsError, ready]);

  if ((!fontsLoaded && !fontsError) || !ready) {
    return (
      <View style={splashStyles.container}>
        <Image
          source={require('../assets/images/app-logo.png')}
          style={splashStyles.logo}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LoadingProvider>
          <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <StatusBar style={theme.dark ? 'light' : 'dark'} />
            <InAppNotificationBanner
              data={banner}
              onDismiss={() => setBanner(null)}
            />
            <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.background },
                animation: 'slide_from_right',
                animationDuration: 200,
                gestureEnabled: true,
                gestureDirection: 'horizontal',
              }}
            >
              <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="match/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="team/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="standings/[leagueId]" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="player/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="legal" options={{ headerShown: false, animation: 'slide_from_right' }} />
            </Stack>
            </View>
            <BannerAd />
          </View>
        </LoadingProvider>
      </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 120,
    height: 120,
  },
});