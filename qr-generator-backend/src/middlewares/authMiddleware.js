const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware xác thực Token JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
        // Token thường có dạng: "Bearer <token>"
        const token = authHeader.split(' ')[1];

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
            }
            // Gán thông tin user vào request để các hàm sau dùng được
            req.user = user;
            next();
        });
    } else {
        res.status(401).json({ error: 'Bạn chưa đăng nhập (Thiếu Token).' });
    }
};

// Middleware kiểm tra quyền Admin
const verifyAdmin = (req, res, next) => {
    // req.user đã có nhờ verifyToken chạy trước đó
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Truy cập bị từ chối. Chỉ dành cho Admin.' });
    }
};

module.exports = { verifyToken, verifyAdmin };