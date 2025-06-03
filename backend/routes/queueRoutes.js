// backend/routes/queueRoutes.js
const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

router.post('/join', isAuthenticated, queueController.joinQueue);
router.post('/clear', isAdmin, queueController.clearQueue);

module.exports = router;