const mongoose = require('mongoose');

const graceDaySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    calendarId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SharedCalendar',
        default: null // null for personal calendar
    },
    activatedDate: {
        type: String, // Format: YYYY-MM-DD
        required: true
    },
    used: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for efficient queries
graceDaySchema.index({ userId: 1, activatedDate: 1 });
graceDaySchema.index({ userId: 1, calendarId: 1, activatedDate: 1 });

module.exports = mongoose.model('GraceDay', graceDaySchema);
