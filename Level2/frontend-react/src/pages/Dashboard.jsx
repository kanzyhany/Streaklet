import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { habitService } from '../services/api';
import HabitCard from '../components/HabitCard';

const Dashboard = () => {
    const { user } = useAuth();
    const [habits, setHabits] = useState([]);
    const [logs, setLogs] = useState({});
    const [stats, setStats] = useState(null);
    const [streakStats, setStreakStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const today = new Date();
                const year = today.getFullYear();
                const month = today.getMonth() + 1;
                const dateKey = today.toISOString().split('T')[0];

                const [habitsRes, logsRes, statsRes, streakRes] = await Promise.all([
                    habitService.getHabits('all'),
                    habitService.getMonthlyLogs(year, month, 'all'),
                    habitService.getStats('weekly'),
                    habitService.getStats('streaks')
                ]);

                if (habitsRes.success) {
                    const dayName = today.toLocaleDateString('en-US', { weekday: 'short' });
                    const todayHabits = habitsRes.data.filter(h =>
                        (h.frequencyType === 'weekly' && h.frequency.includes(dayName)) ||
                        (!h.frequencyType && h.frequency.includes(dayName)) ||
                        (h.frequencyType === 'yearly' && h.yearlyMonth === month && h.yearlyDay === today.getDate()) ||
                        (h.frequencyType === 'one-time' && h.specificDate && h.specificDate.startsWith(dateKey))
                    );
                    setHabits(todayHabits);
                }

                if (logsRes.success) {
                    // Create a map of date -> logs for easy lookup
                    const logMap = {};
                    logsRes.data.forEach(log => {
                        if (!logMap[log.date]) logMap[log.date] = [];
                        logMap[log.date].push(log);
                    });
                    setLogs(logMap);
                }

                if (statsRes.success) {
                    setStats(statsRes.data);
                }

                if (streakRes.success) {
                    setStreakStats(streakRes.data);
                }

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleToggle = async (habitId, status, notes) => {
        try {
            // Use local date for logging
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const date = `${year}-${month}-${day}`;

            const data = { status, date };
            if (notes !== undefined) data.notes = notes;

            const res = await habitService.toggleHabit(habitId, data);
            if (res.success) {
                // Update local logs immediately for UI responsiveness
                setLogs(prev => {
                    const newLogs = { ...prev };
                    if (!newLogs[date]) newLogs[date] = [];

                    // Smartly find existing log (handling object vs string ID mismatch)
                    const existingLogIndex = newLogs[date].findIndex(l => {
                        const logHabitId = l.habitId?._id || l.habitId;
                        return logHabitId === habitId;
                    });

                    if (existingLogIndex >= 0) {
                        // Update existing log
                        newLogs[date][existingLogIndex] = {
                            ...newLogs[date][existingLogIndex],
                            status,
                            notes: notes !== undefined ? notes : newLogs[date][existingLogIndex].notes
                        };
                    } else {
                        // Add new log found in response
                        newLogs[date].push(res.data);
                    }
                    return newLogs;
                });

                // Refresh stats to update progress ring and chart
                const statsRes = await habitService.getStats('weekly');
                if (statsRes.success) setStats(statsRes.data);
            }
        } catch (error) {
            console.error('Toggle error:', error);
            alert(error.message);
        }
    };

    if (loading) return <div className="flex-center" style={{ height: '80vh' }}><div className="loading-spinner"></div></div>;

    // Calculate today's progress using Local Date
    const today = new Date();
    const tYear = today.getFullYear();
    const tMonth = String(today.getMonth() + 1).padStart(2, '0');
    const tDay = String(today.getDate()).padStart(2, '0');
    const dateKey = `${tYear}-${tMonth}-${tDay}`;

    const todaysLogs = logs[dateKey] || [];

    // Filter logs that are 'done' AND belong to the current habits list (prevents >100% due to duplicates or hidden habits)
    const completedCount = habits.filter(h => {
        const log = todaysLogs.find(l => (l.habitId?._id || l.habitId) === h._id);
        return log?.status === 'done';
    }).length;

    const progress = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

    // Progress Ring Calculations
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="container">
            <div className="page-greeting" style={{ marginBottom: 'var(--space-xl)' }}>
                <h1 style={{ marginBottom: '4px' }}>{new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'} 👋</h1>
                <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-muted)' }}>Let's build your habits, {user?.name}.</p>
            </div>

            <div className="dashboard-grid">
                <div className="dashboard-main">
                    {/* Today's Habits */}
                    <div className="card" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                            <h2 className="card-title" style={{ fontSize: '1.2rem', fontWeight: '700' }}>Today's Habits</h2>
                            <button className="btn btn-primary" onClick={() => window.location.href = '/habits'} style={{ padding: '10px 24px', borderRadius: 'var(--radius-lg)' }}>
                                + Add Habit
                            </button>
                        </div>
                        <div className="habits-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {habits.length > 0 ? (
                                habits.map(habit => {
                                    const log = todaysLogs.find(l => {
                                        const logHabitId = l.habitId?._id || l.habitId;
                                        return logHabitId === habit._id;
                                    });
                                    let status = 'pending';
                                    if (log) status = log.status;

                                    return (
                                        <HabitCard
                                            key={habit._id}
                                            habit={habit}
                                            status={status}
                                            log={log}
                                            onToggle={handleToggle}
                                        />
                                    );
                                })
                            ) : (<div className="text-center" style={{ padding: '60px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-cream-light)' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>✨</div>
                                <p className="text-muted">No habits scheduled for today! Enjoy your day.</p>
                            </div>
                            )}
                        </div>
                    </div>

                    {/* Progress Visuals */}
                    <div className="progress-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
                        <div className="card" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)' }}>
                            <h3 className="section-title" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-lg)' }}>Today's Progress</h3>
                            <div className="progress-ring-container" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-md)' }}>
                                <div className="progress-ring" style={{ position: 'relative', width: '160px', height: '160px' }}>
                                    <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                                        <circle className="progress-ring-bg" cx="80" cy="80" r="70" stroke="var(--bg-cream)" strokeWidth="12" fill="transparent" />
                                        <circle
                                            className="progress-ring-fill"
                                            cx="80" cy="80" r="70"
                                            stroke="var(--primary-green)"
                                            strokeWidth="12"
                                            fill="transparent"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={offset}
                                            strokeLinecap="round"
                                            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                                        />
                                    </svg>
                                    <div className="progress-ring-text" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                        <div className="progress-percentage" style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-dark)' }}>{progress}%</div>
                                        <div className="progress-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Completed</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)' }}>
                            <h3 className="section-title" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-lg)' }}>Weekly Overview</h3>
                            <div className="weekly-chart" style={{ height: '160px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 10px' }}>
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLabel, i) => {
                                    const dayData = stats?.dailyStats ? stats.dailyStats[i] : { percentage: 0 };
                                    return (
                                        <div key={i} className="chart-bar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                                            <div className="bar-fill-container" style={{ width: '12px', height: '120px', background: 'var(--bg-cream)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                                                <div
                                                    className="bar-fill"
                                                    style={{ position: 'absolute', bottom: 0, width: '100%', height: `${dayData.percentage}%`, background: 'var(--primary-green)', borderRadius: '10px', transition: 'height 0.3s ease' }}
                                                ></div>
                                            </div>
                                            <span className="bar-label" style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>{dayLabel}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="chart-footer" style={{ marginTop: 'var(--space-md)', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <strong>{stats?.perfectDays || 0}</strong> Perfect Days this week!
                            </div>
                        </div>
                    </div>
                </div>

                <div className="dashboard-sidebar">
                    <div className="card" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
                        <h3 className="section-title" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-lg)' }}>Your Streaks</h3>

                        <div className="streak-item" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 'var(--space-lg)', background: 'var(--bg-cream-light)', padding: '16px', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ fontSize: '2rem' }}>🔥</div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-dark)' }}>{streakStats?.currentStreak || 0} Days</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Current Best Streak {streakStats?.currentStreakHabit && <span style={{ fontWeight: '600', color: 'var(--primary-green)' }}>• {streakStats.currentStreakHabit}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="streak-item" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-white)', border: '1px solid var(--border-light)', padding: '16px', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ fontSize: '2rem' }}>🏆</div>
                            <div>
                                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-dark)' }}>{streakStats?.longestStreak || 0} Days</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Best Streak Ever {streakStats?.longestStreakHabit && <span style={{ fontWeight: '600', color: 'var(--primary-green)' }}>• {streakStats.longestStreakHabit}</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card ai-insights-card" style={{ background: 'linear-gradient(135deg, var(--bg-white), var(--bg-cream-light))', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-md)' }}>
                            <span style={{ fontSize: '1.5rem' }}>🧠</span>
                            <h3 className="card-title" style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>AI Insight</h3>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-md)' }}>
                            {progress > 50
                                ? "You're on fire today! Consistency is the key to mastering new skills. Keep this momentum for your evening habits."
                                : "A gentle start to the day. Remember, even the smallest step counts toward your long-term transformation."}
                        </p>
                        <Link to="/progress" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary-green)', fontSize: '0.85rem', fontWeight: '700', textDecoration: 'none' }}>
                            View deep report <span style={{ fontSize: '1.1rem' }}>›</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
