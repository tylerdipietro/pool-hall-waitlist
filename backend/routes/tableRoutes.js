// backend/routes/tableRoutes.js
const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

router.post('/:tableId/join', isAuthenticated, tableController.joinTable);
router.post('/:tableId/remove/:userId', isAdmin, tableController.removePlayerFromTable);
router.post('/clear', isAdmin, tableController.clearTables);
//router.post('/:tableId/win', isAuthenticated, tableController.winRound);
//router.post('/:tableId/confirm-win', isAuthenticated, tableController.confirmWin);

module.exports = router;