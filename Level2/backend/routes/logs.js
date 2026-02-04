const express = require('express');
const router = express.Router();
const { updateLog, getMonthlyLogs, getHabitNotes } = require('../controllers/logController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.get('/monthly', getMonthlyLogs);
router.get('/notes', getHabitNotes);
router.put('/:id', updateLog);

module.exports = router;
