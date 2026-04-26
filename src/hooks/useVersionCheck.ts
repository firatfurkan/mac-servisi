import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useVersionCheckStore } from '../stores/versionCheckStore';

interface VersionConfig {
  min_version_ios?: string;
  latest_version_ios?: string;
  ios_url?: string;
  min_version_android?: string;
  latest_version_android?: string;
  android_url?: string;
  message?: string;
}

function compareVersions(current: string, required: string): boolean {
  const curr = current.split('.').map(Number);
  const req = required.split('.').map(Number);

  for (let i = 0; i < Math.max(curr.length, req.length); i++) {
    const c = curr[i] || 0;
    const r = req[i] || 0;
    if (c < r) return false;
    if (c > r) return true;
  }
  return true;
}

export function useVersionCheck() {
  const [checked, setChecked] = useState(false);
  const { setHardUpdateNeeded, setMessage, setStoreUrl } = useVersionCheckStore();

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const currentVersion = Constants.expoConfig?.version || '1.0.0';
        const platform = Platform.OS;

        const configRef = doc(db, 'appVersionControl', 'current');
        const configSnap = await getDoc(configRef);

        if (!configSnap.exists()) {
          // Firestore'da config yok → soft update devam et
          setChecked(true);
          return;
        }

        const config = configSnap.data() as VersionConfig;

        // Platform-specific version check
        let minVersion: string | undefined;
        let storeUrl: string | undefined;
        let message = config.message || 'Uygulama güncellemesi gerekli';

        if (platform === 'ios') {
          minVersion = config.min_version_ios;
          storeUrl = config.ios_url;
        } else if (platform === 'android') {
          minVersion = config.min_version_android;
          storeUrl = config.android_url;
        }

        // Hard update check: current < minVersion
        if (minVersion) {
          const isSufficientVersion = compareVersions(currentVersion, minVersion);

          if (!isSufficientVersion) {
            // Hard update gerekli
            setHardUpdateNeeded(true);
            setMessage(message);
            if (storeUrl) {
              setStoreUrl(storeUrl);
            }
          }
        }

        setChecked(true);
      } catch (error) {
        // Firestore error → soft update'e izin ver
        if (__DEV__) console.log('Version check error:', error);
        setChecked(true);
      }
    };

    // Web'de veya Expo Go'da skip et
    if (Platform.OS !== 'web' && Constants.appOwnership !== 'expo') {
      checkVersion();
    } else {
      setChecked(true);
    }
  }, [setHardUpdateNeeded, setMessage, setStoreUrl]);

  return checked;
}
