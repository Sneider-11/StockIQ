/**
 * BottomNavBar.tsx — Dark Space Edition 2026
 * Barra de navegación con:
 *  - Pill deslizante con squish spring y glow violeta
 *  - Ícono activo con glow shadow
 *  - Labels con fade + micro-slide vertical
 *  - Fondo liquid glass ultra-traslúcido
 *  - Línea superior especular de 1px
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { PRP, VLT } from '../../constants/colors';

export interface NavTab {
  key:        string;
  label:      string;
  icon:       string;
  iconActive: string;
}

interface Props {
  tabs:      NavTab[];
  activeKey: string;
  onSelect:  (key: string) => void;
}

const PILL_W = 58;
const PILL_H = 36;
const NAV_H  = Platform.OS === 'ios' ? 82 : 66;

export const BottomNavBar: React.FC<Props> = ({ tabs, activeKey, onSelect }) => {
  const tc           = useThemeColors();
  const { width: W } = useWindowDimensions();
  const tabW         = tabs.length > 0 ? W / tabs.length : W;

  const pillX      = useRef(new Animated.Value(0)).current;
  const pillScaleX = useRef(new Animated.Value(1)).current;
  const pillScaleY = useRef(new Animated.Value(1)).current;
  const pillOpac   = useRef(new Animated.Value(1)).current;
  const scales     = useRef(tabs.map(() => new Animated.Value(1))).current;
  const labelOps   = useRef(tabs.map(() => new Animated.Value(0))).current;
  const labelY     = useRef(tabs.map(() => new Animated.Value(3))).current;

  useEffect(() => {
    const idx     = Math.max(0, tabs.findIndex(t => t.key === activeKey));
    const targetX = idx * tabW + tabW / 2 - PILL_W / 2;

    // Pill: squish suave → deslizar → recuperar
    Animated.parallel([
      Animated.spring(pillX, {
        toValue: targetX, tension: 80, friction: 12, useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.parallel([
          Animated.spring(pillScaleX, { toValue: 1.14, tension: 300, friction: 10, useNativeDriver: true }),
          Animated.spring(pillScaleY, { toValue: 0.84, tension: 300, friction: 10, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(pillScaleX, { toValue: 1.0, tension: 180, friction: 10, useNativeDriver: true }),
          Animated.spring(pillScaleY, { toValue: 1.0, tension: 180, friction: 10, useNativeDriver: true }),
        ]),
      ]),
    ]).start();

    // Labels: fade + slide vertical
    tabs.forEach((tab, i) => {
      const isActive = tab.key === activeKey;
      Animated.parallel([
        Animated.timing(labelOps[i], {
          toValue: isActive ? 1 : 0, duration: 200, useNativeDriver: true,
        }),
        Animated.spring(labelY[i], {
          toValue: isActive ? 0 : 3, tension: 180, friction: 10, useNativeDriver: true,
        }),
      ]).start();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, tabW]);

  const handlePress = (key: string, idx: number) => {
    if (key === activeKey) return;
    Animated.sequence([
      Animated.spring(scales[idx], { toValue: 0.65, tension: 380, friction: 8, useNativeDriver: true }),
      Animated.spring(scales[idx], { toValue: 1,    tension: 180, friction: 7, useNativeDriver: true }),
    ]).start();
    onSelect(key);
  };

  // Glass tokens
  const glassBg  = tc.isDark ? 'rgba(8,8,12,0.88)' : 'rgba(248,248,252,0.88)';
  const glassRim = tc.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.90)';

  return (
    <View style={s.wrapper}>
      {/* Sombra exterior hacia arriba */}
      <View style={[s.container, { backgroundColor: glassBg, borderTopColor: glassRim }]}>

        {/* Línea superior especular */}
        <View style={[s.topShine, { backgroundColor: tc.glassShine }]} pointerEvents="none" />

        {/* Pill deslizante con glow */}
        <Animated.View
          style={[
            s.pill,
            {
              backgroundColor: tc.isDark ? `${PRP}22` : `${PRP}14`,
              borderColor:     `${PRP}50`,
              shadowColor:     PRP,
              transform: [
                { translateX: pillX },
                { scaleX: pillScaleX },
                { scaleY: pillScaleY },
              ],
            },
          ]}
        />

        {tabs.map((tab, idx) => {
          const isActive = tab.key === activeKey;
          return (
            <TouchableOpacity
              key={tab.key}
              style={s.tab}
              onPress={() => handlePress(tab.key, idx)}
              activeOpacity={1}
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              {/* Ícono con scale en press — separado de la label para que el pill no tape el texto */}
              <Animated.View
                style={[s.iconWrap, { transform: [{ scale: scales[idx] }] }]}
              >
                <View style={isActive ? [s.iconGlow, { shadowColor: PRP }] : undefined}>
                  <Ionicons
                    name={(isActive ? tab.iconActive : tab.icon) as any}
                    size={22}
                    color={isActive ? VLT : tc.isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.25)'}
                  />
                </View>
              </Animated.View>

              {/* Label fuera del scale, debajo del pill */}
              <Animated.Text
                style={[
                  s.label,
                  {
                    color:     VLT,
                    opacity:   labelOps[idx],
                    transform: [{ translateY: labelY[idx] }],
                  },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  wrapper: {
    position:      'absolute',
    bottom:        0,
    left:          0,
    right:         0,
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: -8 },
    shadowOpacity: 0.30,
    shadowRadius:  24,
    elevation:     24,
  },
  container: {
    flexDirection:  'row',
    height:         NAV_H,
    paddingBottom:  Platform.OS === 'ios' ? 20 : 4,
    borderTopWidth: 1,
    position:       'relative',
    overflow:       'hidden',
  },
  topShine: {
    position: 'absolute',
    top:      0,
    left:     0,
    right:    0,
    height:   1,
  },
  pill: {
    position:      'absolute',
    top:           5,
    width:         PILL_W,
    height:        PILL_H,
    borderRadius:  12,
    borderWidth:   1,
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.50,
    shadowRadius:  9,
    elevation:     5,
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'flex-start',
    paddingTop:     5,
    paddingBottom:  4,
  },
  iconWrap: {
    width:          PILL_W,
    height:         PILL_H,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconGlow: {
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius:  8,
    elevation:     0,
  },
  label: {
    fontSize:      10,
    fontWeight:    '700',
    marginTop:     2,
    letterSpacing: 0.3,
  },
});
