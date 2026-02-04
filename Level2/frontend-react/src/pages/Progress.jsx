import React, { useState, useEffect, useRef } from 'react';
import { habitService, chatService } from '../services/api';

const Progress = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chartView, setChartView] = useState('weekly');
    const [messages, setMessages] = useState(JSON.parse(localStorage.getItem('streaklet_chat_history') || '[]'));
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef(null);

    const [weeklyData, setWeeklyData] = useState(null);
    const [monthlyData, setMonthlyData] = useState(null);
    const [streaksData, setStreaksData] = useState(null);
    const [insightsData, setInsightsData] = useState(null);

    useEffect(() => {
        const fetchAllStats = async () => {
            try {
                const [weeklyRes, monthlyRes, streaksRes, insightsRes] = await Promise.all([
                    habitService.getStats('weekly'),
                    habitService.getStats('monthly'),
                    habitService.getStats('streaks'),
                    habitService.getStats('insights')
                ]);

                if (weeklyRes.success) setWeeklyData(weeklyRes.data);
                if (monthlyRes.success) setMonthlyData(monthlyRes.data);
                if (streaksRes.success) setStreaksData(streaksRes.data);
                if (insightsRes.success) setInsightsData(insightsRes.data);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllStats();
    }, []);

    useEffect(() => {
        localStorage.setItem('streaklet_chat_history', JSON.stringify(messages));
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const context = `User statistics: ${JSON.stringify(stats)}.`;
            const res = await chatService.askAI(input, context);
            if (res.success) {
                setMessages(prev => [...prev, { role: 'ai', content: res.data.answer }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', content: "I'm sorry, I'm having trouble connecting right now. 🌿" }]);
        } finally {
            setIsTyping(false);
        }
    };

    const askQuickPrompt = (prompt) => {
        setInput(prompt);
    };

    if (loading) return <div className="flex-center" style={{ height: '80vh' }}><div className="loading-spinner"></div></div>;

    return (
        <div className="container">
            <div className="page-greeting">
                <h1>Your Progress 📈</h1>
                <p>See how your habits are growing.</p>
            </div>

            <div className="progress-page-grid">
                {/* Main Completion Chart Card */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="card-title">Weekly Habit Completion</h2>
                        <div className="chart-toggle">
                            <button
                                className={`chart-toggle-btn ${chartView === 'weekly' ? 'active' : ''}`}
                                onClick={() => setChartView('weekly')}
                            >
                                Weekly
                            </button>
                            <button
                                className={`chart-toggle-btn ${chartView === 'monthly' ? 'active' : ''}`}
                                onClick={() => setChartView('monthly')}
                            >
                                Monthly
                            </button>
                        </div>
                    </div>

                    {chartView === 'weekly' ? (
                        <div id="completionChart">
                            <div className="chart-bars">
                                {weeklyData?.dailyStats?.map((day, i) => (
                                    <div key={i} className="chart-bar">
                                        <div className="bar-percentage">{day.percentage}%</div>
                                        <div className="bar-fill-container">
                                            <div className="bar-fill" style={{ height: `${day.percentage}%`, background: 'var(--primary-green)' }}></div>
                                        </div>
                                        <div className="bar-label">{day.day}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="card-title mt-lg" style={{ marginTop: '32px', marginBottom: '16px' }}>Missed Habits</div>
                            <div id="missedChart">
                                <div className="chart-bars">
                                    {weeklyData?.dailyStats?.map((day, i) => (
                                        <div key={i} className="chart-bar">
                                            <div className="bar-percentage">{day.missed}</div>
                                            <div className="bar-fill-container">
                                                <div className="bar-fill" style={{ height: `${(day.missed / (day.total || 1)) * 100}%`, background: 'var(--status-missed)' }}></div>
                                            </div>
                                            <div className="bar-label">{day.day}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="monthly-summary" style={{ padding: '60px 0', marginTop: '20px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                                <div className="stat-box">
                                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary-green)' }}>{monthlyData?.totalCompleted || 0}</div>
                                    <div className="stat-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Habits Completed</div>
                                </div>
                                <div className="stat-box">
                                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary-green)' }}>{monthlyData?.completionRate || 0}%</div>
                                    <div className="stat-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Completion Rate</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Best Streaks Card */}
                <div className="card">
                    <h2 className="card-title mb-lg">Your Best Streaks</h2>
                    <div className="best-streaks-list" id="bestStreaksList">
                        {streaksData?.bestStreaks?.length > 0 ? (
                            streaksData.bestStreaks.slice(0, 3).map((streak, i) => (
                                <div key={i} className="best-streak-item">
                                    <div className="habit-icon" style={{ background: streak.color || 'var(--bg-cream)', width: '48px', height: '48px', fontSize: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-light)' }}>
                                        {streak.icon || '🎯'}
                                    </div>
                                    <div className="best-streak-info">
                                        <div className="best-streak-title">{streak.title}</div>
                                        <div className="best-streak-category">{streak.category || 'Habit'}</div>
                                    </div>
                                    <div className="best-streak-count">
                                        {streak.currentStreak} Days 🔥
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex-center" style={{ padding: '40px' }}>
                                <p className="text-muted">Keep going to start your first streak! ⭐</p>
                            </div>
                        )}
                    </div>

                    <div className="card-title mt-lg mb-md">Habit Insights</div>
                    <div className="insights-grid" id="insightsGrid">
                        <div className="insight-item">
                            <div className="insight-icon">⭐</div>
                            <div className="insight-text">
                                <div className="insight-label">Consistency King</div>
                                <div className="insight-value">{insightsData?.bestDay?.message || 'You complete habits most consistently on Saturdays'}</div>
                            </div>
                        </div>
                        <div className="insight-item">
                            <div className="insight-icon">🕐</div>
                            <div className="insight-text">
                                <div className="insight-label">Time Master</div>
                                <div className="insight-value">{insightsData?.bestTime?.message || "You're most consistent with habits at 9 PM"}</div>
                            </div>
                        </div>
                    </div>

                    <a href="#" className="view-all-link">View All</a>
                </div>
            </div>

            {/* AI Insights Section */}
            <div className="card ai-insights-card">
                <div className="card-header">
                    <h2 className="card-title">🤖 AI Insights</h2>
                    <p className="card-subtitle">Ask me anything about your habits!</p>
                </div>

                <div className="quick-prompts">
                    <button className="quick-prompt-btn" onClick={() => askQuickPrompt('Summarize my week')}>
                        📊 Summarize my week
                    </button>
                    <button className="quick-prompt-btn" onClick={() => askQuickPrompt('What kind of person am I based on my habits?')}>
                        🧠 Who am I?
                    </button>
                    <button className="quick-prompt-btn" onClick={() => askQuickPrompt('What is my best habit and why?')}>
                        🏆 My best habit
                    </button>
                </div>

                <div className="chat-history" id="chatHistory">
                    {messages.length === 0 ? (
                        <div className="chat-welcome">
                            <span className="chat-welcome-icon">🌿</span>
                            <p>Hi! I'm your habit assistant. Ask me about your progress, streaks, or reflections!</p>
                        </div>
                    ) : (
                        messages.map((msg, i) => (
                            <div key={i} className={`chat-message ${msg.role}`}>
                                {msg.role === 'ai' && <span className="message-icon">🌿</span>}
                                <div className="message-content">{msg.content}</div>
                            </div>
                        ))
                    )}
                    {isTyping && <div className="typing-indicator">AI is thinking...</div>}
                    <div ref={chatEndRef} />
                </div>

                <div className="chat-input-area">
                    <input
                        type="text"
                        id="chatInput"
                        className="chat-input"
                        placeholder="Ask about your habits..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
                    />
                    <button className="chat-send-btn" onClick={handleSendMessage} id="chatSendBtn" disabled={!input.trim() || isTyping}>
                        <span>➤</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Progress;
