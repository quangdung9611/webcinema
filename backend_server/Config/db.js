const mysql = require("mysql2/promise");
require("dotenv").config();

// ============================================================
// MYSQL CONNECTION POOL
// ============================================================

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    port: Number(process.env.DB_PORT) || 26990,

    // ========================================================
    // CONNECTION POOL
    // ========================================================

    waitForConnections: true,

    // Không mở hàng nghìn connection khi có 1.000 user.
    // Mỗi Node instance chỉ giữ một pool connection vừa phải.
    connectionLimit:
        Number(process.env.DB_CONNECTION_LIMIT) || 20,

    // 0 = cho phép request chờ connection.
    queueLimit: 0,

    // ========================================================
    // CHARACTER SET
    // ========================================================

    charset: "utf8mb4",

    // ========================================================
    // TIMEZONE
    //
    // MySQL sử dụng timezone Việt Nam.
    // ========================================================

    timezone: "+07:00",

    // ========================================================
    // SSL
    //
    // Aiven MySQL yêu cầu SSL trong production.
    // ========================================================

    ssl: {
        rejectUnauthorized: false,
    },

    // ========================================================
    // KEEP ALIVE
    //
    // Giúp connection ổn định hơn khi chạy production.
    // ========================================================

    enableKeepAlive: true,
    keepAliveInitialDelay: 0,

    // ========================================================
    // CONNECTION TIMEOUT
    // ========================================================

    connectTimeout: 10000,

    // ========================================================
    // QUERY TIMEOUT
    //
    // mysql2 không có query timeout native giống một số
    // driver khác, nên phần này không đặt timeout giả.
    // ========================================================
});

// ============================================================
// SET MYSQL TIMEZONE
//
// Lưu ý:
// SET GLOBAL không dùng ở đây.
// SET time_zone chỉ áp dụng cho connection hiện tại.
//
// Vì pool tạo nhiều connection nên timezone đã được đặt
// trực tiếp bằng `timezone: "+07:00"` ở phía trên.
// ============================================================


// ============================================================
// DATABASE ERROR HANDLER
// ============================================================

pool.on("error", (error) => {
    console.error(
        "❌ [DATABASE POOL ERROR]:",
        error.message
    );

    if (error.code) {
        console.error(
            "   Code:",
            error.code
        );
    }
});


// ============================================================
// DATABASE HEALTH CHECK
//
// Dùng khi server khởi động để biết DB có kết nối được hay không.
// ============================================================

(async () => {
    let connection;

    try {
        connection = await pool.getConnection();

        await connection.query(
            "SELECT 1"
        );

        console.log(
            "✅ MySQL connection pool initialized"
        );

        console.log(
            `🗄️ MySQL pool limit: ${
                Number(process.env.DB_CONNECTION_LIMIT) || 20
            }`
        );

        console.log(
            "🇻🇳 MySQL timezone: +07:00"
        );

    } catch (error) {

        console.error(
            "❌ [DATABASE INIT ERROR]:",
            error.message
        );

        if (error.code) {
            console.error(
                "   Code:",
                error.code
            );
        }

    } finally {

        if (connection) {
            connection.release();
        }
    }
})();


// ============================================================
// EXPORT POOL
// ============================================================

module.exports = pool;