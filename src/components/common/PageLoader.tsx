/**
 * PageLoader.tsx
 * Pantalla de carga — solo el logo de la app, centrado y limpio.
 * Animación: scale spring 0.82 → 1 + fade-in. Sin texto, sin anillos.
 */
import React, { useRef, useEffect } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export const PageLoader: React.FC = () => {
  const scale   = useRef(new Animated.Value(0.82)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.spring(scale, {
        toValue:         1,
        tension:         55,
        friction:        8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue:         1,
        duration:        480,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={s.container}>
      <StatusBar style="light" />
      <Animated.Image
        source={require('../../../assets/icon.png')}
        style={[s.logo, { opacity, transform: [{ scale }] }]}
        resizeMode="contain"
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#09090B',
    alignItems:      'center',
    justifyContent:  'center',
  },
  logo: {
    width:  160,
    height: 160,
  },
});
