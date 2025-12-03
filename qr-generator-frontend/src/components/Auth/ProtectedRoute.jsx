// src/components/Auth/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; 

const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div>Đang tải...</div>;

    // 1. Chưa đăng nhập -> Về Login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Đã đăng nhập nhưng sai quyền (Ví dụ User thường cố vào trang Admin)
    if (requiredRole && user.role !== requiredRole) {
        return <Navigate to="/" replace />; // Đá về trang chủ
    }

    return children;
};

export default ProtectedRoute;