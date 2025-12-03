const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');

// 1. Lấy tất cả QR Code (EAN-13)
// URL: GET /api/admin/qrs
router.get('/qrs', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const query = `
            SELECT qr.*, u.display_name, u.email 
            FROM qr_codes qr
            LEFT JOIN users u ON qr.user_id = u.id
            ORDER BY qr.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy danh sách QR' });
    }
});

// 2. Lấy tất cả vCard (Profiles) -
// URL: GET /api/admin/profiles
router.get('/profiles', verifyToken, verifyAdmin, async (req, res) => {
    try {
        // Join bảng profiles với users qua google_id để biết ai là chủ sở hữu
        const query = `
            SELECT p.*, u.display_name as owner_name, u.email as owner_email
            FROM profiles p
            LEFT JOIN users u ON p.user_google_id = u.google_id
            ORDER BY p.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy danh sách Profiles' });
    }
});

module.exports = router;