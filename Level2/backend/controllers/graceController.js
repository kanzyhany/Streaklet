const User = require('../models/User');
const SharedCalendar = require('../models/SharedCalendar');
const GraceDay = require('../models/GraceDay');

// @desc    Get grace day and points status
// @route   GET /api/grace/status
// @access  Private
const getGraceStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        // Get shared calendars the user is a member of
        const sharedCalendars = await SharedCalendar.find({
            'members.user': req.user._id
        });

        // Get today's date in user's timezone
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
        const todayDate = `${dateParts.year}-${dateParts.month.padStart(2, '0')}-${dateParts.day.padStart(2, '0')}`;

        // Build response with shared calendar grace days
        const sharedCalendarData = await Promise.all(sharedCalendars.map(async (calendar) => {
            const member = calendar.members.find(m =>
                m.user && m.user.toString() === req.user._id.toString()
            );

            const isGraceActive = await GraceDay.exists({
                userId: req.user._id,
                calendarId: calendar._id,
                activatedDate: todayDate
            });

            return {
                calendarId: calendar._id,
                calendarName: calendar.name,
                points: calendar.points,
                graceDays: member ? member.graceDays : 0,
                activeToday: !!isGraceActive
            };
        }));

        const isPersonalGraceActive = await GraceDay.exists({
            userId: req.user._id,
            calendarId: null,
            activatedDate: todayDate
        });

        res.status(200).json({
            success: true,
            data: {
                personal: {
                    points: user.personalPoints,
                    graceDays: user.personalGraceDays,
                    activeToday: !!isPersonalGraceActive
                },
                sharedCalendars: sharedCalendarData
            }
        });
    } catch (error) {
        console.error('Get grace status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch grace day status',
            error: error.message
        });
    }
};

// @desc    Activate a grace day for today
// @route   POST /api/grace/activate
// @access  Private
const activateGraceDay = async (req, res) => {
    try {
        const { calendarId } = req.body; // null/undefined for personal, calendarId for shared

        // Get today's date in user's timezone
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

        const year = parseInt(dateParts.year);
        const month = parseInt(dateParts.month);
        const day = parseInt(dateParts.day);

        const todayDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

        // Check if grace day already activated for today
        const existingGraceDay = await GraceDay.findOne({
            userId: req.user._id,
            calendarId: calendarId || null,
            activatedDate: todayDate
        });

        if (existingGraceDay) {
            return res.status(400).json({
                success: false,
                message: 'Grace day for today is already activated'
            });
        }

        let updatedGraceDays;

        if (calendarId) {
            // Shared calendar grace day
            const calendar = await SharedCalendar.findById(calendarId);

            if (!calendar) {
                return res.status(404).json({
                    success: false,
                    message: 'Calendar not found'
                });
            }

            const member = calendar.members.find(m =>
                m.user && m.user.toString() === req.user._id.toString()
            );

            if (!member) {
                return res.status(403).json({
                    success: false,
                    message: 'Not a member of this calendar'
                });
            }

            if (member.graceDays <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No grace days available for this calendar'
                });
            }

            // Deduct grace day from member
            member.graceDays -= 1;
            await calendar.save();
            updatedGraceDays = member.graceDays;

        } else {
            // Personal calendar grace day
            const user = await User.findById(req.user._id);

            if (user.personalGraceDays <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No grace days available'
                });
            }

            user.personalGraceDays -= 1;
            await user.save();
            updatedGraceDays = user.personalGraceDays;
        }

        // Create grace day record
        await GraceDay.create({
            userId: req.user._id,
            calendarId: calendarId || null,
            activatedDate: todayDate
        });

        res.status(200).json({
            success: true,
            message: 'Grace day activated for today',
            data: {
                activatedDate: todayDate,
                remainingGraceDays: updatedGraceDays
            }
        });

    } catch (error) {
        console.error('Activate grace day error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to activate grace day',
            error: error.message
        });
    }
};

// @desc    Get grace day history
// @route   GET /api/grace/history
// @access  Private
const getGraceHistory = async (req, res) => {
    try {
        const { limit } = req.query;

        const history = await GraceDay.find({ userId: req.user._id })
            .populate('calendarId', 'name')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit) || 30);

        res.status(200).json({
            success: true,
            count: history.length,
            data: history
        });
    } catch (error) {
        console.error('Get grace history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch grace day history',
            error: error.message
        });
    }
};

// Helper: Check if a grace day is active for a specific date and calendar
const checkGraceDayProtection = async (userId, date, calendarId = null) => {
    const graceDay = await GraceDay.findOne({
        userId,
        calendarId: calendarId || null,
        activatedDate: date,
        used: false
    });

    return graceDay;
};

// Helper: Mark grace day as used
const markGraceDayAsUsed = async (graceDayId) => {
    await GraceDay.findByIdAndUpdate(graceDayId, { used: true });
};

module.exports = {
    getGraceStatus,
    activateGraceDay,
    getGraceHistory,
    checkGraceDayProtection,
    markGraceDayAsUsed
};
