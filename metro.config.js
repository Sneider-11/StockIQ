const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// ── Rutas a los stubs de polyfills ──────────────────────────────────────────
const POLYFILLS = path.resolve(__dirname, 'src/lib/polyfills');
const WS_STUB     = path.join(POLYFILLS, 'ws-stub.js');
const STREAM_STUB = path.join(POLYFILLS, 'stream-stub.js');
const CRYPTO_STUB = path.join(POLYFILLS, 'crypto-stub.js');
const EMPTY_STUB  = path.join(POLYFILLS, 'empty-stub.js');

// ── Módulos Node.js que NO existen en React Native → stubs ──────────────────
// ws (@supabase/realtime-js lo importa) usa stream, crypto, zlib, http, etc.
// En React Native el WebSocket global ya existe; ws nunca se ejecuta en runtime.
const NODE_MODULE_MAP = {
  'ws':     WS_STUB,
  'stream': STREAM_STUB,
  'crypto': CRYPTO_STUB,
  'zlib':   EMPTY_STUB,
  'http':   EMPTY_STUB,
  'https':  EMPTY_STUB,
  'net':    EMPTY_STUB,
  'tls':    EMPTY_STUB,
  'events': EMPTY_STUB,
  'buffer': EMPTY_STUB,
  // Variantes con prefijo 'node:' (Node 16+)
  'node:stream': STREAM_STUB,
  'node:crypto': CRYPTO_STUB,
  'node:zlib':   EMPTY_STUB,
  'node:http':   EMPTY_STUB,
  'node:https':  EMPTY_STUB,
  'node:net':    EMPTY_STUB,
  'node:tls':    EMPTY_STUB,
  'node:events': EMPTY_STUB,
  'node:buffer': EMPTY_STUB,
};

// ── resolveRequest: hook definitivo para interceptar módulos problemáticos ──
// Se ejecuta ANTES de que Metro busque en node_modules.
// Más robusto que extraNodeModules porque tiene acceso completo al contexto.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Interceptar ws y todos los built-ins de Node.js que ws usa
  if (NODE_MODULE_MAP[moduleName]) {
    return { filePath: NODE_MODULE_MAP[moduleName], type: 'sourceFile' };
  }
  // Para cualquier otro módulo, usar la resolución por defecto de Metro
  return context.resolveRequest(context, moduleName, platform);
};

// ── extraNodeModules: capa adicional de seguridad ────────────────────────────
config.resolver.extraNodeModules = NODE_MODULE_MAP;

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

// ── Workers paralelos ────────────────────────────────────────────────────────
config.maxWorkers = require('os').cpus().length;

module.exports = config;
