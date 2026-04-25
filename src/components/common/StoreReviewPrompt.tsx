import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../hooks/useAppTheme';

interface StoreReviewPromptProps {
  visible: boolean;
  onRate: () => void;
  onLater: () => void;
}

/**
 * Non-intrusive Store Review prompt
 * - Spring animation from bottom
 * - 8 second auto-dismiss
 * - Matches InAppNotificationBanner pattern
 */
export function StoreReviewPrompt({
  visible,
  onRate,
  onLater,
}: StoreReviewPromptProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show: spring from bottom
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 8,
          bounciness: 4,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        dismissPrompt();
      }, 8000);

      return () => clearTimeout(timer);
    } else {
      dismissPrompt();
    }
  }, [visible]);

  const dismissPrompt = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (!visible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [200, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateY }],
          paddingBottom: insets.bottom + 12,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.primary,
          },
        ]}
      >
        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[styles.title, { color: theme.colors.textPrimary }]}
            numberOfLines={2}
          >
            {t('storeReview.title')}
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {t('storeReview.subtitle')}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.laterButton, { borderColor: theme.colors.divider }]}
            onPress={() => {
              dismissPrompt();
              onLater();
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.laterText, { color: theme.colors.textSecondary }]}>
              {t('storeReview.laterButton')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rateButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              dismissPrompt();
              onRate();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.rateText}>{t('storeReview.rateButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    zIndex: 100,
  },
  card: {
    borderRadius: 12,
    borderTopWidth: 3,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  content: {
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  laterButton: {
    flex: 0.4,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rateButton: {
    flex: 0.6,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
