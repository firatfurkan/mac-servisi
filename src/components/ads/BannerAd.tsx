import React, { useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { BannerAd as GoogleBannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAppTheme } from '../../hooks/useAppTheme';

const TEST_MODE = false;

const TEST_BANNER_ID  = 'ca-app-pub-3940256099942544/2934735716';
const PROD_BANNER_ID_IOS     = 'ca-app-pub-3272601063768123/7285040449';
const PROD_BANNER_ID_ANDROID = 'ca-app-pub-3272601063768123/1426051949';

const PROD_BANNER_ID = Platform.OS === 'android' ? PROD_BANNER_ID_ANDROID : PROD_BANNER_ID_IOS;
const AD_UNIT_ID = TEST_MODE ? TEST_BANNER_ID : PROD_BANNER_ID;

export default function BannerAd() {
  const theme = useAppTheme();
  const [adFailed, setAdFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAdFailedToLoad = (error: any) => {
    const msg = error?.message || String(error);
    setErrorMsg(msg);
    setAdFailed(true);
  };

  if (adFailed) {
    // TEST_MODE'da hata görünür — production'da gizle
    if (!TEST_MODE) return null;
    return (
      <View style={[styles.errorBox, { borderColor: theme.colors.primary }]}>
        <Text style={{ color: 'red', fontSize: 10 }}>AdMob hata: {errorMsg}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
        },
      ]}
    >
      <GoogleBannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdFailedToLoad={handleAdFailedToLoad}
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
  errorBox: {
    width: '100%',
    padding: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
});
