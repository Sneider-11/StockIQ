import { createClient } from '@supabase/supabase-js';

// ─── CREDENCIALES ─────────────────────────────────────────────────────────────
// Las variables EXPO_PUBLIC_* se leen del archivo .env en raíz del proyecto.
// Nunca escribas las credenciales directamente en este archivo.
// Copia .env.example → .env y rellena tus valores reales.
const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON ?? '';

// ─── CLIENTE ──────────────────────────────────────────────────────────────────
// Sin auth ni sesión — la app usa su propio sistema de login local.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken:   false,
    persistSession:     false,
    detectSessionInUrl: false,
  },
});

// ─── FLAG DE CONFIGURACIÓN ────────────────────────────────────────────────────
// false → app funciona solo con AsyncStorage (modo offline)
// true  → datos se sincronizan con Supabase en segundo plano
export const SUPABASE_LISTO =
  SUPABASE_URL.length > 0 && !SUPABASE_URL.includes('TU_PROYECTO');
