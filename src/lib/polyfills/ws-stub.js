'use strict';
/**
 * ws-stub.js — Polyfill de 'ws' para React Native
 *
 * React Native ya tiene WebSocket global nativo.
 * Este stub evita que el ws de Node.js (que requiere stream, crypto, etc.)
 * se bundle en el proyecto.
 */
const WS = global.WebSocket;
module.exports = WS;
module.exports.default = WS;
module.exports.WebSocket = WS;
