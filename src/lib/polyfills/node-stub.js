'use strict';
/**
 * node-stub.js — Stub para módulos de Node.js no disponibles en React Native
 *
 * Módulos como stream, crypto, zlib, http, https, net, tls, events, buffer
 * son built-ins de Node.js que no existen en React Native.
 *
 * Este archivo exporta clases/objetos vacíos suficientes para que los módulos
 * que los importan (como ws) no exploten al ser evaluados por Metro/Hermes.
 * En runtime, supabase-realtime usa el WebSocket global nativo — nunca llega
 * a ejecutar el código de ws que usa estos módulos.
 */

// EventEmitter mínimo
class EventEmitter {
  on()                { return this; }
  once()              { return this; }
  off()               { return this; }
  emit()              { return false; }
  removeListener()    { return this; }
  removeAllListeners(){ return this; }
  addListener()       { return this; }
  listeners()         { return []; }
  listenerCount()     { return 0; }
}

// Stream stubs
class Stream extends EventEmitter {}
class Readable extends Stream {
  pipe() { return this; }
  read()  { return null; }
  push()  { return false; }
  resume(){ return this; }
  pause() { return this; }
}
class Writable extends Stream {
  write(){ return true; }
  end()  { return this; }
}
class Duplex extends Readable {
  write(){ return true; }
  end()  { return this; }
}
class Transform extends Duplex {}
class PassThrough extends Transform {}

const stream = Object.assign(Stream, {
  Stream, Readable, Writable, Duplex, Transform, PassThrough,
  pipeline: (_src, _dst, cb) => { if (cb) cb(null); },
  finished: (_stream, cb) => { if (cb) cb(null); },
});

// Crypto stub (solo las funciones que ws/lib/sender y websocket usan)
const crypto = {
  randomBytes:    (n) => new Uint8Array(n),
  randomFillSync: (buf) => buf,
  createHash:     () => ({ update(){ return this; }, digest(){ return ''; } }),
  createHmac:     () => ({ update(){ return this; }, digest(){ return ''; } }),
};

// Buffer stub (isUtf8 usado en ws/lib/validation.js)
const buffer = {
  isUtf8: () => true,
  Buffer: global.Buffer || class Buffer {
    static from()   { return new Uint8Array(); }
    static alloc()  { return new Uint8Array(); }
    static isBuffer(){ return false; }
  },
};

// Zlib stub
const zlib = {
  createDeflateRaw: () => new Transform(),
  createInflateRaw: () => new Transform(),
  Z_DEFAULT_COMPRESSION: 6,
};

// HTTP/HTTPS/Net/TLS stubs (ws/lib/websocket.js los requiere pero nunca se usan en RN)
const http  = { request: () => ({}), createServer: () => ({}) };
const https = { request: () => ({}), createServer: () => ({}) };
const net   = { connect: () => ({}), createServer: () => ({}) };
const tls   = { connect: () => ({}), createServer: () => ({}) };

module.exports = { stream, crypto, buffer, zlib, http, https, net, tls };
module.exports.EventEmitter = EventEmitter;
module.exports.Stream    = Stream;
module.exports.Readable  = Readable;
module.exports.Writable  = Writable;
module.exports.Duplex    = Duplex;
module.exports.Transform = Transform;
module.exports.PassThrough = PassThrough;
