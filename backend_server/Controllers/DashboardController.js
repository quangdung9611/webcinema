const db = require('../Config/db');

class DashboardController {
    /**
     * Lấy thống kê tổng quan (card stats)
     * GET /admin/api/manage/stats
     * Query: period (week | month | quarter | year) – optional
     */
    static async getStats(req, res) {
        try {
            const { period } = req.query;

            // Nếu có period, lọc theo thời gian cho doanh thu
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

            // 1. Tổng phim
            const [movieRes] = await db.query("SELECT COUNT(*) as total FROM movies");

            // 2. Tổng người dùng (không tính admin)
            const [userRes] = await db.query("SELECT COUNT(*) as total FROM users WHERE role != 'admin'");

            // 3. Tổng vé đã bán (Completed)
            const [ticketRes] = await db.query(`
                SELECT COUNT(t.ticket_id) as total 
                FROM tickets t
                JOIN bookings b ON t.booking_id = b.booking_id
                WHERE b.status = 'Completed'
            `);

            // 4. Doanh thu – lọc theo period nếu có
            let revenueQuery = `
                SELECT COALESCE(SUM(total_amount), 0) as total 
                FROM bookings 
                WHERE status = 'Completed'
            `;
            if (dateFilter) {
                revenueQuery += ` ${dateFilter}`;
            }
            const [revenueRes] = await db.query(revenueQuery, params);
            const totalRevenue = Number(revenueRes[0]?.total) || 0;

            // 5. Người dùng mới (nếu có period)
            let newUsers = 0;
            let newOrders = 0;
            let revenueGrowth = 0;

            if (period) {
                // Người dùng mới
                const [newUsersRes] = await db.query(`
                    SELECT COUNT(*) as total 
                    FROM users 
                    WHERE role != 'admin'
                      AND DATE(created_at) BETWEEN ? AND ?
                `, [startDate, endDate]);
                newUsers = newUsersRes[0]?.total || 0;

                // Đơn hàng mới
                const [newOrdersRes] = await db.query(`
                    SELECT COUNT(*) as total 
                    FROM bookings 
                    WHERE status = 'Completed'
                      AND DATE(booking_date) BETWEEN ? AND ?
                `, [startDate, endDate]);
                newOrders = newOrdersRes[0]?.total || 0;

                // Tăng trưởng doanh thu
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
                    WHERE status = 'Completed'
                      AND DATE(booking_date) BETWEEN ? AND ?
                `, [prevStartStr, prevEndStr]);

                const prevRevenue = Number(prevRevenueRes[0]?.total) || 0;
                revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
            }

            // Trả về dữ liệu cho frontend
            return res.status(200).json({
                success: true,
                movies: movieRes[0].total || 0,
                users: userRes[0].total || 0,
                tickets: ticketRes[0].total || 0,
                revenue: totalRevenue,
                ...(period ? {
                    new_users: newUsers,
                    new_orders: newOrders,
                    revenue_growth: Math.round(revenueGrowth * 10) / 10,
                    period: period
                } : {})
            });
        } catch (error) {
            console.error('❌ Lỗi getStats:', error);
            return res.status(500).json({
                success: false,
                message: 'Không thể lấy thống kê.',
                error: error.message
            });
        }
    }

    /**
     * Lấy dữ liệu biểu đồ (line + pie + table)
     * GET /admin/api/manage/revenue-chart
     * Query: startDate, endDate
     */
    static async getRevenueChartData(req, res) {
        try {
            const { startDate, endDate } = req.query;

            // Mặc định 7 ngày gần nhất
            const end = endDate || new Date().toISOString().split('T')[0];
            const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // 1. Doanh thu theo ngày
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

            // 2. Doanh thu theo phim
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
            const movieDataWithPercent = movieRevenue.map(item => ({
                ...item,
                value: Number(item.value),
                percent: totalRevenue > 0 ? ((item.value / totalRevenue) * 100).toFixed(1) + '%' : '0%'
            }));

            // 3. Số vé bán theo phim
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

            // 4. Tổng doanh thu & số đơn hàng trong kỳ
            const [summary] = await db.query(`
                SELECT 
                    COALESCE(SUM(total_amount), 0) as total_revenue,
                    COUNT(*) as total_orders
                FROM bookings
                WHERE status = 'Completed'
                  AND DATE(booking_date) BETWEEN ? AND ?
            `, [start, end]);

            return res.status(200).json({
                success: true,
                dailyData: dailyRevenue,
                movieData: movieDataWithPercent,
                ticketData: ticketDetails,
                period: { start, end },
                summary: {
                    total_revenue: Number(summary[0]?.total_revenue) || 0,
                    total_orders: Number(summary[0]?.total_orders) || 0
                }
            });
        } catch (error) {
            console.error('❌ Lỗi getRevenueChartData:', error);
            return res.status(500).json({
                success: false,
                message: 'Không thể lấy dữ liệu biểu đồ.',
                error: error.message
            });
        }
    }

    /**
     * Lấy top phim doanh thu cao
     */
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
            console.error('❌ Lỗi getTopMovies:', error);
            return res.status(500).json({
                success: false,
                message: 'Không thể lấy danh sách phim.',
                error: error.message
            });
        }
    }

    /**
     * Tăng trưởng người dùng
     */
    static async getUserGrowth(req, res) {
        try {
            const days = parseInt(req.query.days) || 30;
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const [data] = await db.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as new_users,
                    SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative
                FROM users
                WHERE role != 'admin'
                  AND DATE(created_at) >= ?
                GROUP BY DATE(created_at)
                ORDER BY DATE(created_at) ASC
            `, [startDate]);

            return res.status(200).json({
                success: true,
                data: data.map(d => ({
                    date: d.date,
                    new_users: d.new_users,
                    cumulative: d.cumulative
                }))
            });
        } catch (error) {
            console.error('❌ Lỗi getUserGrowth:', error);
            return res.status(500).json({
                success: false,
                message: 'Không thể lấy dữ liệu tăng trưởng.',
                error: error.message
            });
        }
    }

    /**
     * Helper: lấy khoảng thời gian theo period
     */
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