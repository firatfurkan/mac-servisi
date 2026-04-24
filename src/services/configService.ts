import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface AppConfig {
  min_version: string;
  update_url: string;
  force_update: boolean;
}

export const checkVersion = async (): Promise<{ isOld: boolean; updateUrl: string }> => {
  try {
    const configDoc = await getDoc(doc(db, 'settings', 'app_config'));
    
    if (!configDoc.exists()) {
      return { isOld: false, updateUrl: '' };
    }

    const data = configDoc.data();
    const currentVersion = Constants.expoConfig?.version || '1.0.0';
    
    const minVersion = Platform.OS === 'ios' 
      ? data.min_ios_version 
      : data.min_android_version;
    
    const updateUrl = Platform.OS === 'ios'
      ? data.update_url_ios || 'https://apps.apple.com/app/id6739194200'
      : data.update_url_android || 'https://play.google.com/store/apps/details?id=com.furkanf.asist';

    // Simple version comparison (e.g., "1.1.3" vs "1.1.4")
    // This handles basic semver comparison
    const isOld = compareVersions(currentVersion, minVersion) < 0;

    return { isOld, updateUrl };
  } catch (error) {
    console.error('Version check failed:', error);
    return { isOld: false, updateUrl: '' };
  }
};

/**
 * Compares two version strings.
 * Returns 1 if v1 > v2
 * Returns -1 if v1 < v2
 * Returns 0 if v1 == v2
 */
function compareVersions(v1: string, v2: string) {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const p1 = v1Parts[i] || 0;
    const p2 = v2Parts[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}
