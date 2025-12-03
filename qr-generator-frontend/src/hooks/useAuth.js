import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user_data');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('user_data', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user_data');
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    const loginWithGoogle = () => {
        // Thay đổi port 5000 nếu backend của bạn chạy port khác
window.location.href = 'http://localhost:5000/api/auth/google';    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, loginWithGoogle }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};