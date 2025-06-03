// backend/sockets/socketHandler.js
const Queue = require('../models/Queue');
const Table = require('../models/Table');
const User = require('../models/User');
const emitStateUpdate = require('./stateEmitter');

const activeInvites = new Map(); // tableId -> timeoutId
const userSocketMap = {}; // userId -> socket.id

module.exports = function socketHandler(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Register user with socket
    socket.on('register_user', ({ userId }) => {
      userSocketMap[userId] = socket.id;
      console.log(`[register_user] ${userId} -> ${socket.id}`);
    });

    // Handle disconnect and cleanup
    socket.on('disconnect', () => {
      for (const [userId, sockId] of Object.entries(userSocketMap)) {
        if (sockId === socket.id) {
          delete userSocketMap[userId];
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });

    // Join Queue
    socket.on('join_queue', async (userId) => {
  console.log('joinQueue received from client:', userId);

  // Check if user is currently on any table
  const isOnTable = await Table.exists({ 'players.user': userId });

  if (isOnTable) {
    console.log(`User ${userId} is currently on a table and cannot join the queue.`);
    // Optionally, you can emit a message back to client that they can't join queue
    socket.emit('join_queue_error', { message: 'You cannot join the queue while on a table.' });
    return;
  }

  let queue = await Queue.findOne();
  if (!queue) {
    queue = new Queue({ users: [] });
    await queue.save();
    console.log('Created new queue document');
  }

  const isAlreadyInQueue = queue.users.some(entry => entry.user.toString() === userId);
  if (!isAlreadyInQueue) {
    queue.users.push({ user: userId, joinedAt: new Date() });
    await queue.save();
    console.log('User added to queue:', userId);
  }

  emitStateUpdate(io);
});

    // Join Table
    socket.on('join_table', async ({ tableId, userId }) => {
      try {
        console.log(`[join_table] Request by ${userId} to join table ${tableId}`);

        const onTable = await Table.findOne({ 'players.user': userId });
        if (onTable) return socket.emit('error', 'Already on a table');

        await Queue.updateOne({}, { $pull: { users: { user: userId } } });

        const table = await Table.findById(tableId);
        if (!table) return socket.emit('error', 'Table not found');
        if (table.players.length >= 2) return socket.emit('error', 'Table full');

        table.players.push({ user: userId, joinedAt: new Date() });
        await table.save();

        const updatedTable = await Table.findById(tableId).populate('players.user', 'displayName username');
        console.log('Updated table:', updatedTable);

        await emitStateUpdate(io);
      } catch (err) {
        console.error('[join_table error]', err);
        socket.emit('error', 'Server error');
      }
    });

    // Claim Win
    // Claim Win
socket.on('claim_win', async ({ tableId, winnerId }) => {
  try {
    console.log(`[claim_win] From ${winnerId} on table ${tableId}`);
    const table = await Table.findById(tableId).populate('players.user', '_id displayName');
    if (!table) return socket.emit('error', 'Table not found');

    const isWinner = table.players.some(p => p.user._id.equals(winnerId));
    if (!isWinner) return socket.emit('error', 'You are not on this table');

    const opponent = table.players.find(p => !p.user._id.equals(winnerId));
    if (!opponent) return socket.emit('error', 'No opponent on table');

    const loserId = opponent.user._id.toString();
    const opponentSocketId = userSocketMap[loserId];

    if (!opponentSocketId) {
      console.warn(`Opponent ${loserId} not connected`);
      return socket.emit('info', 'Opponent not connected');
    }

    console.log(`Emitting win_confirmation_request to ${loserId}`);
    io.to(opponentSocketId).emit('win_confirmation_request', {
      tableId,
      winnerId,
      loserId // ✅ include this in the event
    });
  } catch (err) {
    console.error('[claim_win error]', err);
    socket.emit('error', 'Failed to process win');
  }
});


    // Confirm Win
    socket.on('confirm_win', async ({ tableId, winnerId, loserId, confirmed }, callback) => {
  console.log('[confirm_win] Received:', { tableId, winnerId, loserId, confirmed });

  try {
    if (!confirmed) {
      socket.emit('info', 'Win not confirmed');
      return callback?.({ success: false, message: 'Win not confirmed' });
    }

    const table = await Table.findById(tableId).populate('players.user');
    if (!table) {
      console.error(`[confirm_win] Table not found: ${tableId}`);
      socket.emit('error', 'Table not found');
      return callback?.({ success: false, message: 'Table not found' });
    }

    const winner = table.players.find(p => p.user._id.toString() === winnerId);
    const loser = table.players.find(p => p.user._id.toString() === loserId);

    if (!winner) {
      console.error(`[confirm_win] Winner ${winnerId} not found on table ${tableId}`);
      socket.emit('error', 'Winner not found on this table');
      return callback?.({ success: false, message: 'Winner not found' });
    }

    if (!loser) {
      console.error(`[confirm_win] Loser ${loserId} not found on table ${tableId}`);
      socket.emit('error', 'Loser not found on this table');
      return callback?.({ success: false, message: 'Loser not found' });
    }

    // Remove loser from table
    table.players = table.players.filter(p => p.user._id.toString() !== loserId);
    await table.save();

    // Remove and requeue loser
    await Queue.updateOne({}, { $pull: { users: { user: loserId } } });
    await Queue.updateOne({}, { $push: { users: { user: loserId, joinedAt: new Date() } } });

    // Get queue and invite next user if needed
    const queueDoc = await Queue.findOne().populate('users.user');
    if (!queueDoc) {
      console.warn('[confirm_win] No queue document found');
      await emitStateUpdate(io);
      return callback?.({ success: true });
    }

    const next = queueDoc.users.find(u => u.user._id.toString() !== loserId);
    if (next) {
      const nextId = next.user._id.toString();
      const nextSocket = userSocketMap[nextId];

      if (nextSocket) {
        console.log(`[confirm_win] Inviting next user ${nextId} to table ${tableId}`);
        io.to(nextSocket).emit('table_invite', { tableId });

        const timeout = setTimeout(() => {
          console.log(`[confirm_win] Invite expired for ${nextId}`);
          activeInvites.delete(tableId);
        }, 30000);

        activeInvites.set(tableId, timeout);
      } else {
        console.warn(`[confirm_win] Next user ${nextId} not connected`);
      }
    }

    await emitStateUpdate(io);
    return callback?.({ success: true });
  } catch (err) {
    console.error('[confirm_win] Internal error:', err);
    socket.emit('error', 'Failed to confirm win');
    return callback?.({ success: false, message: 'Internal server error' });
  }
});



    // Accept Invite
    socket.on('accept_invite', async ({ tableId, userId }) => {
      try {
        const table = await Table.findById(tableId);
        if (!table) return socket.emit('error', 'Table not found');

        const queueDoc = await Queue.findOne();
        const front = queueDoc.users.find(u => u.user.toString() === userId);
        if (!front) return socket.emit('error', 'Not your invite to accept');

        await Queue.updateOne({}, { $pull: { users: { user: userId } } });

        if (table.players.length >= 2) return socket.emit('error', 'Table full');

        table.players.push({ user: userId, joinedAt: new Date() });
        await table.save();

        if (activeInvites.has(tableId)) {
          clearTimeout(activeInvites.get(tableId));
          activeInvites.delete(tableId);
        }

        await emitStateUpdate(io);
      } catch (err) {
        console.error('[accept_invite]', err);
        socket.emit('error', 'Failed to accept invite');
      }
    });

    // Skip Invite
    socket.on('skip_invite', async ({ tableId, userId }) => {
      try {
        if (activeInvites.has(tableId)) {
          clearTimeout(activeInvites.get(tableId));
          activeInvites.delete(tableId);
        }

        const queueDoc = await Queue.findOne().populate('users.user');
        const next = queueDoc.users.find(u => u.user._id.toString() !== userId);
        const after = queueDoc.users.find(
          u => u.user._id.toString() !== userId && u.user._id.toString() !== next?.user._id.toString()
        );

        if (after) {
          const afterSocket = userSocketMap[after.user._id.toString()];
          if (afterSocket) {
            io.to(afterSocket).emit('table_invite', { tableId });

            const timeout = setTimeout(() => {
              activeInvites.delete(tableId);
            }, 30000);

            activeInvites.set(tableId, timeout);
          }
        }
      } catch (err) {
        console.error('[skip_invite]', err);
      }
    });

    // --- Admin Actions ---

    socket.on('admin:clear_queue', async () => {
      try {
        await Queue.deleteMany({});
        await emitStateUpdate(io);
      } catch (err) {
        console.error('[admin:clear_queue]', err);
      }
    });

    socket.on('admin:clear_tables', async () => {
      try {
        await Table.updateMany({}, { $set: { players: [] } });
        await emitStateUpdate(io);
      } catch (err) {
        console.error('[admin:clear_tables]', err);
      }
    });

    socket.on('admin:remove_player', async ({ tableId, userId }) => {
      try {
        const table = await Table.findById(tableId);
        if (!table) return socket.emit('error', 'Table not found');

        table.players = table.players.filter(p => !p.user.equals(userId));
        await table.save();
        await emitStateUpdate(io);
      } catch (err) {
        console.error('[admin:remove_player]', err);
        socket.emit('error', 'Failed to remove player');
      }
    });
  });
};
