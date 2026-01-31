const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const habitRoutes = require('./routes/habits');
const logRoutes = require('./routes/logs');
const statsRoutes = require('./routes/stats');
const notificationRoutes = require('./routes/notifications');
const sharedCalendarRoutes = require('./routes/sharedCalendarRoutes');
const graceRoutes = require('./routes/graceRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/shared-calendars', sharedCalendarRoutes);
app.use('/api/grace', graceRoutes);
app.use('/api/chat', chatRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: '🌿 Streaklet API is running!',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`
  🌿 ═══════════════════════════════════════════
     Streaklet API Server
  ═══════════════════════════════════════════
     🚀 Server running on port ${PORT}
     📊 Environment: ${process.env.NODE_ENV || 'development'}
     🔗 Health check: http://localhost:${PORT}/api/health
  ═══════════════════════════════════════════
  `);
});

module.exports = app;
