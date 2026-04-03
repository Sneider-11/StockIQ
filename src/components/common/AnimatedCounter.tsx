/**
 * AnimatedCounter.tsx
 * Número que cuenta desde 0 hasta `value` con animación suave.
 * Úsalo para KPIs y dashboards en ResultadosScreen.
 */
import React, { useRef, useEffect, useState } from 'react';
import { Text, StyleSheet, Animated, Easing } from 'react-native';
import type { TextStyle } from 'react-native';

interface Props {
  value:      number;
  duration?:  number;
  style?:     TextStyle | TextStyle[];
  formatter?: (n: number) => string;
}

const defaultFormatter = (n: number) => String(Math.round(n));

export const AnimatedCounter: React.FC<Props> = ({
  value,
  duration  = 900,
  style,
  formatter = defaultFormatter,
}) => {
  const anim    = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(formatter(0));

  useEffect(() => {
    anim.stopAnimation();
    anim.setValue(0);
    const id = anim.addListener(({ value: v }) => setDisplay(formatter(v)));
    Animated.timing(anim, {
      toValue:         value,
      duration,
      easing:          Easing.out(Easing.cubic),
      useNativeDriver: false,   // must be false to read numeric value via listener
    }).start();
    return () => anim.removeListener(id);
  }, [value, duration, formatter]);

  return <Text style={style}>{display}</Text>;
};
