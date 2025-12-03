import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api'; 

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkLogin = async () => {
            console.log("🕵️‍♂️ AuthContext: Bắt đầu kiểm tra đăng nhập...");
            
            // 1. Kiểm tra Token trong kho
            const token = localStorage.getItem('token');
            console.log("🔑 Token hiện tại:", token ? "Đã có (Bắt đầu bằng " + token.substring(0, 10) + "...)" : "KHÔNG CÓ");

            if (!token) {
                console.log("❌ Không tìm thấy token -> Dừng loading -> User = null");
                setLoading(false);
                return;
            }

            try {
                // 2. Gọi API check profile
                console.log("📡 Đang gọi API lấy profile...");
                // Đảm bảo đường dẫn này đúng với Backend của bạn
                const response = await api.get('/auth/profile');
                
                console.log("✅ Gọi API thành công! User:", response.data);
                setUser(response.data);
            } catch (error) {
                console.error("❌ Lỗi khi gọi API Profile:", error);
                
                // Phân tích lỗi kỹ hơn
                if (error.response) {
                    console.log(`⚠️ Server trả về lỗi: ${error.response.status} - ${error.response.statusText}`);
                    if (error.response.status === 404) console.log("👉 Gợi ý: Kiểm tra lại đường dẫn API (URL).");
                    if (error.response.status === 401) console.log("👉 Gợi ý: Token hết hạn hoặc không hợp lệ.");
                } else {
                    console.log("👉 Gợi ý: Server Backend chưa bật hoặc sai cổng.");
                }

                // Xóa token lỗi để tránh lặp vô tận
                localStorage.removeItem('token'); 
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkLogin();
    }, []);

    const login = (userData, token) => {
        localStorage.setItem('token', token);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};