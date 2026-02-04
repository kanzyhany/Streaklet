import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { habitService } from '../services/api';

const Notes = () => {
    const [notes, setNotes] = useState([]);
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedHabit, setSelectedHabit] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [notesRes, habitsRes] = await Promise.all([
                    api.get('/logs/notes'),
                    habitService.getHabits('all')
                ]);

                if (notesRes.success) setNotes(notesRes.data);
                if (habitsRes.success) setHabits(habitsRes.data);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredNotes = selectedHabit === 'all'
        ? notes
        : notes.filter(n => (n.habitId?._id || n.habitId) === selectedHabit);

    // Group notes by date
    const groupedNotes = filteredNotes.reduce((groups, note) => {
        const dateStr = new Date(note.date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(note);
        return groups;
    }, {});

    if (loading) return <div className="container">Loading notes...</div>;

    return (
        <div className="container">
            <div className="calendar-header-actions" style={{ marginBottom: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="page-greeting" style={{ padding: 0 }}>
                    <h1 style={{ marginBottom: '4px' }}>Habit Notes 📝</h1>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>Reflect on your journey and track your thoughts</p>
                </div>
                <Link to="/habits" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-white)', border: '1px solid var(--border-light)', fontSize: '0.9rem', fontWeight: '600' }}>
                    ← Back to My Habits
                </Link>
            </div>

            <div className="sidebar-left-layout">
                <aside className="calendar-sidebar">
                    <div className="sidebar-section" style={{ background: 'var(--bg-white)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
                        <h3 className="section-title" style={{ fontSize: '0.8rem', letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-md)' }}>Filter by Habit</h3>
                        <div className="filter-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div
                                className={`calendar-item ${selectedHabit === 'all' ? 'active' : ''}`}
                                onClick={() => setSelectedHabit('all')}
                                style={{ padding: '10px 14px', cursor: 'pointer', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px', background: selectedHabit === 'all' ? 'rgba(74, 124, 89, 0.1)' : 'transparent', color: selectedHabit === 'all' ? 'var(--primary-green)' : 'var(--text-secondary)', fontWeight: selectedHabit === 'all' ? '600' : '400' }}
                            >
                                <span style={{ fontSize: '1.1rem' }}>🌎</span> All Habits
                            </div>
                            {habits.map(habit => (
                                <div
                                    key={habit._id}
                                    className={`calendar-item ${selectedHabit === habit._id ? 'active' : ''}`}
                                    onClick={() => setSelectedHabit(habit._id)}
                                    style={{ padding: '10px 14px', cursor: 'pointer', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px', background: selectedHabit === habit._id ? 'rgba(74, 124, 89, 0.1)' : 'transparent', color: selectedHabit === habit._id ? 'var(--primary-green)' : 'var(--text-secondary)', fontWeight: selectedHabit === habit._id ? '600' : '400' }}
                                >
                                    <span style={{ fontSize: '1.1rem' }}>{habit.icon || '🎯'}</span> {habit.title}
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                <main className="dashboard-main">
                    <div className="timeline" style={{ position: 'relative', paddingLeft: '32px' }}>
                        {Object.entries(groupedNotes).length > 0 ? (
                            Object.entries(groupedNotes).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, dateNotes]) => (
                                <div key={date} className="timeline-section" style={{ marginBottom: 'var(--space-xl)' }}>
                                    <div className="timeline-item">
                                        <div className="timeline-dot"></div>
                                        <div className="timeline-date" style={{ fontWeight: '700', color: 'var(--text-dark)', fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>
                                            {date}
                                        </div>

                                        <div className="timeline-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                            {dateNotes.map(note => (
                                                <div key={note._id} className="card note-card" style={{ padding: 'var(--space-lg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-white)', transition: 'transform 0.2s ease', boxShadow: 'none' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{ width: '40px', height: '40px', background: (note.habitId?.color || 'var(--primary-green)') + '20', color: note.habitId?.color || 'var(--primary-green)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                                                {note.habitId?.icon || '🎯'}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{note.habitId?.title || 'Unknown Habit'}</div>
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{note.habitId?.category || 'General'}</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary-green)' }}>
                                                            <input type="checkbox" checked readOnly style={{ width: '16px', height: '16px', accentColor: 'var(--primary-green)' }} />
                                                            Completed
                                                        </div>
                                                    </div>
                                                    <div className="note-text" style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-secondary)', paddingLeft: '52px' }}>
                                                        {note.note || note.notes}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="card text-center" style={{ padding: '60px', background: 'var(--bg-white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🗒️</div>
                                <h3>No Notes Yet</h3>
                                <p className="text-muted">Habit reflections will appear here as you log them!</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Notes;
