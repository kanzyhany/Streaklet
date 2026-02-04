const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: [true, 'Habit title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    category: {
        type: String,
        required: true,
        enum: ['Health', 'Learning', 'Mindfulness', 'Wellness', 'Productivity', 'Social', 'Finance', 'Other'],
        default: 'Other'
    },
    frequencyType: {
        type: String,
        enum: ['weekly', 'yearly', 'one-time'],
        default: 'weekly'
    },
    frequency: {
        type: [String],
        enum: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] // Daily by default
    },
    yearlyMonth: {
        type: Number, // 1-12 for January-December
        min: 1,
        max: 12
    },
    yearlyDay: {
        type: Number, // 1-31 for day of month
        min: 1,
        max: 31
    },
    specificDate: {
        type: Date // For one-time habits
    },
    reminderTime: {
        type: String,
        default: '09:00' // Format: HH:mm
    },
    color: {
        type: String,
        default: '#4A7C59' // Sage green - default brand color
    },
    icon: {
        type: String,
        default: '🎯'
    },
    active: {
        type: Boolean,
        default: true
    },
    sharedCalendarId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SharedCalendar',
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
habitSchema.index({ userId: 1, active: 1 });

module.exports = mongoose.model('Habit', habitSchema);
