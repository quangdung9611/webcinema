const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    // Đổi 'localhost' thành '127.0.0.1' để bỏ qua bước dịch tên miền cho nhanh
    host: process.env.DB_HOST, 
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cinema_shop',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    // CẤU HÌNH ĐÚNG Ý DŨNG: HẾT LỖI NHẢY NGÀY
    timezone: '+07:00', // Đổi thành +07:00 nếu Dũng muốn đúng giờ Việt Nam
    dateStrings: true,  // Giữ nguyên dạng chuỗi "2026-02-24" cực dễ xử lý
    
    // Thêm dòng này để kết nối bền bỉ hơn
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

module.exports = pool;