// backend/controllers/authController.js
const User = require('../models/User');

// controllers/authController.js
exports.loginSuccess = (req, res) => {
  if (req.user) {
    res.json({
      success: true,
      message: 'Login successful',
      user: req.user,  // full user object or sanitized version
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Not logged in',
    });
  }
};


exports.logout = (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).json({ error: err });
    res.status(200).json({ message: 'Logged out' });
  });
};