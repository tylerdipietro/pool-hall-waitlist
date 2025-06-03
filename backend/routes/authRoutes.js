// routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const { loginSuccess, logout } = require('../controllers/authController');
const router = express.Router();

// Redirect user to Google for authentication
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Handle Google callback and redirect based on success or failure
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/failure' }),
  (req, res) => {
    // Redirect to frontend dashboard after successful login
    res.redirect(`${process.env.CLIENT_HOME_PAGE_URL}/dashboard`);
  }
);


// Returns session-authenticated user info if available
router.get('/success', (req, res) => {
  if (req.user) {
    console.log('✅ Login success:', req.user);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: req.user,
    });
  } else {
    console.log('⚠️ Login attempt failed or no session');
    res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
  }
});

// Optional failure route for debugging
router.get('/failure', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Authentication failed',
  });
});

// Logout and destroy session
router.get('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid'); // Make sure you're using the correct cookie name
      res.json({ success: true, message: 'Logged out' });
    });
  });
});

module.exports = router;
