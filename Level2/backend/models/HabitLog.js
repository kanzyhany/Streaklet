const mongoose = require('mongoose');

const habitLogSchema = new mongoose.Schema({
    habitId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Habit',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: {
        type: String,
        required: true // Format: YYYY-MM-DD
    },
    status: {
        type: String,
        enum: ['done', 'missed', 'skipped', 'in_progress'],
        default: 'in_progress'
    },
    completedAt: {
        type: Date
    },
    notes: {
        type: String,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    sharedCalendarId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SharedCalendar',
        default: null
    }
});

// Compound index for efficient date-based queries
habitLogSchema.index({ habitId: 1, userId: 1, date: 1 }, { unique: true });
habitLogSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('HabitLog', habitLogSchema);
