const db = require('../Config/db');

class DashboardController {
    /**
     * Lấy thống kê tổng quan với bộ lọc thời gian
     * GET /admin/api/dashboard/stats
     * Query: period (today, week, month, quarter, year)
     */
    static async getStats(req, res) {
        try {
            const { period = 'week' } = req.query;
            const { startDate, endDate } = DashboardController.getDateRange(period);

            // 1. Thống kê tổng quan
            const [movieRes] = await db.query("SELECT COUNT(*) as total FROM movies");
            const [userRes] = await db.query("SELECT COUNT(*) as total FROM users WHERE role != 'admin'");
            const [ticketRes] = await db.query(`
                SELECT COUNT(t.ticket_id) as total 
                FROM tickets t
                JOIN bookings b ON t.booking_id = b.booking_id
                WHERE b.status = 'Completed'
            `);
            const [revenueRes] = await db.query(`
                SELECT SUM(total_amount) as total 
                FROM bookings 
                WHERE status = 'Completed'
                  AND DATE(booking_date) BETWEEN ? AND ?
            `, [startDate, endDate]);

            // 2. Thống kê tăng trưởng so với kỳ trước
            const prevStart = new Date(startDate);
            prevStart.setDate(prevStart.getDate() - (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
            const prevEnd = new Date(startDate);
            prevEnd.setDate(prevEnd.getDate() - 1);

            const [prevRevenueRes] = await db.query(`
                SELECT SUM(total_amount) as total 
                FROM bookings 
                WHERE status = 'Completed'
                  AND DATE(booking_date) BETWEEN ? AND ?
            `, [prevStart.toISOString().split('T')[0], prevEnd.toISOString().split('T')[0]]);

            const currentRevenue = Number(revenueRes[0]?.total) || 0;
            const prevRevenue = Number(prevRevenueRes[0]?.total) || 0;
            const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

            // 3. Thống kê người dùng mới trong kỳ
            const [newUsersRes] = await db.query(`
                SELECT COUNT(*) as total 
                FROM users 
                WHERE role != 'admin'
                  AND DATE(created_at) BETWEEN ? AND ?
            `, [startDate, endDate]);

            // 4. Thống kê đơn hàng mới
            const [newOrdersRes] = await db.query(`
                SELECT COUNT(*) as total 
                FROM bookings 
                WHERE status = 'Completed'
                  AND DATE(booking_date) BETWEEN ? AND ?
            `, [startDate, endDate]);

            // 5. Top 5 phim bán chạy
            const [topMovies] = await db.query(`
                SELECT 
                    m.movie_id,
                    m.title,
                    m.poster_url,
                    COUNT(t.ticket_id) as total_tickets,
                    SUM(b.total_amount) as revenue
                FROM movies m
                JOIN showtimes s ON m.movie_id = s.movie_id
                JOIN bookings b ON s.showtime_id = b.showtime_id
                JOIN tickets t ON b.booking_id = t.booking_id
                WHERE b.status = 'Completed'
                  AND DATE(b.booking_date) BETWEEN ? AND ?
                GROUP BY m.movie_id, m.title, m.poster_url
                ORDER BY revenue DESC
                LIMIT 5
            `, [startDate, endDate]);

            // 6. Doanh thu theo ngày (cho line chart)
            const [dailyRevenue] = await db.query(`
                SELECT 
                    DATE(booking_date) as date,
                    DATE_FORMAT(booking_date, '%d/%m') as label,
                    CAST(SUM(total_amount) AS UNSIGNED) as daily_total
                FROM bookings
                WHERE status = 'Completed'
                  AND DATE(booking_date) BETWEEN ? AND ?
                GROUP BY DATE(booking_date), DATE_FORMAT(booking_date, '%d/%m')
                ORDER BY DATE(booking_date) ASC
            `, [startDate, endDate]);

            // 7. Tỷ lệ thanh toán
            const [paymentStats] = await db.query(`
                SELECT 
                    payment_method,
                    COUNT(*) as count,
                    SUM(total_amount) as total
                FROM bookings
                WHERE status = 'Completed'
                  AND DATE(booking_date) BETWEEN ? AND ?
                GROUP BY payment_method
            `, [startDate, endDate]);

            // 8. Thống kê phim theo danh mục (genre)
            const [genreStats] = await db.query(`
                SELECT 
                    g.name,
                    COUNT(m.movie_id) as movie_count
                FROM genres g
                LEFT JOIN movie_genres mg ON g.genre_id = mg.genre_id
                LEFT JOIN movies m ON mg.movie_id = m.movie_id
                GROUP BY g.genre_id, g.name
                ORDER BY movie_count DESC
                LIMIT 10
            `);

            return res.status(200).json({
                success: true,
                period: {
                    start: startDate,
                    end: endDate,
                    label: period
                },
                overview: {
                    total_movies: movieRes[0].total || 0,
                    total_users: userRes[0].total || 0,
                    total_tickets: ticketRes[0].total || 0,
                    total_revenue: currentRevenue,
                    revenue_growth: Math.round(revenueGrowth * 10) / 10,
                    new_users: newUsersRes[0].total || 0,
                    new_orders: newOrdersRes[0].total || 0
                },
                top_movies: topMovies.map(m => ({
                    id: m.movie_id,
                    title: m.title,
                    poster: m.poster_url,
                    tickets: m.total_tickets,
                    revenue: Number(m.revenue)
                })),
                daily_revenue: dailyRevenue.map(d => ({
                    date: d.label || d.date,
                    total: Number(d.daily_total)
                })),
                payment_stats: paymentStats.map(p => ({
                    method: p.payment_method || 'Unknown',
                    count: p.count,
                    total: Number(p.total)
                })),
                genre_stats: genreStats
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
     * Lấy dữ liệu biểu đồ với bộ lọc thời gian và loại biểu đồ
     * GET /admin/api/dashboard/chart
     * Query: type (daily, weekly, monthly), period (7, 30, 90, 180, 365)
     */
    static async getChartData(req, res) {
        try {
            const { type = 'daily', period = 30 } = req.query;
            const days = parseInt(period) || 30;
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            let groupBy = '';
            let dateFormat = '';

            switch (type) {
                case 'daily':
                    groupBy = 'DATE(booking_date)';
                    dateFormat = '%d/%m';
                    break;
                case 'weekly':
                    groupBy = 'YEARWEEK(booking_date, 1)';
                    dateFormat = '%d/%m';
                    break;
                case 'monthly':
                    groupBy = 'DATE_FORMAT(booking_date, "%Y-%m")';
                    dateFormat = '%m/%Y';
                    break;
                default:
                    groupBy = 'DATE(booking_date)';
                    dateFormat = '%d/%m';
            }

            // 1. Doanh thu theo thời gian
            const [revenueData] = await db.query(`
                SELECT 
                    ${groupBy} as time_group,
                    DATE_FORMAT(booking_date, ?) as label,
                    CAST(SUM(total_amount) AS UNSIGNED) as value
                FROM bookings
                WHERE status = 'Completed'
                  AND DATE(booking_date) BETWEEN ? AND ?
                GROUP BY time_group, DATE_FORMAT(booking_date, ?)
                ORDER BY time_group ASC
            `, [dateFormat, startDate, endDate, dateFormat]);

            // 2. Top 5 phim theo doanh thu (cho pie chart)
            const [topMovieRevenue] = await db.query(`
                SELECT 
                    m.title as name,
                    CAST(SUM(b.total_amount) AS UNSIGNED) as value
                FROM movies m
                JOIN showtimes s ON m.movie_id = s.movie_id
                JOIN bookings b ON s.showtime_id = b.showtime_id
                WHERE b.status = 'Completed'
                  AND DATE(b.booking_date) BETWEEN ? AND ?
                GROUP BY m.movie_id, m.title
                ORDER BY value DESC
                LIMIT 5
            `, [startDate, endDate]);

            // 3. Số lượng vé theo phim
            const [ticketData] = await db.query(`
                SELECT 
                    m.title as movieName,
                    COUNT(t.ticket_id) as ticketCount
                FROM tickets t
                JOIN bookings b ON t.booking_id = b.booking_id
                JOIN showtimes s ON t.showtime_id = s.showtime_id
                JOIN movies m ON s.movie_id = m.movie_id
                WHERE b.status = 'Completed'
                  AND DATE(b.booking_date) BETWEEN ? AND ?
                GROUP BY m.movie_id, m.title
                ORDER BY ticketCount DESC
                LIMIT 10
            `, [startDate, endDate]);

            // 4. Số lượng đơn hàng theo ngày (để so sánh)
            const [orderCountData] = await db.query(`
                SELECT 
                    DATE(booking_date) as date,
                    COUNT(*) as total_orders
                FROM bookings
                WHERE status = 'Completed'
                  AND DATE(booking_date) BETWEEN ? AND ?
                GROUP BY DATE(booking_date)
                ORDER BY DATE(booking_date) ASC
            `, [startDate, endDate]);

            return res.status(200).json({
                success: true,
                period: {
                    start: startDate,
                    end: endDate,
                    days: days,
                    type: type
                },
                revenue_data: revenueData.map(d => ({
                    label: d.label || d.time_group,
                    value: Number(d.value)
                })),
                movie_data: topMovieRevenue.map(m => ({
                    name: m.name,
                    value: Number(m.value)
                })),
                ticket_data: ticketData.map(t => ({
                    movieName: t.movieName,
                    ticketCount: t.ticketCount
                })),
                order_data: orderCountData.map(o => ({
                    date: o.date,
                    total_orders: o.total_orders
                }))
            });
        } catch (error) {
            console.error('❌ Lỗi getChartData:', error);
            return res.status(500).json({
                success: false,
                message: 'Không thể lấy dữ liệu biểu đồ.',
                error: error.message
            });
        }
    }

    /**
     * Lấy danh sách các phim doanh thu cao
     * GET /admin/api/dashboard/top-movies
     * Query: limit (default 10)
     */
    static async getTopMovies(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const [movies] = await db.query(`
                SELECT 
                    m.movie_id,
                    m.title,
                    m.poster_url,
                    m.release_date,
                    COUNT(t.ticket_id) as tickets_sold,
                    CAST(SUM(b.total_amount) AS UNSIGNED) as revenue,
                    COUNT(DISTINCT b.booking_id) as orders
                FROM movies m
                JOIN showtimes s ON m.movie_id = s.movie_id
                JOIN bookings b ON s.showtime_id = b.showtime_id
                JOIN tickets t ON b.booking_id = t.booking_id
                WHERE b.status = 'Completed'
                GROUP BY m.movie_id, m.title, m.poster_url, m.release_date
                ORDER BY revenue DESC
                LIMIT ?
            `, [limit]);

            return res.status(200).json({
                success: true,
                movies: movies.map(m => ({
                    id: m.movie_id,
                    title: m.title,
                    poster: m.poster_url,
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
     * Lấy thống kê người dùng mới theo thời gian
     * GET /admin/api/dashboard/user-growth
     * Query: days (default 30)
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
     * Hàm hỗ trợ: Lấy khoảng thời gian theo period
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