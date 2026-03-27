import { createClient } from '@supabase/supabase-js';

// ─── CREDENCIALES ─────────────────────────────────────────────────────────────
// Reemplaza estos valores con los de tu proyecto Supabase:
//   Dashboard → Settings → API → Project URL  y  anon public key
const SUPABASE_URL  = 'https://fuupwozvoefwksyeqhgx.supabase.co';
const SUPABASE_ANON = 'sb_publishable_ylFwB02a8U4KvTQG33mg5w_BV9raFQ8';

// ─── CLIENTE ──────────────────────────────────────────────────────────────────
// Sin auth ni sesión — la app usa su propio sistema de login local.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken:  false,
    persistSession:    false,
    detectSessionInUrl: false,
  },
});

// ─── FLAG DE CONFIGURACIÓN ────────────────────────────────────────────────────
// false → app funciona solo con AsyncStorage (modo offline)
// true  → datos se sincronizan con Supabase en segundo plano
// true cuando las credenciales son reales (no los valores de ejemplo)
export const SUPABASE_LISTO = !SUPABASE_URL.includes('TU_PROYECTO');
