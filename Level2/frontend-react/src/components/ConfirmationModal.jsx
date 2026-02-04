import React from 'react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, message }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay show" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal card" style={{ maxWidth: '400px', width: '100%', padding: 'var(--space-lg)', textAlign: 'center' }}>
                <div style={{ marginBottom: 'var(--space-md)', fontSize: '3rem' }}>🗑️</div>
                <h3 className="modal-title" style={{ marginBottom: 'var(--space-sm)' }}>Delete Habit?</h3>
                <p style={{ marginBottom: 'var(--space-xl)', color: 'var(--text-secondary)' }}>{message || 'Are you sure you want to delete this habit? This action cannot be undone.'}</p>
                <div className="flex gap-md justify-center">
                    <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={() => { onConfirm(); onClose(); }}
                        style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
