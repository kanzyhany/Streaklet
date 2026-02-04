const SharedCalendar = require('../models/SharedCalendar');
const Habit = require('../models/Habit');
const HabitLog = require('../models/HabitLog');
const Streak = require('../models/Streak');
const crypto = require('crypto');

// Generate unique 8-char join code
const generateJoinCode = () => {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// @desc    Create a new shared calendar
// @route   POST /api/shared-calendars
// @access  Private
const createCalendar = async (req, res) => {
    try {
        const { name } = req.body;

        let joinCode = generateJoinCode();
        // Ensure uniqueness (simple retry)
        let existing = await SharedCalendar.findOne({ joinCode });
        while (existing) {
            joinCode = generateJoinCode();
            existing = await SharedCalendar.findOne({ joinCode });
        }

        const calendar = await SharedCalendar.create({
            name,
            joinCode,
            ownerId: req.user._id,
            members: [{ user: req.user._id, role: 'edit' }]
        });

        res.status(201).json({
            success: true,
            data: calendar
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Join a shared calendar by code
// @route   POST /api/shared-calendars/join/:code
// @access  Private
const joinCalendar = async (req, res) => {
    try {
        const { code } = req.params;
        const calendar = await SharedCalendar.findOne({ joinCode: code.toUpperCase() });

        if (!calendar) {
            return res.status(404).json({
                success: false,
                message: 'Calendar not found with this code'
            });
        }

        const isAlreadyMember = calendar.members.some(m =>
            m.user && m.user.toString() === req.user._id.toString()
        );
        if (isAlreadyMember) {
            return res.status(400).json({
                success: false,
                message: 'You are already a member of this calendar'
            });
        }

        calendar.members.push({ user: req.user._id, role: 'view' });
        await calendar.save();

        res.status(200).json({
            success: true,
            data: calendar
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get user's shared calendars
// @route   GET /api/shared-calendars
// @access  Private
const getMyCalendars = async (req, res) => {
    try {
        const calendars = await SharedCalendar.find({ 'members.user': req.user._id })
            .populate('ownerId', 'name email')
            .populate('members.user', 'name email');

        res.status(200).json({
            success: true,
            data: calendars
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get calendar members
// @route   GET /api/shared-calendars/:id/members
// @access  Private
const getCalendarMembers = async (req, res) => {
    try {
        const calendar = await SharedCalendar.findById(req.params.id)
            .populate('members.user', 'name email');

        if (!calendar) {
            return res.status(404).json({
                success: false,
                message: 'Calendar not found'
            });
        }

        // Check if requester is a member
        const isMember = calendar.members.some(m => m.user && m.user._id && m.user._id.toString() === req.user._id.toString());
        if (!isMember) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view members'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                members: calendar.members,
                ownerId: calendar.ownerId
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const updateMemberRole = async (req, res) => {
    try {
        const { role } = req.body;
        const calendar = await SharedCalendar.findById(req.params.id);

        if (!calendar) {
            return res.status(404).json({ success: false, message: 'Calendar not found' });
        }

        // Only owner can update roles
        if (calendar.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Only owner can manage roles' });
        }

        if (!['view', 'edit'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        const memberIndex = calendar.members.findIndex(m =>
            m.user && m.user.toString() === req.params.memberId
        );

        if (memberIndex === -1) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        // Prevent changing owner's role (optional safety check)
        if (req.params.memberId === calendar.ownerId.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot change owner role' });
        }

        calendar.members[memberIndex].role = role;
        await calendar.save();

        res.status(200).json({ success: true, data: calendar });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteCalendar = async (req, res) => {
    try {
        const calendar = await SharedCalendar.findById(req.params.id);

        if (!calendar) {
            return res.status(404).json({ success: false, message: 'Calendar not found' });
        }

        // Only owner can delete
        if (calendar.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Only history owner can delete this calendar' });
        }

        // 1. Find all habits associated with this calendar
        const habits = await Habit.find({ sharedCalendarId: req.params.id });
        const habitIds = habits.map(h => h._id);

        // 2. Delete logs for these habits
        await HabitLog.deleteMany({ habitId: { $in: habitIds } });

        // 3. Delete streaks for these habits
        await Streak.deleteMany({ habitId: { $in: habitIds } });

        // 4. Delete the habits themselves
        await Habit.deleteMany({ sharedCalendarId: req.params.id });

        // 5. Finally delete the calendar
        await calendar.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = {
    createCalendar,
    joinCalendar,
    getMyCalendars,
    getCalendarMembers,
    updateMemberRole,
    deleteCalendar
};
