import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── CREDENCIALES ─────────────────────────────────────────────────────────────
const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON ?? '';

// ─── VALIDACIÓN ───────────────────────────────────────────────────────────────
const urlValida =
  SUPABASE_URL.length > 0 &&
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('TU_PROYECTO') &&
  !SUPABASE_URL.includes('your-project');

if (__DEV__ && SUPABASE_URL.length > 0 && !urlValida) {
  console.warn('[StockIQ] EXPO_PUBLIC_SUPABASE_URL inválida. Sync desactivado.');
}

// ─── CLIENTE ──────────────────────────────────────────────────────────────────
// Encapsulado en try/catch para que un fallo de inicialización no crashee
// el módulo completo (Expo Go a veces no tiene todos los globals necesarios).
let _supabase: SupabaseClient | null = null;
let _listo = false;

if (urlValida) {
  try {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        autoRefreshToken:   false,
        persistSession:     false,
        detectSessionInUrl: false,
      },
      // En v2.102+ el Realtime es lazy: NO conecta WebSocket
      // a menos que llames a .channel(). Sin suscripciones = sin WebSocket.
    });
    _listo = true;
  } catch (err) {
    if (__DEV__) console.warn('[StockIQ] Supabase createClient falló:', err);
    // App sigue funcionando en modo offline
  }
}

// Fallback: cliente con placeholder si init falló (nunca se usará en operaciones reales)
if (!_supabase) {
  try {
    _supabase = createClient('https://placeholder.supabase.co', 'placeholder', {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  } catch {
    // Si hasta el placeholder falla, las funciones de db.ts devuelven [] por el chequeo SUPABASE_LISTO
  }
}

export const supabase = _supabase as SupabaseClient;

// true  → sincronización con Supabase disponible
// false → app funciona solo con AsyncStorage (modo offline)
export const SUPABASE_LISTO = _listo;
