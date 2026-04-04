/**
 * ScreenTransition.tsx
 * Animación de entrada para pantallas — fade suave, sin desplazamiento.
 * Sin translateY: evita desajustes de layout en cambios de tema o reinicio.
 */
import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

interface Props {
  children:  React.ReactNode;
  duration?: number;
}

export const ScreenTransition: React.FC<Props> = ({
  children,
  duration = 160,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(opacity, {
      toValue:         1,
      duration,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ flex: 1, opacity }}>
      {children}
    </Animated.View>
  );
};
