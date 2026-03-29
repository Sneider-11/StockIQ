/**
 * db.ts — Capa de acceso a datos de Supabase
 *
 * Todas las funciones son fire-and-forget seguras:
 * si SUPABASE_LISTO es false o hay error de red, devuelven
 * valor vacío sin lanzar excepción (el llamador usa .catch(() => {})).
 */

import { supabase, SUPABASE_LISTO } from './supabase';
import { Usuario, Articulo, Registro, SobranteSinStock } from '../constants/data';

// ─── USUARIOS ─────────────────────────────────────────────────────────────────

export async function dbGetUsuarios(): Promise<Usuario[]> {
  if (!SUPABASE_LISTO) return [];
  const { data, error } = await supabase.from('usuarios').select('*');
  if (error || !data) return [];
  return data.map(r => ({
    id:       r.id,
    cedula:   r.cedula,
    nombre:   r.nombre,
    rol:      r.rol,
    tiendas:  r.tiendas,
    pass:     r.pass,
    telefono: r.telefono ?? undefined,
  }));
}

export async function dbInsertUsuario(u: Usuario): Promise<void> {
  if (!SUPABASE_LISTO) return;
  await supabase.from('usuarios').upsert(
    {
      id:       u.id,
      cedula:   u.cedula,
      nombre:   u.nombre,
      rol:      u.rol,
      tiendas:  u.tiendas,
      pass:     u.pass,
      telefono: u.telefono ?? null,
    },
    { onConflict: 'id' },
  );
}

export async function dbDeleteUsuario(id: string): Promise<void> {
  if (!SUPABASE_LISTO) return;
  await supabase.from('usuarios').delete().eq('id', id);
}

// ─── REGISTROS ────────────────────────────────────────────────────────────────

export async function dbGetRegistros(): Promise<Registro[]> {
  if (!SUPABASE_LISTO) return [];
  const { data, error } = await supabase
    .from('registros')
    .select('*')
    .order('creado_en', { ascending: false });
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
    fotoUri:       null,          // las fotos son URIs locales, no se suben en esta fase
    usuarioNombre: r.usuario_nombre,
    escaneadoEn:   r.escaneado_en,
    clasificacion: r.clasificacion,
  }));
}

export async function dbInsertRegistro(r: Registro): Promise<void> {
  if (!SUPABASE_LISTO) return;
  await supabase.from('registros').insert({
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
  if (!SUPABASE_LISTO) return;
  await supabase.from('registros').delete().eq('id', id);
}

export async function dbLimpiarRegistrosTienda(tiendaId: string): Promise<void> {
  if (!SUPABASE_LISTO) return;
  await supabase.from('registros').delete().eq('tienda_id', tiendaId);
}

// ─── CATÁLOGOS ────────────────────────────────────────────────────────────────

export async function dbGetAllCatalogos(): Promise<Record<string, Articulo[]>> {
  if (!SUPABASE_LISTO) return {};
  const { data, error } = await supabase.from('catalogos').select('*');
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

// ─── SOBRANTES SIN STOCK ──────────────────────────────────────────────────────

/**
 * Tabla requerida en Supabase:
 * CREATE TABLE sobrantes (
 *   id TEXT PRIMARY KEY,
 *   tienda_id TEXT NOT NULL,
 *   codigo TEXT NOT NULL,
 *   descripcion TEXT NOT NULL,
 *   ubicacion TEXT NOT NULL,
 *   foto_uri TEXT,
 *   estado TEXT NOT NULL,
 *   precio NUMERIC NOT NULL,
 *   cantidad INTEGER NOT NULL,
 *   usuario_nombre TEXT NOT NULL,
 *   registrado_en TEXT NOT NULL,
 *   creado_en TIMESTAMPTZ DEFAULT NOW()
 * );
 */

export async function dbGetSobrantes(): Promise<SobranteSinStock[]> {
  if (!SUPABASE_LISTO) return [];
  const { data, error } = await supabase
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
  if (!SUPABASE_LISTO) return;
  await supabase.from('sobrantes').upsert({
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
  if (!SUPABASE_LISTO) return;
  await supabase.from('sobrantes').delete().eq('id', id);
}

export async function dbUpdateSobranteEstado(id: string, estado: string): Promise<void> {
  if (!SUPABASE_LISTO) return;
  await supabase.from('sobrantes').update({ estado }).eq('id', id);
}

// ─── CATÁLOGOS ────────────────────────────────────────────────────────────────

export async function dbUpsertCatalogo(tiendaId: string, articulos: Articulo[]): Promise<void> {
  if (!SUPABASE_LISTO) return;
  // Reemplaza el catálogo completo de esa tienda
  await supabase.from('catalogos').delete().eq('tienda_id', tiendaId);
  if (!articulos.length) return;
  await supabase.from('catalogos').insert(
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
