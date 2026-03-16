const db = require('../Config/db');

const AdminController = {
    // 1. Lấy thống kê tổng quan (Thẻ card ở trên cùng)
    getDashboardStats: async (req, res) => {
        try {
            const [movieRes] = await db.query("SELECT COUNT(*) as total FROM movies");
            const [userRes] = await db.query("SELECT COUNT(*) as total FROM users WHERE role != 'admin'");
            const [ticketRes] = await db.query(`
                SELECT COUNT(t.ticket_id) as total 
                FROM tickets t
                JOIN bookings b ON t.booking_id = b.booking_id
                WHERE b.status = 'Completed'
            `);
            const [revenueRes] = await db.query("SELECT SUM(total_amount) as total FROM bookings WHERE status = 'Completed'");

            return res.status(200).json({
                success: true,
                movies: movieRes[0].total || 0,
                users: userRes[0].total || 0,
                tickets: ticketRes[0].total || 0,
                revenue: Number(revenueRes[0].total) || 0
            });
        } catch (error) {
            console.error("Lỗi getDashboardStats:", error);
            return res.status(500).json({ success: false, message: "Lỗi hệ thống." });
        }
    },

    // 2. Lấy dữ liệu biểu đồ (Có bộ lọc ngày y hệt ACB ONE)
    getRevenueChartData: async (req, res) => {
        try {
            // Lấy tham số startDate và endDate từ query string (VD: ?startDate=2026-03-01&endDate=2026-03-14)
            const { startDate, endDate } = req.query;

            // Nếu không có ngày truyền lên, mặc định lấy 7 ngày gần nhất
            const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const end = endDate || new Date().toISOString().split('T')[0];

            // A. Biểu đồ đường: Doanh thu theo thời gian
            const [dailyRevenue] = await db.query(`
                SELECT 
                    DATE_FORMAT(booking_date, '%d/%m') as date,
                    CAST(SUM(total_amount) AS UNSIGNED) as daily_total
                FROM bookings
                WHERE status = 'Completed' 
                  AND DATE(booking_date) BETWEEN ? AND ?
                GROUP BY DATE(booking_date), DATE_FORMAT(booking_date, '%d/%m')
                ORDER BY DATE(booking_date) ASC
            `, [start, end]);

            // B. Biểu đồ tròn: Tỷ trọng doanh thu giữa các phim
            const [movieRevenue] = await db.query(`
                SELECT 
                    m.title AS name, 
                    CAST(SUM(b.total_amount) AS UNSIGNED) as value
                FROM movies m
                JOIN showtimes s ON m.movie_id = s.movie_id
                JOIN bookings b ON s.showtime_id = b.showtime_id
                WHERE b.status = 'Completed'
                  AND DATE(b.booking_date) BETWEEN ? AND ?
                GROUP BY m.movie_id, m.title
                ORDER BY value DESC
            `, [start, end]);

            // C. BIỂU ĐỒ CỘT (MỚI): CHI TIẾT SỐ LƯỢNG VÉ BÁN RA (Giống chi tiết giao dịch)
            // Giúp Dũng biết phim nào "đắt khách" nhất trong ngày/tháng đó
            const [ticketDetails] = await db.query(`
                SELECT 
                    m.title AS movieName,
                    COUNT(t.ticket_id) AS ticketCount
                FROM tickets t
                JOIN bookings b ON t.booking_id = b.booking_id
                JOIN showtimes s ON t.showtime_id = s.showtime_id
                JOIN movies m ON s.movie_id = m.movie_id
                WHERE b.status = 'Completed' 
                  AND DATE(b.booking_date) BETWEEN ? AND ?
                GROUP BY m.movie_id, m.title
                ORDER BY ticketCount DESC
            `, [start, end]);

            return res.status(200).json({
                success: true,
                dailyData: dailyRevenue,
                movieData: movieRevenue,
                ticketData: ticketDetails // Dữ liệu cho biểu đồ cột chi tiết
            });

        } catch (error) {
            console.error("Lỗi getRevenueChartData:", error);
            return res.status(500).json({
                success: false,
                message: "Không thể lọc dữ liệu biểu đồ.",
                error: error.message
            });
        }
    }
};

module.exports = AdminController;