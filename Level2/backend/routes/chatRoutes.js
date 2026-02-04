const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { askQuestion } = require('../controllers/chatController');

// @route   POST /api/chat/ask
// @desc    Ask AI a question about user's habits
// @access  Private
router.post('/ask', protect, askQuestion);

module.exports = router;
