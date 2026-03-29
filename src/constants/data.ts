import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

// ─── TIPOS ────────────────────────────────────────────────────────────────────
export type Rol = 'SUPERADMIN' | 'ADMIN' | 'CONTADOR';
export type Clasificacion = 'SIN_DIF' | 'FALTANTE' | 'SOBRANTE' | 'CERO';
export type EstadoSobrante = 'CONFIRMADO' | 'PENDIENTE';
export type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface Usuario {
  id: string;
  cedula: string;
  nombre: string;
  /** Rol global — 'ADMIN' si tiene al menos una tienda como admin, 'CONTADOR' si todas son contador */
  rol: Rol;
  tiendas: string[];                              // IDs de tiendas asignadas
  tiendasRoles: Record<string, 'ADMIN' | 'CONTADOR'>;  // rol por tienda (para no-SUPERADMIN)
  pass: string;
  telefono?: string;
  activo?: boolean;      // false = desactivado por un ADMIN
  creadoPor?: string;    // id del ADMIN que creó este CONTADOR
  fotoUri?: string;      // URI de la foto de perfil (almacenado localmente)
}

export interface Tienda {
  id: string;
  nombre: string;
  icono: IoniconName;
  color: string;
  nit?: string;          // NIT opcional de la empresa/tienda
}

export interface Articulo {
  itemId: string;
  descripcion: string;
  ubicacion: string;
  stock: number;
  costo: number;
}

export interface Registro {
  id: string;
  tiendaId: string;
  itemId: string;
  descripcion: string;
  ubicacion: string;
  stockSistema: number;
  costoUnitario: number;
  cantidad: number;
  nota: string;
  fotoUri: string | null;
  usuarioNombre: string;
  escaneadoEn: string;
  clasificacion: Clasificacion;
}

export interface ClasificacionConfig {
  label: string;
  color: string;
  bg: string;
  dot: string;
}

export interface SobranteSinStock {
  id: string;
  tiendaId: string;
  codigo: string;
  descripcion: string;
  ubicacion: string;
  fotoUri: string;
  estado: EstadoSobrante;
  precio: number;
  cantidad: number;
  usuarioNombre: string;
  registradoEn: string;
}

// ─── TIENDAS ──────────────────────────────────────────────────────────────────
export const TIENDAS: Tienda[] = [
  { id: 'general', nombre: 'Inventario General', icono: 'grid',        color: '#09090B' },
  { id: 'yamaha',  nombre: 'Tienda Yamaha',       icono: 'storefront', color: '#1E1B4B' },
  { id: 'bajaj',   nombre: 'Tienda Bajaj',         icono: 'storefront', color: '#4C1D95' },
  { id: 'akt',     nombre: 'Tienda AKT',           icono: 'storefront', color: '#7C3AED' },
  { id: 'honda',   nombre: 'Tienda Honda',         icono: 'storefront', color: '#5B21B6' },
];

// ─── USUARIOS INICIALES ───────────────────────────────────────────────────────
export const USUARIOS_INICIALES: Usuario[] = [
  {
    id: 'u1',
    cedula: '1004807039',
    nombre: 'CARLOS PEÑALOZA',
    rol: 'SUPERADMIN',
    tiendas: ['general', 'yamaha', 'bajaj', 'akt', 'honda'],
    tiendasRoles: {},   // SUPERADMIN no usa tiendasRoles
    pass: 'admin123',
    activo: true,
  },
  {
    id: 'u2',
    cedula: '1090491873',
    nombre: 'EDWIN PUERTO',
    rol: 'ADMIN',
    tiendas: ['yamaha'],
    tiendasRoles: { yamaha: 'ADMIN' },
    pass: 'edwin123',
    activo: true,
  },
  {
    id: 'u3',
    cedula: '1090414059',
    nombre: 'GERMAN TORRES',
    rol: 'CONTADOR',
    tiendas: ['honda'],
    tiendasRoles: { honda: 'CONTADOR' },
    pass: 'german123',
    activo: true,
    creadoPor: 'u1',
  },
];

// ─── CATÁLOGO BASE ────────────────────────────────────────────────────────────
export const CATALOGO_BASE: Articulo[] = [
  { itemId: '7701023894531',   descripcion: 'MANZANA CLUTCH AKT 110S COMPLETA',      ubicacion: 'MANZANAS', stock: 1, costo: 102647 },
  { itemId: '7700149034920',   descripcion: 'MANZANA CLUTCH CTA ALTA3W21 RP',         ubicacion: 'MANZANAS', stock: 4, costo: 165815 },
  { itemId: '7700149254892',   descripcion: 'MANZ CLUT CTA/SLIPER 125NKD RP',         ubicacion: 'MANZANAS', stock: 1, costo: 114275 },
  { itemId: '7700149356206',   descripcion: 'MANZANA CLUTCH ALTA 3W200/21 RP',        ubicacion: 'MANZANAS', stock: 1, costo: 79941  },
  { itemId: '7701023036733',   descripcion: 'MANZANA CLUTCH 180RE RP',                ubicacion: 'MANZANAS', stock: 1, costo: 131471 },
  { itemId: '7701023036450',   descripcion: 'CLUTCH CTO 180RE RP',                    ubicacion: 'MANZANAS', stock: 2, costo: 167936 },
  { itemId: '7701023060523',   descripcion: 'MANZANA CLUTCH RTXS RP',                 ubicacion: 'MANZANAS', stock: 2, costo: 136868 },
  { itemId: '7701023300636',   descripcion: 'MANZANA CLUTCH TVS FLAME',               ubicacion: 'MANZANAS', stock: 0, costo: 57500  },
  { itemId: '3528706376374',   descripcion: 'LLANTA MICHE PIST2 90/90/18TL',          ubicacion: 'LLANTAS',  stock: 1, costo: 168900 },
  { itemId: '3528706781155',   descripcion: 'LLANTA PILOSTRE2 100/90/18TL Rp',        ubicacion: 'LLANTAS',  stock: 1, costo: 194593 },
  { itemId: '7700149013833',   descripcion: 'LLANT KONTROL 130/70-12 SPEEDO',         ubicacion: 'LLANTAS',  stock: 2, costo: 69900  },
  { itemId: '7700149022668',   descripcion: 'LLANTA KTLFAST 3.00-10 TT Rp',          ubicacion: 'LLANTAS',  stock: 1, costo: 51025  },
  { itemId: '7700149022682',   descripcion: 'LLANTA KONTROL 2.75-18 806+',            ubicacion: 'LLANTAS',  stock: 1, costo: 57900  },
  { itemId: '7700149022729',   descripcion: 'LLANTA KONTROL 90/90-17 806+',           ubicacion: 'LLANTAS',  stock: 2, costo: 58784  },
  { itemId: '7700149022736',   descripcion: 'LLANTA KTL 806+ 90/80-17 TL RP',        ubicacion: 'LLANTAS',  stock: 1, costo: 68504  },
  { itemId: '21200AKTATV250F', descripcion: 'MANZANA CLUTCH AKT ATV250F2 COMPLETA',   ubicacion: 'MANZANAS', stock: 1, costo: 169050 },
  { itemId: '7700149193733',   descripcion: 'LLANT KONTROL 90/90-17 THUNDER',         ubicacion: 'LLANTAS',  stock: 3, costo: 63850  },
  { itemId: '7700149265416',   descripcion: 'LLANTA KONTROL 4.50-10 DIESEL',          ubicacion: 'LLANTAS',  stock: 2, costo: 82500  },
];

// ─── CLASIFICACIONES ──────────────────────────────────────────────────────────
export const CLSF: Record<Clasificacion, ClasificacionConfig> = {
  SIN_DIF:  { label: 'Sin diferencia', color: '#6D28D9', bg: '#EDE9FE', dot: '#7C3AED' },
  FALTANTE: { label: 'Faltante',       color: '#C2410C', bg: '#FFF7ED', dot: '#F97316' },
  SOBRANTE: { label: 'Sobrante',       color: '#15803D', bg: '#F0FDF4', dot: '#22C55E' },
  CERO:     { label: 'Conteo cero',    color: '#991B1B', bg: '#FEF2F2', dot: '#EF4444' },
};

// ─── PALETA DE COLORES PARA TIENDAS ──────────────────────────────────────────
export const PALETA_COLORES: string[] = [
  // Negros y grises oscuros
  '#09090B', '#1F2937', '#374151', '#4B5563',
  // Azules oscuros y navy
  '#1E1B4B', '#1E3A5F', '#1D4ED8', '#1E40AF',
  // Morados
  '#4C1D95', '#5B21B6', '#6D28D9', '#7C3AED',
  // Azules y cielos
  '#0369A1', '#0284C7', '#0EA5E9', '#0E7490',
  // Verdes
  '#065F46', '#047857', '#15803D', '#166534',
  // Verdes claros
  '#0F766E', '#0D9488', '#14B8A6', '#059669',
  // Rojos y carmesíes
  '#9F1239', '#BE123C', '#C8372A', '#DC2626',
  // Naranjas y ambar
  '#92400E', '#B45309', '#C2410C', '#D97706',
  // Rosas y fucsias
  '#9D174D', '#DB2777', '#EC4899', '#BE185D',
  // Índigo
  '#312E81', '#3730A3', '#4338CA', '#4F46E5',
  // Cafés y tierra
  '#78350F', '#92400E', '#713F12', '#451A03',
  // Verdes lima y esmeralda
  '#3F6212', '#4D7C0F', '#365314', '#14532D',
];

// ─── COLORES DE LA APP ────────────────────────────────────────────────────────
export const COLORS = {
  primary:   '#7C3AED',
  primaryDk: '#5B21B6',
  primaryLt: '#8B5CF6',
  accent:    '#EDE9FE',
  dark:      '#09090B',
  surface:   '#18181B',
  muted:     '#71717A',
  gray:      '#A1A1AA',
  lightGray: '#F4F4F5',
  border:    '#E4E4E7',
  white:     '#FFFFFF',
  green:     '#25D366',
};
