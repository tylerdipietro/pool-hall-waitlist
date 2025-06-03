// backend/models/Table.js
const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  joinedAt: { type: Date, default: Date.now },
});

const tableSchema = new mongoose.Schema({
  tableNumber: { type: Number, required: true, unique: true }, // Add unique table number
  players: [playerSchema], // max 2 players
});

module.exports = mongoose.model('Table', tableSchema);
