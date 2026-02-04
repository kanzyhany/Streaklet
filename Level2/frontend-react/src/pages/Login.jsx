import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await login({ email, password });
            if (res.success) {
                navigate('/');
            }
        } catch (err) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page" style={{ height: 'calc(100vh - 100px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="auth-card card" style={{ maxWidth: '400px', width: '100%' }}>
                <div className="auth-header text-center" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)', fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary-green)', marginBottom: 'var(--space-md)' }}>
                        <span className="logo-icon">🌿</span>
                        <span>Streaklet</span>
                    </div>
                    <h1>Welcome back!</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Sign in to continue building your habits</p>
                </div>

                {error && (
                    <div className="status-badge missed" style={{ width: '100%', marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)' }}>
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                        <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Email Address</label>
                        <input
                            type="email"
                            className="form-input w-full"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 'var(--space-xl)' }}>
                        <label className="form-label" style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>Password</label>
                        <input
                            type="password"
                            className="form-input w-full"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)' }}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ padding: '1rem' }}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-footer text-center" style={{ marginTop: 'var(--space-lg)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Don't have an account? <Link to="/register" style={{ color: 'var(--primary-green)', fontWeight: '600' }}>Create one</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
