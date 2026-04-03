/**
 * ScreenTransition.tsx
 * Animación de entrada para pantallas — fade + slide-up suave.
 * Úsalo como wrapper de cualquier screen para transiciones profesionales.
 */
import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

interface Props {
  children:    React.ReactNode;
  duration?:   number;
  slideOffset?: number;
}

export const ScreenTransition: React.FC<Props> = ({
  children,
  duration    = 300,
  slideOffset = 22,
}) => {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(slideOffset)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue:        1,
        duration,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue:        0,
        tension:        90,
        friction:       13,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};
