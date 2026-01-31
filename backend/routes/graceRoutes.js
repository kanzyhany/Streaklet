const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getGraceStatus,
    activateGraceDay,
    getGraceHistory
} = require('../controllers/graceController');

// All routes require authentication
router.use(protect);

// Grace day routes
router.get('/status', getGraceStatus);
router.post('/activate', activateGraceDay);
router.get('/history', getGraceHistory);

module.exports = router;
