const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const Streak = require('../models/Streak');

// @desc    Get today's progress
// @route   GET /api/stats/today
// @access  Private
const getTodayStats = async (req, res) => {
    try {
        const today = new Date();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayName = dayNames[today.getDay()];
        const todayDate = today.toISOString().split('T')[0];
        const todayMonth = today.getMonth() + 1; // 1-12
        const todayDay = today.getDate(); // 1-31

        // Get weekly habits scheduled for today + yearly habits that match today's date + one-time habits for today
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const habits = await Habit.find({
            userId: req.user._id,
            active: true,
            $or: [
                { frequencyType: 'weekly', frequency: todayName },
                { frequencyType: { $exists: false }, frequency: todayName }, // Legacy habits without frequencyType
                { frequencyType: 'yearly', yearlyMonth: todayMonth, yearlyDay: todayDay },
                { frequencyType: 'one-time', specificDate: { $gte: startOfDay, $lte: endOfDay } }
            ]
        });

        // Get today's logs
        const logs = await HabitLog.find({
            userId: req.user._id,
            date: todayDate
        });

        const totalHabits = habits.length;
        const completedHabits = logs.filter(log => log.status === 'done').length;
        const missedHabits = logs.filter(log => log.status === 'missed').length;
        const inProgressHabits = logs.filter(log => log.status === 'in_progress').length;
        const pendingHabits = totalHabits - logs.length;

        const completionPercentage = totalHabits > 0
            ? Math.round((completedHabits / totalHabits) * 100)
            : 0;

        res.status(200).json({
            success: true,
            data: {
                date: todayDate,
                totalHabits,
                completedHabits,
                missedHabits,
                inProgressHabits,
                pendingHabits,
                completionPercentage
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch today\'s stats',
            error: error.message
        });
    }
};

// @desc    Get weekly stats
// @route   GET /api/stats/weekly
// @access  Private
const getWeeklyStats = async (req, res) => {
    try {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start from Sunday

        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            days.push(date.toISOString().split('T')[0]);
        }

        // Get all logs for the week
        const logs = await HabitLog.find({
            userId: req.user._id,
            date: { $in: days }
        });

        // Get active habits count
        const habits = await Habit.find({
            userId: req.user._id,
            active: true
        });

        // Calculate daily stats
        const dailyStats = days.map((date, index) => {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayName = dayNames[index];

            // Get habits for this day
            const habitsForDay = habits.filter(h => h.frequency.includes(dayName));
            const dayLogs = logs.filter(log => log.date === date);

            const completedCount = dayLogs.filter(log => log.status === 'done').length;
            const skippedCount = dayLogs.filter(log => log.status === 'skipped').length;
            const totalForDay = habitsForDay.length;

            // Calculate missed: 
            // For past days: Total - (Done + Skipped)
            // For today: Only count explicit 'missed' status (since day isn't over)
            let missedCount = 0;

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
            const todayStr = `${dateParts.year}-${dateParts.month.toString().padStart(2, '0')}-${dateParts.day.toString().padStart(2, '0')}`;

            const isPast = date < todayStr;

            if (isPast) {
                missedCount = Math.max(0, totalForDay - completedCount - skippedCount);
            } else {
                missedCount = dayLogs.filter(log => log.status === 'missed').length;
            }

            return {
                date,
                day: dayName,
                completed: completedCount,
                missed: missedCount,
                total: totalForDay,
                percentage: totalForDay > 0 ? Math.round((completedCount / totalForDay) * 100) : 0,
                isPerfectDay: totalForDay > 0 && completedCount === totalForDay
            };
        });

        const perfectDays = dailyStats.filter(d => d.isPerfectDay).length;

        res.status(200).json({
            success: true,
            data: {
                weekStart: days[0],
                weekEnd: days[6],
                dailyStats,
                perfectDays,
                averageCompletion: Math.round(
                    dailyStats.reduce((acc, d) => acc + d.percentage, 0) / 7
                )
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch weekly stats',
            error: error.message
        });
    }
};

// @desc    Get monthly stats
// @route   GET /api/stats/monthly
// @access  Private
const getMonthlyStats = async (req, res) => {
    try {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const startDate = monthStart.toISOString().split('T')[0];
        const endDate = monthEnd.toISOString().split('T')[0];

        // Get all logs for the month
        const logs = await HabitLog.find({
            userId: req.user._id,
            date: { $gte: startDate, $lte: endDate }
        });

        const completedCount = logs.filter(log => log.status === 'done').length;
        const totalLogs = logs.length;

        res.status(200).json({
            success: true,
            data: {
                month: today.toLocaleString('default', { month: 'long' }),
                year: today.getFullYear(),
                totalCompleted: completedCount,
                totalLogged: totalLogs,
                completionRate: totalLogs > 0
                    ? Math.round((completedCount / totalLogs) * 100)
                    : 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch monthly stats',
            error: error.message
        });
    }
};

// @desc    Get streak stats
// @route   GET /api/stats/streaks
// @access  Private
const getStreakStats = async (req, res) => {
    try {
        // Get all streaks for user's habits
        const streaks = await Streak.find({ userId: req.user._id })
            .populate('habitId', 'title category icon color');

        // Find max current streak
        const maxCurrentStreak = streaks.reduce((max, s) =>
            s.currentStreak > max ? s.currentStreak : max, 0);

        // Find max longest streak
        const maxLongestStreak = streaks.reduce((max, s) =>
            s.longestStreak > max ? s.longestStreak : max, 0);

        // Get best streaking habits
        const bestStreaks = streaks
            .filter(s => s.habitId) // Filter out any orphaned streaks
            .sort((a, b) => b.currentStreak - a.currentStreak)
            .slice(0, 5)
            .map(s => ({
                habitId: s.habitId._id,
                title: s.habitId.title,
                category: s.habitId.category,
                icon: s.habitId.icon,
                color: s.habitId.color,
                currentStreak: s.currentStreak,
                longestStreak: s.longestStreak
            }));

        res.status(200).json({
            success: true,
            data: {
                currentStreak: maxCurrentStreak,
                longestStreak: maxLongestStreak,
                bestStreaks
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch streak stats',
            error: error.message
        });
    }
};

// @desc    Get habit insights
// @route   GET /api/stats/insights
// @access  Private
const getInsights = async (req, res) => {
    try {
        // Get logs from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];

        const logs = await HabitLog.find({
            userId: req.user._id,
            date: { $gte: startDate, $lte: endDate },
            status: 'done'
        });

        // Analyze best day
        const dayCount = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        logs.forEach(log => {
            const day = new Date(log.date).getDay();
            dayCount[dayNames[day]]++;
        });

        const bestDay = Object.entries(dayCount)
            .sort((a, b) => b[1] - a[1])[0];

        // Analyze best time (using completedAt)
        const hourCount = {};
        logs.forEach(log => {
            if (log.completedAt) {
                const hour = new Date(log.completedAt).getHours();
                hourCount[hour] = (hourCount[hour] || 0) + 1;
            }
        });

        const bestHour = Object.entries(hourCount)
            .sort((a, b) => b[1] - a[1])[0];

        const formatHour = (hour) => {
            const h = parseInt(hour);
            if (h === 0) return '12 AM';
            if (h < 12) return `${h} AM`;
            if (h === 12) return '12 PM';
            return `${h - 12} PM`;
        };

        res.status(200).json({
            success: true,
            data: {
                bestDay: bestDay ? {
                    day: bestDay[0],
                    message: `You complete habits most consistently on ${bestDay[0]}s`
                } : null,
                bestTime: bestHour ? {
                    hour: parseInt(bestHour[0]),
                    message: `You're most consistent with habits at ${formatHour(bestHour[0])}`
                } : null,
                totalCompletedLast30Days: logs.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch insights',
            error: error.message
        });
    }
};

module.exports = {
    getTodayStats,
    getWeeklyStats,
    getMonthlyStats,
    getStreakStats,
    getInsights
};
