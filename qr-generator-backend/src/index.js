require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');

// Import cấu hình DB và Passport
const pool = require('./config/db'); 
require('./config/passport'); 

// Import Routes
const authRoutes = require('./routes/authRoutes');
const qrRoutes = require('./routes/qrRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const port = process.env.PORT || 5000;

// --- 1. MIDDLEWARES (Cấu hình App) ---
app.use((req, res, next) => {
    console.log(`👉 DEBUG: [${req.method}] ${req.url}`);
    next();
});

app.use(cors({ 
    origin: process.env.CLIENT_URL || 'http://localhost:3000', 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cấu hình Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key_mac_dinh',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Nếu chạy localhost thì để false, lên host có https thì để true
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// Khởi tạo Passport (Phải nằm sau session)
app.use(passport.initialize());
app.use(passport.session());

// --- 2. ROUTES (Đăng ký đường dẫn) ---
app.use('/api/auth', authRoutes);       
app.use('/api/qrs', qrRoutes);          
app.use('/api/profiles', profileRoutes);
app.use('/api/admin', adminRoutes);     

// Health Check
app.get('/', (req, res) => {
    res.send('✅ QR Generator API is running...');
});

// --- 3. ERROR HANDLING ---
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// --- 4. START SERVER ---
app.listen(port, async () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
    try {
        const client = await pool.connect();
        console.log('✅ Kết nối Database thành công!');
        client.release();
    } catch (err) {
        console.error('❌ Không thể kết nối Database:', err.message);
    }
});