import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('streaklet_token');
            if (token && token !== 'undefined') {
                try {
                    const data = await authService.getMe();
                    if (data.success) {
                        setUser(data.data);
                    }
                } catch (error) {
                    console.error('Failed to load user:', error);
                    localStorage.removeItem('streaklet_token');
                }
            }
            setLoading(false);
        };

        loadUser();

        // Listen for unauthorized events from API interceptor
        const handleUnauthorized = () => {
            setUser(null);
            localStorage.removeItem('streaklet_token');
        };
        window.addEventListener('unauthorized', handleUnauthorized);
        return () => window.removeEventListener('unauthorized', handleUnauthorized);
    }, []);

    const login = async (credentials) => {
        const response = await authService.login(credentials);
        if (response.success && response.data?.token) {
            localStorage.setItem('streaklet_token', response.data.token);
            setUser(response.data);
        }
        return response;
    };

    const logout = () => {
        localStorage.removeItem('streaklet_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
