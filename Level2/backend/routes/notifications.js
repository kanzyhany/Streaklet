const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    generateTodayNotifications,
    cleanupNotifications
} = require('../controllers/notificationController');

// All routes require authentication
router.use(protect);

router.get('/', getNotifications);
router.get('/count', getUnreadCount);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.post('/generate', generateTodayNotifications);
router.delete('/cleanup', cleanupNotifications);

module.exports = router;
