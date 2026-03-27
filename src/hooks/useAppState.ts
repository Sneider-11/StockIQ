import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { USUARIOS_INICIALES, CATALOGO_BASE, Usuario, Articulo, Registro, Tienda } from '../constants/data';
import { genId } from '../utils/helpers';
import { SUPABASE_LISTO } from '../lib/supabase';
import {
  dbGetUsuarios, dbInsertUsuario, dbDeleteUsuario,
  dbGetRegistros, dbInsertRegistro, dbLimpiarRegistrosTienda,
  dbGetAllCatalogos, dbUpsertCatalogo,
} from '../lib/db';

// ─── CLAVES DE ALMACENAMIENTO ─────────────────────────────────────────────────
const KEYS = {
  USUARIOS:  '@stockiq:usuarios',
  REGISTROS: '@stockiq:registros',
  CATALOGOS: '@stockiq:catalogos',
} as const;

export type Pantalla =
  | 'home'
  | 'equipo'
  | 'tienda'
  | 'scanner'
  | 'registros'
  | 'resultados'
  | 'importar';

export function useAppState() {
  const [cargando, setCargando]           = useState(true);
  const [sincronizado, setSincronizado]   = useState(false);
  const [usuarios, setUsuarios]           = useState<Usuario[]>(USUARIOS_INICIALES);
  const [usuario, setUsuario]             = useState<Usuario | null>(null);
  const [pantalla, setPantalla]           = useState<Pantalla>('home');
  const [tiendaActiva, setTiendaActiva]   = useState<Tienda | null>(null);
  const [registros, setRegistros]         = useState<Registro[]>([]);
  const [catalogos, setCatalogos]         = useState<Record<string, Articulo[]>>({});

  // ── FASE 1: AsyncStorage (inmediato, funciona offline) ────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        const [rawUsuarios, rawRegistros, rawCatalogos] = await Promise.all([
          AsyncStorage.getItem(KEYS.USUARIOS),
          AsyncStorage.getItem(KEYS.REGISTROS),
          AsyncStorage.getItem(KEYS.CATALOGOS),
        ]);
        if (rawUsuarios) {
          const guardados: Usuario[] = JSON.parse(rawUsuarios);
          const ids = guardados.map(u => u.id);
          const nuevos = USUARIOS_INICIALES.filter(u => !ids.includes(u.id));
          setUsuarios([...guardados, ...nuevos]);
        }
        if (rawRegistros) setRegistros(JSON.parse(rawRegistros));
        if (rawCatalogos) setCatalogos(JSON.parse(rawCatalogos));
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
        const [sbUsuarios, sbRegistros, sbCatalogos] = await Promise.all([
          dbGetUsuarios(),
          dbGetRegistros(),
          dbGetAllCatalogos(),
        ]);

        // Merge usuarios: preservar contraseñas locales, actualizar el resto
        if (sbUsuarios.length > 0) {
          setUsuarios(prev => {
            const merged = [...prev];
            for (const su of sbUsuarios) {
              const idx = merged.findIndex(u => u.id === su.id);
              if (idx >= 0) {
                merged[idx] = { ...su, pass: merged[idx].pass }; // contraseña siempre local
              } else {
                merged.push(su);
              }
            }
            return merged;
          });
        }

        // Merge registros: agregar los de Supabase que no estén en local
        if (sbRegistros.length > 0) {
          setRegistros(prev => {
            const localIds = new Set(prev.map(r => r.id));
            const extras = sbRegistros.filter(r => !localIds.has(r.id));
            return extras.length > 0 ? [...extras, ...prev] : prev;
          });
        }

        // Catálogos de Supabase como base, los locales tienen prioridad
        if (Object.keys(sbCatalogos).length > 0) {
          setCatalogos(prev => ({ ...sbCatalogos, ...prev }));
        }

        setSincronizado(true);
      } catch {
        // Sin conexión — seguimos con datos locales, sin error para el usuario
      }
    };
    sincronizar();
  }, [cargando, sincronizado]);

  // ── Persistir en AsyncStorage cuando el estado cambia ────────────────────
  useEffect(() => {
    if (cargando) return;
    AsyncStorage.setItem(KEYS.USUARIOS, JSON.stringify(usuarios)).catch(() => {});
  }, [usuarios, cargando]);

  useEffect(() => {
    if (cargando) return;
    AsyncStorage.setItem(KEYS.REGISTROS, JSON.stringify(registros)).catch(() => {});
  }, [registros, cargando]);

  useEffect(() => {
    if (cargando) return;
    AsyncStorage.setItem(KEYS.CATALOGOS, JSON.stringify(catalogos)).catch(() => {});
  }, [catalogos, cargando]);

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
  const navTienda     = useCallback((t: Tienda) => { setTiendaActiva(t); setPantalla('tienda');     }, []);
  const navScanner    = useCallback((t: Tienda) => { setTiendaActiva(t); setPantalla('scanner');    }, []);
  const navRegistros  = useCallback((t: Tienda) => { setTiendaActiva(t); setPantalla('registros');  }, []);
  const navResultados = useCallback((t: Tienda) => { setTiendaActiva(t); setPantalla('resultados'); }, []);
  const navImportar   = useCallback((t: Tienda) => { setTiendaActiva(t); setPantalla('importar');   }, []);
  const volverATienda = useCallback(() => setPantalla('tienda'), []);
  const volverAHome   = useCallback(() => { setPantalla('home'); setTiendaActiva(null); }, []);

  // ── Usuarios — optimistic update + Supabase fire-and-forget ──────────────
  const agregarUsuario = useCallback((u: Omit<Usuario, 'id'>) => {
    const nuevo: Usuario = { ...u, id: genId() };
    setUsuarios(prev => [...prev, nuevo]);
    dbInsertUsuario(nuevo).catch(() => {});
  }, []);

  const editarUsuario = useCallback((id: string, cambios: Partial<Omit<Usuario, 'id'>>) => {
    setUsuarios(prev => {
      const siguiente = prev.map(u => u.id === id ? { ...u, ...cambios } : u);
      const actualizado = siguiente.find(u => u.id === id);
      if (actualizado) dbInsertUsuario(actualizado).catch(() => {});
      return siguiente;
    });
  }, []);

  const eliminarUsuario = useCallback((id: string) => {
    setUsuarios(prev => prev.filter(u => u.id !== id));
    dbDeleteUsuario(id).catch(() => {});
  }, []);

  // ── Inventario — optimistic update + Supabase fire-and-forget ────────────
  const agregarRegistro = useCallback((r: Registro) => {
    setRegistros(prev => [r, ...prev]);
    dbInsertRegistro(r).catch(() => {});
  }, []);

  const cargarCatalogo = useCallback((tiendaId: string, data: Articulo[]) => {
    setCatalogos(prev => ({ ...prev, [tiendaId]: data }));
    dbUpsertCatalogo(tiendaId, data).catch(() => {});
  }, []);

  const getCatalogo = useCallback((tiendaId: string): Articulo[] =>
    catalogos[tiendaId] ?? CATALOGO_BASE,
  [catalogos]);

  const getRegistrosTienda = useCallback((tiendaId: string): Registro[] =>
    registros.filter(r => r.tiendaId === tiendaId),
  [registros]);

  const limpiarRegistrosTienda = useCallback((tiendaId: string) => {
    setRegistros(prev => prev.filter(r => r.tiendaId !== tiendaId));
    dbLimpiarRegistrosTienda(tiendaId).catch(() => {});
  }, []);

  return {
    // Estado de carga
    cargando,
    sincronizado,   // true cuando Supabase ya respondió (útil para indicadores)
    // State
    usuarios, usuario, pantalla, tiendaActiva, registros, catalogos,
    // Auth
    login, logout,
    // Navegación
    navTienda, navScanner, navRegistros, navResultados, navImportar,
    volverATienda, volverAHome,
    setPantalla,
    // Usuarios
    agregarUsuario, editarUsuario, eliminarUsuario,
    // Inventario
    agregarRegistro, cargarCatalogo, getCatalogo, getRegistrosTienda,
    limpiarRegistrosTienda,
  };
}
