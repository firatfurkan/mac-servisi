import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/useAppTheme';

const isExpoGo = Constants.appOwnership === 'expo';

const TEST_MODE = false;

const TEST_BANNER_ID         = 'ca-app-pub-3940256099942544/2934735716';
const PROD_BANNER_ID_IOS     = 'ca-app-pub-3272601063768123/7285040449';
const PROD_BANNER_ID_ANDROID = 'ca-app-pub-3272601063768123/1426051949';

const PROD_BANNER_ID = Platform.OS === 'android' ? PROD_BANNER_ID_ANDROID : PROD_BANNER_ID_IOS;
const AD_UNIT_ID = TEST_MODE ? TEST_BANNER_ID : PROD_BANNER_ID;

export default function BannerAd() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [adFailed, setAdFailed] = useState(false);
  const [modules, setModules] = useState<{ BannerAd: any; BannerAdSize: any } | null>(null);

  useEffect(() => {
    if (isExpoGo || Platform.OS === 'web') return;
    import('react-native-google-mobile-ads')
      .then(({ BannerAd: NativeBannerAd, BannerAdSize }) => {
        setModules({ BannerAd: NativeBannerAd, BannerAdSize });
      })
      .catch(() => setAdFailed(true));
  }, []);

  if (isExpoGo || Platform.OS === 'web') return null;
  if (adFailed || !modules) return null;

  const { BannerAd: NativeBannerAd, BannerAdSize } = modules;

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <NativeBannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setAdFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    minHeight: 58,
  },
});
