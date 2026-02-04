const express = require('express');
const router = express.Router();
const {
    getTodayStats,
    getWeeklyStats,
    getMonthlyStats,
    getStreakStats,
    getInsights
} = require('../controllers/statsController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.get('/today', getTodayStats);
router.get('/weekly', getWeeklyStats);
router.get('/monthly', getMonthlyStats);
router.get('/streaks', getStreakStats);
router.get('/insights', getInsights);

module.exports = router;
