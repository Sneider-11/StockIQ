/**
 * db.ts — Capa de acceso a datos de Supabase
 *
 * Todas las funciones son fire-and-forget seguras:
 * si getSupabaseListo() es false o hay error de red, devuelven
 * valor vacío sin lanzar excepción.
 *
 * Supabase se inicializa de forma diferida (ver supabase.ts).
 * Estas funciones se llaman SOLO después de initSupabase().
 */

import { getSupabaseListo, getSupabaseClient } from './supabase';
import { Usuario, Articulo, Registro, SobranteSinStock, Tienda } from '../constants/data';

// Acceso seguro al cliente — devuelve null si no está listo
function sb() {
  return getSupabaseListo() ? getSupabaseClient() : null;
}

// ─── TIENDAS ──────────────────────────────────────────────────────────────────

export async function dbGetTiendas(): Promise<Tienda[]> {
  const c = sb(); if (!c) return [];
  const { data, error } = await c.from('tiendas').select('*').order('creado_en');
  if (error || !data) return [];
  return data.map(r => ({
    id:     r.id,
    nombre: r.nombre,
    icono:  r.icono ?? 'storefront',
    color:  r.color ?? '#09090B',
    nit:    r.nit ?? undefined,
  }));
}

export async function dbUpsertTienda(t: Tienda): Promise<void> {
  const c = sb(); if (!c) return;
  await c.from('tiendas').upsert(
    { id: t.id, nombre: t.nombre, icono: t.icono, color: t.color, nit: t.nit ?? null },
    { onConflict: 'id' },
  );
}

export async function dbDeleteTienda(id: string): Promise<void> {
  const c = sb(); if (!c) return;
  await c.from('tiendas').delete().eq('id', id);
}

// ─── USUARIOS ─────────────────────────────────────────────────────────────────

function migrateRol(rol: string): Usuario['rol'] {
  if (rol === 'AUDITOR') return 'ADMIN';
  return rol as Usuario['rol'];
}

export async function dbGetUsuarios(): Promise<Usuario[]> {
  const c = sb(); if (!c) return [];
  const { data, error } = await c
    .from('usuarios')
    .select('id,cedula,nombre,rol,tiendas,tiendas_roles,telefono,activo,creado_por');
  if (error || !data) return [];
  return data.map(r => ({
    id:           r.id,
    cedula:       r.cedula,
    nombre:       r.nombre,
    rol:          migrateRol(r.rol),
    tiendas:      r.tiendas ?? [],
    tiendasRoles: r.tiendas_roles ?? {},
    pass:         '',
    telefono:     r.telefono ?? undefined,
    activo:       r.activo ?? true,
    creadoPor:    r.creado_por ?? undefined,
  }));
}

export async function dbInsertUsuario(u: Usuario): Promise<void> {
  const c = sb(); if (!c) return;
  await c.from('usuarios').upsert(
    {
      id:            u.id,
      cedula:        u.cedula,
      nombre:        u.nombre,
      rol:           u.rol,
      tiendas:       u.tiendas,
      tiendas_roles: u.tiendasRoles ?? {},
      telefono:      u.telefono ?? null,
      activo:        u.activo ?? true,
      creado_por:    u.creadoPor ?? null,
    },
    { onConflict: 'id' },
  );
}

export async function dbDeleteUsuario(id: string): Promise<void> {
  const c = sb(); if (!c) return;
  await c.from('usuarios').delete().eq('id', id);
}

// ─── REGISTROS ────────────────────────────────────────────────────────────────

export async function dbGetRegistros(): Promise<Registro[]> {
  const c = sb(); if (!c) return [];
  const { data, error } = await c
    .from('registros')
    .select('*')
    .order('escaneado_en', { ascending: false });
  if (error || !data) return [];
  return data.map(r => ({
    id:            r.id,
    tiendaId:      r.tienda_id,
    itemId:        r.item_id,
    descripcion:   r.descripcion,
    ubicacion:     r.ubicacion,
    stockSistema:  r.stock_sistema,
    costoUnitario: r.costo_unitario,
    cantidad:      r.cantidad,
    nota:          r.nota ?? '',
    fotoUri:       null,
    usuarioNombre: r.usuario_nombre,
    escaneadoEn:   r.escaneado_en,
    clasificacion: r.clasificacion,
  }));
}

export async function dbInsertRegistro(r: Registro): Promise<void> {
  const c = sb(); if (!c) return;
  await c.from('registros').insert({
    id:             r.id,
    tienda_id:      r.tiendaId,
    item_id:        r.itemId,
    descripcion:    r.descripcion,
    ubicacion:      r.ubicacion,
    stock_sistema:  r.stockSistema,
    costo_unitario: r.costoUnitario,
    cantidad:       r.cantidad,
    nota:           r.nota || null,
    foto_uri:       null,
    usuario_nombre: r.usuarioNombre,
    escaneado_en:   r.escaneadoEn,
    clasificacion:  r.clasificacion,
  });
}

export async function dbDeleteRegistro(id: string): Promise<void> {
  const c = sb(); if (!c) return;
  await c.from('registros').delete().eq('id', id);
}

export async function dbLimpiarRegistrosTienda(tiendaId: string): Promise<void> {
  const c = sb(); if (!c) return;
  await c.from('registros').delete().eq('tienda_id', tiendaId);
}

export async function dbReiniciarInventario(tiendaId: string): Promise<void> {
  const c = sb(); if (!c) return;
  await Promise.all([
    c.from('registros').delete().eq('tienda_id', tiendaId),
    c.from('sobrantes').delete().eq('tienda_id', tiendaId),
  ]);
}

// ─── CATÁLOGOS ────────────────────────────────────────────────────────────────

export async function dbGetAllCatalogos(): Promise<Record<string, Articulo[]>> {
  const c = sb(); if (!c) return {};
  const { data, error } = await c.from('catalogos').select('*');
  if (error || !data) return {};
  const result: Record<string, Articulo[]> = {};
  for (const r of data) {
    if (!result[r.tienda_id]) result[r.tienda_id] = [];
    result[r.tienda_id].push({
      itemId:      r.item_id,
      descripcion: r.descripcion,
      ubicacion:   r.ubicacion,
      stock:       r.stock,
      costo:       r.costo,
    });
  }
  return result;
}

export async function dbUpsertCatalogo(tiendaId: string, articulos: Articulo[]): Promise<void> {
  const c = sb(); if (!c) return;
  await c.from('catalogos').delete().eq('tienda_id', tiendaId);
  if (!articulos.length) return;
  await c.from('catalogos').insert(
    articulos.map(a => ({
      tienda_id:   tiendaId,
      item_id:     a.itemId,
      descripcion: a.descripcion,
      ubicacion:   a.ubicacion,
      stock:       a.stock,
      costo:       a.costo,
    })),
  );
}

// ─── SOBRANTES SIN STOCK ──────────────────────────────────────────────────────

export async function dbGetSobrantes(): Promise<SobranteSinStock[]> {
  const c = sb(); if (!c) return [];
  const { data, error } = await c
    .from('sobrantes')
    .select('*')
    .order('creado_en', { ascending: false });
  if (error || !data) return [];
  return data.map(r => ({
    id:            r.id,
    tiendaId:      r.tienda_id,
    codigo:        r.codigo,
    descripcion:   r.descripcion,
    ubicacion:     r.ubicacion,
    fotoUri:       r.foto_uri ?? '',
    estado:        r.estado,
    precio:        r.precio,
    cantidad:      r.cantidad,
    usuarioNombre: r.usuario_nombre,
    registradoEn:  r.registrado_en,
  }));
}

export async function dbInsertSobrante(s: SobranteSinStock): Promise<void> {
  const c = sb(); if (!c) return;
  await c.from('sobrantes').upsert({
    id:             s.id,
    tienda_id:      s.tiendaId,
    codigo:         s.codigo,
    descripcion:    s.descripcion,
    ubicacion:      s.ubicacion,
    foto_uri:       s.fotoUri || null,
    estado:         s.estado,
    precio:         s.precio,
    cantidad:       s.cantidad,
    usuario_nombre: s.usuarioNombre,
    registrado_en:  s.registradoEn,
  }, { onConflict: 'id' });
}

export async function dbDeleteSobrante(id: string): Promise<void> {
  const c = sb(); if (!c) return;
  await c.from('sobrantes').delete().eq('id', id);
}

export async function dbUpdateSobranteEstado(id: string, estado: string): Promise<void> {
  const c = sb(); if (!c) return;
  await c.from('sobrantes').update({ estado }).eq('id', id);
}
