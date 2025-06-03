// backend/controllers/tableController.js
const Table = require('../models/Table');
const Queue = require('../models/Queue');
const { getIO } = require('../sockets/io');

exports.joinTable = async (req, res) => {
  const { tableId, userId } = req.body;
  const table = await Table.findById(tableId);
  if (!table || table.players.length >= 2) return res.status(400).json({ message: 'Table full or not found' });

  if (!table.players.includes(userId)) {
    table.players.push(userId);
    await table.save();
  }
  await Queue.findOneAndDelete({ user: userId });
  const queue = await Queue.find().populate('user');
  const tables = await Table.find().populate('players');
  getIO().emit('queue:update', queue);
  getIO().emit('tables:update', tables);
  res.status(200).json(tables);
};

exports.clearTables = async (req, res) => {
  await Table.updateMany({}, { players: [] });
  const tables = await Table.find();
  getIO().emit('tables:update', tables);
  res.status(200).json({ message: 'All tables cleared' });
};

exports.removePlayerFromTable = async (req, res) => {
  const { tableId, playerId } = req.body;
  const table = await Table.findById(tableId);
  if (!table) return res.status(404).json({ message: 'Table not found' });
  table.players = table.players.filter(id => id.toString() !== playerId);
  await table.save();
  const tables = await Table.find().populate('players');
  getIO().emit('tables:update', tables);
  res.status(200).json(tables);
};