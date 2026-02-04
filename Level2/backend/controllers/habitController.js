const Habit = require('../models/Habit');
const Streak = require('../models/Streak');
const HabitLog = require('../models/HabitLog');
const SharedCalendar = require('../models/SharedCalendar');

// @desc    Create a new habit
// @route   POST /api/habits
// @access  Private
const createHabit = async (req, res) => {
    try {
        const { title, category, frequencyType, frequency, yearlyMonth, yearlyDay, specificDate, reminderTime, color, icon, sharedCalendarId } = req.body;

        const habitData = {
            userId: req.user._id,
            title,
            category: category || 'Other',
            frequencyType: frequencyType || 'weekly',
            reminderTime: reminderTime || '09:00',
            color: color || '#4A7C59',
            icon: icon || '🎯',
            sharedCalendarId: sharedCalendarId || null
        };

        // If shared calendar, check if user has 'edit' role
        if (sharedCalendarId) {
            const calendar = await SharedCalendar.findById(sharedCalendarId);
            if (!calendar) {
                return res.status(404).json({ success: false, message: 'Shared calendar not found' });
            }

            const member = calendar.members.find(m => m.user.toString() === req.user._id.toString());
            if (!member || member.role !== 'edit') {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to add habits to this shared calendar'
                });
            }
        }
        // ... rest of createHabit remains same logic for frequency

        // Set frequency based on type
        if (frequencyType === 'yearly') {
            habitData.yearlyMonth = yearlyMonth;
            habitData.yearlyDay = yearlyDay;
            habitData.frequency = []; // Clear weekly frequency for yearly habits
        } else if (frequencyType === 'one-time') {
            habitData.specificDate = specificDate;
            habitData.frequency = [];
        } else {
            habitData.frequency = frequency || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        }

        const habit = await Habit.create(habitData);

        // Create initial streak record
        await Streak.create({
            habitId: habit._id,
            userId: req.user._id,
            currentStreak: 0,
            longestStreak: 0
        });

        res.status(201).json({
            success: true,
            message: 'Habit created successfully',
            data: habit
        });
    } catch (error) {
        console.error('Create habit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create habit',
            error: error.message
        });
    }
};

// @desc    Get all habits for current user (optionally filtered by calendar)
// @route   GET /api/habits?calendarId=...
// @access  Private
const getHabits = async (req, res) => {
    try {
        const { calendarId, active } = req.query;
        let query = {};

        // Default to active habits unless specified otherwise
        if (active === 'false') {
            query.active = false;
        } else {
            query.active = true;
        }

        if (calendarId === 'personal') {
            query.userId = req.user._id;
            query.sharedCalendarId = null;
        } else if (calendarId && calendarId !== 'all') {
            // Verify membership for a specific shared calendar
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
            // Fetch all (personal + shared)
            const mySharedCalendars = await SharedCalendar.find({
                'members.user': req.user._id
            });
            const mySharedCalendarIds = mySharedCalendars.map(c => c._id);

            query.$or = [
                { userId: req.user._id, sharedCalendarId: null },
                { sharedCalendarId: { $in: mySharedCalendarIds } }
            ];
        }

        const habits = await Habit.find(query)
            .populate({
                path: 'sharedCalendarId',
                select: 'name members ownerId'
            })
            .sort({ createdAt: -1 });

        // Process habits to add canEdit flag and streaks
        const processedHabits = await Promise.all(
            habits.map(async (habit) => {
                const habitObj = habit.toObject();

                // By default, you can edit your own personal habits
                let canEdit = true;

                if (habit.sharedCalendarId) {
                    // For shared habits, check role
                    const calendar = habit.sharedCalendarId;

                    // Owner can always edit
                    if (calendar.ownerId.toString() === req.user._id.toString()) {
                        canEdit = true;
                    } else {
                        // Check member role
                        const member = calendar.members.find(m =>
                            m.user && m.user.toString() === req.user._id.toString()
                        );
                        canEdit = member && member.role === 'edit';
                    }

                    // Cleanup sensitive member data from response
                    delete habitObj.sharedCalendarId.members;
                }

                habitObj.canEdit = canEdit;

                // Get streaks for each habit
                const streak = await Streak.findOne({ habitId: habit._id });
                habitObj.currentStreak = streak?.currentStreak || 0;
                habitObj.longestStreak = streak?.longestStreak || 0;

                return habitObj;
            })
        );

        res.status(200).json({
            success: true,
            count: processedHabits.length,
            data: processedHabits
        });
    } catch (error) {
        console.error('Get habits error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch habits',
            error: error.message
        });
    }
};

// @desc    Get today's habits with status
// @route   GET /api/habits/today
// @access  Private
const getTodaysHabits = async (req, res) => {
    try {
        const userTimezone = req.user.timezone || 'UTC';

        // Get current time in user's timezone
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: userTimezone,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            weekday: 'short'
        });

        const parts = formatter.formatToParts(now);
        const dateParts = {};
        parts.forEach(p => dateParts[p.type] = p.value);

        // Map short weekday to your app's format (Sun, Mon, etc.)
        const todayName = dateParts.weekday;
        const todayMonth = parseInt(dateParts.month);
        const todayDay = parseInt(dateParts.day);
        const todayYear = parseInt(dateParts.year);

        // Construct YYYY-MM-DD string for comparison (e.g., for logs)
        const todayDate = `${todayYear}-${todayMonth.toString().padStart(2, '0')}-${todayDay.toString().padStart(2, '0')}`;

        // For one-time habits, we need to calculate boundaries in user's local time
        // but since specificDate is stored as a Date (UTC), we should compare it 
        // against the start and end of the "user's day" in UTC.
        const startOfDay = new Date(Date.UTC(todayYear, todayMonth - 1, todayDay, 0, 0, 0, 0));
        // Note: startOfDay in UTC needs to be adjusted by the timezone offset if we want strict accuracy,
        // but a simpler approach is to check if the specificDate (which is UTC) falls on the same "calendar day".
        // However, the current schema stores specificDate which usually represents the "target day".

        const endOfDay = new Date(Date.UTC(todayYear, todayMonth - 1, todayDay, 23, 59, 59, 999));

        // Fetch shared calendars etc.
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
                        { frequencyType: { $exists: false }, frequency: todayName }, // Legacy habits without frequencyType
                        { frequencyType: 'yearly', yearlyMonth: todayMonth, yearlyDay: todayDay },
                        { frequencyType: 'one-time', specificDate: { $gte: startOfDay, $lte: endOfDay } }
                    ]
                }
            ]
        }).populate('sharedCalendarId', 'name').sort({ reminderTime: 1 });

        // Get today's logs and streaks
        const habitsWithStatus = await Promise.all(
            habits.map(async (habit) => {
                const log = await HabitLog.findOne({
                    habitId: habit._id,
                    date: todayDate,
                    userId: req.user._id
                });
                const streak = await Streak.findOne({ habitId: habit._id });

                return {
                    ...habit.toObject(),
                    todayStatus: log?.status || 'pending',
                    todayNotes: log?.notes || '',
                    currentStreak: streak?.currentStreak || 0,
                    longestStreak: streak?.longestStreak || 0
                };
            })
        );

        // Fetch shared completions for the dashboard today view
        const sharedLogQuery = {
            sharedCalendarId: { $in: mySharedCalendarIds },
            date: todayDate,
            status: 'done'
        };

        const sharedLogs = await HabitLog.find(sharedLogQuery).populate('userId', 'name');
        const sharedCompletions = {};

        sharedLogs.forEach(sLog => {
            const hId = sLog.habitId.toString();
            if (!sharedCompletions[hId]) sharedCompletions[hId] = [];
            if (sLog.userId && sLog.userId.name) {
                const name = sLog.userId._id.toString() === req.user._id.toString() ? 'You' : sLog.userId.name;
                sharedCompletions[hId].push(name);
            }
        });

        res.status(200).json({
            success: true,
            date: todayDate,
            day: todayName,
            count: habitsWithStatus.length,
            data: habitsWithStatus,
            sharedCompletions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch today\'s habits',
            error: error.message
        });
    }
};

// @desc    Get single habit
// @route   GET /api/habits/:id
// @access  Private
const getHabit = async (req, res) => {
    try {
        const habit = await Habit.findById(req.params.id);

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
                const isMember = calendar.members.some(m =>
                    m.user && m.user.toString() === req.user._id.toString()
                );
                if (calendar.ownerId.toString() === req.user._id.toString() || isMember) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this habit'
            });
        }

        const streak = await Streak.findOne({ habitId: habit._id });

        res.status(200).json({
            success: true,
            data: {
                ...habit.toObject(),
                currentStreak: streak?.currentStreak || 0,
                longestStreak: streak?.longestStreak || 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch habit',
            error: error.message
        });
    }
};

// @desc    Update habit
// @route   PUT /api/habits/:id
// @access  Private
const updateHabit = async (req, res) => {
    try {
        const { title, category, frequencyType, frequency, yearlyMonth, yearlyDay, specificDate, reminderTime, color, icon, active, sharedCalendarId } = req.body;

        let habit = await Habit.findById(req.params.id);

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

        // 2. Check shared calendar permissions
        if (habit.sharedCalendarId) {
            const calendar = await SharedCalendar.findById(habit.sharedCalendarId);
            if (calendar) {
                const isOwner = calendar.ownerId.toString() === req.user._id.toString();
                const member = calendar.members.find(m =>
                    m.user && m.user.toString() === req.user._id.toString()
                );

                // Allow if Owner OR (Member AND role is 'edit')
                if (isOwner || (member && member.role === 'edit')) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to edit this habit'
            });
        }

        const updateData = { title, category, frequencyType, reminderTime, color, icon, active };

        // Handle calendar change
        if (sharedCalendarId !== undefined) {
            updateData.sharedCalendarId = sharedCalendarId === 'personal' ? null : sharedCalendarId;
        }

        // Set frequency based on type
        if (frequencyType === 'yearly') {
            updateData.yearlyMonth = yearlyMonth;
            updateData.yearlyDay = yearlyDay;
            updateData.frequency = [];
            updateData.specificDate = null;
        } else if (frequencyType === 'one-time') {
            updateData.specificDate = specificDate;
            updateData.frequency = [];
            updateData.yearlyMonth = null;
            updateData.yearlyDay = null;
        } else {
            updateData.frequency = frequency;
            updateData.yearlyMonth = null;
            updateData.yearlyDay = null;
            updateData.specificDate = null;
        }

        habit = await Habit.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Habit updated successfully',
            data: habit
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update habit',
            error: error.message
        });
    }
};

// @desc    Delete habit (soft delete)
// @route   DELETE /api/habits/:id
// @access  Private
const deleteHabit = async (req, res) => {
    try {
        const habit = await Habit.findById(req.params.id);

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

        // 2. Check shared calendar permissions
        if (habit.sharedCalendarId) {
            const calendar = await SharedCalendar.findById(habit.sharedCalendarId);
            if (calendar) {
                const isOwner = calendar.ownerId.toString() === req.user._id.toString();
                const member = calendar.members.find(m =>
                    m.user && m.user.toString() === req.user._id.toString()
                );

                // Allow if Owner OR (Member AND role is 'edit')
                if (isOwner || (member && member.role === 'edit')) {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this habit'
            });
        }

        // Soft delete - just mark as inactive
        await Habit.findByIdAndUpdate(req.params.id, { active: false });

        res.status(200).json({
            success: true,
            message: 'Habit deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete habit',
            error: error.message
        });
    }
};

module.exports = {
    createHabit,
    getHabits,
    getTodaysHabits,
    getHabit,
    updateHabit,
    deleteHabit
};
