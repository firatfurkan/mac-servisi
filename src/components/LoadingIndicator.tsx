import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';

interface LoadingIndicatorProps {
  type?: 'linear' | 'circular';
  size?: number;
  strokeWidth?: number;
}

const PRIMARY_COLOR = '#03422d';
const BACKGROUND_COLOR = '#F0F0F0';

// ═════════════════════════════════════════════════════════════
// WEB VERSION - Pure HTML/CSS (No React Native)
// ═════════════════════════════════════════════════════════════

function WebLinearLoadingIndicator() {
  useEffect(() => {
    // Inject CSS keyframes
    const styleId = 'loading-indicator-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes linearSlide {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .loading-linear-bar {
          animation: linearSlide 2.3s infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div
      style={{
        width: '100%',
        paddingVertical: 16,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: 16,
        paddingBottom: 16,
      } as any}
    >
      <div
        style={{
          width: '90%',
          height: 4,
          backgroundColor: BACKGROUND_COLOR,
          borderRadius: 2,
          overflow: 'hidden',
        } as any}
      >
        <div
          className="loading-linear-bar"
          style={{
            width: '30%',
            height: '100%',
            backgroundColor: PRIMARY_COLOR,
            borderRadius: 2,
            boxShadow: `0 0 8px ${PRIMARY_COLOR}`,
          } as any}
        />
      </div>
    </div>
  );
}

function WebCircularLoadingIndicator({
  size = 48,
  strokeWidth = 4,
}: {
  size?: number;
  strokeWidth?: number;
}) {
  useEffect(() => {
    // Inject CSS keyframes
    const styleId = 'loading-circular-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes circularSpin {
          0% {
            transform: rotate(0deg) scale(0.8);
          }
          50% {
            transform: rotate(180deg) scale(1);
          }
          100% {
            transform: rotate(360deg) scale(0.8);
          }
        }

        .loading-circular-spinner {
          animation: circularSpin 1.4s linear infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: size,
        height: size,
      } as any}
    >
      <div
        className="loading-circular-spinner"
        style={{
          position: 'relative',
          width: size,
          height: size,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        } as any}
      >
        {/* Background circle */}
        <div
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            border: `${strokeWidth}px solid ${BACKGROUND_COLOR}`,
          } as any}
        />

        {/* Animated arc */}
        <div
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderTop: `${strokeWidth}px solid ${PRIMARY_COLOR}`,
            borderRight: `${strokeWidth}px solid transparent`,
            borderBottom: `${strokeWidth}px solid transparent`,
            borderLeft: `${strokeWidth}px solid transparent`,
          } as any}
        />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// NATIVE VERSION - Animated API
// ═════════════════════════════════════════════════════════════

function NativeLinearLoadingIndicator() {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });

  return (
    <View style={styles.linearContainer}>
      <View style={styles.linearBackground}>
        <Animated.View
          style={[
            styles.linearBar,
            {
              transform: [{ translateX }],
              opacity,
            },
          ]}
        />
      </View>
    </View>
  );
}

function NativeCircularLoadingIndicator({
  size = 48,
  strokeWidth = 4,
}: {
  size?: number;
  strokeWidth?: number;
}) {
  const rotateValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 0.8,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [rotateValue, scaleValue]);

  const rotation = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.circularContainer, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.circularOuter,
          {
            width: size,
            height: size,
            transform: [{ rotate: rotation }, { scale: scaleValue }],
          },
        ]}
      >
        {/* Background circle */}
        <View
          style={[
            styles.circularBackground,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: BACKGROUND_COLOR,
            },
          ]}
        />

        {/* Animated arc/stroke */}
        <View
          style={[
            styles.circularStroke,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: PRIMARY_COLOR,
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT - Platform-aware
// ═════════════════════════════════════════════════════════════

export default function LoadingIndicator({
  type = 'circular',
  size = 48,
  strokeWidth = 4,
}: LoadingIndicatorProps) {
  const isWeb = Platform.OS === 'web';

  if (type === 'linear') {
    return isWeb ? (
      <WebLinearLoadingIndicator />
    ) : (
      <NativeLinearLoadingIndicator />
    );
  }

  return isWeb ? (
    <WebCircularLoadingIndicator size={size} strokeWidth={strokeWidth} />
  ) : (
    <NativeCircularLoadingIndicator size={size} strokeWidth={strokeWidth} />
  );
}

export { NativeLinearLoadingIndicator, NativeCircularLoadingIndicator };

// ═════════════════════════════════════════════════════════════
// NATIVE STYLES - React Native Only
// ═════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Linear Indicator
  linearContainer: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
  },
  linearBackground: {
    width: '90%',
    height: 4,
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 2,
    overflow: 'hidden',
  },
  linearBar: {
    width: '30%',
    height: '100%',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },

  // Circular Indicator
  circularContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularOuter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularBackground: {
    position: 'absolute',
  },
  circularStroke: {
    position: 'absolute',
  },
});
