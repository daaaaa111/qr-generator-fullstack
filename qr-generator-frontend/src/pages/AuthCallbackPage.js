import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

const AuthCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth(); // Lấy hàm login từ hook

    useEffect(() => {
        const token = searchParams.get('token');

        if (token) {
            // 1. Lưu token vào localStorage
            localStorage.setItem('token', token);

            // 2. Gọi API lấy thông tin user bằng token đó
            api.get('/auth/profile') // Đảm bảo backend có route này
                .then(res => {
                    // 3. Lưu thông tin user vào Global State (Context)
                    login(res.data);

                    // 4. Chuyển hướng về trang chủ (hoặc trang admin tùy role)
                    if (res.data.role === 'admin') {
                        navigate('/admin');
                    } else {
                        navigate('/');
                    }
                })
                .catch(err => {
                    console.error('Lỗi lấy profile:', err);
                    navigate('/login?error=fetch_profile_failed');
                });
        } else {
            // Không có token -> Lỗi
            console.error('Không tìm thấy token trong URL');
            navigate('/login?error=no_token');
        }
    }, [searchParams, navigate, login]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <h2>Đang xử lý đăng nhập...</h2>
        </div>
    );
};

export default AuthCallbackPage;