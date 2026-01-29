const mongoose = require('mongoose');

const streakSchema = new mongoose.Schema({
    habitId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Habit',
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    currentStreak: {
        type: Number,
        default: 0,
        min: 0
    },
    longestStreak: {
        type: Number,
        default: 0,
        min: 0
    },
    lastCompletedDate: {
        type: String // Format: YYYY-MM-DD
    },
    graceDaysUsed: {
        type: Number,
        default: 0,
        max: 1 // Allow 1 grace day per streak
    }
});

// Update longest streak when current streak increases
streakSchema.pre('save', function (next) {
    if (this.currentStreak > this.longestStreak) {
        this.longestStreak = this.currentStreak;
    }
    next();
});

module.exports = mongoose.model('Streak', streakSchema);
