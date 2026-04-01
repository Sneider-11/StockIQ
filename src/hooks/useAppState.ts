import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { USUARIOS_INICIALES, TIENDAS, CATALOGO_BASE, Usuario, Articulo, Registro, Tienda, SobranteSinStock, Rol } from '../constants/data';
import { genId, clasificar } from '../utils/helpers';
import { SUPABASE_LISTO } from '../lib/supabase';
import {
  dbGetTiendas, dbUpsertTienda, dbDeleteTienda,
  dbGetUsuarios, dbInsertUsuario, dbDeleteUsuario,
  dbGetRegistros, dbInsertRegistro, dbDeleteRegistro, dbLimpiarRegistrosTienda, dbReiniciarInventario,
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
} as const;

// ─── HELPERS SECURE STORE ─────────────────────────────────────────────────────
type PassMap = Record<string, string>;

async function loadPasswords(): Promise<PassMap> {
  try {
    const raw = await SecureStore.getItemAsync(KEYS.PASSWORDS);
    return raw ? (JSON.parse(raw) as PassMap) : {};
  } catch { return {}; }
}

async function savePasswords(map: PassMap): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEYS.PASSWORDS, JSON.stringify(map));
  } catch {}
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

export function useAppState() {
  const [cargando, setCargando]           = useState(true);
  const [sincronizado, setSincronizado]   = useState(false);
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

  // ── FASE 1: AsyncStorage + SecureStore (inmediato, funciona offline) ────────
  useEffect(() => {
    const cargar = async () => {
      try {
        const [rawTiendas, rawUsuarios, rawRegistros, rawCatalogos, rawSobrantes, rawConfirmados, passwords] = await Promise.all([
          AsyncStorage.getItem(KEYS.TIENDAS),
          AsyncStorage.getItem(KEYS.USUARIOS),
          AsyncStorage.getItem(KEYS.REGISTROS),
          AsyncStorage.getItem(KEYS.CATALOGOS),
          AsyncStorage.getItem(KEYS.SOBRANTES),
          AsyncStorage.getItem(KEYS.CONFIRMADOS_CERO),
          loadPasswords(),
        ]);

        // Tiendas dinámicas
        if (rawTiendas) {
          setTiendas(JSON.parse(rawTiendas) as Tienda[]);
        }

        // Sembrar SecureStore con las contraseñas de USUARIOS_INICIALES si faltan
        let passNeedsSave = false;
        for (const u of USUARIOS_INICIALES) {
          if (!passwords[u.id]) { passwords[u.id] = u.pass; passNeedsSave = true; }
        }
        if (passNeedsSave) savePasswords(passwords);

        if (rawUsuarios) {
          const guardados = JSON.parse(rawUsuarios) as any[];
          const ids = guardados.map(u => u.id);
          const nuevos = USUARIOS_INICIALES.filter(u => !ids.includes(u.id));
          setUsuarios([
            ...guardados.map(u => {
              const tiendasRoles = normalizarTiendasRoles(u);
              const rolGlobal    = u.rol === 'SUPERADMIN' ? 'SUPERADMIN' : deriveRolGlobal(tiendasRoles);
              return {
                ...u,
                rol:          rolGlobal,
                tiendasRoles,
                activo:       u.activo ?? true,
                pass:         passwords[u.id] ?? '',
              } as Usuario;
            }),
            ...nuevos,
          ]);
        }
        if (rawRegistros)   setRegistros(JSON.parse(rawRegistros));
        if (rawCatalogos)   setCatalogos(JSON.parse(rawCatalogos));
        if (rawSobrantes)   setSobrantes(JSON.parse(rawSobrantes));
        if (rawConfirmados) setConfirmadosCero(JSON.parse(rawConfirmados));
      } catch {
        // Si algo falla, la app sigue con los datos iniciales
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  // ── FASE 2: Supabase en segundo plano (no bloquea la UI) ─────────────────
  useEffect(() => {
    if (cargando || !SUPABASE_LISTO || sincronizado) return;
    const sincronizar = async () => {
      try {
        const [sbTiendas, sbUsuarios, sbRegistros, sbCatalogos, sbSobrantes] = await Promise.all([
          dbGetTiendas(),
          dbGetUsuarios(),
          dbGetRegistros(),
          dbGetAllCatalogos(),
          dbGetSobrantes(),
        ]);

        // Tiendas: Supabase como base, locales tienen prioridad
        if (sbTiendas.length > 0) {
          setTiendas(prev => {
            const localIds = new Set(prev.map(t => t.id));
            const extras = sbTiendas.filter(t => !localIds.has(t.id));
            return extras.length > 0 ? [...prev, ...extras] : prev;
          });
        }

        // Merge usuarios: preservar contraseñas locales, normalizar tiendasRoles
        if (sbUsuarios.length > 0) {
          setUsuarios(prev => {
            const merged = [...prev];
            for (const su of sbUsuarios) {
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

        if (sbRegistros.length > 0) {
          setRegistros(prev => {
            const localIds = new Set(prev.map(r => r.id));
            const extras = sbRegistros.filter(r => !localIds.has(r.id));
            return extras.length > 0 ? [...extras, ...prev] : prev;
          });
        }

        if (Object.keys(sbCatalogos).length > 0) {
          setCatalogos(prev => ({ ...sbCatalogos, ...prev }));
        }

        if (sbSobrantes.length > 0) {
          setSobrantes(prev => {
            const localIds = new Set(prev.map(s => s.id));
            const extras = sbSobrantes.filter(s => !localIds.has(s.id));
            return extras.length > 0 ? [...extras, ...prev] : prev;
          });
        }

        setSincronizado(true);
      } catch {
        // Sin conexión — seguimos con datos locales
      }
    };
    sincronizar();
  }, [cargando, sincronizado]);

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
    dbDeleteUsuario(id).catch(() => {});
  }, []);

  // ── Inventario — optimistic update + Supabase fire-and-forget ────────────
  const agregarRegistro = useCallback((r: Registro) => {
    setRegistros(prev => [r, ...prev]);
    dbInsertRegistro(r).catch(() => {});
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
  };
}
