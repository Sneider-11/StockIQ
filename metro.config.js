const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Excluir carpetas que no forman parte del bundle nativo
// Esto evita que Metro procese archivos web/test innecesarios
config.resolver.blockList = [
  /node_modules\/react-dom\/.*/,
  /node_modules\/react-native-web\/.*/,
];

// Aumentar workers para aprovechar múltiples núcleos del CPU
config.maxWorkers = 4;

module.exports = config;
