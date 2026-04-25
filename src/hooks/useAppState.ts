import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { USUARIOS_INICIALES, TIENDAS, CATALOGO_BASE, Usuario, Articulo, Registro, Tienda, SobranteSinStock, Rol } from '../constants/data';
import { genId, clasificar } from '../utils/helpers';
import { initSupabase, getSupabaseListo } from '../lib/supabase';
import {
  dbGetTiendas, dbUpsertTienda, dbDeleteTienda,
  dbGetUsuarios, dbInsertUsuario, dbDeleteUsuario,
  dbGetRegistros, dbInsertRegistro, dbActualizarRegistro, dbDeleteRegistro, dbLimpiarRegistrosTienda, dbReiniciarInventario,
  dbGetAllCatalogos, dbUpsertCatalogo,
  dbGetSobrantes, dbInsertSobrante, dbDeleteSobrante, dbUpdateSobranteEstado,
} from '../lib/db';

// ─── CLAVES DE ALMACENAMIENTO ─────────────────────────────────────────────────
const KEYS = {
  USUARIOS:          '@stockiq:usuarios_v4',
  TIENDAS:           '@stockiq:tiendas_v1',
  REGISTROS:         '@stockiq:registros',
  CATALOGOS:         '@stockiq:catalogos',
  SOBRANTES:         '@stockiq:sobrantes',
  CONFIRMADOS_CERO:  '@stockiq:confirmados_cero',
  PASSWORDS:         'stockiq_pass_v1',
  DELETED_USERS:     '@stockiq:deleted_users_v1',
  DELETED_TIENDAS:   '@stockiq:deleted_tiendas_v1',
} as const;

// ─── HELPERS SECURE STORE ─────────────────────────────────────────────────────
type PassMap = Record<string, string>;

// Timeout helper — resuelve con null si la promesa tarda más de `ms` milisegundos.
// Usado para evitar que SecureStore cuelgue indefinidamente en Expo Go / Android.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
  ]);
}

async function loadPasswords(): Promise<PassMap> {
  try {
    // SecureStore puede congelarse sin resolver en Android/Expo Go.
    // Si tarda más de 4 s, devolvemos {} y la app arranca sin contraseñas del store.
    const raw = await withTimeout(SecureStore.getItemAsync(KEYS.PASSWORDS), 4000);
    return raw ? (JSON.parse(raw) as PassMap) : {};
  } catch (err) {
    if (__DEV__) console.warn('[useAppState] loadPasswords error:', err);
    return {};
  }
}

async function savePasswords(map: PassMap): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEYS.PASSWORDS, JSON.stringify(map));
  } catch (err) {
    if (__DEV__) console.warn('[useAppState] savePasswords error:', err);
  }
}

// Migrar rol legacy 'AUDITOR' → 'ADMIN'
function migrateRol(rol: string): Usuario['rol'] {
  if (rol === 'AUDITOR') return 'ADMIN';
  return rol as Usuario['rol'];
}

/**
 * Deriva el rol global a partir de tiendasRoles.
 * Si alguna tienda tiene 'ADMIN' → global es 'ADMIN', si todas son 'CONTADOR' → 'CONTADOR'.
 */
function deriveRolGlobal(tiendasRoles: Record<string, 'ADMIN' | 'CONTADOR'>): 'ADMIN' | 'CONTADOR' {
  const roles = Object.values(tiendasRoles);
  if (roles.length === 0) return 'CONTADOR';
  return roles.includes('ADMIN') ? 'ADMIN' : 'CONTADOR';
}

/** Asegura que tiendasRoles exista y sea coherente con tiendas[]. */
function normalizarTiendasRoles(u: any): Record<string, 'ADMIN' | 'CONTADOR'> {
  if (u.rol === 'SUPERADMIN') return {};
  if (u.tiendasRoles && typeof u.tiendasRoles === 'object') return u.tiendasRoles;
  // Migración: construir tiendasRoles a partir del rol global y tiendas[]
  const rolLegacy: 'ADMIN' | 'CONTADOR' = migrateRol(u.rol) === 'ADMIN' ? 'ADMIN' : 'CONTADOR';
  const resultado: Record<string, 'ADMIN' | 'CONTADOR'> = {};
  for (const tid of (u.tiendas ?? [])) resultado[tid] = rolLegacy;
  return resultado;
}

export type Pantalla =
  | 'home'
  | 'equipo'
  | 'tiendas'        // gestión de tiendas (solo SUPERADMIN)
  | 'tienda'
  | 'scanner'
  | 'registros'      // todos los registros de la tienda (admin ve todos, contador solo suyos)
  | 'mis_registros'  // solo los registros propios con edición (para admin/superadmin)
  | 'resultados'
  | 'importar'
  | 'sobrantes'
  | 'perfil'
  | 'reporte';

async function loadDeletedUsers(): Promise<Set<string>> {
  try {
    const raw = await withTimeout(AsyncStorage.getItem(KEYS.DELETED_USERS), 3000);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

async function saveDeletedUsers(set: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.DELETED_USERS, JSON.stringify([...set]));
  } catch {}
}

async function loadDeletedTiendas(): Promise<Set<string>> {
  try {
    const raw = await withTimeout(AsyncStorage.getItem(KEYS.DELETED_TIENDAS), 3000);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

async function saveDeletedTiendas(set: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.DELETED_TIENDAS, JSON.stringify([...set]));
  } catch {}
}

export function useAppState() {
  const [cargando, setCargando]           = useState(true);
  const [sincronizado, setSincronizado]   = useState(false);
  const deletedUsersRef   = useRef<Set<string>>(new Set());
  const deletedTiendasRef = useRef<Set<string>>(new Set());
  const [tiendas, setTiendas]             = useState<Tienda[]>(TIENDAS);
  const [usuarios, setUsuarios]           = useState<Usuario[]>(USUARIOS_INICIALES);
  const [usuario, setUsuario]             = useState<Usuario | null>(null);
  const [pantalla, setPantalla]           = useState<Pantalla>('home');
  const [tiendaActiva, setTiendaActiva]   = useState<Tienda | null>(null);
  const [registros, setRegistros]         = useState<Registro[]>([]);
  const [catalogos, setCatalogos]         = useState<Record<string, Articulo[]>>({});
  const [sobrantes, setSobrantes]         = useState<SobranteSinStock[]>([]);
  // confirmadosCero: tiendaId → [itemId, ...] artículos con conteo cero confirmados por Admin/SuperAdmin
  const [confirmadosCero, setConfirmadosCero] = useState<Record<string, string[]>>({});

  // Ref siempre actualizado con los registros más recientes — permite acceder al
  // estado actual desde efectos sin incluirlo como dependencia.
  const registrosRef = useRef<Registro[]>([]);

  // ── FASE 1: AsyncStorage + SecureStore (inmediato, funciona offline) ────────
  useEffect(() => {
    // Safety-net: si la carga local tarda más de 7 s (p.ej. SecureStore congelado
    // en Android/Expo Go), desbloquea la app con los datos iniciales de todos modos.
    const safetyTimer = setTimeout(() => {
      if (__DEV__) console.warn('[useAppState] Safety-net: carga local superó 7 s, desbloqueando app.');
      setCargando(false);
    }, 7000);

    const cargar = async () => {
      try {
        const [rawTiendas, rawUsuarios, rawRegistros, rawCatalogos, rawSobrantes, rawConfirmados, passwords, deletedUsers, deletedTiendas] = await Promise.all([
          withTimeout(AsyncStorage.getItem(KEYS.TIENDAS),          5000),
          withTimeout(AsyncStorage.getItem(KEYS.USUARIOS),         5000),
          withTimeout(AsyncStorage.getItem(KEYS.REGISTROS),        5000),
          withTimeout(AsyncStorage.getItem(KEYS.CATALOGOS),        5000),
          withTimeout(AsyncStorage.getItem(KEYS.SOBRANTES),        5000),
          withTimeout(AsyncStorage.getItem(KEYS.CONFIRMADOS_CERO), 5000),
          loadPasswords(),
          loadDeletedUsers(),
          loadDeletedTiendas(),
        ]);
        deletedUsersRef.current   = deletedUsers;
        deletedTiendasRef.current = deletedTiendas;

        // Tiendas dinámicas — excluir las eliminadas explícitamente
        if (rawTiendas) {
          const all = JSON.parse(rawTiendas) as Tienda[];
          setTiendas(all.filter(t => !deletedTiendas.has(t.id)));
        }

        // Sembrar SecureStore con las contraseñas de USUARIOS_INICIALES si faltan,
        // pero solo para usuarios que NO han sido eliminados explícitamente.
        let passNeedsSave = false;
        for (const u of USUARIOS_INICIALES) {
          if (deletedUsers.has(u.id)) continue;
          if (!passwords[u.id]) { passwords[u.id] = u.pass; passNeedsSave = true; }
        }
        if (passNeedsSave) savePasswords(passwords);

        if (rawUsuarios) {
          const guardados = JSON.parse(rawUsuarios) as any[];
          // Excluir usuarios que fueron eliminados explícitamente (blocklist)
          const guardadosFiltrados = guardados.filter((u: any) => !deletedUsers.has(u.id));
          const ids = guardadosFiltrados.map((u: any) => u.id);
          // Solo re-agregar semillas que no han sido eliminadas y no están ya guardadas
          const nuevos = USUARIOS_INICIALES.filter(
            u => !ids.includes(u.id) && !deletedUsers.has(u.id),
          );
          setUsuarios([
            ...guardadosFiltrados.map((u: any) => {
              const tiendasRoles = normalizarTiendasRoles(u);
              const rolGlobal    = u.rol === 'SUPERADMIN' ? 'SUPERADMIN' : deriveRolGlobal(tiendasRoles);
              const passLocal = passwords[u.id]
                ?? USUARIOS_INICIALES.find(i => i.id === u.id)?.pass
                ?? '';
              return {
                ...u,
                rol:          rolGlobal,
                tiendasRoles,
                activo:       u.activo ?? true,
                pass:         passLocal,
              } as Usuario;
            }),
            ...nuevos,
          ]);
        }
        if (rawRegistros)   setRegistros(JSON.parse(rawRegistros));
        if (rawCatalogos)   setCatalogos(JSON.parse(rawCatalogos));
        if (rawSobrantes)   setSobrantes(JSON.parse(rawSobrantes));
        if (rawConfirmados) setConfirmadosCero(JSON.parse(rawConfirmados));
      } catch (err) {
        // Si algo falla, la app sigue con los datos iniciales
        if (__DEV__) console.warn('[useAppState] Error al cargar datos locales:', err);
      } finally {
        clearTimeout(safetyTimer);
        setCargando(false);
      }
    };
    cargar();
    return () => clearTimeout(safetyTimer);
  }, []);

  // Evita ejecuciones concurrentes del sync (ej. foreground + timer)
  const sincronizandoRef = useRef(false);

  // ── FASE 3: Re-sync al volver a primer plano ──────────────────────────────
  useEffect(() => {
    if (cargando) return;
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') setSincronizado(false);
    });
    return () => sub.remove();
  }, [cargando]);

  // ── FASE 2: Supabase en segundo plano (no bloquea la UI) ─────────────────
  // initSupabase() se llama AQUÍ — después del primer render — para que
  // createClient() no ejecute en el hilo JS durante la carga inicial.
  useEffect(() => {
    if (cargando || sincronizado) return;
    if (sincronizandoRef.current) return;  // sync ya en curso
    initSupabase();                  // inicialización diferida, segura
    if (!getSupabaseListo()) return; // sin credenciales válidas → solo offline
    const sincronizar = async () => {
      sincronizandoRef.current = true;
      try {
        // Timeout de 12 s para no quedar bloqueado si Supabase no responde
        const sbTimeout = <T,>(p: Promise<T>): Promise<T> =>
          Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('sb-timeout')), 12000))]);

        const tiendaIdsFilter = (usuario && usuario.rol !== 'SUPERADMIN') ? usuario.tiendas : undefined;
        const [sbTiendas, sbUsuarios, sbRegistros, sbCatalogos, sbSobrantes] = await sbTimeout(
          Promise.all([
            dbGetTiendas(),
            dbGetUsuarios(),
            dbGetRegistros(tiendaIdsFilter),
            dbGetAllCatalogos(),
            dbGetSobrantes(),
          ]),
        );

        // Tiendas: Supabase actualiza las existentes y añade nuevas.
        // Ignorar tiendas que fueron eliminadas localmente (deletedTiendasRef).
        if (sbTiendas.length > 0) {
          setTiendas(prev => {
            const sbFiltered = sbTiendas.filter(t => !deletedTiendasRef.current.has(t.id));
            const sbMap   = new Map(sbFiltered.map(t => [t.id, t]));
            const updated = prev.map(t => sbMap.has(t.id) ? { ...t, ...sbMap.get(t.id)! } : t);
            const localIds = new Set(prev.map(t => t.id));
            const extras   = sbFiltered.filter(t => !localIds.has(t.id));
            return extras.length > 0 ? [...updated, ...extras] : updated;
          });
        }

        // Merge usuarios: preservar contraseñas locales, normalizar tiendasRoles
        // Ignorar usuarios que fueron eliminados localmente (deletedUsersRef)
        if (sbUsuarios.length > 0) {
          setUsuarios(prev => {
            const merged = [...prev];
            for (const su of sbUsuarios) {
              if (deletedUsersRef.current.has(su.id)) continue;
              const tiendasRoles = normalizarTiendasRoles(su);
              const rolGlobal: Rol = su.rol === 'SUPERADMIN' ? 'SUPERADMIN' : deriveRolGlobal(tiendasRoles);
              const normalizado  = { ...su, tiendasRoles, rol: rolGlobal };
              const idx = merged.findIndex(u => u.id === su.id);
              if (idx >= 0) {
                merged[idx] = { ...normalizado, pass: merged[idx].pass };
              } else {
                merged.push(normalizado);
              }
            }
            return merged;
          });
        }

        // ── Sync bidireccional de registros ─────────────────────────────────
        // 1. Bajar y actualizar registros de Supabase (deep-merge por ID)
        if (sbRegistros.length > 0) {
          setRegistros(prev => {
            const sbMap = new Map(sbRegistros.map((r: Registro) => [r.id, r]));
            const updated = prev.map(r => sbMap.has(r.id) ? { ...r, ...sbMap.get(r.id)! } : r);
            const localIds = new Set(prev.map(r => r.id));
            const extras = sbRegistros.filter((r: Registro) => !localIds.has(r.id));
            return extras.length > 0 ? [...extras, ...updated] : updated;
          });
        }
        // 2. Subir a Supabase los registros locales que no están en la nube
        // Si ya existe uno del mismo usuario+artículo+tienda, actualizar en vez de duplicar (BUG-03)
        const sbIds = new Set(sbRegistros.map((r: Registro) => r.id));
        const porSubir = registrosRef.current.filter(r => !sbIds.has(r.id));
        if (porSubir.length > 0) {
          if (__DEV__) console.log(`[StockIQ] Subiendo ${porSubir.length} registro(s) local(es) a Supabase...`);
          let subidos = 0, errores = 0;
          for (const r of porSubir) {
            try {
              const existing = sbRegistros.find(
                (sb: Registro) => sb.tiendaId === r.tiendaId && sb.itemId === r.itemId && sb.usuarioNombre === r.usuarioNombre,
              );
              if (existing) {
                await dbActualizarRegistro(existing.id, {
                  cantidad: r.cantidad, nota: r.nota, usuarioNombre: r.usuarioNombre,
                  clasificacion: r.clasificacion, escaneadoEn: r.escaneadoEn,
                });
                setRegistros(prev => prev.map(reg => reg.id === r.id ? { ...reg, id: existing.id } : reg));
              } else {
                await dbInsertRegistro(r);
              }
              subidos++;
            } catch (e) {
              errores++;
              if (__DEV__) console.warn('[StockIQ] Error subiendo registro:', (e as Error)?.message);
            }
          }
          if (__DEV__) {
            if (errores > 0) console.warn(`[StockIQ] ${errores} registro(s) no se pudieron subir.`);
            else console.log(`[StockIQ] ${subidos} registro(s) sincronizado(s) correctamente.`);
          }
        }

        if (Object.keys(sbCatalogos).length > 0) {
          setCatalogos(prev => ({ ...prev, ...sbCatalogos }));
        }

        if (sbSobrantes.length > 0) {
          setSobrantes(prev => {
            const localIds = new Set(prev.map(s => s.id));
            const extras = sbSobrantes.filter(s => !localIds.has(s.id));
            return extras.length > 0 ? [...extras, ...prev] : prev;
          });
        }

        setSincronizado(true);
      } catch (err) {
        // Sin conexión o timeout — seguimos con datos locales
        if (__DEV__) console.warn('[useAppState] Supabase sync falló:', err);
      } finally {
        sincronizandoRef.current = false;
      }
    };
    sincronizar();
  }, [cargando, sincronizado]);

  // ─── Sync liviano: descarga + sube pendientes, cada 15 s en primer plano ──
  const refreshRegistros = useCallback(async () => {
    if (!getSupabaseListo()) return;
    try {
      const tiendaIdsFilter = (usuario && usuario.rol !== 'SUPERADMIN') ? usuario.tiendas : undefined;
      const sbRegistros = await dbGetRegistros(tiendaIdsFilter);
      if (sbRegistros.length > 0) {
        setRegistros(prev => {
          const sbMap = new Map(sbRegistros.map((r: Registro) => [r.id, r]));
          const updated = prev.map(r => sbMap.has(r.id) ? { ...r, ...sbMap.get(r.id)! } : r);
          const localIds = new Set(prev.map(r => r.id));
          const extras = sbRegistros.filter((r: Registro) => !localIds.has(r.id));
          return extras.length > 0 ? [...extras, ...updated] : updated;
        });
      }
      // Subir registros locales pendientes que Supabase aún no conoce
      const sbIds = new Set(sbRegistros.map((r: Registro) => r.id));
      const porSubir = registrosRef.current.filter(r => !sbIds.has(r.id));
      for (const r of porSubir) {
        try {
          const existing = sbRegistros.find(
            (sb: Registro) => sb.tiendaId === r.tiendaId && sb.itemId === r.itemId && sb.usuarioNombre === r.usuarioNombre,
          );
          if (existing) {
            await dbActualizarRegistro(existing.id, {
              cantidad: r.cantidad, nota: r.nota, usuarioNombre: r.usuarioNombre,
              clasificacion: r.clasificacion, escaneadoEn: r.escaneadoEn,
            });
            setRegistros(prev => prev.map(reg => reg.id === r.id ? { ...reg, id: existing.id } : reg));
          } else {
            await dbInsertRegistro(r);
          }
        } catch (e) {
          if (__DEV__) console.warn('[StockIQ] refreshRegistros upload error:', (e as Error)?.message);
        }
      }
    } catch {}
  }, [usuario]);

  useEffect(() => {
    if (cargando) return;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refreshRegistros();
    }, 15000);
    return () => clearInterval(timer);
  }, [cargando, refreshRegistros]);

  // ── Persistir en AsyncStorage cuando el estado cambia ────────────────────
  useEffect(() => {
    if (cargando) return;
    AsyncStorage.setItem(KEYS.TIENDAS, JSON.stringify(tiendas)).catch(() => {});
  }, [tiendas, cargando]);

  useEffect(() => {
    if (cargando) return;
    const sinPass = usuarios.map(({ pass: _pass, ...u }) => u);
    AsyncStorage.setItem(KEYS.USUARIOS, JSON.stringify(sinPass)).catch(() => {});
  }, [usuarios, cargando]);

  useEffect(() => {
    registrosRef.current = registros;
    if (cargando) return;
    AsyncStorage.setItem(KEYS.REGISTROS, JSON.stringify(registros)).catch(() => {});
  }, [registros, cargando]);

  useEffect(() => {
    if (cargando) return;
    AsyncStorage.setItem(KEYS.CATALOGOS, JSON.stringify(catalogos)).catch(() => {});
  }, [catalogos, cargando]);

  useEffect(() => {
    if (cargando) return;
    AsyncStorage.setItem(KEYS.SOBRANTES, JSON.stringify(sobrantes)).catch(() => {});
  }, [sobrantes, cargando]);

  useEffect(() => {
    if (cargando) return;
    AsyncStorage.setItem(KEYS.CONFIRMADOS_CERO, JSON.stringify(confirmadosCero)).catch(() => {});
  }, [confirmadosCero, cargando]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = useCallback((u: Usuario) => {
    setUsuario(u);
    setPantalla('home');
  }, []);

  const logout = useCallback(() => {
    setUsuario(null);
    setPantalla('home');
    setTiendaActiva(null);
  }, []);

  // ── Navegación ────────────────────────────────────────────────────────────
  const navTienda        = useCallback((t: Tienda) => { setTiendaActiva(t); setPantalla('tienda');        }, []);
  const navScanner       = useCallback((t: Tienda) => { setTiendaActiva(t); setPantalla('scanner');       }, []);
  const navRegistros     = useCallback((t: Tienda) => { setTiendaActiva(t); setPantalla('registros');     }, []);
  const navMisRegistros  = useCallback((t: Tienda) => { setTiendaActiva(t); setPantalla('mis_registros'); }, []);
  const navResultados    = useCallback((t: Tienda) => { setTiendaActiva(t); setPantalla('resultados');    }, []);
  const navImportar      = useCallback((t: Tienda) => { setTiendaActiva(t); setPantalla('importar');      }, []);
  const navSobrantes     = useCallback((t: Tienda) => { setTiendaActiva(t); setPantalla('sobrantes');     }, []);
  const navPerfil        = useCallback(() => setPantalla('perfil'), []);
  const volverATienda    = useCallback(() => setPantalla('tienda'), []);
  const volverAHome      = useCallback(() => { setPantalla('home'); setTiendaActiva(null); }, []);

  // ── Tiendas — CRUD ────────────────────────────────────────────────────────
  const agregarTienda = useCallback((t: Omit<Tienda, 'id'>) => {
    const nueva: Tienda = { ...t, id: genId() };
    setTiendas(prev => [...prev, nueva]);
    dbUpsertTienda(nueva).catch(() => {});
  }, []);

  const editarTienda = useCallback((id: string, cambios: Partial<Omit<Tienda, 'id'>>) => {
    setTiendas(prev => {
      const siguiente = prev.map(t => t.id === id ? { ...t, ...cambios } : t);
      const actualizada = siguiente.find(t => t.id === id);
      if (actualizada) dbUpsertTienda(actualizada).catch(() => {});
      return siguiente;
    });
  }, []);

  const eliminarTienda = useCallback((id: string) => {
    setTiendas(prev => prev.filter(t => t.id !== id));
    deletedTiendasRef.current.add(id);
    saveDeletedTiendas(deletedTiendasRef.current);
    dbDeleteTienda(id).catch(() => {});
  }, []);

  // ── Usuarios — optimistic update + SecureStore + Supabase fire-and-forget ──
  const agregarUsuario = useCallback((u: Omit<Usuario, 'id'>) => {
    const tiendasRoles = u.rol === 'SUPERADMIN' ? {} : (u.tiendasRoles ?? {});
    const rolGlobal    = u.rol === 'SUPERADMIN' ? 'SUPERADMIN' : deriveRolGlobal(tiendasRoles);
    const nuevo: Usuario = { ...u, id: genId(), activo: true, tiendasRoles, rol: rolGlobal };
    setUsuarios(prev => [...prev, nuevo]);
    loadPasswords().then(map => { map[nuevo.id] = nuevo.pass; savePasswords(map); });
    dbInsertUsuario(nuevo).catch(() => {});
  }, []);

  const editarUsuario = useCallback((id: string, cambios: Partial<Omit<Usuario, 'id'>>) => {
    setUsuarios(prev => {
      const siguiente = prev.map(u => {
        if (u.id !== id) return u;
        const merged       = { ...u, ...cambios };
        // Si cambió tiendasRoles, recalcular rol global
        if (cambios.tiendasRoles !== undefined && merged.rol !== 'SUPERADMIN') {
          merged.rol    = deriveRolGlobal(merged.tiendasRoles);
          merged.tiendas = Object.keys(merged.tiendasRoles);
        }
        return merged;
      });
      const actualizado = siguiente.find(u => u.id === id);
      if (actualizado) {
        dbInsertUsuario(actualizado).catch(() => {});
        if (cambios.pass) {
          loadPasswords().then(map => { map[id] = cambios.pass!; savePasswords(map); });
        }
      }
      return siguiente;
    });
  }, []);

  const eliminarUsuario = useCallback((id: string) => {
    setUsuarios(prev => prev.filter(u => u.id !== id));
    loadPasswords().then(map => { delete map[id]; savePasswords(map); });
    deletedUsersRef.current.add(id);
    saveDeletedUsers(deletedUsersRef.current);
    dbDeleteUsuario(id).catch(() => {});
  }, []);

  // ── Inventario — optimistic update + Supabase fire-and-forget ────────────
  const agregarRegistro = useCallback((r: Registro) => {
    setRegistros(prev => [r, ...prev]);
    dbInsertRegistro(r).catch(err => {
      // El registro se guardó en AsyncStorage; se sincronizará en la próxima sesión.
      if (__DEV__) console.warn('[StockIQ] agregarRegistro no se sincronizó en vivo:', err?.message ?? err);
    });
  }, []);

  const eliminarRegistro = useCallback((id: string) => {
    setRegistros(prev => prev.filter(r => r.id !== id));
    dbDeleteRegistro(id).catch(() => {});
  }, []);

  const editarRegistro = useCallback((id: string, cambios: Partial<Pick<Registro, 'cantidad' | 'nota' | 'fotoUri'>>) => {
    setRegistros(prev => prev.map(r => {
      if (r.id !== id) return r;
      const actualizado = { ...r, ...cambios };
      if (cambios.cantidad !== undefined) {
        actualizado.clasificacion = clasificar(actualizado.stockSistema, actualizado.cantidad);
      }
      dbInsertRegistro(actualizado).catch(() => {});
      return actualizado;
    }));
  }, []);

  const cargarCatalogo = useCallback((tiendaId: string, data: Articulo[]) => {
    setCatalogos(prev => ({ ...prev, [tiendaId]: data }));
    dbUpsertCatalogo(tiendaId, data).catch(() => {});
  }, []);

  const getCatalogo = useCallback((tiendaId: string): Articulo[] =>
    catalogos[tiendaId] ?? CATALOGO_BASE,
  [catalogos]);

  const getRegistrosTienda  = useCallback((tiendaId: string): Registro[] =>
    registros.filter(r => r.tiendaId === tiendaId),
  [registros]);

  const agregarSobrante = useCallback((s: SobranteSinStock) => {
    setSobrantes(prev => [s, ...prev]);
    dbInsertSobrante(s).catch(() => {});
  }, []);

  const eliminarSobrante = useCallback((id: string) => {
    setSobrantes(prev => prev.filter(s => s.id !== id));
    dbDeleteSobrante(id).catch(() => {});
  }, []);

  const editarSobrante = useCallback((id: string, cambios: Partial<Omit<SobranteSinStock, 'id'>>) => {
    setSobrantes(prev => prev.map(s => s.id === id ? { ...s, ...cambios } : s));
    if (cambios.estado) {
      dbUpdateSobranteEstado(id, cambios.estado).catch(() => {});
    }
  }, []);

  const getSobrantesTienda = useCallback((tiendaId: string): SobranteSinStock[] =>
    sobrantes.filter(s => s.tiendaId === tiendaId),
  [sobrantes]);

  const limpiarRegistrosTienda = useCallback((tiendaId: string) => {
    setRegistros(prev => prev.filter(r => r.tiendaId !== tiendaId));
    dbLimpiarRegistrosTienda(tiendaId).catch(() => {});
  }, []);

  const reiniciarInventario = useCallback((tiendaId: string) => {
    setRegistros(prev => prev.filter(r => r.tiendaId !== tiendaId));
    setSobrantes(prev => prev.filter(s => s.tiendaId !== tiendaId));
    setCatalogos(prev => { const next = { ...prev }; delete next[tiendaId]; return next; });
    setConfirmadosCero(prev => { const next = { ...prev }; delete next[tiendaId]; return next; });
    dbReiniciarInventario(tiendaId).catch(() => {});
  }, []);

  const confirmarCero = useCallback((tiendaId: string, itemId: string) => {
    setConfirmadosCero(prev => {
      const lista = prev[tiendaId] ?? [];
      if (lista.includes(itemId)) return prev;
      return { ...prev, [tiendaId]: [...lista, itemId] };
    });
  }, []);

  const desconfirmarCero = useCallback((tiendaId: string, itemId: string) => {
    setConfirmadosCero(prev => {
      const lista = (prev[tiendaId] ?? []).filter(id => id !== itemId);
      return { ...prev, [tiendaId]: lista };
    });
  }, []);

  const getConfirmadosCero = useCallback((tiendaId: string): string[] =>
    confirmadosCero[tiendaId] ?? [],
  [confirmadosCero]);

  /**
   * Cambia el modo de inventario de una tienda a ONLINE u OFFLINE.
   * OFFLINE bloquea el acceso de auditores/contadores desde cualquier pantalla.
   */
  const toggleModoInventario = useCallback((
    tiendaId: string,
    modo: 'ONLINE' | 'OFFLINE',
    cerradoPor: string,
  ) => {
    editarTienda(tiendaId, modo === 'OFFLINE'
      ? { modoInventario: 'OFFLINE', cerradoPor }
      : { modoInventario: 'ONLINE',  cerradoPor: undefined },
    );
  }, [editarTienda]);

  return {
    // Estado de carga
    cargando,
    sincronizado,
    // State
    tiendas, usuarios, usuario, pantalla, tiendaActiva, registros, catalogos, sobrantes,
    // Auth
    login, logout,
    // Navegación
    navTienda, navScanner, navRegistros, navMisRegistros, navResultados, navImportar, navSobrantes, navPerfil,
    volverATienda, volverAHome,
    setPantalla,
    // Tiendas
    agregarTienda, editarTienda, eliminarTienda,
    // Usuarios
    agregarUsuario, editarUsuario, eliminarUsuario,
    // Inventario
    agregarRegistro, eliminarRegistro, editarRegistro, cargarCatalogo, getCatalogo, getRegistrosTienda,
    limpiarRegistrosTienda, reiniciarInventario,
    // Sobrantes sin stock
    agregarSobrante, eliminarSobrante, editarSobrante, getSobrantesTienda,
    // Confirmados cero
    confirmadosCero, confirmarCero, desconfirmarCero, getConfirmadosCero,
    // Modo inventario
    toggleModoInventario,
    // Refresh manual
    refresh: () => setSincronizado(false),
    refreshRegistros,
  };
}
