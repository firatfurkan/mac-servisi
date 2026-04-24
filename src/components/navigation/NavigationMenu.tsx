import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useTranslation } from 'react-i18next';

const MENU_KEYS = [
  { route: 'index',    i18nKey: 'navigation.home',     icon: 'football'    as const, custom: false },
  { route: 'favorites',i18nKey: 'navigation.favorites', icon: 'heart'       as const, custom: false },
  { route: 'analysis', i18nKey: 'navigation.analysis',  icon: 'analytics'   as const, custom: true  },
  { route: 'arena',    i18nKey: 'navigation.arena',     icon: 'game-controller' as const, custom: false },
  { route: 'settings', i18nKey: 'navigation.settings',  icon: 'settings'    as const, custom: false },
];

// Analiz Merkezi ikonu: Maçlar'daki football ile aynı boyut + üstüne trending-up overlay
function AnalysisIcon({ size, color }: { size: number; color: string }) {
  return (
    <View style={{ width: size, height: size }}>
      {/* Football — Maçlar ikonuyla birebir aynı */}
      <Ionicons name="football" size={size} color={color} />
      {/* Trend oku — football'ın renginde overlay */}
      <Ionicons
        name="trending-up"
        size={Math.round(size * 0.75)}
        color={color}
        style={{ position: 'absolute', top: -2, right: -2 }}
      />
    </View>
  );
}

interface NavigationMenuProps {
  children?: React.ReactNode;
}

export default function NavigationMenu({ children }: NavigationMenuProps) {
  const theme = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  const fabTop = insets.top + 8;

  const currentRoute = MENU_KEYS.find((item) => {
    if (item.route === 'index') {
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    }
    return pathname === `/(tabs)/${item.route}` || pathname === `/${item.route}`;
  });

  const handleMenuPress = (route: string) => {
    setVisible(false);
    const path = route === 'index' ? '/(tabs)' : `/(tabs)/${route}`;
    router.push(path as any);
  };

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [visible]);

  return (
    <View style={styles.container}>
      {children}

      {/* Accordion-style FAB with label */}
      <TouchableOpacity
        onPress={() => setVisible(!visible)}
        style={[
          styles.fab,
          { backgroundColor: theme.colors.primary, top: fabTop },
        ]}
        activeOpacity={0.8}
      >
        <Ionicons
          name={visible ? 'close' : 'menu'}
          size={22}
          color="#fff"
        />
        {currentRoute && (
          <Text style={styles.fabLabel}>{t(currentRoute.i18nKey)}</Text>
        )}
        <Ionicons
          name={visible ? 'chevron-up' : 'chevron-down'}
          size={14}
          color="rgba(255,255,255,0.7)"
        />
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={[styles.overlay, { paddingTop: fabTop + 56 }]}
          onPress={() => setVisible(false)}
        >
          <Pressable
            style={[
              styles.menuCard,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Menu Header */}
            <View
              style={[
                styles.menuHeader,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={styles.menuHeaderText}>MaçServisi</Text>
            </View>

            {/* Menu Items */}
            {MENU_KEYS.map((item) => {
              const isActive = currentRoute?.route === item.route;
              return (
                <TouchableOpacity
                  key={item.route}
                  style={[
                    styles.menuItem,
                    {
                      backgroundColor: isActive
                        ? theme.colors.primary + '15'
                        : 'transparent',
                      borderLeftColor: isActive
                        ? theme.colors.primary
                        : 'transparent',
                    },
                  ]}
                  onPress={() => handleMenuPress(item.route)}
                  activeOpacity={0.7}
                >
                  {item.custom
                    ? <AnalysisIcon
                        size={20}
                        color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                      />
                    : <Ionicons
                        name={item.icon}
                        size={20}
                        color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                      />
                  }
                  <Text
                    style={[
                      styles.menuItemLabel,
                      {
                        color: isActive
                          ? theme.colors.primary
                          : theme.colors.textPrimary,
                        fontWeight: isActive ? '700' : '500',
                      },
                    ]}
                  >
                    {t(item.i18nKey)}
                  </Text>
                  {isActive && (
                    <View
                      style={[
                        styles.activeIndicator,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Divider */}
            <View
              style={[
                styles.divider,
                { backgroundColor: theme.colors.divider },
              ]}
            />

            {/* Info Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                v1.1.2
              </Text>
              <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                © 2026 MaçServisi
              </Text>
              <Text style={[styles.studioText, { color: theme.colors.primary }]}>
                Lionx Studio
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 26,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingLeft: 12,
  },
  menuCard: {
    width: 280,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  menuHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuHeaderText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  betaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  betaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 3,
    gap: 12,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 15,
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  divider: {
    height: 1,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
  studioText: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
