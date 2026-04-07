/**
 * ScreenTransition.tsx
 * Animación de entrada para pantallas — fade suave, sin desplazamiento.
 *
 * Por qué useLayoutEffect:
 *   useEffect dispara DESPUÉS del primer frame pintado → el componente aparece
 *   un frame en opacity=0 (destello negro) antes de que arranque la animación.
 *   useLayoutEffect dispara de forma síncrona antes del paint, eliminando
 *   completamente ese hueco visible.
 *
 * Por qué screenKey en lugar de key:
 *   Usar key={pantalla} fuerza desmonte + remonte en cada cambio de pantalla,
 *   creando un hueco entre el desmonte del anterior y el inicio de la animación.
 *   Con screenKey el mismo Animated.View persiste; cuando screenKey cambia,
 *   useLayoutEffect reinicia opacity a 0 y arranca el fade antes del paint.
 */
import React, { useRef, useLayoutEffect } from 'react';
import { Animated } from 'react-native';

interface Props {
  children:   React.ReactNode;
  screenKey?: string;
  duration?:  number;
}

export const ScreenTransition: React.FC<Props> = ({
  children,
  screenKey,
  duration = 180,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    opacity.setValue(0);
    const anim = Animated.timing(opacity, {
      toValue:         1,
      duration,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  // screenKey es la dependencia intencional — cambia cuando se navega
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenKey]);

  return (
    <Animated.View style={{ flex: 1, opacity }}>
      {children}
    </Animated.View>
  );
};
