/**
 * BottomNavBar.tsx
 * Barra de navegación Liquid Glass — pill deslizante + rebote en íconos.
 * Efecto vidrio: fondo ultra-traslúcido + borde especular + sombra difusa.
 * Admin/SuperAdmin: 5 pestañas. Contador: 3 pestañas.
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { PRP } from '../../constants/colors';

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

const PILL_W = 52;

export const BottomNavBar: React.FC<Props> = ({ tabs, activeKey, onSelect }) => {
  const tc           = useThemeColors();
  const { width: W } = useWindowDimensions();
  const tabW         = tabs.length > 0 ? W / tabs.length : W;

  const pillX    = useRef(new Animated.Value(0)).current;
  const pillScaleY = useRef(new Animated.Value(1)).current;
  const scales   = useRef(tabs.map(() => new Animated.Value(1))).current;
  const labelOps = useRef(tabs.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const idx     = Math.max(0, tabs.findIndex(t => t.key === activeKey));
    const targetX = idx * tabW + tabW / 2 - PILL_W / 2;

    // Pill: squish down then spring to position
    Animated.parallel([
      Animated.spring(pillX, {
        toValue: targetX, tension: 75, friction: 11, useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(pillScaleY, { toValue: 0.82, tension: 400, friction: 8, useNativeDriver: true }),
        Animated.spring(pillScaleY, { toValue: 1,    tension: 200, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();

    // Labels: active tab label fades in, rest fade out
    tabs.forEach((tab, i) => {
      Animated.timing(labelOps[i], {
        toValue:         tab.key === activeKey ? 1 : 0,
        duration:        180,
        useNativeDriver: true,
      }).start();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, tabW]);

  const handlePress = (key: string, idx: number) => {
    if (key === activeKey) return;
    Animated.sequence([
      Animated.spring(scales[idx], { toValue: 0.68, tension: 350, friction: 8, useNativeDriver: true }),
      Animated.spring(scales[idx], { toValue: 1,    tension: 180, friction: 6, useNativeDriver: true }),
    ]).start();
    onSelect(key);
  };

  // Glass tokens
  const glassBg   = tc.isDark ? 'rgba(14,14,16,0.82)' : 'rgba(248,248,250,0.82)';
  const glassRim  = tc.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)';
  const glassShine= tc.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.90)';

  return (
    <View style={[s.wrapper]}>
      {/* Glass body */}
      <View style={[s.container, { backgroundColor: glassBg, borderTopColor: glassRim }]}>
        {/* Specular top-edge highlight */}
        <View style={[s.topShine, { backgroundColor: glassShine }]} pointerEvents="none" />

        {/* Sliding pill */}
        <Animated.View
          style={[
            s.pill,
            {
              backgroundColor: tc.isDark ? PRP + '28' : PRP + '18',
              borderColor:     PRP + '40',
              transform: [{ translateX: pillX }, { scaleY: pillScaleY }],
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
              <Animated.View
                style={[s.tabInner, { transform: [{ scale: scales[idx] }] }]}
              >
                <Ionicons
                  name={(isActive ? tab.iconActive : tab.icon) as any}
                  size={23}
                  color={isActive ? PRP : tc.isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.28)'}
                />
                <Animated.Text
                  style={[s.label, { color: PRP, opacity: labelOps[idx] }]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Animated.Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const NAV_H = Platform.OS === 'ios' ? 82 : 64;

const s = StyleSheet.create({
  wrapper: {
    position:     'absolute',
    bottom:       0,
    left:         0,
    right:        0,
    // Outer shadow that bleeds upward — depth effect
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation:    20,
  },
  container: {
    flexDirection: 'row',
    height:        NAV_H,
    paddingBottom: Platform.OS === 'ios' ? 20 : 4,
    borderTopWidth: 1,
    position:      'relative',
    overflow:      'hidden',
  },
  topShine: {
    position: 'absolute',
    top:      0,
    left:     0,
    right:    0,
    height:   1,
  },
  pill: {
    position:     'absolute',
    top:          8,
    width:        PILL_W,
    height:       42,
    borderRadius: 14,
    borderWidth:  1,
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     4,
  },
  tabInner: {
    alignItems: 'center',
    minHeight:  42,
    justifyContent: 'center',
  },
  label: {
    fontSize:      10,
    fontWeight:    '700',
    marginTop:     2,
    letterSpacing: 0.2,
  },
});
