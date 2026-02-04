import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { habitService, sharedCalendarService } from '../services/api';
import CalendarModal from '../components/CalendarModal';

const Calendar = () => {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month'); // 'month' or 'day'
    const [selectedDate, setSelectedDate] = useState(null);
    const [habits, setHabits] = useState([]);
    const [logs, setLogs] = useState([]);
    const [sharedCompletions, setSharedCompletions] = useState({});
    const [sharedCalendars, setSharedCalendars] = useState([]);
    const [selectedCalendar, setSelectedCalendar] = useState('personal');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, type: 'create' });
    const [loading, setLoading] = useState(true);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [habitsRes, calendarsRes, logsRes] = await Promise.all([
                    habitService.getHabits(selectedCalendar === 'personal' ? null : selectedCalendar),
                    sharedCalendarService.getCalendars(),
                    habitService.getMonthlyLogs(year, month + 1, selectedCalendar === 'personal' ? null : selectedCalendar)
                ]);

                if (habitsRes.success) setHabits(habitsRes.data);
                if (calendarsRes.success) setSharedCalendars(calendarsRes.data);
                if (logsRes.success) {
                    setLogs(logsRes.data);
                    // Extract shared completions if available in API response
                    // For now, let's assume they might be in a separate field or joined
                    if (logsRes.sharedCompletions) setSharedCompletions(logsRes.sharedCompletions);
                }
            } catch (error) {
                console.error('Calendar load failed:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentDate, selectedCalendar, year, month]);

    const getHabitsForDate = (date) => {
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
        const m = date.getMonth() + 1;
        const d = date.getDate();
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return habits.filter(habit => {
            if (!habit.active) return false;

            if (habit.frequencyType === 'one-time') {
                if (!habit.specificDate) return false;
                const sDate = new Date(habit.specificDate);
                return sDate >= startOfDay && sDate <= endOfDay;
            }

            if (habit.frequencyType === 'yearly') {
                return habit.yearlyMonth === m && habit.yearlyDay === d;
            }

            if (habit.frequencyType === 'weekly' || !habit.frequencyType) {
                return (habit.frequency || []).includes(dayName);
            }

            return false;
        });
    };

    const handleDayClick = (date) => {
        setSelectedDate(date);
        setViewMode('day');
    };

    const backToMonthView = () => {
        setViewMode('month');
        setSelectedDate(null);
    };

    const changeDay = (offset) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + offset);
        setSelectedDate(newDate);
        // If we crossed into a new month/year, update currentDate to fetch logs
        if (newDate.getMonth() !== currentDate.getMonth() || newDate.getFullYear() !== currentDate.getFullYear()) {
            setCurrentDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
        }
    };

    const changeMonth = (offset) => {
        const newDate = new Date(year, month + offset, 1);
        setCurrentDate(newDate);
    };

    const handleCreateCalendar = async (name) => {
        try {
            const res = await sharedCalendarService.createCalendar(name);
            if (res.success) {
                setSharedCalendars([...sharedCalendars, res.data]);
                setSelectedCalendar(res.data._id);
            }
        } catch (error) {
            alert(error.message);
        }
    };

    const handleJoinCalendar = async (code) => {
        try {
            const res = await sharedCalendarService.joinCalendar(code);
            if (res.success) {
                setSharedCalendars([...sharedCalendars, res.data]);
                setSelectedCalendar(res.data._id);
            }
        } catch (error) {
            alert(error.message);
        }
    };

    const handleUpdateMemberRole = async (calendarId, memberId, newRole) => {
        try {
            const res = await sharedCalendarService.updateMemberRole(calendarId, memberId, newRole);
            if (res.success) {
                // Update the shared calendars list with the new role
                const updatedCalendars = sharedCalendars.map(cal => {
                    if (cal._id === calendarId) {
                        return {
                            ...cal,
                            members: cal.members.map(m => {
                                const mId = m.user?._id || m.user;
                                if (mId === memberId) {
                                    return { ...m, role: newRole };
                                }
                                return m;
                            })
                        };
                    }
                    return cal;
                });
                setSharedCalendars(updatedCalendars);
            }
        } catch (error) {
            alert(error.message || 'Failed to update member role');
        }
    };

    const renderHeader = () => {
        const monthName = currentDate.toLocaleString('default', { month: 'long' });
        return (
            <div className="calendar-header-actions" style={{ marginBottom: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="page-greeting" style={{ padding: 0 }}>
                    <h1 style={{ marginBottom: '4px' }}>My Calendar</h1>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>View your personal habit history</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-white)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-light)', padding: '4px 8px', boxShadow: 'var(--shadow-sm)' }}>
                        <button className="btn-icon" onClick={() => changeMonth(-1)} style={{ padding: '8px 12px', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>‹</button>
                        <span style={{ padding: '0 16px', fontWeight: '800', fontSize: '1.1rem', color: 'var(--text-dark)', minWidth: '160px', textAlign: 'center' }}>{monthName} {year}</span>
                        <button className="btn-icon" onClick={() => changeMonth(1)} style={{ padding: '8px 12px', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>›</button>
                    </div>
                    <button className="btn btn-secondary" onClick={() => setCurrentDate(new Date())} style={{ background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-full)', padding: '10px 24px', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-dark)', boxShadow: 'var(--shadow-sm)' }}>Today</button>
                </div>
            </div>
        );
    };

    const renderGrid = () => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];

        // Padding for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`prev-${i}`} className="calendar-day empty" style={{ height: '120px', background: 'rgba(250, 250, 250, 0.5)', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}></div>);
        }

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toLocaleDateString('en-CA');
            const dayHabits = getHabitsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();

            days.push(
                <div
                    key={day}
                    className="calendar-day"
                    style={{
                        height: '120px',
                        padding: '10px',
                        cursor: 'pointer',
                        background: isToday ? 'rgba(74, 124, 89, 0.05)' : 'var(--bg-white)',
                        borderBottom: '1px solid #e5e7eb',
                        borderRight: '1px solid #e5e7eb',
                        transition: 'background 0.15s ease',
                        position: 'relative'
                    }}
                    onMouseEnter={(e) => { if (!isToday) e.currentTarget.style.background = 'var(--bg-cream)'; }}
                    onMouseLeave={(e) => { if (!isToday) e.currentTarget.style.background = 'var(--bg-white)'; }}
                    onClick={() => handleDayClick(date)}
                >
                    <div style={{
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        marginBottom: '4px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-full)',
                        background: isToday ? 'var(--primary-green)' : 'transparent',
                        color: isToday ? 'white' : 'var(--text-secondary)'
                    }}>{day}</div>
                    <div className="day-habits" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                        {dayHabits.slice(0, 3).map(habit => {
                            const log = logs.find(l => l.habitId._id === habit._id && l.date.split('T')[0] === dateStr);
                            const isDone = log && log.status === 'done';
                            return (
                                <div key={habit._id} style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    background: isDone ? habit.color : `${habit.color}20`,
                                    color: isDone ? 'white' : habit.color,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {habit.title}
                                </div>
                            );
                        })}
                        {dayHabits.length > 3 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'auto', paddingTop: '2px' }}>
                                +{dayHabits.length - 3} more
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-white)' }}>
                <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
                        <div key={d} style={{ padding: '14px 10px', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)', background: 'rgba(249, 250, 251, 1)', fontSize: '0.85rem', borderBottom: '1px solid #e5e7eb', borderRight: idx < 6 ? '1px solid #e5e7eb' : 'none' }}>{d}</div>
                    ))}
                    {days}
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        if (!selectedDate) return null;
        const dateStr = selectedDate.toLocaleDateString('en-CA');
        const dayHabits = getHabitsForDate(selectedDate);

        return (
            <div className="day-view">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button className="btn btn-secondary btn-icon" onClick={backToMonthView}>‹ Back</button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-white)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                        <button className="btn btn-secondary btn-icon" onClick={() => changeDay(-1)}>‹</button>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', textAlign: 'center' }}>
                            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </h2>
                        <button className="btn btn-secondary btn-icon" onClick={() => changeDay(1)}>›</button>
                    </div>
                </div>

                <div className="habits-list">
                    {dayHabits.length > 0 ? (
                        dayHabits.map(habit => {
                            const log = logs.find(l => l.habitId._id === habit._id && l.date.split('T')[0] === dateStr);
                            const status = log ? log.status : 'pending';
                            const categoryClass = habit.category ? habit.category.toLowerCase() : 'other';
                            const others = sharedCompletions[dateStr] ? sharedCompletions[dateStr][habit._id] : [];

                            return (
                                <div key={habit._id} className="habit-card" style={{ cursor: 'default' }}>
                                    <div className={`habit-icon ${categoryClass}`}>
                                        {habit.icon || '🎯'}
                                    </div>
                                    <div className="habit-info">
                                        <div className="habit-title">{habit.title}</div>
                                        <div className="habit-category">{habit.category || 'General'}</div>
                                        {others && others.length > 0 && (
                                            <div className="shared-completions" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                                                ✅ Completed by: {others.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="habit-status">
                                        <span className={`status-badge ${status}`}>
                                            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                                            {status === 'done' ? ' ✓' : ''}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center" style={{ padding: '60px', background: 'var(--bg-white)', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>✨</div>
                            <h3>Rest Day!</h3>
                            <p className="text-muted">No habits scheduled for this day.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return <div className="container">Loading Calendar...</div>;

    return (
        <div className="container">
            {renderHeader()}

            <div className="sidebar-left-layout">
                <aside className="calendar-sidebar" style={{ background: 'var(--bg-white)', padding: 'var(--space-md)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', position: 'sticky', top: '100px', display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                    <div>
                        <button className="btn btn-primary" style={{ borderRadius: 'var(--radius-md)', padding: '8px 16px', fontSize: '0.85rem', fontWeight: '600', width: 'auto', background: 'var(--primary-green)', color: 'white', border: 'none' }} onClick={() => setModalConfig({ isOpen: true, type: 'create' })}>
                            + Calendar
                        </button>
                    </div>

                    <div>
                        <h3 className="section-title" style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '8px' }}>CALENDARS</h3>
                        <div className="calendar-list" style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                            <div
                                className={`calendar-item ${selectedCalendar === 'all' ? 'active' : ''}`}
                                onClick={() => setSelectedCalendar('all')}
                                style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: selectedCalendar === 'all' ? 'rgba(74, 124, 89, 0.08)' : 'transparent', color: selectedCalendar === 'all' ? 'var(--primary-green)' : 'var(--text-secondary)', fontWeight: selectedCalendar === 'all' ? '600' : '500', fontSize: '0.9rem', transition: 'all 0.15s ease' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '1rem' }}>🌍</span>
                                    <span>All Calendars</span>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>⚙</span>
                            </div>
                            <div
                                className={`calendar-item ${selectedCalendar === 'personal' ? 'active' : ''}`}
                                onClick={() => setSelectedCalendar('personal')}
                                style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', background: selectedCalendar === 'personal' ? 'rgba(74, 124, 89, 0.08)' : 'transparent', color: selectedCalendar === 'personal' ? 'var(--primary-green)' : 'var(--text-secondary)', fontWeight: selectedCalendar === 'personal' ? '600' : '500', fontSize: '0.9rem', transition: 'all 0.15s ease' }}
                            >
                                <span style={{ fontSize: '1rem' }}>👤</span>
                                <span>My Calendar</span>
                            </div>
                            {sharedCalendars.map(cal => (
                                <div
                                    key={cal._id}
                                    className={`calendar-item ${selectedCalendar === cal._id ? 'active' : ''}`}
                                    onClick={() => setSelectedCalendar(cal._id)}
                                    style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '8px', background: selectedCalendar === cal._id ? 'rgba(74, 124, 89, 0.08)' : 'transparent', color: selectedCalendar === cal._id ? 'var(--primary-green)' : 'var(--text-secondary)', fontWeight: selectedCalendar === cal._id ? '600' : '500', fontSize: '0.9rem', transition: 'all 0.15s ease' }}
                                >
                                    <span style={{ fontSize: '1rem' }}>📅</span>
                                    <span>{cal.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rewards Section */}
                    <div>
                        <h3 className="section-title" style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>✨</span> REWARDS
                        </h3>
                        <div className="rewards-card" style={{ background: 'rgba(240, 244, 248, 0.5)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <div className="points-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>POINTS</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                                    <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary-green)', lineHeight: '1' }}>{user?.personalPoints || 5}/10</span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>to next grace day</div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <div className="grace-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>GRACE DAYS</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary-green)', lineHeight: '1' }}>{user?.personalGraceDays || 0}</div>
                            </div>

                            <button className={`btn w-full ${user?.personalGraceDays > 0 ? 'btn-primary' : ''}`}
                                style={{
                                    background: 'rgba(139, 171, 148, 0.85)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '9px 14px',
                                    fontWeight: '600',
                                    fontSize: '0.82rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    cursor: user?.personalGraceDays > 0 ? 'pointer' : 'not-allowed',
                                    marginBottom: '8px',
                                    transition: 'all 0.2s ease'
                                }}>
                                <span>🛡️</span> Use Grace Day
                            </button>
                            <button className="btn w-full" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '9px 14px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s ease' }}>
                                <span>ℹ️</span> Explain Streaks
                            </button>

                            <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', textAlign: 'center', marginTop: '12px', fontWeight: '500' }}>Protect today's streaks</div>
                        </div>
                    </div>

                    {selectedCalendar !== 'personal' && selectedCalendar !== 'all' && (() => {
                        const currentCalendar = sharedCalendars.find(c => c._id === selectedCalendar);
                        if (!currentCalendar) return null;

                        const isOwner = currentCalendar.ownerId._id === user._id || currentCalendar.ownerId === user._id;
                        const currentUserMember = currentCalendar.members?.find(m => {
                            const mId = m.user?._id || m.user;
                            return mId === user._id;
                        });
                        const userRole = isOwner ? 'owner' : (currentUserMember?.role || 'view');

                        return (
                            <div>
                                <h3 className="section-title" style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>CALENDAR MEMBERS</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {currentCalendar.members?.map(member => {
                                        const memberId = member.user?._id || member.user;
                                        const memberName = member.user?.name || 'Unknown User';
                                        const isMemberOwner = memberId === currentCalendar.ownerId._id || memberId === currentCalendar.ownerId;
                                        const memberRole = isMemberOwner ? 'owner' : (member.role || 'view');

                                        return (
                                            <div key={memberId} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-full)', background: 'var(--bg-cream-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-dark)', flexShrink: 0 }}>
                                                    {memberName.charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {memberName}
                                                    </div>
                                                    {isMemberOwner ? (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--primary-green)', fontWeight: '600', background: 'rgba(74, 124, 89, 0.1)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '2px' }}>Owner</div>
                                                    ) : isOwner ? (
                                                        <select
                                                            value={memberRole}
                                                            onChange={(e) => handleUpdateMemberRole(selectedCalendar, memberId, e.target.value)}
                                                            style={{ fontSize: '0.8rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'white', marginTop: '2px' }}
                                                        >
                                                            <option value="view">View</option>
                                                            <option value="edit">Edit</option>
                                                        </select>
                                                    ) : (
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            {memberRole === 'edit' ? 'Editor' : 'Viewer'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {isOwner && (
                                    <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--bg-cream)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>JOIN CODE</div>
                                        <div style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary-green)' }}>
                                            {currentCalendar.joinCode}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </aside>

                <main className="dashboard-main">
                    {viewMode === 'month' ? renderGrid() : renderDayView()}
                </main>
            </div>

            <CalendarModal
                isOpen={modalConfig.isOpen}
                type={modalConfig.type}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSubmit={modalConfig.type === 'create' ? handleCreateCalendar : handleJoinCalendar}
            />
        </div>
    );
};

export default Calendar;
