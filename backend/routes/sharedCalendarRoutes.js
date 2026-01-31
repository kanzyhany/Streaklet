const express = require('express');
const router = express.Router();
const {
    createCalendar,
    joinCalendar,
    getMyCalendars,
    getCalendarMembers,
    deleteCalendar
} = require('../controllers/sharedCalendarController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
    .get(getMyCalendars)
    .post(createCalendar);

router.route('/:id')
    .delete(deleteCalendar);

router.post('/join/:code', joinCalendar);
router.get('/:id/members', getCalendarMembers);
router.put('/:id/members/:memberId', require('../controllers/sharedCalendarController').updateMemberRole);

module.exports = router;
