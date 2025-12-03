/**
 * Tính số kiểm tra (checksum) cho mã EAN-13
 * Quy tắc:
 * 1. Tổng các số ở vị trí lẻ (1, 3, 5...) nhân 1.
 * 2. Tổng các số ở vị trí chẵn (2, 4, 6...) nhân 3.
 * 3. Cộng hai tổng lại.
 * 4. Lấy phần dư của tổng chia cho 10.
 * 5. Checksum = (10 - phần dư) % 10.
 */
const calculateEan13Checksum = (inputString) => {
    if (inputString.length !== 12) {
        throw new Error("Chuỗi đầu vào phải có đúng 12 ký tự số.");
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(inputString[i]);
        // Trong lập trình index bắt đầu từ 0. 
        // Index chẵn (0, 2...) tương ứng vị trí Lẻ (1st, 3rd...) -> nhân 1
        // Index lẻ (1, 3...) tương ứng vị trí Chẵn (2nd, 4th...) -> nhân 3
        if (i % 2 === 0) {
            sum += digit * 1;
        } else {
            sum += digit * 3;
        }
    }

    const remainder = sum % 10;
    const checksum = (10 - remainder) % 10;
    return checksum;
};

module.exports = { calculateEan13Checksum };