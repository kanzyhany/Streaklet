const express = require('express');
const router = express.Router();
const {
    createHabit,
    getHabits,
    getTodaysHabits,
    getHabit,
    updateHabit,
    deleteHabit
} = require('../controllers/habitController');
const { logHabit, getHabitLogs } = require('../controllers/logController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Habit CRUD routes
router.route('/')
    .post(createHabit)
    .get(getHabits);

router.get('/today', getTodaysHabits);

router.route('/:id')
    .get(getHabit)
    .put(updateHabit)
    .delete(deleteHabit);

// Habit log routes
router.route('/:id/log')
    .post(logHabit);

router.route('/:id/logs')
    .get(getHabitLogs);

module.exports = router;
