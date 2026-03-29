// ─── PALETA CENTRAL DE COLORES ────────────────────────────────────────────────
// Importa desde aquí en todos los screens/componentes en lugar de declarar
// constantes locales.

export const PRP  = '#C8372A';  // primary (rojo corporativo StockIQ)
export const BLK  = '#09090B';  // dark background
export const DRK  = '#18181B';  // surface / card dark
export const MTD  = '#6B6B6B';  // muted text (4.6:1 sobre blanco — WCAG AA)
export const GRY  = '#767676';  // gray placeholder (4.54:1 sobre blanco — WCAG AA)
export const LGR  = '#F4F4F5';  // light gray background
export const BRD  = '#E4E4E7';  // border
export const GRN  = '#25D366';  // green (WhatsApp)
export const WHT  = '#FFFFFF';  // white

// Objeto compatible con el existente en data.ts (mantiene retrocompatibilidad)
export const COLORS = {
  primary:   PRP,
  primaryDk: '#9E2920',
  primaryLt: '#E04B3C',
  accent:    '#FEE2E2',
  dark:      BLK,
  surface:   DRK,
  muted:     MTD,
  gray:      GRY,
  lightGray: LGR,
  border:    BRD,
  white:     WHT,
  green:     GRN,
} as const;
