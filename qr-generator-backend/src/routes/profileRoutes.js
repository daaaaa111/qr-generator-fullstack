const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middlewares/authMiddleware');
const { nanoid } = require('nanoid');
const ExcelJS = require('exceljs');
const QRCode = require('qrcode');

// 1. API Lưu Profile (Tạo mới hoặc Cập nhật)
// URL: POST /api/profiles
router.post('/', verifyToken, async (req, res) => {
    const { firstName, lastName, phone, email, company, jobTitle, avatarBase64, links } = req.body;
    const userId = req.user.id;

    try {
        // Lấy google_id từ user_id
        const userRes = await pool.query('SELECT google_id FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const googleId = userRes.rows[0].google_id;

        const existing = await pool.query('SELECT * FROM profiles WHERE user_google_id = $1', [googleId]);
        let result;

        if (existing.rows.length > 0) {
            // Update
            const query = `UPDATE profiles SET first_name=$1, last_name=$2, phone=$3, email=$4, company=$5, job_title=$6, avatar_base64=$7, links=$8 WHERE user_google_id=$9 RETURNING *`;
            result = await pool.query(query, [firstName, lastName, phone, email, company, jobTitle, avatarBase64, JSON.stringify(links), googleId]);
        } else {
            // Create
            const newId = nanoid(10);
            const query = `INSERT INTO profiles (profile_id, user_google_id, first_name, last_name, phone, email, company, job_title, avatar_base64, links) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`;
            result = await pool.query(query, [newId, googleId, firstName, lastName, phone, email, company, jobTitle, avatarBase64, JSON.stringify(links)]);
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi server khi lưu profile' });
    }
});

// 2. API Lấy danh sách vCard của tôi
// URL: GET /api/profiles/my-profiles
router.get('/my-profiles', verifyToken, async (req, res) => {
    try {
        const userRes = await pool.query('SELECT google_id FROM users WHERE id = $1', [req.user.id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const result = await pool.query('SELECT * FROM profiles WHERE user_google_id = $1 ORDER BY created_at DESC', [userRes.rows[0].google_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Lỗi lấy danh sách' });
    }
});

// 3. API Lấy vCard công khai (Ai xem cũng được)
// URL: GET /api/profiles/:profileId
router.get('/:profileId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM profiles WHERE profile_id = $1', [req.params.profileId]);
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(404).json({ error: 'Không tìm thấy hồ sơ' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 4. API Xóa vCard
// URL: DELETE /api/profiles/:profileId
router.delete('/:profileId', verifyToken, async (req, res) => {
    try {
        // (Cần thêm logic check quyền sở hữu ở đây nếu muốn chặt chẽ hơn)
        await pool.query('DELETE FROM profiles WHERE profile_id = $1', [req.params.profileId]);
        res.json({ message: 'Đã xóa' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi xóa' });
    }
});

//  5. API XUẤT EXCEL VCARD (Quan trọng: Tên route là /export-excel)
// URL: POST /api/profiles/export-excel
router.post('/export-excel', verifyToken, async (req, res) => {
    const { profileIds } = req.body;
    if (!profileIds || profileIds.length === 0) return res.status(400).json({ error: 'Chưa chọn hồ sơ' });

    try {
        const result = await pool.query('SELECT * FROM profiles WHERE profile_id = ANY($1::text[])', [profileIds]);
        const profiles = result.rows;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Danh sách vCard');

        worksheet.columns = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Họ Tên', key: 'name', width: 25 },
            { header: 'Chức danh', key: 'job', width: 20 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Link Profile', key: 'link', width: 40 },
            { header: 'Mã QR', key: 'qr', width: 18 }
        ];

        for (let i = 0; i < profiles.length; i++) {
            const p = profiles[i];
            const rowIndex = i + 2;
            const profileUrl = `${process.env.CLIENT_URL}/profile/${p.profile_id}`;

            worksheet.addRow({
                stt: i + 1,
                name: `${p.first_name} ${p.last_name}`,
                job: p.job_title,
                email: p.email,
                link: profileUrl
            });

            const qrDataUrl = await QRCode.toDataURL(profileUrl);
            const imageId = workbook.addImage({ base64: qrDataUrl, extension: 'png' });

            worksheet.addImage(imageId, {
                tl: { col: 5, row: rowIndex - 1 },
                ext: { width: 100, height: 100 }
            });
            worksheet.getRow(rowIndex).height = 90;
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=vCard_Export.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi xuất file Excel' });
    }
});

module.exports = router;