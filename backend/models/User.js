// backend/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  isPlaying: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now },
  email: String,
  photo: String,
});

module.exports = mongoose.model('User', userSchema);