/**
 * LiquidGlass.tsx
 * Efecto "Liquid Glass" inspirado en el diseño Apple 2026.
 * Capas apiladas de rgba, highlight especular en el borde superior
 * y sombra difusa dan la ilusión de vidrio líquido traslúcido.
 *
 * Uso:
 *   <LiquidGlass>...</LiquidGlass>
 *   <LiquidGlass tint="purple" intensity="strong">...</LiquidGlass>
 *   <LiquidGlass tint="dark" radius={28}>...</LiquidGlass>
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

type Tint      = 'light' | 'dark' | 'purple' | 'rose' | 'teal';
type Intensity = 'subtle' | 'medium' | 'strong';

interface Props {
  children:   React.ReactNode;
  tint?:      Tint;
  intensity?: Intensity;
  radius?:    number;
  style?:     ViewStyle;
  padding?:   number;
}

// ── Tokens de vidrio por tinte ────────────────────────────────────────────────
const GLASS: Record<Tint, { fill: string; rim: string; shine: string; shadow: string }> = {
  light:  { fill: 'rgba(255,255,255,0.10)', rim: 'rgba(255,255,255,0.28)', shine: 'rgba(255,255,255,0.22)', shadow: 'rgba(0,0,0,0.22)' },
  dark:   { fill: 'rgba(12,12,14,0.55)',   rim: 'rgba(255,255,255,0.14)', shine: 'rgba(255,255,255,0.07)', shadow: 'rgba(0,0,0,0.45)' },
  purple: { fill: 'rgba(109,40,217,0.22)', rim: 'rgba(192,168,255,0.35)', shine: 'rgba(192,168,255,0.15)', shadow: 'rgba(109,40,217,0.35)' },
  rose:   { fill: 'rgba(190,18,60,0.18)',  rim: 'rgba(253,164,175,0.35)', shine: 'rgba(253,164,175,0.12)', shadow: 'rgba(190,18,60,0.30)' },
  teal:   { fill: 'rgba(15,118,110,0.20)', rim: 'rgba(94,234,212,0.35)', shine: 'rgba(94,234,212,0.12)',  shadow: 'rgba(15,118,110,0.30)' },
};

const BLUR_OPACITY: Record<Intensity, number> = {
  subtle: 0.7,
  medium: 1.0,
  strong: 1.0,
};

const FILL_BOOST: Record<Intensity, number> = {
  subtle: 0.5,
  medium: 1.0,
  strong: 1.6,
};

// ── Componente ────────────────────────────────────────────────────────────────
export const LiquidGlass: React.FC<Props> = ({
  children,
  tint      = 'light',
  intensity = 'medium',
  radius    = 20,
  style,
  padding   = 16,
}) => {
  const g      = GLASS[tint];
  const boost  = FILL_BOOST[intensity];
  const opaque = BLUR_OPACITY[intensity];

  return (
    <View
      style={[
        s.outer,
        {
          borderRadius:    radius,
          borderColor:     g.rim,
          shadowColor:     g.shadow,
          opacity:         opaque,
        },
        style,
      ]}
    >
      {/* Capa de relleno traslúcido */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius, backgroundColor: g.fill },
        ]}
        pointerEvents="none"
      />

      {/* Specular highlight — borde superior brillante */}
      <View
        style={[
          s.shine,
          {
            borderRadius:    radius,
            borderTopColor:  g.shine,
            borderLeftColor: `rgba(255,255,255,${0.06 * boost})`,
          },
        ]}
        pointerEvents="none"
      />

      {/* Contenido */}
      <View style={{ padding }}>
        {children}
      </View>
    </View>
  );
};

// ── Variante plana (sin padding — para usar en listas) ────────────────────────
export const LiquidGlassFlat: React.FC<Omit<Props, 'padding'>> = (props) => (
  <LiquidGlass {...props} padding={0} />
);

const s = StyleSheet.create({
  outer: {
    borderWidth:   1,
    overflow:      'hidden',
    shadowOffset:  { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius:  24,
    elevation:     10,
  },
  shine: {
    ...StyleSheet.absoluteFillObject,
    borderWidth:        1.5,
    borderColor:        'transparent',
    borderBottomColor:  'transparent',
    borderRightColor:   'transparent',
  },
});
