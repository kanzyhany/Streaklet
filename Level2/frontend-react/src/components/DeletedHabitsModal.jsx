import React, { useState, useEffect } from 'react';
import { habitService } from '../services/api';

const DeletedHabitsModal = ({ isOpen, onClose, onRestore }) => {
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadDeletedHabits();
        }
    }, [isOpen]);

    const loadDeletedHabits = async () => {
        setLoading(true);
        try {
            const res = await habitService.getDeletedHabits();
            if (res.success) {
                setHabits(res.data);
            }
        } catch (error) {
            console.error('Failed to load deleted habits', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (id) => {
        try {
            const res = await habitService.restoreHabit(id);
            if (res.success) {
                setHabits(prev => prev.filter(h => h._id !== id));
                if (onRestore) onRestore();
            }
        } catch (error) {
            alert('Failed to restore habit');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay show" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal card" style={{ maxWidth: '450px', width: '100%', padding: 'var(--space-lg)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
                    <h3 className="modal-title">Deleted Habits</h3>
                    <button type="button" className="modal-close" onClick={onClose} style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <div className="loading-spinner" style={{ margin: '20px auto' }}></div>
                    ) : habits.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No deleted habits found.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {habits.map(h => (
                                <div key={h._id} style={{
                                    padding: '12px',
                                    background: 'var(--bg-cream)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-light)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ fontSize: '1.2rem' }}>{h.icon}</div>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{h.title}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{h.category}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRestore(h._id)}
                                        className="btn btn-sm"
                                        style={{
                                            background: '#fff',
                                            border: '1px solid var(--primary-green)',
                                            color: 'var(--primary-green)',
                                            fontSize: '0.8rem',
                                            padding: '4px 10px',
                                            cursor: 'pointer',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        Restore
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeletedHabitsModal;
