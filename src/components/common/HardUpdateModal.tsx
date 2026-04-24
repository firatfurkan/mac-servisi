import { useAppTheme } from '../../hooks/useAppTheme';
import { Linking, Modal, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useVersionCheckStore } from '../../stores/versionCheckStore';

interface HardUpdateModalProps {
  visible: boolean;
  message: string;
}

export default function HardUpdateModal({ visible, message }: HardUpdateModalProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { storeUrl } = useVersionCheckStore();

  const getDefaultStoreUrl = (): string => {
    if (Platform.OS === 'ios') {
      return `https://apps.apple.com/app/${Constants.expoConfig?.ios?.bundleIdentifier || 'com.furkanf.asist'}`;
    } else {
      return `https://play.google.com/store/apps/details?id=${Constants.expoConfig?.android?.package || 'com.furkanf.asist'}`;
    }
  };

  const handleOpenStore = async () => {
    try {
      // Firestore'dan gelen URL'i kullan, yoksa fallback URL'i oluştur
      const urlToOpen = storeUrl || getDefaultStoreUrl();
      await Linking.openURL(urlToOpen);
    } catch (error) {
      console.log('Failed to open store:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View
        style={[
          styles.overlay,
          { backgroundColor: 'rgba(0,0,0,0.8)' }
        ]}
      >
        <View
          style={[
            styles.container,
            {
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 20,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.divider,
            }
          ]}
        >
          <MaterialCommunityIcons
            name="cloud-download-outline"
            size={60}
            color={theme.colors.primary}
            style={styles.icon}
          />

          <Text
            style={[
              styles.title,
              { color: theme.colors.textPrimary }
            ]}
          >
            Güncelleme Gerekli
          </Text>

          <Text
            style={[
              styles.message,
              { color: theme.colors.textSecondary }
            ]}
          >
            {message}
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: theme.colors.textSecondary }
            ]}
          >
            En son sürümünü yüklemek için lütfen App/Play Store'a gidin.
          </Text>

          <Pressable
            onPress={handleOpenStore}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed ? 0.8 : 1,
              }
            ]}
          >
            <Text style={[styles.buttonText, { color: '#fff' }]}>
              {Platform.OS === 'ios' ? 'App Store\'a Git' : 'Play Store\'a Git'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
