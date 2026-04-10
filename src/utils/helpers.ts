import { Clasificacion, Rol, Usuario } from '../constants/data';

/**
 * Devuelve el rol efectivo de un usuario en una tienda concreta.
 * SUPERADMIN siempre es SUPERADMIN.
 * Para los demás: lee tiendasRoles[tiendaId]; si no existe, usa el rol global como fallback.
 */
export const getRolEnTienda = (usuario: Usuario, tiendaId: string): Rol => {
  if (usuario.rol === 'SUPERADMIN') return 'SUPERADMIN';
  return (usuario.tiendasRoles?.[tiendaId] as Rol) ?? usuario.rol;
};

export const clasificar = (stock: number, cant: number): Clasificacion => {
  if (cant === 0 && stock > 0)  return 'CERO';
  if (cant === stock)            return 'SIN_DIF';
  if (cant < stock)              return 'FALTANTE';
  return 'SOBRANTE';
};

export const fCOP = (v: number): string =>
  '$' + v.toLocaleString('es-CO');

export const genId = (): string => {
  // UUID v4 con crypto.getRandomValues (disponible en Hermes / React Native).
  // Fallback si el entorno no lo soporta.
  try {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant RFC 4122
    const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  } catch {
    const ts  = Date.now().toString(36);
    const rnd = Math.random().toString(36).slice(2, 10);
    return `${ts}-${rnd}`;
  }
};

export const initials = (nombre: string): string => {
  if (!nombre || nombre.trim() === '') return '?';
  return nombre
    .split(' ')
    .filter(w => w.length > 0)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

/** Devuelve el primer nombre (antes del primer espacio). Seguro con cualquier string. */
export const primerNombre = (nombre: string): string => {
  if (!nombre || nombre.trim() === '') return '';
  return nombre.split(' ').filter(w => w.length > 0)[0] ?? '';
};

export const ahora = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
