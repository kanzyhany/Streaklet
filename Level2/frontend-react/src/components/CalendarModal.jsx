import React, { useState } from 'react';

const CalendarModal = ({ isOpen, onClose, type, onSubmit }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (type === 'create') onSubmit(name);
        else onSubmit(code);
        onClose();
        setName('');
        setCode('');
    };

    return (
        <div className="modal-overlay show" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal card" style={{ maxWidth: '400px', width: '100%', padding: 'var(--space-lg)' }}>
                <div className="modal-header flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
                    <h3 className="modal-title">{type === 'create' ? 'Create Shared Calendar' : 'Join a Calendar'}</h3>
                    <button className="modal-close" onClick={onClose} style={{ fontSize: '1.5rem' }}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    {type === 'create' ? (
                        <div className="form-group" style={{ marginBottom: 'var(--space-xl)' }}>
                            <label className="form-label">Calendar Name</label>
                            <input
                                type="text"
                                className="form-input w-full"
                                placeholder="e.g. Family Goals"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    ) : (
                        <div className="form-group" style={{ marginBottom: 'var(--space-xl)' }}>
                            <label className="form-label">Join Code</label>
                            <input
                                type="text"
                                className="form-input w-full"
                                placeholder="Enter the invite code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div className="modal-footer flex gap-md">
                        <button type="button" className="btn btn-secondary w-full" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary w-full">
                            {type === 'create' ? 'Create' : 'Join'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CalendarModal;
