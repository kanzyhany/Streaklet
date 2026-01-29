const express = require('express');
const router = express.Router();
const { updateLog, getMonthlyLogs } = require('../controllers/logController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.get('/monthly', getMonthlyLogs);
router.put('/:id', updateLog);

module.exports = router;
