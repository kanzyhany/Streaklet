const mongoose = require('mongoose');

const sharedCalendarSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Calendar name is required'],
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    joinCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        minlength: 8,
        maxlength: 8
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['view', 'edit'],
            default: 'view'
        },
        graceDays: {
            type: Number,
            default: 0,
            min: 0
        }
    }],
    points: {
        type: Number,
        default: 0,
        min: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('SharedCalendar', sharedCalendarSchema);
