import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import logoImg from '../../assets/logo.png'; // Đảm bảo bạn có logo ở đây
import './LoginPage.css'; // Tạo file css này ở bước 3

const LoginPage = () => {
    const { user, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    // Nếu đã đăng nhập rồi thì đá về trang chủ
    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <img src={logoImg} alt="Logo" className="login-logo" />
                    <h1>Đăng Nhập Hệ Thống</h1>
                    <p>Quản lý mã QR và Danh thiếp điện tử</p>
                </div>
                
                <button className="google-btn" onClick={loginWithGoogle}>
                    <img src="https://cdn-icons-png.flaticon.com/512/2991/2991148.png" alt="G" />
                    Tiếp tục với Google
                </button>

                <div className="login-footer">
                    <p>&copy; 2025 Trung Nguyên Legend. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;