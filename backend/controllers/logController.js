const HabitLog = require('../models/HabitLog');
const Streak = require('../models/Streak');
const Habit = require('../models/Habit');

// @desc    Log habit status for a specific date
// @route   POST /api/habits/:id/log
// @access  Private
const logHabit = async (req, res) => {
    try {
        const { status, date, notes } = req.body;
        const habitId = req.params.id;

        // Verify habit belongs to user
        const habit = await Habit.findOne({
            _id: habitId,
            userId: req.user._id
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found'
            });
        }

        // Use today's date if not provided
        const logDate = date || new Date().toISOString().split('T')[0];

        // Check if log already exists for this date
        let log = await HabitLog.findOne({ habitId, date: logDate });

        if (log) {
            // Update existing log
            log.status = status;
            log.notes = notes;
            if (status === 'done') {
                log.completedAt = new Date();
            }
            await log.save();
        } else {
            // Create new log
            log = await HabitLog.create({
                habitId,
                userId: req.user._id,
                date: logDate,
                status,
                notes,
                completedAt: status === 'done' ? new Date() : undefined
            });
        }

        // Update streak if marked as done
        if (status === 'done') {
            await updateStreak(habitId, req.user._id, logDate);
        } else if (status === 'missed') {
            await resetStreak(habitId, req.user._id);
        }

        res.status(200).json({
            success: true,
            message: `Habit marked as ${status}`,
            data: log
        });
    } catch (error) {
        console.error('Log habit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to log habit',
            error: error.message
        });
    }
};

// Helper: Update streak when habit is completed
const updateStreak = async (habitId, userId, completedDate) => {
    try {
        let streak = await Streak.findOne({ habitId });

        if (!streak) {
            streak = await Streak.create({
                habitId,
                userId,
                currentStreak: 1,
                longestStreak: 1,
                lastCompletedDate: completedDate
            });
            return streak;
        }

        const lastDate = streak.lastCompletedDate;
        const today = new Date(completedDate);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDate === completedDate) {
            // Already completed today, no change
            return streak;
        } else if (lastDate === yesterdayStr) {
            // Consecutive day - increment streak
            streak.currentStreak += 1;
        } else if (!lastDate) {
            // First completion
            streak.currentStreak = 1;
        } else {
            // Streak broken, start fresh
            streak.currentStreak = 1;
        }

        streak.lastCompletedDate = completedDate;
        await streak.save();
        return streak;
    } catch (error) {
        console.error('Update streak error:', error);
    }
};

// Helper: Reset streak when habit is missed
const resetStreak = async (habitId, userId) => {
    try {
        const streak = await Streak.findOne({ habitId });
        if (streak) {
            streak.currentStreak = 0;
            await streak.save();
        }
    } catch (error) {
        console.error('Reset streak error:', error);
    }
};

// @desc    Get logs for a specific habit
// @route   GET /api/habits/:id/logs
// @access  Private
const getHabitLogs = async (req, res) => {
    try {
        const habitId = req.params.id;
        const { startDate, endDate, limit } = req.query;

        // Verify habit belongs to user
        const habit = await Habit.findOne({
            _id: habitId,
            userId: req.user._id
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found'
            });
        }

        let query = { habitId };

        // Filter by date range
        if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        }

        const logs = await HabitLog.find(query)
            .sort({ date: -1 })
            .limit(parseInt(limit) || 30);

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch habit logs',
            error: error.message
        });
    }
};

// @desc    Update a log entry
// @route   PUT /api/logs/:id
// @access  Private
const updateLog = async (req, res) => {
    try {
        const { status, notes } = req.body;

        let log = await HabitLog.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Log not found'
            });
        }

        log.status = status || log.status;
        log.notes = notes !== undefined ? notes : log.notes;
        if (status === 'done' && !log.completedAt) {
            log.completedAt = new Date();
        }

        await log.save();

        res.status(200).json({
            success: true,
            message: 'Log updated successfully',
            data: log
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update log',
            error: error.message
        });
    }
};

// @desc    Get all logs for a specific month
// @route   GET /api/logs/monthly
// @access  Private
const getMonthlyLogs = async (req, res) => {
    try {
        const { year, month } = req.query;

        if (!year || !month) {
            return res.status(400).json({
                success: false,
                message: 'Please provide year and month'
            });
        }

        // Calculate start and end date of the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        // Convert to YYYY-MM-DD strings
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const logs = await HabitLog.find({
            userId: req.user._id,
            date: { $gte: startStr, $lte: endStr }
        }).populate('habitId', 'title color icon');

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch monthly logs',
            error: error.message
        });
    }
};

module.exports = { logHabit, getHabitLogs, updateLog, getMonthlyLogs };
