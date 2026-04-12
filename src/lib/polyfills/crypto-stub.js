'use strict';
module.exports = {
  randomBytes:    (n) => new Uint8Array(n),
  randomFillSync: (buf) => buf,
  createHash:     () => ({ update(){ return this; }, digest(){ return ''; } }),
  createHmac:     () => ({ update(){ return this; }, digest(){ return ''; } }),
  createCipheriv: () => ({ update(){ return Buffer.alloc(0); }, final(){ return Buffer.alloc(0); } }),
  createDecipheriv:()=> ({ update(){ return Buffer.alloc(0); }, final(){ return Buffer.alloc(0); } }),
};
