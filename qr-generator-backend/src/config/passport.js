const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');
require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback",
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    const { id, displayName, emails, photos } = profile;
    const email = emails[0].value;
    const profilePicture = photos[0].value;

    try {
        // 1. Kiểm tra user cũ
        let result = await pool.query('SELECT * FROM users WHERE google_id = $1', [id]);
        
        if (result.rows.length > 0) {
            return done(null, result.rows[0]);
        } else {
            // 2. Tạo user mới
            const adminEmail = process.env.ADMIN_EMAIL || ''; 
            
            // So sánh email đăng nhập với email trong .env
            const role = (email === adminEmail) ? 'admin' : 'user';
            
            const newUserResult = await pool.query(
                'INSERT INTO users (google_id, email, display_name, profile_picture, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [id, email, displayName, profilePicture, role]
            );
            return done(null, newUserResult.rows[0]);
        }
    } catch (err) {
        return done(err, null);
    }
  }
));

// Serialize: Lưu ID vào session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize: Lấy thông tin user từ ID trong session
passport.deserializeUser(async (id, done) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (result.rows.length > 0) {
            done(null, result.rows[0]);
        } else {
            done(new Error('User not found'), null);
        }
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;