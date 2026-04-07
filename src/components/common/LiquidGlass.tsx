/**
 * LiquidGlass.tsx — Dark Space Edition 2026
 * Tres capas apiladas para profundidad máxima:
 *   1. Fill traslúcido (el "cuerpo" del vidrio)
 *   2. Inner glow (brillo de acento desde abajo)
 *   3. Specular highlight (reflejo especular en borde superior)
 * Sombra exterior doble: oscura + acento de color.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

type Tint      = 'light' | 'dark' | 'purple' | 'rose' | 'teal' | 'indigo' | 'amber';
type Intensity = 'subtle' | 'medium' | 'strong';

interface Props {
  children:   React.ReactNode;
  tint?:      Tint;
  intensity?: Intensity;
  radius?:    number;
  style?:     ViewStyle;
  padding?:   number;
}

const GLASS: Record<Tint, {
  fill:    string;
  rim:     string;
  shine:   string;
  shadow:  string;
  glow:    string;
}> = {
  light:  {
    fill:   'rgba(255,255,255,0.09)',
    rim:    'rgba(255,255,255,0.30)',
    shine:  'rgba(255,255,255,0.22)',
    shadow: 'rgba(0,0,0,0.30)',
    glow:   'rgba(255,255,255,0.04)',
  },
  dark:   {
    fill:   'rgba(10,10,14,0.65)',
    rim:    'rgba(255,255,255,0.12)',
    shine:  'rgba(255,255,255,0.07)',
    shadow: 'rgba(0,0,0,0.55)',
    glow:   'rgba(124,58,237,0.06)',
  },
  purple: {
    fill:   'rgba(88,28,200,0.20)',
    rim:    'rgba(192,168,255,0.38)',
    shine:  'rgba(192,168,255,0.18)',
    shadow: 'rgba(88,28,200,0.45)',
    glow:   'rgba(167,139,250,0.12)',
  },
  indigo: {
    fill:   'rgba(67,56,202,0.20)',
    rim:    'rgba(165,180,252,0.38)',
    shine:  'rgba(165,180,252,0.16)',
    shadow: 'rgba(67,56,202,0.40)',
    glow:   'rgba(129,140,248,0.12)',
  },
  rose:   {
    fill:   'rgba(190,18,60,0.18)',
    rim:    'rgba(253,164,175,0.38)',
    shine:  'rgba(253,164,175,0.14)',
    shadow: 'rgba(190,18,60,0.35)',
    glow:   'rgba(251,113,133,0.10)',
  },
  teal:   {
    fill:   'rgba(13,148,136,0.18)',
    rim:    'rgba(94,234,212,0.38)',
    shine:  'rgba(94,234,212,0.14)',
    shadow: 'rgba(13,148,136,0.35)',
    glow:   'rgba(45,212,191,0.10)',
  },
  amber:  {
    fill:   'rgba(180,83,9,0.18)',
    rim:    'rgba(252,211,77,0.38)',
    shine:  'rgba(252,211,77,0.14)',
    shadow: 'rgba(180,83,9,0.35)',
    glow:   'rgba(251,191,36,0.10)',
  },
};

const FILL_BOOST: Record<Intensity, number> = {
  subtle: 0.55,
  medium: 1.0,
  strong: 1.7,
};

export const LiquidGlass: React.FC<Props> = ({
  children,
  tint      = 'light',
  intensity = 'medium',
  radius    = 20,
  style,
  padding   = 16,
}) => {
  const g     = GLASS[tint];
  const boost = FILL_BOOST[intensity];

  return (
    <View
      style={[
        s.outer,
        {
          borderRadius: radius,
          borderColor:  g.rim,
          shadowColor:  g.shadow,
        },
        style,
      ]}
    >
      {/* Capa 1 — Fill traslúcido */}
      <View
        style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: g.fill }]}
        pointerEvents="none"
      />

      {/* Capa 2 — Inner glow desde abajo (acento de color) */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            backgroundColor: 'transparent',
            borderBottomColor: g.glow,
            borderBottomWidth: 60,
            opacity: boost * 0.8,
          },
        ]}
        pointerEvents="none"
      />

      {/* Capa 3 — Specular highlight borde superior + izquierdo */}
      <View
        style={[
          s.shine,
          {
            borderRadius: radius,
            borderTopColor:  g.shine,
            borderLeftColor: `rgba(255,255,255,${0.05 * boost})`,
          },
        ]}
        pointerEvents="none"
      />

      <View style={{ padding }}>
        {children}
      </View>
    </View>
  );
};

export const LiquidGlassFlat: React.FC<Omit<Props, 'padding'>> = (props) => (
  <LiquidGlass {...props} padding={0} />
);

const s = StyleSheet.create({
  outer: {
    borderWidth:   1,
    overflow:      'hidden',
    // Sombra doble: exterior fuerte + difusa amplia
    shadowOffset:  { width: 0, height: 12 },
    shadowOpacity: 0.40,
    shadowRadius:  32,
    elevation:     14,
  },
  shine: {
    ...StyleSheet.absoluteFillObject,
    borderWidth:       1.5,
    borderColor:       'transparent',
    borderBottomColor: 'transparent',
    borderRightColor:  'transparent',
  },
});
