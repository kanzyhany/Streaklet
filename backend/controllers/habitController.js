const Habit = require('../models/Habit');
const Streak = require('../models/Streak');
const HabitLog = require('../models/HabitLog');

// @desc    Create a new habit
// @route   POST /api/habits
// @access  Private
const createHabit = async (req, res) => {
    try {
        const { title, category, frequencyType, frequency, yearlyMonth, yearlyDay, specificDate, reminderTime, color, icon } = req.body;

        const habitData = {
            userId: req.user._id,
            title,
            category: category || 'Other',
            frequencyType: frequencyType || 'weekly',
            reminderTime: reminderTime || '09:00',
            color: color || '#4A7C59',
            icon: icon || '🎯'
        };

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

// @desc    Get all habits for current user
// @route   GET /api/habits
// @access  Private
const getHabits = async (req, res) => {
    try {
        const habits = await Habit.find({ userId: req.user._id, active: true })
            .sort({ createdAt: -1 });

        // Get streaks for each habit
        const habitsWithStreaks = await Promise.all(
            habits.map(async (habit) => {
                const streak = await Streak.findOne({ habitId: habit._id });
                return {
                    ...habit.toObject(),
                    currentStreak: streak?.currentStreak || 0,
                    longestStreak: streak?.longestStreak || 0
                };
            })
        );

        res.status(200).json({
            success: true,
            count: habits.length,
            data: habitsWithStreaks
        });
    } catch (error) {
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
        const today = new Date();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayName = dayNames[today.getDay()];
        const todayDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
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

        // Get today's logs and streaks
        const habitsWithStatus = await Promise.all(
            habits.map(async (habit) => {
                const log = await HabitLog.findOne({
                    habitId: habit._id,
                    date: todayDate
                });
                const streak = await Streak.findOne({ habitId: habit._id });

                return {
                    ...habit.toObject(),
                    todayStatus: log?.status || 'pending',
                    currentStreak: streak?.currentStreak || 0,
                    longestStreak: streak?.longestStreak || 0
                };
            })
        );

        res.status(200).json({
            success: true,
            date: todayDate,
            day: todayName,
            count: habitsWithStatus.length,
            data: habitsWithStatus
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
        const habit = await Habit.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found'
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
        const { title, category, frequencyType, frequency, yearlyMonth, yearlyDay, specificDate, reminderTime, color, icon, active } = req.body;

        let habit = await Habit.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found'
            });
        }

        const updateData = { title, category, frequencyType, reminderTime, color, icon, active };

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
        const habit = await Habit.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found'
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
