const Notification = require('../models/Notification');
const Habit = require('../models/Habit');

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            userId: req.user._id,
            scheduledFor: { $lte: new Date() } // Only get notifications that are due
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('habitId', 'title icon color');

        const unreadCount = await Notification.countDocuments({
            userId: req.user._id,
            read: false,
            scheduledFor: { $lte: new Date() }
        });

        res.status(200).json({
            success: true,
            unreadCount,
            data: notifications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/count
// @access  Private
const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            userId: req.user._id,
            read: false,
            scheduledFor: { $lte: new Date() }
        });

        res.status(200).json({
            success: true,
            count
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notification count',
            error: error.message
        });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.status(200).json({
            success: true,
            data: notification
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message
        });
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, read: false },
            { read: true }
        );

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to mark notifications as read',
            error: error.message
        });
    }
};

// @desc    Generate notifications for today's habits
// @route   POST /api/notifications/generate
// @access  Private
const generateTodayNotifications = async (req, res) => {
    try {
        const today = new Date();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayName = dayNames[today.getDay()];
        const todayDate = today.toISOString().split('T')[0];
        const todayMonth = today.getMonth() + 1;
        const todayDay = today.getDate();

        // Get habits scheduled for today
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const habits = await Habit.find({
            userId: req.user._id,
            active: true,
            $or: [
                { frequencyType: 'weekly', frequency: todayName },
                { frequencyType: { $exists: false }, frequency: todayName },
                { frequencyType: 'yearly', yearlyMonth: todayMonth, yearlyDay: todayDay },
                { frequencyType: 'one-time', specificDate: { $gte: startOfDay, $lte: endOfDay } }
            ]
        });

        let created = 0;
        for (const habit of habits) {
            // Parse reminder time
            const [hours, minutes] = (habit.reminderTime || '09:00').split(':');
            const scheduledFor = new Date(today);
            scheduledFor.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // Check if notification already exists for this habit today
            const existing = await Notification.findOne({
                userId: req.user._id,
                habitId: habit._id,
                scheduledFor: {
                    $gte: new Date(todayDate),
                    $lt: new Date(new Date(todayDate).getTime() + 24 * 60 * 60 * 1000)
                }
            });

            if (!existing) {
                await Notification.create({
                    userId: req.user._id,
                    habitId: habit._id,
                    title: `Time for: ${habit.title}`,
                    message: `It's ${habit.reminderTime} - time to complete your ${habit.category.toLowerCase()} habit!`,
                    type: 'reminder',
                    icon: habit.icon || '🔔',
                    scheduledFor
                });
                created++;
            }
        }

        res.status(200).json({
            success: true,
            message: `Generated ${created} notifications`,
            created
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to generate notifications',
            error: error.message
        });
    }
};

// @desc    Delete old notifications (cleanup)
// @route   DELETE /api/notifications/cleanup
// @access  Private
const cleanupNotifications = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await Notification.deleteMany({
            userId: req.user._id,
            createdAt: { $lt: thirtyDaysAgo }
        });

        res.status(200).json({
            success: true,
            message: `Deleted ${result.deletedCount} old notifications`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup notifications',
            error: error.message
        });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    generateTodayNotifications,
    cleanupNotifications
};
