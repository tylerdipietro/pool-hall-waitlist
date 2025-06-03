// backend/controllers/queueController.js
const Queue = require('../models/Queue');
const User = require('../models/User');
const { getIO } = require('../sockets/io');

exports.joinQueue = async (req, res) => {
  const { userId } = req.body;
  const existing = await Queue.findOne({ user: userId });
  if (existing) return res.status(400).json({ message: 'Already in queue' });

  const newEntry = await Queue.create({ user: userId });
  const queue = await Queue.find().populate('user');
  getIO().emit('queue:update', queue);
  res.status(200).json(queue);
};

exports.clearQueue = async (req, res) => {
  await Queue.deleteMany();
  getIO().emit('queue:update', []);
  res.status(200).json({ message: 'Queue cleared' });
};