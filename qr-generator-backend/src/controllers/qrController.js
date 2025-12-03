const QRCode = require('qrcode');
const pool = require('../config/db'); // Import kết nối DB
const { calculateEan13Checksum } = require('../utils/ean13Helper');

// Hàm tạo mã QR chuẩn EAN-13
const createEan13Qr = async (req, res) => {
    try {
        const { manufacturerCode, productCode, programName } = req.body;
        const userId = req.user.id; // Lấy từ middleware verifyToken

        // 1. Validate dữ liệu đầu vào (Quan trọng)
        if (!manufacturerCode || !/^\d{5}$/.test(manufacturerCode)) {
            return res.status(400).json({ error: 'Mã doanh nghiệp phải gồm đúng 5 chữ số.' });
        }
        if (!productCode || !/^\d{4}$/.test(productCode)) {
            return res.status(400).json({ error: 'Mã sản phẩm phải gồm đúng 4 chữ số.' });
        }

        // 2. Tạo chuỗi 12 số đầu tiên
        const prefix = '893';
        const rawString = `${prefix}${manufacturerCode}${productCode}`;

        // 3. Tính số cuối cùng (Checksum)
        const checksum = calculateEan13Checksum(rawString);

        // 4. Tạo mã hoàn chỉnh (13 số)
        const fullEan13Code = `${rawString}${checksum}`;

        // 5. Kiểm tra trùng lặp trong Database (Tùy chọn nhưng nên làm)
        const existing = await pool.query('SELECT id FROM qr_codes WHERE custom_code = $1', [fullEan13Code]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Mã EAN-13 này đã tồn tại trong hệ thống.' });
        }

        // 6. Lưu vào Database
        // Lưu ý: program_name là tên chương trình user đặt (nếu có)
        const result = await pool.query(
            'INSERT INTO qr_codes (program_name, custom_code, user_id) VALUES ($1, $2, $3) RETURNING *',
            [programName || `EAN-13 ${fullEan13Code}`, fullEan13Code, userId]
        );

        // 7. (Tùy chọn) Tạo ảnh QR trả về ngay lập tức để hiển thị Preview
        const qrImage = await QRCode.toDataURL(fullEan13Code);

        // 8. Trả về kết quả
        res.status(201).json({
            message: 'Tạo mã EAN-13 thành công',
            data: {
                ...result.rows[0],
                ean_parts: {
                    prefix: '893',
                    manufacturer: manufacturerCode,
                    product: productCode,
                    checksum: checksum
                },
                qr_image: qrImage // Chuỗi Base64 để hiển thị thẻ <img src="..." />
            }
        });

    } catch (error) {
        console.error('Lỗi tạo mã EAN-13:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi server.' });
    }
};

module.exports = {
    createEan13Qr,
    // ... các hàm khác (saveQRs, getAllQRs...)
};