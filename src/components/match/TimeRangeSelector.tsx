import React, { useRef, useCallback } from 'react';
import { View, Text, PanResponder, StyleSheet, LayoutChangeEvent, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';

interface Props {
  startMinute: number;
  endMinute: number;
  maxMinute?: number;
  step?: number;
  onChangeStart: (value: number) => void;
  onChangeEnd: (value: number) => void;
  onReset?: () => void;
}

export default function TimeRangeSelector({
  startMinute,
  endMinute,
  maxMinute = 90,
  step = 5,
  onChangeStart,
  onChangeEnd,
  onReset,
}: Props) {
  const theme = useAppTheme();
  const trackWidth = useRef(0);
  const trackPageX = useRef(0);
  const startRef = useRef(startMinute);
  const endRef = useRef(endMinute);
  startRef.current = startMinute;
  endRef.current = endMinute;

  const isFullMatch = startMinute === 0 && endMinute === maxMinute;

  const snap = (val: number) => Math.round(val / step) * step;

  const minuteFromPageX = (pageX: number) => {
    const ratio = Math.max(0, Math.min(1, (pageX - trackPageX.current) / trackWidth.current));
    return snap(ratio * maxMinute);
  };

  const startResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (evt) => {
        const minute = minuteFromPageX(evt.nativeEvent.pageX);
        const clamped = Math.max(0, Math.min(endRef.current - step, minute));
        onChangeStart(clamped);
      },
    }),
  ).current;

  const endResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (evt) => {
        const minute = minuteFromPageX(evt.nativeEvent.pageX);
        const clamped = Math.max(startRef.current + step, Math.min(maxMinute, minute));
        onChangeEnd(clamped);
      },
    }),
  ).current;

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    trackWidth.current = width;
    (e.target as any)?.measure?.(
      (_x: number, _y: number, _w: number, _h: number, pageX: number) => {
        trackPageX.current = pageX;
      },
    );
  }, []);

  const handleTrackPress = useCallback((evt: any) => {
    const pageX = evt.nativeEvent.pageX;
    const minute = minuteFromPageX(pageX);
    const distToStart = Math.abs(minute - startRef.current);
    const distToEnd = Math.abs(minute - endRef.current);
    if (distToStart < distToEnd) {
      onChangeStart(Math.max(0, Math.min(endRef.current - step, minute)));
    } else {
      onChangeEnd(Math.max(startRef.current + step, Math.min(maxMinute, minute)));
    }
  }, []);

  const startPct = (startMinute / maxMinute) * 100;
  const endPct = (endMinute / maxMinute) * 100;

  const markers = maxMinute > 90
    ? [0, 15, 30, 45, 60, 75, 90, 105, 120]
    : [0, 15, 30, 45, 60, 75, 90];

  const handleReset = () => {
    onChangeStart(0);
    onChangeEnd(maxMinute);
    onReset?.();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textSecondary }]}>
          Zaman Araligi
        </Text>
        <Text style={[styles.rangeText, { color: theme.colors.primary }]}>
          {startMinute}' - {endMinute}'
        </Text>
      </View>

      {/* Slider */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTrackPress}
        style={styles.sliderTouchArea}
      >
        <View style={styles.sliderArea}>
          <View
            style={[styles.track, { backgroundColor: theme.colors.divider + '40' }]}
            onLayout={onTrackLayout}
          >
            <View
              style={[
                styles.fill,
                {
                  left: `${startPct}%`,
                  width: `${endPct - startPct}%`,
                  backgroundColor: theme.colors.primary,
                },
              ]}
            />
            {markers.map((m) => (
              <View
                key={m}
                style={[
                  styles.marker,
                  { left: `${(m / maxMinute) * 100}%`, backgroundColor: theme.colors.textSecondary + '60' },
                ]}
              />
            ))}
          </View>

          {/* Başlangıç thumb */}
          <View
            {...startResponder.panHandlers}
            style={[
              styles.thumbHitArea,
              { left: `${startPct}%` },
            ]}
          >
            <View
              style={[
                styles.thumb,
                {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.card,
                },
              ]}
            />
          </View>

          {/* Bitiş thumb */}
          <View
            {...endResponder.panHandlers}
            style={[
              styles.thumbHitArea,
              { left: `${endPct}%` },
            ]}
          >
            <View
              style={[
                styles.thumb,
                {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.card,
                },
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Dakika etiketleri + Tüm Maç butonu */}
      <View style={styles.bottomRow}>
        <View style={styles.labelsWrapper}>
          {markers.map((m) => (
            <Text
              key={m}
              style={[
                styles.label,
                { left: `${(m / maxMinute) * 100}%`, color: theme.colors.textSecondary },
              ]}
            >
              {m}'
            </Text>
          ))}
        </View>
        {!isFullMatch && (
          <TouchableOpacity
            onPress={handleReset}
            style={[styles.resetBtn, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.7}
          >
            <Text style={styles.resetText}>Tum Mac</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const THUMB_SIZE = 22;
const HIT_AREA = 40;

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rangeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sliderTouchArea: {
    paddingVertical: 8,
  },
  sliderArea: {
    height: HIT_AREA,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderRadius: 3,
  },
  marker: {
    position: 'absolute',
    top: 0,
    width: 1,
    height: '100%',
  },
  thumbHitArea: {
    position: 'absolute',
    width: HIT_AREA,
    height: HIT_AREA,
    marginLeft: -HIT_AREA / 2,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 3,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  labelsWrapper: {
    flex: 1,
    position: 'relative',
    height: 16,
  },
  label: {
    position: 'absolute',
    fontSize: 9,
    transform: [{ translateX: -8 }],
  },
  resetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  resetText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
