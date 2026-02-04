import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { habitService, sharedCalendarService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import HabitCard from '../components/HabitCard';
import HabitModal from '../components/HabitModal';
import ConfirmationModal from '../components/ConfirmationModal';
import DeletedHabitsModal from '../components/DeletedHabitsModal';

const Habits = () => {
    const { user } = useAuth();
    const [habits, setHabits] = useState([]);
    const [filteredHabits, setFilteredHabits] = useState([]);
    const [sharedCalendars, setSharedCalendars] = useState([]);
    const [selectedCalendar, setSelectedCalendar] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedColor, setSelectedColor] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState(null);
    const [loading, setLoading] = useState(true);

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [habitToDelete, setHabitToDelete] = useState(null);
    const [showDeletedModal, setShowDeletedModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return; // Wait for user to load
            setLoading(true);
            try {
                const [habitsRes, calendarsRes] = await Promise.all([
                    habitService.getHabits(selectedCalendar === 'all' ? null : selectedCalendar),
                    sharedCalendarService.getCalendars()
                ]);

                if (habitsRes.success) setHabits(habitsRes.data);
                if (calendarsRes.success) {
                    // Filter to only calendars where user has 'edit' role
                    const editable = calendarsRes.data.filter(cal => {
                        const member = cal.members.find(m =>
                            (m.user?._id || m.user) === user?._id
                        );
                        return member?.role === 'edit';
                    });
                    setSharedCalendars(editable);
                }
            } catch (error) {
                console.error('Failed to fetch habits:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedCalendar, refreshKey, user]);

    // Filtering and Sorting Logic
    useEffect(() => {
        let result = [...habits];

        // Filter by Category
        if (selectedCategory !== 'all') {
            result = result.filter(h => h.category === selectedCategory);
        }

        // Filter by Color
        if (selectedColor !== 'all') {
            result = result.filter(h => h.color === selectedColor);
        }

        // Sort
        result.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
            if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
            if (sortBy === 'alpha') return a.title.localeCompare(b.title);
            return 0;
        });

        setFilteredHabits(result);
    }, [habits, selectedCategory, selectedColor, sortBy]);

    const handleSaveHabit = async (habitData, habitId) => {
        try {
            if (habitId) {
                const res = await habitService.updateHabit(habitId, habitData);
                if (res.success) {
                    setHabits(prev => prev.map(h => h._id === habitId ? res.data : h));
                }
            } else {
                const res = await habitService.createHabit(habitData);
                if (res.success) {
                    setHabits(prev => [res.data, ...prev]);
                }
            }
        } catch (error) {
            alert(error.message);
        }
    };

    const handleEdit = (habit) => {
        setEditingHabit(habit);
        setIsModalOpen(true);
    };

    const handleDeleteRequest = (habitId) => {
        setHabitToDelete(habitId);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!habitToDelete) return;
        try {
            const res = await habitService.deleteHabit(habitToDelete);
            if (res.success) {
                setHabits(prev => prev.filter(h => h._id !== habitToDelete));
            }
        } catch (error) {
            alert(error.message);
        }
    };

    if (loading && habits.length === 0) return (
        <div className="flex-center" style={{ height: '80vh' }}>
            <div className="loading-spinner"></div>
        </div>
    );

    return (
        <div className="container">
            <div className="calendar-header-actions" style={{ marginBottom: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="page-greeting" style={{ padding: 0 }}>
                    <h1 style={{ marginBottom: '4px' }}>My Habits</h1>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Showing {filteredHabits.length} of {habits.length} habits
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                    <div className="sort-control" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-white)', padding: '8px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sort by:</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{ background: 'none', border: 'none', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-dark)', outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="alpha">Alphabetical</option>
                        </select>
                    </div>
                    <Link to="/notes" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-white)', border: '1px solid var(--border-light)', fontSize: '0.9rem', fontWeight: '600' }}>
                        <span>📝</span> View Notes
                    </Link>
                </div>
            </div>

            <div className="sidebar-left-layout">
                <aside className="calendar-sidebar">
                    <div className="sidebar-section" style={{ background: 'var(--bg-white)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
                        <h3 className="section-title" style={{ fontSize: '0.8rem', letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-md)' }}>Categories</h3>
                        <div className="filter-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {['Health', 'Learning', 'Other', 'Social'].map(cat => (
                                <label key={cat} className="filter-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={selectedCategory === cat}
                                        onChange={() => setSelectedCategory(selectedCategory === cat ? 'all' : cat)}
                                    />
                                    <span>{cat}</span>
                                </label>
                            ))}
                        </div>

                        <h3 className="section-title" style={{ fontSize: '0.8rem', letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 'var(--space-xl)', marginBottom: 'var(--space-md)' }}>Colors</h3>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {['#4A7C59', '#4A90A4', '#558B6E', '#9B59B6', '#D94B3D'].map(color => (
                                <div
                                    key={color}
                                    onClick={() => setSelectedColor(selectedColor === color ? 'all' : color)}
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: color,
                                        cursor: 'pointer',
                                        border: selectedColor === color ? '2px solid white' : 'none',
                                        boxShadow: selectedColor === color ? `0 0 0 2px ${color}` : 'none'
                                    }}
                                />
                            ))}
                        </div>

                        <button
                            className="btn btn-secondary w-full"
                            style={{ marginTop: 'var(--space-xl)', background: 'var(--bg-cream)', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem' }}
                            onClick={() => { setSelectedCategory('all'); setSelectedColor('all'); }}
                        >
                            Clear All Filters
                        </button>

                        <div style={{ marginTop: 'var(--space-md)', borderTop: '1px solid var(--border-light)', paddingTop: 'var(--space-md)' }}>
                            <button
                                className="btn w-full"
                                style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'underline' }}
                                onClick={() => setShowDeletedModal(true)}
                            >
                                Show deleted habits
                            </button>
                        </div>
                    </div>


                </aside>

                <main className="habits-main">
                    {loading && habits.length > 0 ? (
                        <div className="flex-center" style={{ padding: '40px' }}><div className="loading-spinner"></div></div>
                    ) : (
                        <div className="habits-grid">
                            {filteredHabits.length > 0 ? (
                                filteredHabits.map(h => (
                                    <HabitCard
                                        key={h._id}
                                        habit={h}
                                        variant="manage"
                                        onEdit={handleEdit}
                                        onDelete={handleDeleteRequest}
                                    />
                                ))
                            ) : (
                                <div className="card empty-state" style={{ gridColumn: '1 / -1' }}>
                                    <div className="empty-state-icon">🌱</div>
                                    <h3>No habits found</h3>
                                    <p>You haven't created any habits for this calendar yet.</p>
                                    <button className="btn btn-secondary" onClick={() => setIsModalOpen(true)}>Create your first habit</button>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            <HabitModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingHabit(null);
                }}
                onSubmit={handleSaveHabit}
                sharedCalendars={sharedCalendars}
                editingHabit={editingHabit}
            />

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                message="Are you sure you want to delete this habit? This cannot be undone."
            />

            <DeletedHabitsModal
                isOpen={showDeletedModal}
                onClose={() => setShowDeletedModal(false)}
                onRestore={() => setRefreshKey(prev => prev + 1)}
            />
        </div>
    );
};

export default Habits;
