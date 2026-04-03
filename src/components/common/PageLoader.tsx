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
  // One value per ring (0 = invisible/small, 1 = expanded/transparent)
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ── Logo entrance ────────────────────────────────────────────────────────
    const logoAnim = Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1, tension: 70, friction: 9, useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }),
    ]);

    // ── Pulse ring — single timing from 0→1 each iteration ──────────────────
    // Animated.loop resets the value to the initial fromValue (0) on each restart.
    const makePulse = (anim: Animated.Value, delay: number) => {
      anim.setValue(0); // explicit reset so the first frame is correct
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1, duration: 1400, useNativeDriver: true,
          }),
        ]),
      );
    };

    logoAnim.start();
    const r1 = makePulse(ring1, 0);
    const r2 = makePulse(ring2, 470);
    const r3 = makePulse(ring3, 940);
    r1.start();
    r2.start();
    r3.start();

    // Stop all animations when component unmounts (prevents memory leaks)
    return () => {
      logoAnim.stop();
      r1.stop();
      r2.stop();
      r3.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Interpolations driven by the 0→1 value
  const ringStyle = (anim: Animated.Value) => ({
    transform: [{
      scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.9] }),
    }],
    opacity: anim.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0.7, 0.35, 0],
    }),
  });

  return (
    <View style={s.container}>
      <StatusBar style="light" />

      {/* Pulse rings */}
      <Animated.View style={[s.ring, ringStyle(ring1)]} />
      <Animated.View style={[s.ring, ringStyle(ring2)]} />
      <Animated.View style={[s.ring, ringStyle(ring3)]} />

      {/* Logo box */}
      <Animated.View style={[
        s.logoBox,
        { transform: [{ scale: logoScale }], opacity: logoOpacity },
      ]}>
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
    fontSize:      13,
    fontWeight:    '500',
    color:         'rgba(255,255,255,0.35)',
    letterSpacing: 1,
  },
});
