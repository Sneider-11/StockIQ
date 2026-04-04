/**
 * Shimmer.tsx
 * Skeleton loader con animación de pulso para estados de carga.
 * Uso:
 *   <Shimmer width={200} height={16} />
 *   <ShimmerCard />   — layout pre-armado de tarjeta
 *   <ShimmerRow />    — fila con avatar + líneas de texto
 */
import React, { useRef, useEffect } from 'react';
import { View, Animated, ViewStyle } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

// ── Átomo ─────────────────────────────────────────────────────────────────────
interface ShimmerProps {
  width?:        number | `${number}%`;
  height?:       number;
  borderRadius?: number;
  style?:        ViewStyle;
}

export const Shimmer: React.FC<ShimmerProps> = ({
  width        = '100%',
  height       = 14,
  borderRadius = 7,
  style,
}) => {
  const tc   = useThemeColors();
  const anim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,    duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: tc.isDark ? '#3F3F46' : '#E4E4E7',
          opacity: anim,
        },
        style,
      ]}
    />
  );
};

// ── Tarjeta completa ──────────────────────────────────────────────────────────
export const ShimmerCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const tc = useThemeColors();
  return (
    <View style={[{
      backgroundColor: tc.card,
      borderRadius:    18,
      padding:         16,
      marginBottom:    12,
      borderWidth:     1,
      borderColor:     tc.border,
    }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <Shimmer width={48} height={48} borderRadius={14} style={{ marginRight: 14 }} />
        <View style={{ flex: 1 }}>
          <Shimmer height={14} width="58%" style={{ marginBottom: 8 }} />
          <Shimmer height={11} width="38%" />
        </View>
      </View>
      <Shimmer height={11} width="92%" style={{ marginBottom: 7 }} />
      <Shimmer height={11} width="68%" />
    </View>
  );
};

// ── Fila con avatar ───────────────────────────────────────────────────────────
export const ShimmerRow: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const tc = useThemeColors();
  return (
    <View style={[{
      flexDirection:   'row',
      alignItems:      'center',
      backgroundColor: tc.card,
      borderRadius:    14,
      padding:         14,
      marginBottom:    10,
      borderWidth:     1,
      borderColor:     tc.border,
    }, style]}>
      <Shimmer width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Shimmer height={13} width="50%" style={{ marginBottom: 7 }} />
        <Shimmer height={10} width="35%" />
      </View>
    </View>
  );
};

// ── Stat card cuadrado ────────────────────────────────────────────────────────
export const ShimmerStat: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[{
    width:         '47%',
    borderRadius:  16,
    padding:       16,
    aspectRatio:   1.05,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth:   1,
    borderColor:   'rgba(255,255,255,0.15)',
  }, style]}>
    <Shimmer width={32} height={32} borderRadius={10} style={{ marginBottom: 12 }} />
    <Shimmer height={22} width="55%" style={{ marginBottom: 8 }} />
    <Shimmer height={10} width="70%" />
  </View>
);
