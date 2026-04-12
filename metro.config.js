const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

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
