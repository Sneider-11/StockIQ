const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ── Polyfills para módulos Node.js no disponibles en React Native ────────────
// @supabase/realtime-js importa 'ws' dinámicamente; ws requiere 'stream'.
// En React Native el WebSocket global ya existe, así que ws nunca se usa.
// Redirigimos ws al stub para evitar el error "unable to resolve stream".
config.resolver.extraNodeModules = {
  ws:     path.resolve(__dirname, 'src/lib/polyfills/ws-stub.js'),
};

// ── Excluir módulos web que no se usan en la app nativa ─────────────────────
config.resolver.blockList = [
  /node_modules\/react-dom\/.*/,
  /node_modules\/react-native-web\/.*/,
  /.*\/__tests__\/.*/,
  /.*\.test\.[jt]sx?$/,
  /.*\.spec\.[jt]sx?$/,
];

// ── Plataformas nativas únicamente ──────────────────────────────────────────
config.resolver.platforms = ['ios', 'android', 'native'];

// ── Workers paralelos — usa todos los núcleos disponibles ───────────────────
config.maxWorkers = require('os').cpus().length;

module.exports = config;
