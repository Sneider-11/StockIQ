const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Polyfills para módulos Node.js que no existen en React Native
const POLYFILLS = path.resolve(__dirname, 'src/lib/polyfills');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const nodeModuleMap = {
    'ws':          path.join(POLYFILLS, 'ws-stub.js'),
    'stream':      path.join(POLYFILLS, 'stream-stub.js'),
    'crypto':      path.join(POLYFILLS, 'crypto-stub.js'),
    'zlib':        path.join(POLYFILLS, 'empty-stub.js'),
    'http':        path.join(POLYFILLS, 'empty-stub.js'),
    'https':       path.join(POLYFILLS, 'empty-stub.js'),
    'net':         path.join(POLYFILLS, 'empty-stub.js'),
    'tls':         path.join(POLYFILLS, 'empty-stub.js'),
    'events':      path.join(POLYFILLS, 'empty-stub.js'),
    'buffer':      path.join(POLYFILLS, 'empty-stub.js'),
    'node:stream': path.join(POLYFILLS, 'stream-stub.js'),
    'node:crypto': path.join(POLYFILLS, 'crypto-stub.js'),
    'node:zlib':   path.join(POLYFILLS, 'empty-stub.js'),
    'node:http':   path.join(POLYFILLS, 'empty-stub.js'),
    'node:https':  path.join(POLYFILLS, 'empty-stub.js'),
    'node:net':    path.join(POLYFILLS, 'empty-stub.js'),
    'node:tls':    path.join(POLYFILLS, 'empty-stub.js'),
    'node:events': path.join(POLYFILLS, 'empty-stub.js'),
    'node:buffer': path.join(POLYFILLS, 'empty-stub.js'),
  };
  if (nodeModuleMap[moduleName]) {
    return { filePath: nodeModuleMap[moduleName], type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.blockList = [
  /node_modules[/\\]react-dom[/\\].*/,
  /node_modules[/\\]react-native-web[/\\].*/,
  /.*[/\\]__tests__[/\\].*/,
  /.*\.test\.[jt]sx?$/,
  /.*\.spec\.[jt]sx?$/,
];

config.resolver.platforms = ['ios', 'android', 'native'];

module.exports = config;
