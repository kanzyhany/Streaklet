import React, { useState } from 'react';

const HabitModal = ({ isOpen, onClose, onSubmit, sharedCalendars = [], editingHabit = null }) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Health');
    const [calendar, setCalendar] = useState('personal');
    const [frequencyType, setFrequencyType] = useState('weekly');
    const [frequency, setFrequency] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    const [icon, setIcon] = useState('🎯');
    const [color, setColor] = useState('#4A7C59');

    // Populate form when editingHabit changes
    React.useEffect(() => {
        if (editingHabit) {
            setTitle(editingHabit.title || '');
            setCategory(editingHabit.category || 'Health');
            setCalendar(editingHabit.sharedCalendarId || 'personal');
            setFrequencyType(editingHabit.frequencyType || 'weekly');
            setFrequency(editingHabit.frequency || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
            setIcon(editingHabit.icon || '🎯');
            setColor(editingHabit.color || '#4A7C59');
        } else {
            // Reset to defaults for new habit
            setTitle('');
            setCategory('Health');
            setCalendar('personal');
            setFrequencyType('weekly');
            setFrequency(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
            setIcon('🎯');
            setColor('#4A7C59');
        }
    }, [editingHabit, isOpen]);

    if (!isOpen) return null;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const toggleDay = (day) => {
        if (frequency.includes(day)) {
            setFrequency(frequency.filter(d => d !== day));
        } else {
            setFrequency([...frequency, day]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            title,
            category,
            sharedCalendarId: calendar === 'personal' ? null : calendar,
            frequencyType,
            frequency,
            icon,
            color
        }, editingHabit?._id);
        onClose();
    };

    return (
        <div className="modal-overlay show" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal card" style={{ maxWidth: '500px', width: '100%', padding: 'var(--space-lg)' }}>
                <div className="modal-header flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
                    <h3 className="modal-title">{editingHabit ? 'Edit Habit' : 'Add New Habit'}</h3>
                    <button className="modal-close" onClick={onClose} style={{ fontSize: '1.5rem' }}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                        <label className="form-label">Habit Name</label>
                        <input
                            type="text"
                            className="form-input w-full"
                            placeholder="e.g. Read 20 pages"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex gap-md" style={{ marginBottom: 'var(--space-md)' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Category</label>
                            <select className="form-input w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
                                <option value="Health">Health</option>
                                <option value="Learning">Learning</option>
                                <option value="Mindfulness">Mindfulness</option>
                                <option value="Wellness">Wellness</option>
                                <option value="Productivity">Productivity</option>
                                <option value="Social">Social</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Calendar</label>
                            <select className="form-input w-full" value={calendar} onChange={(e) => setCalendar(e.target.value)}>
                                <option value="personal">👤 My Calendar</option>
                                {sharedCalendars.map(cal => (
                                    <option key={cal._id} value={cal._id}>📅 {cal.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                        <label className="form-label">Frequency Type</label>
                        <div className="flex gap-sm">
                            {['weekly', 'daily', 'one-time'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    className={`btn ${frequencyType === type ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setFrequencyType(type)}
                                    style={{ flex: 1, fontSize: '0.8rem' }}
                                >
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {frequencyType === 'weekly' && (
                        <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                            <label className="form-label">Days</label>
                            <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
                                {days.map(day => (
                                    <label key={day} style={{ fontSize: '0.85rem', cursor: 'pointer', background: frequency.includes(day) ? 'var(--primary-green-subtle)' : 'var(--bg-cream)', padding: '4px 8px', borderRadius: '4px' }}>
                                        <input
                                            type="checkbox"
                                            checked={frequency.includes(day)}
                                            onChange={() => toggleDay(day)}
                                            style={{ marginRight: '4px' }}
                                        /> {day}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-md" style={{ marginBottom: 'var(--space-xl)' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Icon</label>
                            <select className="form-input w-full" value={icon} onChange={(e) => setIcon(e.target.value)}>
                                <option value="🎯">🎯 Target</option>
                                <option value="💪">💪 Workout</option>
                                <option value="📚">📚 Reading</option>
                                <option value="🧘">🧘 Meditation</option>
                                <option value="💧">💧 Water</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Color Swatch</label>
                            <input type="color" className="form-input w-full" value={color} onChange={(e) => setColor(e.target.value)} style={{ padding: '4px', height: '45px' }} />
                        </div>
                    </div>

                    <div className="modal-footer flex gap-md">
                        <button type="button" className="btn btn-secondary w-full" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary w-full">{editingHabit ? 'Save Changes' : 'Create Habit'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HabitModal;
