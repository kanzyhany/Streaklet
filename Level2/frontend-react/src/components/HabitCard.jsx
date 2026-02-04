import React, { useState, useRef, useEffect } from 'react';

const HabitCard = ({ habit, log, onToggle, onEdit, onDelete, variant = 'dashboard' }) => {
    const status = log ? log.status : 'pending';
    const isDone = status === 'done';
    const [showMenu, setShowMenu] = useState(false);
    const [showNote, setShowNote] = useState(false);
    const [noteText, setNoteText] = useState(log?.notes || '');
    const menuRef = useRef(null);
    const noteRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSaveNote = async () => {
        // We use onToggle to save the note with the current status
        await onToggle(habit._id, status, noteText);
        setShowNote(false);
    };

    // Status label mapping
    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    const statusClass = status;
    const hasNote = log?.notes && log.notes.trim().length > 0;

    if (variant === 'manage') {
        const createdDate = new Date(habit.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const frequencyText = habit.frequencyType === 'weekly'
            ? habit.frequency?.join(', ')
            : habit.frequencyType === 'yearly'
                ? `Every ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][habit.yearlyMonth - 1]} ${habit.yearlyDay}`
                : `One-time: ${new Date(habit.specificDate).toLocaleDateString()}`;

        const calendarName = habit.sharedCalendarId ? (habit.sharedCalendarId.name || 'Shared') : 'My Calendar';

        return (
            <div className="habit-manage-card" style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                background: 'var(--bg-white)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-lg)',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border-light)',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '6px',
                    backgroundColor: habit.color || 'var(--primary-green)'
                }} />
                <div className="habit-manage-header" style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                    <div className="habit-manage-icon" style={{
                        width: '48px', height: '48px', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', background: (habit.color || '#4A7C59') + '20', color: habit.color || 'var(--primary-green)'
                    }}>
                        {habit.icon || '🎯'}
                    </div>
                    <div className="habit-manage-info">
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{habit.title}</h3>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{habit.category}</div>
                    </div>
                </div>

                <div className="habit-details" style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                        <strong>Frequency:</strong> {frequencyText}
                    </div>
                    <div style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                        <strong>Calendar:</strong> {calendarName}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Created on {createdDate}
                    </div>
                </div>

                <div className="habit-manage-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span className={`badge ${habit.active ? 'badge-active' : 'badge-inactive'}`}
                        style={{
                            background: habit.active ? '#e6f4ea' : '#f1f3f4',
                            color: habit.active ? '#1e8e3e' : '#5f6368',
                            padding: '4px 12px', borderRadius: '20px', fontSize: '0.8em', fontWeight: '600'
                        }}>
                        {habit.active ? 'Active' : 'Paused'}
                    </span>
                    <div className="habit-actions" style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => onEdit(habit)}
                            title="Edit Habit"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.1rem', padding: 0 }}
                        >
                            ✏️
                        </button>
                        <button
                            onClick={() => onDelete(habit._id)}
                            title="Delete Habit"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d94b3d', fontSize: '1.1rem', padding: 0 }}
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="habit-card-wrapper" style={{ position: 'relative' }}>
            <div className="habit-card">
                <div className={`habit-icon ${habit.category?.toLowerCase() || 'other'}`}>
                    {habit.icon || '🎯'}
                </div>
                <div className="habit-info">
                    <div className="habit-title">{habit.title}</div>
                    <div className="habit-category">{habit.category || 'General'}</div>
                </div>
                <div className="habit-status">
                    <span className={`status-badge ${statusClass}`} style={{ marginRight: '8px' }}>
                        {statusLabel} {isDone && '✓'}
                    </span>

                    <div className="habit-actions" style={{ display: 'flex', gap: '4px' }}>
                        {/* Note Button - Only show if done */}
                        {isDone && (
                            <button
                                className={`btn-note ${hasNote ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setShowNote(!showNote); }}
                                title="Add Note"
                                style={{
                                    background: hasNote ? 'var(--primary-green)' : '#ffffff',
                                    color: hasNote ? 'white' : '#4b5563', // Darker gray for better visibility
                                    border: hasNote ? 'none' : '1px solid #d1d5db', // Distinct border
                                    width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: hasNote ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                            >
                                📝
                            </button>
                        )}

                        {/* Quick Done Button (only if not done) */}
                        {!isDone && (
                            <button
                                className="status-action"
                                title="Mark as Done"
                                onClick={() => onToggle(habit._id, 'done')}
                                style={{
                                    background: 'var(--primary-green)', color: 'white', border: 'none',
                                    width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                ✓
                            </button>
                        )}

                        {/* Menu Toggle */}
                        <div style={{ position: 'relative' }} ref={menuRef}>
                            <button
                                className="status-action"
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                style={{
                                    background: 'transparent', border: '1px solid var(--border-medium)', color: 'var(--text-muted)',
                                    width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                }}
                            >
                                ›
                            </button>

                            {/* Dropdown Menu */}
                            {showMenu && (
                                <div className="habit-menu" style={{
                                    position: 'absolute', right: 0, top: '40px', background: 'white',
                                    border: '1px solid var(--border-light)', borderRadius: '8px',
                                    boxShadow: 'var(--shadow-md)', zIndex: 100, minWidth: '150px',
                                    padding: '4px 0'
                                }}>
                                    <button
                                        className="menu-item"
                                        onClick={() => { onToggle(habit._id, 'done'); setShowMenu(false); }}
                                        style={{ display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--primary-green)' }}
                                    >
                                        ✓ Mark Done
                                    </button>
                                    <button
                                        className="menu-item"
                                        onClick={() => { onToggle(habit._id, 'skipped'); setShowMenu(false); }}
                                        style={{ display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}
                                    >
                                        ⏭ Skip Today
                                    </button>
                                    <hr style={{ margin: '4px 0', border: '0', borderTop: '1px solid var(--border-light)' }} />
                                    <button
                                        className="menu-item"
                                        onClick={() => { onEdit(habit); setShowMenu(false); }}
                                        style={{ display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}
                                    >
                                        ✏️ Edit Habit
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Note Area */}
            {showNote && (
                <div className="habit-note-input-container" style={{
                    marginTop: '12px',
                    padding: '16px',
                    background: '#f3f4f6', // Light gray background
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    animation: 'fadeIn 0.2s ease-in-out'
                }}>
                    <label style={{
                        display: 'block',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        marginBottom: '8px',
                        color: '#374151'
                    }}>
                        Add a note:
                    </label>
                    <textarea
                        ref={noteRef}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="e.g. Ran 5km instead of 3km..."
                        rows={3}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontFamily: 'inherit',
                            fontSize: '0.95rem',
                            resize: 'vertical',
                            background: '#ffffff',
                            color: '#1f2937',
                            display: 'block',
                            marginBottom: '12px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowNote(false); }}
                            style={{
                                background: 'transparent',
                                color: '#6b7280',
                                border: '1px solid transparent',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '500'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveNote}
                            style={{
                                background: 'var(--primary-green)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        >
                            Save Note
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HabitCard;
