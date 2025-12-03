const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { verifyToken } = require('../middlewares/authMiddleware'); 

require('dotenv').config();

// --- CÁC ROUTE CỦA BẠN ---// --- CÁC ROUTE CỦA BẠN ---
// --- CÁC ROUTE CỦA BẠN ---


// 1. Login Google
router.get('/google', 
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 2. Callback Google
router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/login` }),
    (req, res) => {
        try {
            const payload = { 
                id: req.user.id, 
                role: req.user.role 
            };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
            res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
        } catch (err) {
            console.error(err);
            res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
        }
    }
);

// 3. Lấy Profile (Cần verifyToken)
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, display_name, email, profile_picture, role, google_id FROM users WHERE id = $1', 
            [req.user.id]
        );
        
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'User not foundzz' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;