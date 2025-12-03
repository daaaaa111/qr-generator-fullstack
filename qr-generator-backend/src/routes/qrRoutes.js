const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middlewares/authMiddleware');
const ExcelJS = require('exceljs');
const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');

// ==========================================
// HÀM HỖ TRỢ: VẼ NGUYÊN THẺ CARD (Name + QR + Code)
// Dùng để xuất ra Excel
// ==========================================
const generateFullCardImage = async (text, name, description) => {
    try {
        // 1. Cấu hình kích thước thẻ (Rộng 400, Cao 580)
        const width = 400;
        const height = 580;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // 2. Vẽ nền trắng & Viền
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, width - 4, height - 4);

        // 3. Viết Tên Chương Trình (Header)
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 28px sans-serif'; 
        ctx.textAlign = 'center';
        
        // Cắt tên nếu quá dài
        const displayName = name && name.length > 25 ? name.substring(0, 25) + '...' : (name || '');
        ctx.fillText(displayName, width / 2, 60); 

        // 4. Viết Mô tả (Nếu có)
        if (description) {
            ctx.fillStyle = '#666666';
            ctx.font = '18px sans-serif';
            const displayDesc = description.length > 35 ? description.substring(0, 35) + '...' : description;
            ctx.fillText(displayDesc, width / 2, 90);
        }

        // 5. VẼ MÃ QR (Ở giữa)
        const qrSize = 300;
        const qrCanvas = createCanvas(qrSize, qrSize);
        await QRCode.toCanvas(qrCanvas, text, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: qrSize,
            color: { dark: '#000000', light: '#ffffff' }
        });

        // Dán QR vào canvas chính
        const qrY = 120;
        ctx.drawImage(qrCanvas, (width - qrSize) / 2, qrY);

        // 6. VẼ LOGO VÀO GIỮA QR
        const logoPath = path.join(__dirname, '../../assets/logo.png');
        if (fs.existsSync(logoPath)) {
            const logo = await loadImage(logoPath);
            const logoSize = qrSize * 0.22; 
            const logoX = (width - logoSize) / 2;
            const logoY = qrY + (qrSize - logoSize) / 2;
            const padding = 5;

            // Nền trắng logo
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(logoX - padding, logoY - padding, logoSize + (padding*2), logoSize + (padding*2));
            
            // Vẽ logo
            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        }

        // 7. FOOTER: MÃ SỐ
        // Vẽ nền xám dưới đáy
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(20, height - 90, width - 40, 70);
        
        // Viết số
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 34px monospace'; 
        ctx.textAlign = 'center';
        ctx.fillText(text, width / 2, height - 45);

        return canvas.toDataURL('image/png');

    } catch (error) {
        console.error('Lỗi vẽ Card:', error);
        // Fallback: Trả về QR thường nếu lỗi vẽ
        return await QRCode.toDataURL(text);
    }
};

// ==========================================
// 1. API TẠO MÃ EAN-13 (PREVIEW)
// ==========================================
router.post('/create-ean13', verifyToken, async (req, res) => {
    try {
        const { manufacturerCode, productCode, programName, prefix = '893' } = req.body;
        const rawString = `${prefix}${manufacturerCode}${productCode}`;
        let sum = 0;
        for (let i = 0; i < 12; i++) sum += (i % 2 === 0) ? parseInt(rawString[i]) : parseInt(rawString[i]) * 3;
        const remainder = sum % 10;
        const checksum = (10 - remainder) % 10;
        const fullCode = `${rawString}${checksum}`;
        const qrImage = await QRCode.toDataURL(fullCode);

        res.json({
            message: 'OK',
            data: { program_name: programName, custom_code: fullCode, qr_image: qrImage, ean_parts: { checksum }, qr_type: 'EAN' }
        });
    } catch (error) { res.status(500).json({ error: 'Lỗi tạo mã' }); }
});

// ==========================================
// 2. API QUẢN LÝ LÔ HÀNG (BATCHES)
// ==========================================
router.get('/batches', verifyToken, async (req, res) => {
    try {
        let query;
        let params;
        // Admin xem hết, User xem của mình
        if (req.user.role === 'admin') {
            query = `SELECT b.*, u.display_name as creator_name, COUNT(q.id) as qr_count FROM batches b LEFT JOIN qr_codes q ON b.id = q.batch_id LEFT JOIN users u ON b.user_id = u.id GROUP BY b.id, u.display_name ORDER BY b.updated_at DESC`;
            params = [];
        } else {
            query = `SELECT b.*, u.display_name as creator_name, COUNT(q.id) as qr_count FROM batches b LEFT JOIN qr_codes q ON b.id = q.batch_id LEFT JOIN users u ON b.user_id = u.id WHERE b.user_id = $1 GROUP BY b.id, u.display_name ORDER BY b.updated_at DESC`;
            params = [req.user.id];
        }
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: 'Lỗi lấy danh sách' }); }
});

router.get('/batches/:id', verifyToken, async (req, res) => {
    try {
        const batchRes = await pool.query('SELECT * FROM batches WHERE id = $1', [req.params.id]);
        const qrRes = await pool.query('SELECT * FROM qr_codes WHERE batch_id = $1 ORDER BY created_at DESC', [req.params.id]);
        res.json({ batch: batchRes.rows[0], qrs: qrRes.rows });
    } catch (err) { res.status(500).json({ error: 'Lỗi lấy chi tiết' }); }
});

// ==========================================
// 3. API LƯU TRỮ & CẬP NHẬT
// ==========================================

// Lưu hàng loạt
router.post('/save-batch', verifyToken, async (req, res) => {
    const { codes, batchName, batchId } = req.body;
    const userId = req.user.id;
    if (!codes || codes.length === 0) return res.status(400).json({ error: 'No data' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let targetBatchId = batchId;

        if (!targetBatchId || targetBatchId === 'new') {
            const tempName = batchName || 'Tệp QR Mới';
            const batchRes = await client.query('INSERT INTO batches (user_id, batch_name) VALUES ($1, $2) RETURNING id', [userId, tempName]);
            targetBatchId = batchRes.rows[0].id;
            if (!batchName) await client.query("UPDATE batches SET batch_name = $1 WHERE id = $2", [`Tệp QR #${targetBatchId}`, targetBatchId]);
        } else {
            await client.query("UPDATE batches SET updated_at = CURRENT_TIMESTAMP WHERE id = $1", [targetBatchId]);
        }

        for (const item of codes) {
            const check = await client.query('SELECT 1 FROM qr_codes WHERE custom_code = $1', [item.custom_code]);
            if (check.rowCount === 0) {
                await client.query(
                    `INSERT INTO qr_codes (program_name, custom_code, description, user_id, batch_id, qr_type) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [item.program_name, item.custom_code, item.description || '', userId, targetBatchId, item.qr_type || 'EAN']
                );
            }
        }
        await client.query('COMMIT');
        res.json({ message: 'Saved', batchId: targetBatchId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Save failed' });
    } finally { client.release(); }
});

// Cập nhật thông tin 1 mã QR (Edit)
router.put('/:id', verifyToken, async (req, res) => {
    const { programName, description } = req.body;
    try {
        let query = 'UPDATE qr_codes SET program_name = $1, description = $2 WHERE id = $3';
        let params = [programName, description, req.params.id];
        
        // Nếu không phải admin, chỉ cho sửa của chính mình
        if (req.user.role !== 'admin') {
            query += ' AND user_id = $4';
            params.push(req.user.id);
        }

        const result = await pool.query(query, params);
        if (result.rowCount === 0) return res.status(404).json({ error: 'Không tìm thấy hoặc không có quyền sửa.' });
        
        res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ error: 'Update failed' }); }
});

// ==========================================
// 4. API XUẤT EXCEL (THÔNG MINH)
// ==========================================
router.post('/export-excel', verifyToken, async (req, res) => {
    const { codes } = req.body;
    if (!codes || codes.length === 0) return res.status(400).json({ error: 'No data' });

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('QR Codes');

        // Kiểm tra dữ liệu để ẩn cột trống
        let hasName = false;
        let hasDesc = false;
        for (const item of codes) {
            if (item.program_name) hasName = true;
            if (item.description) hasDesc = true;
        }

        const columns = [{ header: 'STT', key: 'stt', width: 8 }];
        if (hasName) columns.push({ header: 'Tên Chương Trình', key: 'name', width: 30 });
        if (hasDesc) columns.push({ header: 'Mô tả', key: 'desc', width: 25 });
        columns.push({ header: 'Mã EAN-13 / Nội dung', key: 'code', width: 25 });
        columns.push({ header: 'Thẻ QR (Hình ảnh)', key: 'image', width: 35 }); // Cột ảnh rộng

        worksheet.columns = columns;

        for (let i = 0; i < codes.length; i++) {
            const item = codes[i];
            const rowIndex = i + 2;

            const rowData = { stt: i + 1, code: item.custom_code };
            if (hasName) rowData.name = item.program_name;
            if (hasDesc) rowData.desc = item.description;
            
            const row = worksheet.addRow(rowData);
            
            // Căn giữa dọc và ngang
            row.alignment = { vertical: 'middle', horizontal: 'center' };
            if (hasName) row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

            const cardImageData = await generateFullCardImage(
                item.custom_code,
                item.program_name,
                item.description
            );
            
            const imageId = workbook.addImage({ base64: cardImageData, extension: 'png' });
            const imageColIndex = columns.length - 1; // Cột cuối cùng

            worksheet.addImage(imageId, {
                tl: { col: imageColIndex, row: rowIndex - 1 },
                ext: { width: 150, height: 217 } // Tỉ lệ thẻ dọc (400x580)
            });

            // Tăng chiều cao dòng để chứa vừa thẻ
            worksheet.getRow(rowIndex).height = 170; 
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=QR_Export.xlsx');
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Excel Error:", error);
        res.status(500).json({ error: 'Export failed' });
    }
});

// ==========================================
// 5. CÁC API KHÁC (GET ALL, DELETE)
// ==========================================
router.get('/batches/:id', verifyToken, async (req, res) => {
    try {
        const batchRes = await pool.query('SELECT * FROM batches WHERE id = $1', [req.params.id]);
        
        const qrRes = await pool.query(`
            SELECT qr.*, u.display_name, u.email
            FROM qr_codes qr 
            LEFT JOIN users u ON qr.user_id = u.id 
            WHERE qr.batch_id = $1 
            ORDER BY qr.created_at DESC
        `, [req.params.id]);
        
        res.json({ batch: batchRes.rows[0], qrs: qrRes.rows });
    } catch (err) { res.status(500).json({ error: 'Lỗi lấy chi tiết tệp' }); }
});

router.delete('/:id', verifyToken, async (req, res) => {
    try {
        // Admin xóa all, User xóa của mình
        let query = 'DELETE FROM qr_codes WHERE id=$1';
        let params = [req.params.id];
        if (req.user.role !== 'admin') {
            query += ' AND user_id=$2';
            params.push(req.user.id);
        }
        const result = await pool.query(query, params);
        if (result.rowCount > 0) res.json({ message: 'Deleted' });
        else res.status(404).json({ error: 'Not found' });
    } catch (err) { res.status(500).json({ error: 'Err' }); }
});

module.exports = router;