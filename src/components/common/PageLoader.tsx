/**
 * PageLoader.tsx — Dark Space Edition 2026
 * Pantalla de carga: logo con anillo pulsante triple y fade-in.
 * Tres anillos concéntricos con stagger para efecto de onda expansiva.
 */
import React, { useRef, useEffect } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PRP, IND, VLT } from '../../constants/colors';

export const PageLoader: React.FC = () => {
  const logoScale   = useRef(new Animated.Value(0.78)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ring1       = useRef(new Animated.Value(0)).current;
  const ring2       = useRef(new Animated.Value(0)).current;
  const ring3       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo: scale spring + fade
    const logoAnim = Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1, tension: 52, friction: 8, useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }),
    ]);

    // Anillos: onda expansiva con stagger, loop infinito
    const makeRingLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, {
              toValue: 1, duration: 1400, useNativeDriver: true,
            }),
          ]),
          Animated.timing(anim, {
            toValue: 0, duration: 0, useNativeDriver: true,
          }),
        ]),
      );

    const r1 = makeRingLoop(ring1, 0);
    const r2 = makeRingLoop(ring2, 480);
    const r3 = makeRingLoop(ring3, 960);

    logoAnim.start();
    r1.start();
    r2.start();
    r3.start();

    return () => {
      logoAnim.stop();
      r1.stop();
      r2.stop();
      r3.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const makeRingStyle = (anim: Animated.Value, baseSize: number, color: string) => ({
    width:  baseSize,
    height: baseSize,
    borderRadius: baseSize / 2,
    borderWidth: 1.5,
    borderColor: color,
    position: 'absolute' as const,
    opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.7, 0] }),
    transform: [{
      scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }),
    }],
  });

  return (
    <View style={s.container}>
      <StatusBar style="light" />

      {/* Fondo con orbe de luz centrado */}
      <View style={s.orb} />

      {/* Anillos expansivos */}
      <Animated.View style={makeRingStyle(ring3, 160, `${VLT}60`)} />
      <Animated.View style={makeRingStyle(ring2, 160, `${IND}80`)} />
      <Animated.View style={makeRingStyle(ring1, 160, `${PRP}AA`)} />

      {/* Logo */}
      <Animated.Image
        source={require('../../../assets/icon.png')}
        style={[s.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
        resizeMode="contain"
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#030305',
    alignItems:      'center',
    justifyContent:  'center',
  },
  orb: {
    position:     'absolute',
    width:        320,
    height:       320,
    borderRadius: 160,
    backgroundColor: 'rgba(124,58,237,0.08)',
  },
  logo: {
    width:  140,
    height: 140,
  },
});
