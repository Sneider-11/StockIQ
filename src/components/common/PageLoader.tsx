/**
 * PageLoader.tsx
 * Pantalla de carga animada con logo StockIQ, anillos de pulso y fade-in.
 * Reemplaza el ActivityIndicator simple en App.tsx.
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PRP } from '../../constants/colors';

export const PageLoader: React.FC = () => {
  const logoScale   = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ring1Scale  = useRef(new Animated.Value(0.5)).current;
  const ring2Scale  = useRef(new Animated.Value(0.5)).current;
  const ring3Scale  = useRef(new Animated.Value(0.5)).current;
  const ring1Opacity = useRef(new Animated.Value(0.5)).current;
  const ring2Opacity = useRef(new Animated.Value(0.5)).current;
  const ring3Opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1, tension: 70, friction: 9, useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }),
    ]).start();

    // Pulse rings — staggered
    const pulse = (scale: Animated.Value, opacity: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1.8, duration: 1000, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,   duration: 1000, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 0.5, duration: 0,    useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.5, duration: 0,    useNativeDriver: true }),
          ]),
        ]),
      );

    pulse(ring1Scale, ring1Opacity, 0).start();
    pulse(ring2Scale, ring2Opacity, 350).start();
    pulse(ring3Scale, ring3Opacity, 700).start();
  }, []);

  return (
    <View style={s.container}>
      <StatusBar style="light" />

      {/* Pulse rings */}
      <Animated.View style={[s.ring, { transform: [{ scale: ring1Scale }], opacity: ring1Opacity }]} />
      <Animated.View style={[s.ring, { transform: [{ scale: ring2Scale }], opacity: ring2Opacity }]} />
      <Animated.View style={[s.ring, { transform: [{ scale: ring3Scale }], opacity: ring3Opacity }]} />

      {/* Logo box */}
      <Animated.View style={[s.logoBox, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
        <Text style={s.logoLetter}>S</Text>
      </Animated.View>

      {/* App name */}
      <Animated.Text style={[s.appName, { opacity: logoOpacity }]}>
        StockIQ
      </Animated.Text>
      <Animated.Text style={[s.tagline, { opacity: logoOpacity }]}>
        Cargando...
      </Animated.Text>
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
  ring: {
    position:     'absolute',
    width:        100,
    height:       100,
    borderRadius: 50,
    borderWidth:  2,
    borderColor:  PRP,
  },
  logoBox: {
    width:           76,
    height:          76,
    borderRadius:    22,
    backgroundColor: PRP,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    18,
    shadowColor:     PRP,
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.45,
    shadowRadius:    20,
    elevation:       12,
  },
  logoLetter: {
    fontSize:   38,
    fontWeight: '900',
    color:      '#fff',
  },
  appName: {
    fontSize:      26,
    fontWeight:    '800',
    color:         '#fff',
    letterSpacing: 3,
    marginBottom:  6,
  },
  tagline: {
    fontSize:   13,
    fontWeight: '500',
    color:      'rgba(255,255,255,0.35)',
    letterSpacing: 1,
  },
});
