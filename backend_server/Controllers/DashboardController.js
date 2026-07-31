const db = require('../Config/db');

class DashboardController {
    // ----------------------------------------------------------------
    // 1. Thống kê tổng quan (số phim, vé, user, doanh thu)
    //    Có thể lọc theo period (today, week, month, quarter, year)
    // ----------------------------------------------------------------
    static async getStats(req, res) {
        try {
            const { period } = req.query;
            let dateFilter = '';
            let params = [];
            let startDate, endDate;

            if (period) {
                const range = DashboardController.getDateRange(period);
                startDate = range.startDate;
                endDate = range.endDate;
                dateFilter = 'AND DATE(booking_date) BETWEEN ? AND ?';
                params = [startDate, endDate];
            }

            // Tổng phim
            const [movieRes] = await db.query("SELECT COUNT(*) as total FROM movies");
            // Tổng user (không admin)
            const [userRes] = await db.query("SELECT COUNT(*) as total FROM users WHERE role != 'admin'");
            // Tổng vé đã bán (từ booking Completed)
            const [ticketRes] = await db.query(`
                SELECT COUNT(t.ticket_id) as total 
                FROM tickets t
                JOIN bookings b ON t.booking_id = b.booking_id
                WHERE b.status = 'Completed'
            `);

            // Tổng doanh thu
            let revenueQuery = `
                SELECT COALESCE(SUM(total_amount), 0) as total 
                FROM bookings 
                WHERE status = 'Completed'
            `;
            if (dateFilter) revenueQuery += ` ${dateFilter}`;
            const [revenueRes] = await db.query(revenueQuery, params);
            const totalRevenue = Number(revenueRes[0]?.total) || 0;

            // Thêm các chỉ số phụ nếu có period
            let response = {
                success: true,
                movies: movieRes[0].total || 0,
                users: userRes[0].total || 0,
                tickets: ticketRes[0].total || 0,
                revenue: totalRevenue
            };

            if (period) {
                // User mới
                const [newUsersRes] = await db.query(`
                    SELECT COUNT(*) as total 
                    FROM users 
                    WHERE role != 'admin' AND DATE(created_at) BETWEEN ? AND ?
                `, [startDate, endDate]);
                // Đơn hàng mới
                const [newOrdersRes] = await db.query(`
                    SELECT COUNT(*) as total 
                    FROM bookings 
                    WHERE status = 'Completed' AND DATE(booking_date) BETWEEN ? AND ?
                `, [startDate, endDate]);

                // Tính tăng trưởng doanh thu so với kỳ trước
                const duration = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
                const prevStart = new Date(startDate);
                prevStart.setDate(prevStart.getDate() - duration - 1);
                const prevEnd = new Date(startDate);
                prevEnd.setDate(prevEnd.getDate() - 1);
                const prevStartStr = prevStart.toISOString().split('T')[0];
                const prevEndStr = prevEnd.toISOString().split('T')[0];

                const [prevRevenueRes] = await db.query(`
                    SELECT COALESCE(SUM(total_amount), 0) as total 
                    FROM bookings 
                    WHERE status = 'Completed' AND DATE(booking_date) BETWEEN ? AND ?
                `, [prevStartStr, prevEndStr]);

                const prevRevenue = Number(prevRevenueRes[0]?.total) || 0;
                const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

                response = {
                    ...response,
                    new_users: newUsersRes[0]?.total || 0,
                    new_orders: newOrdersRes[0]?.total || 0,
                    revenue_growth: Math.round(revenueGrowth * 10) / 10,
                    period
                };
            }

            return res.status(200).json(response);
        } catch (error) {
            console.error('❌ getStats error:', error);
            return res.status(500).json({ success: false, message: 'Lỗi thống kê.', error: error.message });
        }
    }

    // ----------------------------------------------------------------
    // 2. Doanh thu theo ngày (Line Chart)
    //    Nhận startDate, endDate (query)
    // ----------------------------------------------------------------
    static async getRevenueTrend(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const end = endDate || new Date().toISOString().split('T')[0];
            let start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Nếu start > end thì đảo lại
            if (new Date(start) > new Date(end)) {
                [start, end] = [end, start];
            }

            const [dailyRevenue] = await db.query(`
                SELECT 
                    DATE_FORMAT(booking_date, '%d/%m') as date,
                    COALESCE(SUM(total_amount), 0) as daily_total
                FROM bookings
                WHERE status = 'Completed' 
                  AND DATE(booking_date) BETWEEN ? AND ?
                GROUP BY DATE(booking_date)
                ORDER BY DATE(booking_date) ASC
            `, [start, end]);

            return res.status(200).json({
                success: true,
                data: dailyRevenue,
                period: { start, end }
            });
        } catch (error) {
            console.error('❌ getRevenueTrend error:', error);
            return res.status(500).json({ success: false, message: 'Lỗi lấy dữ liệu xu hướng doanh thu.', error: error.message });
        }
    }

    // ----------------------------------------------------------------
    // 3. Doanh thu theo phim (Pie Chart)
    //    Nhận startDate, endDate (query)
    // ----------------------------------------------------------------
    static async getRevenueByMovie(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const end = endDate || new Date().toISOString().split('T')[0];
            let start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            if (new Date(start) > new Date(end)) {
                [start, end] = [end, start];
            }

            const [movieRevenue] = await db.query(`
                SELECT 
                    m.title AS name, 
                    COALESCE(SUM(b.total_amount), 0) as value
                FROM movies m
                JOIN showtimes s ON m.movie_id = s.movie_id
                JOIN bookings b ON s.showtime_id = b.showtime_id
                WHERE b.status = 'Completed'
                  AND DATE(b.booking_date) BETWEEN ? AND ?
                GROUP BY m.movie_id, m.title
                ORDER BY value DESC
            `, [start, end]);

            const totalRevenue = movieRevenue.reduce((sum, item) => sum + Number(item.value), 0);
            const dataWithPercent = movieRevenue.map(item => ({
                ...item,
                value: Number(item.value),
                percent: totalRevenue > 0 ? ((item.value / totalRevenue) * 100).toFixed(1) + '%' : '0%'
            }));

            return res.status(200).json({
                success: true,
                data: dataWithPercent,
                period: { start, end },
                total: totalRevenue
            });
        } catch (error) {
            console.error('❌ getRevenueByMovie error:', error);
            return res.status(500).json({ success: false, message: 'Lỗi lấy doanh thu theo phim.', error: error.message });
        }
    }

    // ----------------------------------------------------------------
    // 4. Số vé bán theo phim (Bar Chart)
    //    Nhận startDate, endDate (query)
    // ----------------------------------------------------------------
    static async getTicketsByMovie(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const end = endDate || new Date().toISOString().split('T')[0];
            let start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            if (new Date(start) > new Date(end)) {
                [start, end] = [end, start];
            }

            const [ticketDetails] = await db.query(`
                SELECT 
                    m.title AS movieName,
                    COUNT(t.ticket_id) AS ticketCount,
                    COALESCE(SUM(b.total_amount), 0) as totalRevenue
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
                data: ticketDetails,
                period: { start, end }
            });
        } catch (error) {
            console.error('❌ getTicketsByMovie error:', error);
            return res.status(500).json({ success: false, message: 'Lỗi lấy số vé theo phim.', error: error.message });
        }
    }

    // ----------------------------------------------------------------
    // 5. Top phim doanh thu cao (Top List)
    //    Nhận limit (query) mặc định 10
    // ----------------------------------------------------------------
    static async getTopMovies(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const [movies] = await db.query(`
                SELECT 
                    m.movie_id,
                    m.title,
                    m.movie_poster as poster,
                    m.release_date,
                    COUNT(t.ticket_id) as tickets_sold,
                    COALESCE(SUM(b.total_amount), 0) as revenue,
                    COUNT(DISTINCT b.booking_id) as orders
                FROM movies m
                JOIN showtimes s ON m.movie_id = s.movie_id
                JOIN bookings b ON s.showtime_id = b.showtime_id
                JOIN tickets t ON b.booking_id = t.booking_id
                WHERE b.status = 'Completed'
                GROUP BY m.movie_id, m.title, m.movie_poster, m.release_date
                ORDER BY revenue DESC
                LIMIT ?
            `, [limit]);

            return res.status(200).json({
                success: true,
                movies: movies.map(m => ({
                    id: m.movie_id,
                    title: m.title,
                    poster: m.poster,
                    release_date: m.release_date,
                    tickets_sold: m.tickets_sold,
                    revenue: Number(m.revenue),
                    orders: m.orders
                }))
            });
        } catch (error) {
            console.error('❌ getTopMovies error:', error);
            return res.status(500).json({ success: false, message: 'Lỗi lấy top phim.', error: error.message });
        }
    }

    // ----------------------------------------------------------------
    // Helper: tính khoảng thời gian
    // ----------------------------------------------------------------
    static getDateRange(period) {
        const now = new Date();
        const endDate = now.toISOString().split('T')[0];
        let startDate = new Date();

        switch (period) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'quarter':
                startDate.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate
        };
    }
}

module.exports = DashboardController;