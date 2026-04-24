// Shared io instance to avoid circular imports between server.js and routes
let _io = null;

export function setIo(io) {
  _io = io;
}

export function getIo() {
  return _io;
}
