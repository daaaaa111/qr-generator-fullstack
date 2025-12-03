import QRCode from 'qrcode';

/**
 * Hàm tạo ảnh QR Code có logo ở giữa (Trả về Base64)
 */
export const generateQrWithLogo = async (text, logoUrl) => {
    try {
        // 1. Tạo thẻ Canvas ảo
        const canvas = document.createElement('canvas');
        const size = 500; // Vẽ độ phân giải cao để in Excel cho nét
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');

        // 2. Vẽ mã QR lên canvas
        await QRCode.toCanvas(canvas, text, {
            errorCorrectionLevel: 'H', // Mức sửa lỗi cao nhất (30%)
            margin: 1,
            width: size,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        // 3. Vẽ Logo đè lên (nếu có)
        if (logoUrl) {
            const img = new Image();
            img.src = logoUrl;
            img.crossOrigin = "Anonymous";

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = (e) => {
                    console.warn("Không load được logo:", e);
                    resolve();
                };
            });

            // Tính toán kích thước logo (22% kích thước QR)
            const logoSize = size * 0.22;
            const xy = (size - logoSize) / 2;
            const padding = 15; // Viền trắng xung quanh logo

            // A. Vẽ hình vuông trắng làm nền
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(
                xy - padding,
                xy - padding,
                logoSize + (padding * 2),
                logoSize + (padding * 2)
            );

            // B. Vẽ logo vào giữa
            ctx.drawImage(img, xy, xy, logoSize, logoSize);
        }

        // 4. Trả về dữ liệu ảnh dạng Base64 (image/png)
        return canvas.toDataURL('image/png');

    } catch (error) {
        console.error("Lỗi tạo QR Image:", error);
        return null;
    }
};