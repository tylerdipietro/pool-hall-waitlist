// backend/sockets/io.js
let ioInstance;

function init(server) {
  const { Server } = require('socket.io');
  const origin = process.env.CLIENT_HOME_PAGE_URL || 'http://localhost:19000';

  ioInstance = new Server(server, {
    cors: {
      origin,
      credentials: true,
    },
  });

  return ioInstance;
}

function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized!');
  }
  return ioInstance;
}

module.exports = { init, getIO };
