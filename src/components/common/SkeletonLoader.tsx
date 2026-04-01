import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width, height, borderRadius = 4, style }: SkeletonProps) {
  const theme = useAppTheme();
  const opacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.65, duration: 1000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.dark ? '#3A3A3A' : '#E0E0E0',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function MatchCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.teamSide}>
        <Skeleton width={28} height={28} borderRadius={6} />
        <Skeleton width={80} height={13} />
      </View>
      <View style={styles.center}>
        <Skeleton width={50} height={15} />
      </View>
      <View style={[styles.teamSide, { justifyContent: 'flex-end' }]}>
        <Skeleton width={80} height={13} />
        <Skeleton width={28} height={28} borderRadius={6} />
      </View>
    </View>
  );
}

export function LeagueSectionSkeleton() {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <View style={[styles.header, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Skeleton width={28} height={28} borderRadius={8} />
        <View style={{ flex: 1, gap: 5 }}>
          <Skeleton width={130} height={13} />
          <Skeleton width={70} height={11} />
        </View>
      </View>
      <View style={{ backgroundColor: theme.colors.card }}>
        <MatchCardSkeleton />
        <MatchCardSkeleton />
        <MatchCardSkeleton />
      </View>
    </View>
  );
}

export function HomeScreenSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <LeagueSectionSkeleton />
      <LeagueSectionSkeleton />
      <LeagueSectionSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 13,
    gap: 6,
  },
  teamSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  center: {
    width: 80,
    alignItems: 'center',
  },
  section: {
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  skeletonContainer: {
    paddingVertical: 6,
  },
});
