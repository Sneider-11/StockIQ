'use strict';
/**
 * ws-stub.js — Polyfill de 'ws' para React Native
 *
 * React Native provee un WebSocket global nativo. El paquete 'ws' es para
 * Node.js y depende de módulos como 'stream' que no existen en React Native.
 *
 * @supabase/realtime-js hace un require('ws') dinámico que Metro bundlea.
 * Este stub redirige ese require al WebSocket global de React Native,
 * eliminando el error "Unable to resolve module stream".
 *
 * En runtime, supabase-realtime detecta que WebSocket ya está disponible
 * globalmente y nunca usa este módulo directamente.
 */
const W = global.WebSocket;
module.exports = W;
module.exports.default = W;
module.exports.WebSocket = W;
