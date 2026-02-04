import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { unreadCount, markAllRead, notifications } = useNotifications();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    if (!user) return null;

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-brand">
                    <span className="logo-icon">🌿</span>
                    <span>Streaklet</span>
                </Link>

                <div className="navbar-nav">
                    <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Dashboard</NavLink>
                    <NavLink to="/habits" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>My Habits</NavLink>
                    <NavLink to="/calendar" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Calendar</NavLink>
                    <NavLink to="/progress" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Progress</NavLink>
                    <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>About</NavLink>
                </div>

                <div className="navbar-actions">
                    {/* Notification Bell */}
                    <div className="notification-wrapper" style={{ position: 'relative' }}>
                        <button
                            className="notification-bell"
                            onClick={() => setShowNotifications(!showNotifications)}
                            title="Notifications"
                        >
                            <span className="bell-icon">🔔</span>
                            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                        </button>

                        {showNotifications && (
                            <div className="notification-panel show" style={{ display: 'block' }}>
                                <div className="notification-header">
                                    <h4>Notifications</h4>
                                    <button className="btn-link" onClick={markAllRead}>Mark all read</button>
                                </div>
                                <div className="notification-list">
                                    {notifications.length > 0 ? (
                                        notifications.map(n => (
                                            <div key={n._id} className={`notification-item ${!n.read ? 'unread' : ''}`}>
                                                <div className="notification-title">{n.title}</div>
                                                <div className="notification-message">{n.message}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="notification-empty">No notifications</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="navbar-dropdown" style={{ position: 'relative' }}>
                        <button className="btn-menu" onClick={() => setShowUserMenu(!showUserMenu)}>
                            <span>•••</span>
                        </button>
                        {showUserMenu && (
                            <div className="dropdown-menu show" style={{ display: 'block' }}>
                                <Link to="/settings" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                                    <span>⚙️</span> Settings
                                </Link>
                                <Link to="/notes" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                                    <span>📝</span> My Notes
                                </Link>
                                <button className="dropdown-item logout" onClick={logout}>
                                    <span>🚪</span> Logout
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="user-avatar" onClick={() => window.location.href = '/settings'}>
                        <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="User avatar" />
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
