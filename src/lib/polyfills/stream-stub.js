'use strict';
class E {
  on(){ return this; } once(){ return this; } off(){ return this; }
  emit(){ return false; } removeListener(){ return this; }
  removeAllListeners(){ return this; } addListener(){ return this; }
}
class Stream extends E {}
class Readable extends Stream { pipe(){ return this; } read(){ return null; } push(){ return false; } resume(){ return this; } pause(){ return this; } }
class Writable extends Stream { write(){ return true; } end(){ return this; } }
class Duplex extends Readable { write(){ return true; } end(){ return this; } }
class Transform extends Duplex {}
class PassThrough extends Transform {}
const s = Object.assign(Stream, { Stream, Readable, Writable, Duplex, Transform, PassThrough,
  pipeline: (_,__,cb) => { if(cb) cb(null); },
  finished: (_,cb) => { if(cb) cb(null); },
});
module.exports = s;
