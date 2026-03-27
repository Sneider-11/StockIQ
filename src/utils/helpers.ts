import { Clasificacion } from '../constants/data';

export const clasificar = (stock: number, cant: number): Clasificacion => {
  if (cant === 0 && stock > 0)  return 'CERO';
  if (cant === stock)            return 'SIN_DIF';
  if (cant < stock)              return 'FALTANTE';
  return 'SOBRANTE';
};

export const fCOP = (v: number): string =>
  '$' + v.toLocaleString('es-CO');

export const genId = (): string =>
  Math.random().toString(36).slice(2, 10);

export const initials = (nombre: string): string =>
  nombre.split(' ').map(x => x[0]).join('').slice(0, 2);

export const ahora = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
