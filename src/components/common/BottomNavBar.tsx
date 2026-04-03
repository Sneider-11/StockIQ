/**
 * BottomNavBar.tsx
 * Barra de navegación inferior animada con pill deslizante y rebote en íconos.
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
  icon:       string;   // Ionicons outline
  iconActive: string;   // Ionicons filled
}

interface Props {
  tabs:      NavTab[];
  activeKey: string;
  onSelect:  (key: string) => void;
}

const PILL_W = 48;

export const BottomNavBar: React.FC<Props> = ({ tabs, activeKey, onSelect }) => {
  const tc          = useThemeColors();
  const { width: W } = useWindowDimensions();  // safe — always computed inside component
  const tabW        = tabs.length > 0 ? W / tabs.length : W;

  const pillX  = useRef(new Animated.Value(0)).current;
  const scales = useRef(tabs.map(() => new Animated.Value(1))).current;

  // Set pill to correct position whenever activeKey or dimensions change
  useEffect(() => {
    const idx = Math.max(0, tabs.findIndex(t => t.key === activeKey));
    const targetX = idx * tabW + tabW / 2 - PILL_W / 2;
    Animated.spring(pillX, {
      toValue:         targetX,
      tension:         80,
      friction:        12,
      useNativeDriver: true,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, tabW]);

  const handlePress = (key: string, idx: number) => {
    if (key === activeKey) return;
    Animated.sequence([
      Animated.spring(scales[idx], { toValue: 0.72, tension: 300, friction: 8,  useNativeDriver: true }),
      Animated.spring(scales[idx], { toValue: 1,    tension: 150, friction: 6,  useNativeDriver: true }),
    ]).start();
    onSelect(key);
  };

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor: tc.isDark ? 'rgba(18,18,20,0.97)' : 'rgba(255,255,255,0.97)',
          borderTopColor:  tc.border,
        },
      ]}
    >
      {/* Sliding pill highlight */}
      <Animated.View
        style={[s.pill, { transform: [{ translateX: pillX }] }]}
      />

      {tabs.map((tab, idx) => {
        const isActive = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            style={s.tab}
            onPress={() => handlePress(tab.key, idx)}
            activeOpacity={0.85}
          >
            <Animated.View
              style={{ transform: [{ scale: scales[idx] }], alignItems: 'center' }}
            >
              <Ionicons
                name={(isActive ? tab.iconActive : tab.icon) as any}
                size={22}
                color={isActive ? PRP : tc.muted}
              />
              <Text
                style={[s.label, { color: isActive ? PRP : tc.muted }]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    position:       'absolute',
    bottom:         0,
    left:           0,
    right:          0,
    flexDirection:  'row',
    height:         Platform.OS === 'ios' ? 82 : 64,
    paddingBottom:  Platform.OS === 'ios' ? 20 : 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: -4 },
    shadowOpacity:  0.10,
    shadowRadius:   12,
    elevation:      16,
  },
  pill: {
    position:        'absolute',
    top:             8,
    width:           PILL_W,
    height:          40,
    borderRadius:    12,
    backgroundColor: PRP + '1E',  // ~12% opacity purple
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     6,
  },
  label: {
    fontSize:      10,
    fontWeight:    '600',
    marginTop:     3,
    letterSpacing: 0.1,
  },
});
