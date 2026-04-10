/**
 * supabase.ts — Inicialización DIFERIDA del cliente Supabase
 *
 * ⚠️  NO se llama a createClient al cargar el módulo.
 *     En iOS/Expo Go, la inicialización síncrona de supabase-js bloquea
 *     el hilo JS antes del primer render, impidiendo que la app arranque.
 *
 * Uso:
 *   1. La app carga → muestra login (sin Supabase).
 *   2. Después del primer render, useAppState llama a initSupabase().
 *   3. getSupabaseListo() devuelve true → el sync en segundo plano puede ejecutarse.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON ?? '';

const URL_VALIDA =
  SUPABASE_URL.length > 0 &&
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('TU_PROYECTO') &&
  !SUPABASE_URL.includes('your-project');

// ─── Estado interno (mutable, no exportado como const) ────────────────────────
let _client: SupabaseClient | null = null;
let _listo  = false;
let _intentado = false;   // evita reintentos si ya falló

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Inicializa el cliente Supabase. Debe llamarse desde un useEffect,
 * NUNCA al nivel del módulo ni durante el render inicial.
 * Es idempotente: múltiples llamadas son seguras.
 */
export function initSupabase(): void {
  if (_listo || _intentado || !URL_VALIDA) return;
  _intentado = true;
  try {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        autoRefreshToken:   false,
        persistSession:     false,
        detectSessionInUrl: false,
      },
    });
    _listo = true;
    if (__DEV__) console.log('[StockIQ] Supabase inicializado correctamente.');
  } catch (err) {
    if (__DEV__) console.warn('[StockIQ] Supabase createClient falló:', err);
  }
}

/** Retorna true si el cliente está listo para hacer consultas. */
export function getSupabaseListo(): boolean {
  return _listo;
}

/**
 * Retorna el cliente Supabase o null si aún no se inicializó.
 * Usar solo dentro de funciones de db.ts (no durante el render).
 */
export function getSupabaseClient(): SupabaseClient | null {
  return _client;
}

// ⚠️  SUPABASE_LISTO como constante fue eliminado — siempre era false y confundía.
//     Usa getSupabaseListo() para conocer el estado real tras initSupabase().
