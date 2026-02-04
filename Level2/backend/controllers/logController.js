const HabitLog = require('../models/HabitLog');
const Streak = require('../models/Streak');
const Habit = require('../models/Habit');
const SharedCalendar = require('../models/SharedCalendar');
const User = require('../models/User');
const { checkGraceDayProtection, markGraceDayAsUsed } = require('./graceController');

// @desc    Log habit status for a specific date
// @route   POST /api/habits/:id/log
// @access  Private
const logHabit = async (req, res) => {
    try {

        const { status, date, notes } = req.body;
        const habitId = req.params.id;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a habit status (done, missed, skipped, or in_progress)'
            });
        }

        // Verify habit belongs to user
        // Fetch habit by ID only first
        const habit = await Habit.findById(habitId);

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found'
            });
        }

        // Authorization Check
        let isAuthorized = false;

        // 1. Check if creator
        if (habit.userId.toString() === req.user._id.toString()) {
            isAuthorized = true;
        }
        // 2. Check shared calendar access
        else if (habit.sharedCalendarId) {
            const calendar = await SharedCalendar.findById(habit.sharedCalendarId);
            if (calendar) {
                const isOwner = calendar.ownerId.toString() === req.user._id.toString();
                const member = calendar.members.find(m =>
                    m.user && m.user.toString() === req.user._id.toString()
                );

                // Enable logging for Owner or ANY Member
                const isMember = member && member.user;

                if (isOwner || isMember) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to log this habit'
            });
        }

        // Use today's date if not provided
        let logDate = date;
        if (!logDate) {
            const userTimezone = req.user.timezone || 'UTC';
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: userTimezone,
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            });
            const parts = formatter.formatToParts(now);
            const dateParts = {};
            parts.forEach(p => dateParts[p.type] = p.value);

            const year = parseInt(dateParts.year);
            const month = parseInt(dateParts.month);
            const day = parseInt(dateParts.day);

            logDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }

        // Check if log already exists for this date for THIS user
        let log = await HabitLog.findOne({ habitId, date: logDate, userId: req.user._id });

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
                completedAt: status === 'done' ? new Date() : undefined,
                sharedCalendarId: habit.sharedCalendarId // Inherit from habit
            });
        }

        // Update streak if marked as done
        if (status === 'done') {
            await updateStreak(habitId, req.user._id, logDate, habit);
        } else if (status === 'missed') {
            await resetStreak(habitId, req.user._id, logDate, habit.sharedCalendarId);
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
const updateStreak = async (habitId, userId, completedDate, habit) => {
    try {
        let streak = await Streak.findOne({ habitId, userId });

        if (!streak) {
            streak = await Streak.create({
                habitId,
                userId,
                currentStreak: 1,
                longestStreak: 1,
                lastCompletedDate: completedDate,
                totalStreaksAchieved: 0
            });
            return streak;
        }

        const lastDate = streak.lastCompletedDate;

        if (lastDate === completedDate) {
            // Already completed today, no change
            return streak;
        }

        // Check if the streak is consecutive based on habit frequency
        const isConsecutive = await checkConsecutive(habit, lastDate, completedDate);

        if (isConsecutive) {
            // Consecutive day (or valid next scheduled day) - increment streak
            streak.currentStreak += 1;
        } else if (!lastDate) {
            // First completion
            streak.currentStreak = 1;
        } else {
            // Streak broken, start fresh
            streak.currentStreak = 1;
        }

        streak.lastCompletedDate = completedDate;

        // Check for 5-streak milestone and award points
        if (streak.currentStreak % 5 === 0 && streak.currentStreak > 0) {
            const milestone = Math.floor(streak.currentStreak / 5);
            console.log(`🔥 Streak milestone reached! Current streak: ${streak.currentStreak}, Milestone: ${milestone}, Total achieved: ${streak.totalStreaksAchieved}`);
            if (milestone > streak.totalStreaksAchieved) {
                // Award points
                await awardPoints(userId, habit);
                streak.totalStreaksAchieved = milestone;
            } else {
                console.log(`⚠️ Milestone ${milestone} already achieved, skipping points award`);
            }
        }

        await streak.save();
        return streak;
    } catch (error) {
        console.error('Update streak error:', error);
    }
};

// Helper: Award points when reaching 5-streak milestone
const awardPoints = async (userId, habit) => {
    try {
        console.log(`🎯 Awarding points for habit: ${habit.title}, isShared: ${!!habit.sharedCalendarId}`);

        if (habit.sharedCalendarId) {
            // Shared calendar: add 2 points to calendar
            const calendar = await SharedCalendar.findById(habit.sharedCalendarId);
            if (calendar) {
                calendar.points += 2;
                console.log(`📅 Shared calendar ${calendar.name} now has ${calendar.points} points`);

                // Check if reached 10 points -> award grace days
                if (calendar.points >= 10) {
                    const graceDaysToAward = Math.floor(calendar.points / 10);
                    // Award grace day to each member
                    calendar.members.forEach(member => {
                        member.graceDays += graceDaysToAward;
                    });
                    calendar.points = calendar.points % 10; // Keep remainder
                    console.log(`🎉 Awarded ${graceDaysToAward} grace day(s) to all members!`);
                }

                await calendar.save();
            }
        } else {
            // Personal calendar: add 5 points to user
            const user = await User.findById(userId);
            if (user) {
                user.personalPoints += 5;
                console.log(`👤 User ${user.name} now has ${user.personalPoints} points`);

                // Check if reached 10 points -> award grace day
                if (user.personalPoints >= 10) {
                    const graceDaysToAward = Math.floor(user.personalPoints / 10);
                    user.personalGraceDays += graceDaysToAward;
                    user.personalPoints = user.personalPoints % 10; // Keep remainder
                    console.log(`🎉 Awarded ${graceDaysToAward} grace day(s) to user!`);
                }

                await user.save();
            }
        }
    } catch (error) {
        console.error('Award points error:', error);
    }
};

// Helper: Reset streak when habit is missed
const resetStreak = async (habitId, userId, date, sharedCalendarId = null) => {
    try {
        // Check if grace day is active for today
        const graceDay = await checkGraceDayProtection(userId, date, sharedCalendarId);

        if (graceDay) {
            // Grace day protects the streak - mark it as used
            await markGraceDayAsUsed(graceDay._id);
            console.log(`Grace day protected streak for habit ${habitId} on ${date}`);
            return; // Don't reset the streak
        }

        // No grace day - reset the streak for THIS user
        const streak = await Streak.findOne({ habitId, userId });
        if (streak) {
            streak.currentStreak = 0;
            streak.totalStreaksAchieved = 0; // Reset milestone tracker
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

        // Verify access to habit
        const habit = await Habit.findById(habitId);

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found'
            });
        }

        let isAuthorized = false;
        if (habit.userId.toString() === req.user._id.toString()) {
            isAuthorized = true;
        } else if (habit.sharedCalendarId) {
            const calendar = await SharedCalendar.findById(habit.sharedCalendarId);
            if (calendar && calendar.members.some(m => m.user && m.user.toString() === req.user._id.toString())) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view these logs'
            });
        }

        let query = { habitId, userId: req.user._id };

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

        // Calculate start and end date strings manually to avoid timezone shifts
        // (e.g. new Date(2026, 1, 0) in GMT+2 becomes Jan 30th UTC if we use toISOString)
        const paddedMonth = String(month).padStart(2, '0');
        const daysInMonth = new Date(year, month, 0).getDate();

        const startStr = `${year}-${paddedMonth}-01`;
        const endStr = `${year}-${paddedMonth}-${daysInMonth}`;

        const { calendarId } = req.query;
        let query = {
            date: { $gte: startStr, $lte: endStr },
            userId: req.user._id // ALWAYS filter by userId for individual progress
        };

        if (calendarId === 'all') {
            const mySharedCalendars = await SharedCalendar.find({
                'members.user': req.user._id
            });
            const mySharedCalendarIds = mySharedCalendars.map(c => c._id);

            query.$or = [
                { sharedCalendarId: null },
                { sharedCalendarId: { $in: mySharedCalendarIds } }
            ];
        } else if (calendarId && calendarId !== 'personal') {
            // Verify membership
            const calendar = await SharedCalendar.findById(calendarId);
            const isMember = calendar && calendar.members.some(m =>
                m.user && m.user.toString() === req.user._id.toString()
            );
            if (!isMember) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view this calendar'
                });
            }
            query.sharedCalendarId = calendarId;
        } else {
            // Personal
            query.sharedCalendarId = null;
        }

        const logs = await HabitLog.find(query).populate('habitId', 'title color icon');

        // Fetch shared completions for the day view
        let sharedLogQuery = {
            date: { $gte: startStr, $lte: endStr },
            status: 'done'
        };

        if (calendarId === 'all') {
            const mySharedCalendars = await SharedCalendar.find({ 'members.user': req.user._id });
            const mySharedCalendarIds = mySharedCalendars.map(c => c._id);
            sharedLogQuery.sharedCalendarId = { $in: mySharedCalendarIds };
        } else if (calendarId && calendarId !== 'personal') {
            sharedLogQuery.sharedCalendarId = calendarId;
        } else {
            // For personal view, we don't need shared completions
            sharedLogQuery = null;
        }

        const sharedCompletions = {};
        if (sharedLogQuery) {
            const sharedLogs = await HabitLog.find(sharedLogQuery).populate('userId', 'name');
            sharedLogs.forEach(sLog => {
                const dateStr = sLog.date;
                const hId = sLog.habitId.toString();
                if (!sharedCompletions[dateStr]) sharedCompletions[dateStr] = {};
                if (!sharedCompletions[dateStr][hId]) sharedCompletions[dateStr][hId] = [];

                if (sLog.userId && sLog.userId.name) {
                    const name = sLog.userId._id.toString() === req.user._id.toString() ? 'You' : sLog.userId.name;
                    sharedCompletions[dateStr][hId].push(name);
                }
            });
        }

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs,
            sharedCompletions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch monthly logs',
            error: error.message
        });
    }
};

// @desc    Get all logs with notes
// @route   GET /api/logs/notes
// @access  Private
const getHabitNotes = async (req, res) => {
    try {
        const logs = await HabitLog.find({
            userId: req.user._id,
            notes: { $exists: true, $ne: '' }
        })
            .populate('habitId', 'title color icon category')
            .sort({ date: -1 });

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch habit notes',
            error: error.message
        });
    }
};

// Helper: Check if streak is consecutive considering habit frequency
const checkConsecutive = async (habit, lastDateStr, currentDateStr) => {
    if (!lastDateStr) return true;

    // Default to daily check for non-weekly habits
    if (habit.frequencyType !== 'weekly' || !habit.frequency || habit.frequency.length === 0) {
        const last = new Date(lastDateStr);
        const current = new Date(currentDateStr);
        const diffTime = current - last;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === 1;
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const current = new Date(currentDateStr);
    const last = new Date(lastDateStr);

    if (current <= last) return false;

    // Check for missed scheduled days in between
    const checkDate = new Date(last);
    checkDate.setDate(checkDate.getDate() + 1);

    // Limit loop to avoid performance issues on large gaps
    let daysChecked = 0;
    while (checkDate < current) {
        if (daysChecked > 60) return false; // Assume broken if huge gap

        const dayIndex = checkDate.getUTCDay();
        const dayName = dayNames[dayIndex];

        if (habit.frequency.includes(dayName)) {
            // Found a scheduled day that was skipped
            return false;
        }
        checkDate.setDate(checkDate.getDate() + 1);
        daysChecked++;
    }

    return true;
};

module.exports = { logHabit, getHabitLogs, updateLog, getMonthlyLogs, getHabitNotes };
