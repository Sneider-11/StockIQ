import { useTheme } from '../context/ThemeContext';

/**
 * Hook centralizado de colores por tema.
 * Úsalo en cualquier screen para obtener los colores correctos
 * según el modo oscuro/claro seleccionado por el usuario.
 *
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
    /** Fondo principal de pantalla */
    bg:          isDark ? '#09090B' : '#F4F4F5',
    /** Fondo de tarjetas / cards */
    card:        isDark ? '#1C1C1E' : '#FFFFFF',
    /** Fondo secundario (campos de input, chips, etc.) */
    cardAlt:     isDark ? '#27272A' : '#F4F4F5',
    /** Fondo de filas en listas */
    row:         isDark ? '#18181B' : '#FFFFFF',
    /** Fondo de secciones de peligro */
    danger:      isDark ? '#2D0A0A' : '#FEF2F2',
    /** Fondo del header de pantallas secundarias */
    headerBg:    isDark ? '#18181B' : '#FFFFFF',

    // ── Textos ────────────────────────────────────────────────────────────────
    /** Texto principal */
    text:        isDark ? '#F4F4F5' : '#09090B',
    /** Texto secundario / muted */
    muted:       isDark ? '#A1A1AA' : '#6B6B6B',
    /** Texto placeholder */
    placeholder: isDark ? 'rgba(255,255,255,0.30)' : '#767676',
    /** Texto sobre fondos de peligro */
    dangerText:  isDark ? '#F87171' : '#DC2626',

    // ── Bordes y divisores ────────────────────────────────────────────────────
    /** Borde estándar */
    border:      isDark ? '#3F3F46' : '#E4E4E7',
    /** Borde más sutil */
    borderLight: isDark ? '#27272A' : '#F0F0F0',

    // ── Inputs ────────────────────────────────────────────────────────────────
    /** Fondo de campos de texto */
    inputBg:     isDark ? '#27272A' : '#F4F4F5',
    /** Borde de campos de texto */
    inputBorder: isDark ? '#3F3F46' : '#E4E4E7',

    // ── Iconos y elementos interactivos ──────────────────────────────────────
    /** Color de iconos por defecto */
    icon:        isDark ? '#A1A1AA' : '#6B6B6B',
    /** Fondo de botón circular (back, close, etc.) */
    btnBg:       isDark ? '#27272A' : '#F4F4F5',
    /** Flecha / chevron */
    chevron:     isDark ? '#52525B' : '#A1A1AA',

    // ── StatusBar ────────────────────────────────────────────────────────────
    /** Estilo de status bar: 'light' o 'dark' */
    statusBar:   (isDark ? 'light' : 'dark') as 'light' | 'dark',

    // ── Acceso rápido — para leer el booleano si lo necesitas ────────────────
    isDark,
  } as const;
};
