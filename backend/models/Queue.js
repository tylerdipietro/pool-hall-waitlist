//models/Queue.js
const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  users: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      joinedAt: { type: Date, default: Date.now },
    }
  ]
});

module.exports = mongoose.model('Queue', queueSchema);
