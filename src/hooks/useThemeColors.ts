import { useTheme } from '../context/ThemeContext';

/**
 * Hook centralizado de colores por tema — Dark Space Edition 2026.
 * Uso:
 *   const tc = useThemeColors();
 *   <View style={{ backgroundColor: tc.bg }}>
 *     <Text style={{ color: tc.text }}>...</Text>
 *   </View>
 */
export const useThemeColors = () => {
  const { isDark } = useTheme();

  return {
    // ── Fondos ────────────────────────────────────────────────────────────────
    /** Fondo principal — #030305 dark, #F4F4F5 light */
    bg:           isDark ? '#030305' : '#F4F4F5',
    /** Fondo de tarjetas */
    card:         isDark ? '#0D0D14' : '#FFFFFF',
    /** Tarjeta elevada (segunda capa) */
    cardAlt:      isDark ? '#12121C' : '#F8F8FA',
    /** Fondo de filas en listas */
    row:          isDark ? '#0D0D14' : '#FFFFFF',
    /** Fondo de secciones de peligro */
    danger:       isDark ? '#1A0505' : '#FEF2F2',
    /** Fondo del header de pantallas secundarias */
    headerBg:     isDark ? '#0D0D14' : '#FFFFFF',
    /** Fondo para inputs / chips */
    inputBg:      isDark ? 'rgba(255,255,255,0.06)' : '#F4F4F5',

    // ── Textos ────────────────────────────────────────────────────────────────
    text:         isDark ? '#F4F4F5' : '#09090B',
    muted:        isDark ? '#A1A1AA' : '#6B6B6B',
    placeholder:  isDark ? 'rgba(255,255,255,0.30)' : '#767676',
    dangerText:   isDark ? '#F87171' : '#DC2626',

    // ── Bordes ────────────────────────────────────────────────────────────────
    border:       isDark ? 'rgba(255,255,255,0.08)' : '#E4E4E7',
    borderLight:  isDark ? 'rgba(255,255,255,0.04)' : '#F0F0F0',
    inputBorder:  isDark ? 'rgba(255,255,255,0.10)' : '#E4E4E7',

    // ── Iconos y botones ──────────────────────────────────────────────────────
    icon:         isDark ? '#71717A' : '#6B6B6B',
    btnBg:        isDark ? 'rgba(255,255,255,0.07)' : '#F4F4F5',
    chevron:      isDark ? '#52525B' : '#A1A1AA',

    // ── Glow / Acento 2026 ────────────────────────────────────────────────────
    /** Fondo suave del color primario */
    accentSoft:   isDark ? 'rgba(124,58,237,0.14)' : 'rgba(124,58,237,0.08)',
    /** Sombra de glow violeta */
    accentGlow:   'rgba(124,58,237,0.40)',
    /** Borde especular glass */
    glassRim:     isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.80)',
    /** Inner highlight glass */
    glassShine:   isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.95)',
    /** Sombra de card */
    cardShadow:   isDark ? 'rgba(0,0,0,0.60)' : 'rgba(0,0,0,0.10)',

    // ── StatusBar ────────────────────────────────────────────────────────────
    statusBar:    (isDark ? 'light' : 'dark') as 'light' | 'dark',
    isDark,
  } as const;
};
