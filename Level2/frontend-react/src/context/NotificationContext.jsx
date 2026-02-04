import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const data = await api.get('/notifications');
            if (data.success) {
                setNotifications(data.data);
                setUnreadCount(data.data.filter(n => !n.read).length);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark notifications as read:', error);
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markAllRead }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
