//sockets/stateEmitter.js
const Queue = require('../models/Queue');
const Table = require('../models/Table');

module.exports = async function emitStateUpdate(io) {
  const queueDoc = await Queue.findOne().populate('users.user'); // findOne for single queue doc
  const tables = await Table.find()
    .populate('players.user', 'displayName username') // Make sure this is correct
    .exec();

  const queue = queueDoc?.users || [];

  // Optional: map queue entries to only send needed user info:
  const formattedQueue = queue.map(entry => ({
    user: {
      _id: entry.user._id,
      username: entry.user.username || 'Unnamed User',
    },
    joinedAt: entry.joinedAt,
  }));

  io.emit('state_update', {
    queue: formattedQueue,
    tables,
  });
};
