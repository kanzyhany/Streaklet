const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for Level 1 Basic requirements
let habits = [
    {
        _id: '1',
        title: 'Morning Exercise',
        category: 'Health',
        frequencyType: 'weekly',
        frequency: ['Mon', 'Wed', 'Fri'],
        color: '#4a7c59',
        icon: '🏃',
        active: true,
        canEdit: true,
        createdAt: new Date().toISOString()
    },
    {
        _id: '2',
        title: 'Read 20 Pages',
        category: 'Education',
        frequencyType: 'daily',
        color: '#3d5a80',
        icon: '📚',
        active: true,
        canEdit: true,
        createdAt: new Date().toISOString()
    }
];

let logs = [];
let userProfile = {
    name: 'Level 1 User',
    email: 'level1@streaklet.com',
    points: 150,
    graceDays: 15,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=streaklet'
};

let sharedCalendars = [
    {
        _id: 'sc1',
        name: 'Family Goals',
        icon: '🏠',
        members: [{ name: 'Level 1 User', points: 150 }],
        habits: []
    }
];

// CRUD Routes for Habits
app.get('/api/habits', (req, res) => {
    res.json({ success: true, data: habits });
});

app.post('/api/habits', (req, res) => {
    const newHabit = {
        _id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        canEdit: true,
        ...req.body
    };
    habits.push(newHabit);
    res.status(201).json({ success: true, data: newHabit });
});

app.put('/api/habits/:id', (req, res) => {
    const index = habits.findIndex(h => h._id === req.params.id);
    if (index !== -1) {
        habits[index] = { ...habits[index], ...req.body };
        return res.json({ success: true, data: habits[index] });
    }
    res.status(404).json({ success: false, message: 'Habit not found' });
});

app.delete('/api/habits/:id', (req, res) => {
    habits = habits.filter(h => h._id !== req.params.id);
    res.json({ success: true, message: 'Habit deleted' });
});

// Logs for Habits
app.get('/api/habits/:id/logs', (req, res) => {
    const habitLogs = logs.filter(l => l.habitId === req.params.id);
    res.json({ success: true, data: habitLogs });
});

app.post('/api/habits/:id/log', (req, res) => {
    const newLog = {
        _id: Date.now().toString(),
        habitId: req.params.id,
        timestamp: new Date().toISOString(),
        ...req.body
    };
    logs.push(newLog);
    res.json({ success: true, data: newLog });
});

// Profile Routes
app.get('/api/auth/me', (req, res) => {
    res.json({ success: true, data: userProfile });
});

app.put('/api/auth/profile', (req, res) => {
    userProfile = { ...userProfile, ...req.body };
    res.json({ success: true, data: userProfile });
});

// Shared Calendar Routes
app.get('/api/shared-calendars', (req, res) => {
    res.json({ success: true, data: sharedCalendars });
});

app.post('/api/shared-calendars', (req, res) => {
    const newSC = {
        _id: Date.now().toString(),
        members: [{ name: userProfile.name, points: userProfile.points }],
        habits: [],
        ...req.body
    };
    sharedCalendars.push(newSC);
    res.status(201).json({ success: true, data: newSC });
});

app.delete('/api/shared-calendars/:id', (req, res) => {
    sharedCalendars = sharedCalendars.filter(sc => sc._id !== req.params.id);
    res.json({ success: true, message: 'Shared calendar deleted' });
});

// Stats Routes
app.get('/api/stats/today', (req, res) => {
    const completedToday = logs.filter(l => {
        const d = new Date(l.timestamp);
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    }).length;

    res.json({
        success: true,
        data: {
            completion: completedToday > 0 ? (completedToday / habits.length) * 100 : 0,
            total: habits.length,
            completed: completedToday
        }
    });
});

app.get('/api/stats/overall', (req, res) => {
    res.json({
        success: true,
        data: {
            totalHabits: habits.length,
            totalLogs: logs.length,
            points: userProfile.points,
            graceDays: userProfile.graceDays
        }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Level 1 Basic API is running!' });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Level 1 (Basic) Server running on port ${PORT}`);
});
