// ─── PALETA CENTRAL DE COLORES ────────────────────────────────────────────────
// Importa desde aquí en todos los screens/componentes.

export const PRP  = '#7C3AED';  // primary — violeta
export const IND  = '#4F46E5';  // indigo — acento secundario 2026
export const VLT  = '#A78BFA';  // violet light — highlight / glow
export const BLK  = '#09090B';  // dark background
export const SPC  = '#030305';  // space black — fondo más profundo
export const DRK  = '#18181B';  // surface / card dark
export const MTD  = '#6B6B6B';  // muted text
export const GRY  = '#767676';  // gray placeholder
export const LGR  = '#F4F4F5';  // light gray background
export const BRD  = '#E4E4E7';  // border
export const GRN  = '#10B981';  // emerald green (success)
export const AMB  = '#F59E0B';  // amber (warning)
export const DNG  = '#F87171';  // danger / error
export const WHT  = '#FFFFFF';  // white

// Objeto compatible retrocompatible con data.ts
export const COLORS = {
  primary:   PRP,
  primaryDk: '#5B21B6',
  primaryLt: VLT,
  accent:    '#EDE9FE',
  dark:      BLK,
  space:     SPC,
  surface:   DRK,
  muted:     MTD,
  gray:      GRY,
  lightGray: LGR,
  border:    BRD,
  white:     WHT,
  green:     GRN,
  amber:     AMB,
  danger:    DNG,
  indigo:    IND,
  violet:    VLT,
} as const;
