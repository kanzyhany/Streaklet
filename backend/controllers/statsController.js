const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const Streak = require('../models/Streak');
const SharedCalendar = require('../models/SharedCalendar');

// @desc    Get today's progress
// @route   GET /api/stats/today
// @access  Private
const getTodayStats = async (req, res) => {
    try {
        const [hours, minutes, day, month, year, weekday] = new Intl.DateTimeFormat('en-US', {
            timeZone: req.user.timezone || 'UTC',
            hour: 'numeric',
            minute: 'numeric',
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            weekday: 'short'
        }).formatToParts(new Date()).reduce((acc, part) => {
            if (part.type !== 'literal') acc.push(part.value);
            return acc;
        }, []);

        const todayName = weekday;
        const todayMonth = parseInt(month);
        const todayDay = parseInt(day);
        const todayYear = parseInt(year);
        const todayDate = `${todayYear}-${todayMonth.toString().padStart(2, '0')}-${todayDay.toString().padStart(2, '0')}`;

        const startOfDay = new Date(Date.UTC(todayYear, todayMonth - 1, todayDay, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(todayYear, todayMonth - 1, todayDay, 23, 59, 59, 999));

        // Fetch shared calendars
        const mySharedCalendars = await SharedCalendar.find({
            'members.user': req.user._id
        });
        const mySharedCalendarIds = mySharedCalendars.map(c => c._id);

        const habits = await Habit.find({
            active: true,
            $and: [
                {
                    $or: [
                        { userId: req.user._id, sharedCalendarId: null },
                        { sharedCalendarId: { $in: mySharedCalendarIds } }
                    ]
                },
                {
                    $or: [
                        { frequencyType: 'weekly', frequency: todayName },
                        { frequencyType: { $exists: false }, frequency: todayName },
                        { frequencyType: 'yearly', yearlyMonth: todayMonth, yearlyDay: todayDay },
                        { frequencyType: 'one-time', specificDate: { $gte: startOfDay, $lte: endOfDay } }
                    ]
                }
            ]
        });

        // Get today's logs for this user
        const logs = await HabitLog.find({
            userId: req.user._id,
            date: todayDate
        });

        const totalHabits = habits.length;
        const completedHabits = logs.filter(log => log.status === 'done').length;
        const missedHabits = logs.filter(log => log.status === 'missed').length;
        const inProgressHabits = logs.filter(log => log.status === 'in_progress').length;

        // Fix pending calculation: total - (anything that has a log today)
        const pendingHabits = totalHabits - habits.filter(h => logs.some(l => l.habitId.toString() === h._id.toString())).length;

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
        weekStart.setHours(0, 0, 0, 0);

        const days = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            days.push(date.toISOString().split('T')[0]);
        }

        // Fetch shared calendars
        const mySharedCalendars = await SharedCalendar.find({
            'members.user': req.user._id
        });
        const mySharedCalendarIds = mySharedCalendars.map(c => c._id);

        // Get all logs for the week
        const logs = await HabitLog.find({
            userId: req.user._id,
            date: { $in: days }
        });

        // Get active habits (personal + shared)
        const habits = await Habit.find({
            active: true,
            $or: [
                { userId: req.user._id, sharedCalendarId: null },
                { sharedCalendarId: { $in: mySharedCalendarIds } }
            ]
        });

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Calculate daily stats
        const dailyStats = days.map((dateStr, index) => {
            const dayName = dayNames[index];
            const currentDate = new Date(dateStr);
            const currentMonth = currentDate.getMonth() + 1;
            const currentDay = currentDate.getDate();

            // Filter habits for THIS specific day
            const habitsForDay = habits.filter(h => {
                if (h.frequencyType === 'weekly' || !h.frequencyType) {
                    return h.frequency.includes(dayName);
                }
                if (h.frequencyType === 'yearly') {
                    return h.yearlyMonth === currentMonth && h.yearlyDay === currentDay;
                }
                if (h.frequencyType === 'one-time') {
                    const habitDate = new Date(h.specificDate).toISOString().split('T')[0];
                    return habitDate === dateStr;
                }
                return false;
            });

            const dayLogs = logs.filter(log => log.date === dateStr);
            const completedCount = dayLogs.filter(log => log.status === 'done').length;
            const skippedCount = dayLogs.filter(log => log.status === 'skipped').length;
            const totalForDay = habitsForDay.length;

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

            const isPast = dateStr < todayStr;

            let missedCount = 0;
            if (isPast) {
                missedCount = Math.max(0, totalForDay - completedCount - skippedCount);
            } else {
                missedCount = dayLogs.filter(log => log.status === 'missed').length;
            }

            return {
                date: dateStr,
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

        // Find max current streak and its habit(s)
        let maxCurrentStreak = 0;
        let currentStreakHabits = [];

        streaks.forEach(s => {
            if (s.currentStreak > maxCurrentStreak) {
                maxCurrentStreak = s.currentStreak;
                currentStreakHabits = [s.habitId ? s.habitId.title : ''];
            } else if (s.currentStreak === maxCurrentStreak && maxCurrentStreak > 0) {
                if (s.habitId) currentStreakHabits.push(s.habitId.title);
            }
        });

        // Find max longest streak and its habit(s)
        let maxLongestStreak = 0;
        let longestStreakHabits = [];

        streaks.forEach(s => {
            if (s.longestStreak > maxLongestStreak) {
                maxLongestStreak = s.longestStreak;
                longestStreakHabits = [s.habitId ? s.habitId.title : ''];
            } else if (s.longestStreak === maxLongestStreak && maxLongestStreak > 0) {
                if (s.habitId) longestStreakHabits.push(s.habitId.title);
            }
        });

        const maxCurrentStreakHabit = currentStreakHabits.join(' & ');
        const maxLongestStreakHabit = longestStreakHabits.join(' & ');

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
                currentStreakHabit: maxCurrentStreakHabit,
                longestStreak: maxLongestStreak,
                longestStreakHabit: maxLongestStreakHabit,
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
