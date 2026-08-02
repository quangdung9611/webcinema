const db = require('../Config/db');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

class DashboardController {

    // =============================================================
    //  HELPER – Lấy khoảng thời gian
    // =============================================================
    static getDateRange(period = 'week', startDate, endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (period === 'custom') {
            const start = startDate ? new Date(startDate) : today;
            const end = endDate ? new Date(endDate) : today;
            if (start > end) [start, end] = [end, start];
            return {
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0]
            };
        }

        let start = new Date(today);
        switch (period) {
            case 'today': break;
            case 'week':  start.setDate(start.getDate() - 6); break;
            case 'month': start.setDate(start.getDate() - 29); break;
            case 'quarter': start.setDate(start.getDate() - 89); break;
            case 'year':  start.setFullYear(start.getFullYear() - 1); break;
            default:      start.setDate(start.getDate() - 6);
        }
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0]
        };
    }

    static buildDateCondition(table = 'b.booking_date', startDate, endDate) {
        return `${table} >= ? AND ${table} < DATE_ADD(?, INTERVAL 1 DAY)`;
    }

    // =============================================================
    //  1. THỐNG KÊ TỔNG QUAN (KPI)
    // =============================================================
    static async getStats(req, res) {
        try {
            const { period = 'week', startDate, endDate } = req.query;
            const range = this.getDateRange(period, startDate, endDate);
            const cacheKey = `stats_${range.startDate}_${range.endDate}`;
            const cached = cache.get(cacheKey);
            if (cached) return res.json({ success: true, ...cached });

            const sql = `
                WITH current_period AS (
                    SELECT
                        COUNT(DISTINCT b.booking_id) AS orders,
                        COUNT(DISTINCT CASE WHEN bd.seat_id IS NOT NULL THEN bd.booking_detail_id END) AS tickets,
                        COALESCE(SUM(CASE WHEN bd.seat_id IS NOT NULL THEN bd.quantity * bd.price END), 0) AS ticket_revenue,
                        COALESCE(SUM(CASE WHEN bd.product_id IS NOT NULL THEN bd.quantity * bd.price END), 0) AS product_revenue,
                        COALESCE(SUM(b.total_amount), 0) AS revenue
                    FROM bookings b
                    LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id
                    WHERE b.status = 'Completed'
                      AND ${this.buildDateCondition('b.booking_date', range.startDate, range.endDate)}
                ),
                previous_period AS (
                    SELECT
                        COUNT(DISTINCT b.booking_id) AS orders,
                        COUNT(DISTINCT CASE WHEN bd.seat_id IS NOT NULL THEN bd.booking_detail_id END) AS tickets,
                        COALESCE(SUM(b.total_amount), 0) AS revenue
                    FROM bookings b
                    LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id
                    WHERE b.status = 'Completed'
                      AND ${this.buildDateCondition('b.booking_date', 
                          this.getPreviousStart(range.startDate, range.endDate), 
                          this.getPreviousEnd(range.startDate, range.endDate)
                      )}
                ),
                total_movies AS (SELECT COUNT(*) AS total FROM movies),
                total_users AS (SELECT COUNT(*) AS total FROM users WHERE role = 'customer')
                SELECT
                    (SELECT total FROM total_movies) AS movies,
                    (SELECT total FROM total_users) AS users,
                    c.orders, c.tickets, c.revenue, c.ticket_revenue, c.product_revenue,
                    p.orders AS prev_orders, p.tickets AS prev_tickets, p.revenue AS prev_revenue
                FROM current_period c, previous_period p
            `;

            const [rows] = await db.query(sql);
            const data = rows[0] || {};

            const result = {
                movies: Number(data.movies) || 0,
                users: Number(data.users) || 0,
                tickets: Number(data.tickets) || 0,
                revenue: Number(data.revenue) || 0,
                orders: Number(data.orders) || 0,
                ticketRevenue: Number(data.ticket_revenue) || 0,
                productRevenue: Number(data.product_revenue) || 0,
                period: range,
                comparison: {
                    revenue: {
                        current: Number(data.revenue) || 0,
                        previous: Number(data.prev_revenue) || 0,
                        change: this.calcPercent(data.revenue, data.prev_revenue)
                    },
                    orders: {
                        current: Number(data.orders) || 0,
                        previous: Number(data.prev_orders) || 0,
                        change: this.calcPercent(data.orders, data.prev_orders)
                    },
                    tickets: {
                        current: Number(data.tickets) || 0,
                        previous: Number(data.prev_tickets) || 0,
                        change: this.calcPercent(data.tickets, data.prev_tickets)
                    }
                }
            };

            cache.set(cacheKey, result);
            return res.json({ success: true, ...result });
        } catch (error) {
            console.error('❌ getStats error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  2. XU HƯỚNG DOANH THU (LINE CHART)
    // =============================================================
    static async getRevenueTrend(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'week', req.query.startDate, req.query.endDate);
            const cacheKey = `trend_${range.startDate}_${range.endDate}`;
            const cached = cache.get(cacheKey);
            if (cached) return res.json({ success: true, data: cached, period: range });

            const sql = `
                SELECT
                    DATE(b.booking_date) AS date,
                    COUNT(DISTINCT b.booking_id) AS orders,
                    COALESCE(SUM(b.total_amount), 0) AS revenue,
                    COALESCE(SUM(CASE WHEN bd.seat_id IS NOT NULL THEN bd.quantity END), 0) AS tickets,
                    COALESCE(SUM(CASE WHEN bd.product_id IS NOT NULL THEN bd.quantity END), 0) AS products
                FROM bookings b
                LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id
                WHERE b.status = 'Completed'
                  AND ${this.buildDateCondition('b.booking_date', range.startDate, range.endDate)}
                GROUP BY DATE(b.booking_date)
                ORDER BY date ASC
            `;
            const [rows] = await db.query(sql);
            cache.set(cacheKey, rows);
            return res.json({ success: true, data: rows, period: range });
        } catch (error) {
            console.error('❌ getRevenueTrend error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  3. CHI TIẾT GIAO DỊCH (PHÂN TRANG NHANH)
    // =============================================================
    static async getTransactions(req, res) {
        try {
            const { startDate, endDate, page = 1, limit = 20, search = '', status = 'Completed' } = req.query;
            const range = this.getDateRange('custom', startDate, endDate);
            const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit) || 20);
            const limitVal = Math.min(100, parseInt(limit) || 20);
            const searchTerm = `%${search.trim()}%`;

            // Đếm tổng
            const countSql = `
                SELECT COUNT(*) AS total
                FROM bookings b
                LEFT JOIN users u ON u.user_id = b.user_id
                LEFT JOIN showtimes st ON st.showtime_id = b.showtime_id
                LEFT JOIN movies m ON m.movie_id = st.movie_id
                WHERE b.booking_date >= ? AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                  ${status !== 'all' ? 'AND b.status = ?' : ''}
                  AND (? = '' OR u.full_name LIKE ? OR u.email LIKE ? OR m.title LIKE ? OR b.memo LIKE ?)
            `;
            const countParams = [range.startDate, range.endDate];
            if (status !== 'all') countParams.push(status);
            countParams.push(search.trim(), searchTerm, searchTerm, searchTerm, searchTerm);
            const [countRows] = await db.query(countSql, countParams);
            const total = Number(countRows[0]?.total) || 0;

            // Lấy dữ liệu (chỉ lấy thông tin cần thiết)
            const sql = `
                SELECT
                    b.booking_id, b.booking_date, b.total_amount, b.status, b.memo,
                    COALESCE(u.full_name, 'Khách lẻ') AS customer_name,
                    u.email,
                    m.title AS movie_title,
                    c.cinema_name,
                    r.room_name,
                    st.start_time,
                    (SELECT COUNT(*) FROM booking_details bd WHERE bd.booking_id = b.booking_id AND bd.seat_id IS NOT NULL) AS ticket_count,
                    (SELECT COUNT(*) FROM booking_details bd WHERE bd.booking_id = b.booking_id AND bd.product_id IS NOT NULL) AS product_count
                FROM bookings b
                LEFT JOIN users u ON u.user_id = b.user_id
                LEFT JOIN showtimes st ON st.showtime_id = b.showtime_id
                LEFT JOIN movies m ON m.movie_id = st.movie_id
                LEFT JOIN cinemas c ON c.cinema_id = st.cinema_id
                LEFT JOIN rooms r ON r.room_id = st.room_id
                WHERE b.booking_date >= ? AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                  ${status !== 'all' ? 'AND b.status = ?' : ''}
                  AND (? = '' OR u.full_name LIKE ? OR u.email LIKE ? OR m.title LIKE ? OR b.memo LIKE ?)
                ORDER BY b.booking_date DESC
                LIMIT ? OFFSET ?
            `;
            const params = [range.startDate, range.endDate];
            if (status !== 'all') params.push(status);
            params.push(search.trim(), searchTerm, searchTerm, searchTerm, searchTerm, limitVal, offset);

            const [rows] = await db.query(sql, params);

            return res.json({
                success: true,
                data: rows.map(r => ({ ...r, total_amount: Number(r.total_amount) || 0 })),
                pagination: { page: parseInt(page), limit: limitVal, total, totalPages: Math.ceil(total / limitVal) },
                period: range
            });
        } catch (error) {
            console.error('❌ getTransactions error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  4. DOANH THU THEO PHIM (PIE CHART)
    // =============================================================
    static async getRevenueByMovie(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const cacheKey = `by_movie_${range.startDate}_${range.endDate}`;
            const cached = cache.get(cacheKey);
            if (cached) return res.json({ success: true, data: cached, period: range });

            const sql = `
                SELECT
                    m.movie_id,
                    m.title AS name,
                    m.movie_poster AS poster,
                    COUNT(bd.booking_detail_id) AS tickets,
                    COALESCE(SUM(bd.quantity * bd.price), 0) AS value
                FROM booking_details bd
                INNER JOIN bookings b ON b.booking_id = bd.booking_id AND b.status = 'Completed'
                INNER JOIN showtimes st ON st.showtime_id = b.showtime_id
                INNER JOIN movies m ON m.movie_id = st.movie_id
                WHERE bd.seat_id IS NOT NULL
                  AND ${this.buildDateCondition('b.booking_date', range.startDate, range.endDate)}
                GROUP BY m.movie_id, m.title, m.movie_poster
                ORDER BY value DESC
            `;
            const [rows] = await db.query(sql);
            const total = rows.reduce((s, r) => s + Number(r.value), 0);
            const data = rows.map(r => ({
                ...r,
                value: Number(r.value) || 0,
                percent: total > 0 ? parseFloat((Number(r.value) / total * 100).toFixed(1)) : 0
            }));
            cache.set(cacheKey, data);
            return res.json({ success: true, data, total, period: range });
        } catch (error) {
            console.error('❌ getRevenueByMovie error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  5. TOP PHIM
    // =============================================================
    static async getTopMovies(req, res) {
        try {
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const cacheKey = `top_movies_${range.startDate}_${range.endDate}_${limit}`;
            const cached = cache.get(cacheKey);
            if (cached) return res.json({ success: true, movies: cached, period: range });

            const sql = `
                SELECT
                    m.movie_id AS id,
                    m.title,
                    m.movie_poster AS poster,
                    m.release_date,
                    m.status,
                    COUNT(DISTINCT bd.booking_detail_id) AS tickets_sold,
                    COUNT(DISTINCT b.booking_id) AS orders,
                    COALESCE(SUM(bd.quantity * bd.price), 0) AS revenue
                FROM movies m
                INNER JOIN showtimes st ON st.movie_id = m.movie_id
                INNER JOIN bookings b ON b.showtime_id = st.showtime_id AND b.status = 'Completed'
                INNER JOIN booking_details bd ON bd.booking_id = b.booking_id AND bd.seat_id IS NOT NULL
                WHERE ${this.buildDateCondition('b.booking_date', range.startDate, range.endDate)}
                GROUP BY m.movie_id, m.title, m.movie_poster, m.release_date, m.status
                ORDER BY revenue DESC
                LIMIT ?
            `;
            const [rows] = await db.query(sql, [limit]);
            cache.set(cacheKey, rows);
            return res.json({ success: true, movies: rows, period: range });
        } catch (error) {
            console.error('❌ getTopMovies error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  6. TRẠNG THÁI BOOKING
    // =============================================================
    static async getBookingStatus(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const sql = `
                SELECT status, COUNT(*) AS orders, COALESCE(SUM(total_amount), 0) AS revenue
                FROM bookings
                WHERE ${this.buildDateCondition('booking_date', range.startDate, range.endDate)}
                GROUP BY status
                ORDER BY orders DESC
            `;
            const [rows] = await db.query(sql);
            return res.json({ success: true, data: rows, period: range });
        } catch (error) {
            console.error('❌ getBookingStatus error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  7. TĂNG TRƯỞNG USER
    // =============================================================
    static async getUserGrowth(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const sql = `
                SELECT DATE(created_at) AS date, COUNT(*) AS new_users
                FROM users
                WHERE role = 'customer'
                  AND ${this.buildDateCondition('created_at', range.startDate, range.endDate)}
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `;
            const [rows] = await db.query(sql);
            let cumulative = 0;
            const data = rows.map(r => {
                cumulative += Number(r.new_users);
                return { date: r.date, newUsers: Number(r.new_users), cumulative };
            });
            return res.json({ success: true, data, period: range });
        } catch (error) {
            console.error('❌ getUserGrowth error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  8. TOP KHÁCH HÀNG
    // =============================================================
    static async getTopCustomers(req, res) {
        try {
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const sql = `
                SELECT
                    u.user_id, u.full_name, u.email, u.user_avatar AS avatar, u.points,
                    COUNT(DISTINCT b.booking_id) AS orders,
                    COUNT(DISTINCT CASE WHEN bd.seat_id IS NOT NULL THEN bd.booking_detail_id END) AS tickets,
                    COALESCE(SUM(b.total_amount), 0) AS spending
                FROM users u
                INNER JOIN bookings b ON b.user_id = u.user_id AND b.status = 'Completed'
                LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id
                WHERE u.role = 'customer'
                  AND ${this.buildDateCondition('b.booking_date', range.startDate, range.endDate)}
                GROUP BY u.user_id, u.full_name, u.email, u.user_avatar, u.points
                ORDER BY spending DESC
                LIMIT ?
            `;
            const [rows] = await db.query(sql, [limit]);
            return res.json({ success: true, data: rows, period: range });
        } catch (error) {
            console.error('❌ getTopCustomers error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  9. SẢN PHẨM BÁN CHẠY
    // =============================================================
    static async getProductPerformance(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const sql = `
                SELECT
                    p.product_id, p.product_name, p.food_image AS image, p.category,
                    SUM(bd.quantity) AS quantity,
                    COALESCE(SUM(bd.quantity * bd.price), 0) AS revenue
                FROM booking_details bd
                INNER JOIN bookings b ON b.booking_id = bd.booking_id AND b.status = 'Completed'
                INNER JOIN product_menu p ON p.product_id = bd.product_id
                WHERE bd.product_id IS NOT NULL
                  AND ${this.buildDateCondition('b.booking_date', range.startDate, range.endDate)}
                GROUP BY p.product_id, p.product_name, p.food_image, p.category
                ORDER BY revenue DESC
            `;
            const [rows] = await db.query(sql);
            return res.json({ success: true, data: rows, period: range });
        } catch (error) {
            console.error('❌ getProductPerformance error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  10. DOANH THU THEO RẠP
    // =============================================================
    static async getCinemaPerformance(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const sql = `
                SELECT
                    c.cinema_id, c.cinema_name,
                    COUNT(DISTINCT b.booking_id) AS orders,
                    COUNT(DISTINCT bd.booking_detail_id) AS tickets,
                    COALESCE(SUM(b.total_amount), 0) AS revenue
                FROM cinemas c
                INNER JOIN showtimes st ON st.cinema_id = c.cinema_id
                INNER JOIN bookings b ON b.showtime_id = st.showtime_id AND b.status = 'Completed'
                LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id AND bd.seat_id IS NOT NULL
                WHERE ${this.buildDateCondition('b.booking_date', range.startDate, range.endDate)}
                GROUP BY c.cinema_id, c.cinema_name
                ORDER BY revenue DESC
            `;
            const [rows] = await db.query(sql);
            return res.json({ success: true, data: rows, period: range });
        } catch (error) {
            console.error('❌ getCinemaPerformance error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  11. HIỆU SUẤT PHÒNG CHIẾU
    // =============================================================
    static async getRoomPerformance(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const sql = `
                SELECT
                    r.room_id, r.room_name, r.room_type, c.cinema_name,
                    COUNT(DISTINCT st.showtime_id) AS showtimes,
                    COUNT(DISTINCT CASE WHEN b.status = 'Completed' AND bd.seat_id IS NOT NULL THEN bd.booking_detail_id END) AS tickets,
                    COUNT(DISTINCT st.showtime_id) * r.total_seats AS capacity,
                    COALESCE(SUM(CASE WHEN b.status = 'Completed' THEN b.total_amount ELSE 0 END), 0) AS revenue
                FROM rooms r
                INNER JOIN cinemas c ON c.cinema_id = r.cinema_id
                LEFT JOIN showtimes st ON st.room_id = r.room_id
                    AND st.start_time >= ? AND st.start_time < DATE_ADD(?, INTERVAL 1 DAY)
                LEFT JOIN bookings b ON b.showtime_id = st.showtime_id
                LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id AND bd.seat_id IS NOT NULL
                GROUP BY r.room_id, r.room_name, r.room_type, c.cinema_name, r.total_seats
                ORDER BY revenue DESC
            `;
            const [rows] = await db.query(sql, [range.startDate, range.endDate]);
            const data = rows.map(r => ({
                ...r,
                tickets: Number(r.tickets) || 0,
                capacity: Number(r.capacity) || 0,
                occupancy: r.capacity > 0 ? parseFloat((r.tickets / r.capacity * 100).toFixed(1)) : 0,
                revenue: Number(r.revenue) || 0
            }));
            return res.json({ success: true, data, period: range });
        } catch (error) {
            console.error('❌ getRoomPerformance error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  12. HIỆU SUẤT SUẤT CHIẾU
    // =============================================================
    static async getShowtimePerformance(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'today', req.query.startDate, req.query.endDate);
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
            const sql = `
                SELECT
                    st.showtime_id, st.start_time, m.title AS movie_title,
                    c.cinema_name, r.room_name, r.total_seats,
                    COUNT(DISTINCT CASE WHEN b.status = 'Completed' AND bd.seat_id IS NOT NULL THEN bd.booking_detail_id END) AS tickets,
                    COALESCE(SUM(CASE WHEN b.status = 'Completed' THEN b.total_amount ELSE 0 END), 0) AS revenue
                FROM showtimes st
                INNER JOIN movies m ON m.movie_id = st.movie_id
                INNER JOIN cinemas c ON c.cinema_id = st.cinema_id
                INNER JOIN rooms r ON r.room_id = st.room_id
                LEFT JOIN bookings b ON b.showtime_id = st.showtime_id
                LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id AND bd.seat_id IS NOT NULL
                WHERE st.start_time >= ? AND st.start_time < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY st.showtime_id, st.start_time, m.title, c.cinema_name, r.room_name, r.total_seats
                ORDER BY tickets DESC
                LIMIT ?
            `;
            const [rows] = await db.query(sql, [range.startDate, range.endDate, limit]);
            const data = rows.map(r => ({
                ...r,
                tickets: Number(r.tickets) || 0,
                total_seats: Number(r.total_seats) || 0,
                occupancy: r.total_seats > 0 ? parseFloat((r.tickets / r.total_seats * 100).toFixed(1)) : 0,
                revenue: Number(r.revenue) || 0
            }));
            return res.json({ success: true, data, period: range });
        } catch (error) {
            console.error('❌ getShowtimePerformance error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  13. COUPON
    // =============================================================
    static async getCouponPerformance(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const sql = `
                SELECT
                    c.coupon_id, c.coupon_code, c.discount_value, c.expiry_date,
                    COUNT(b.booking_id) AS used_count,
                    COALESCE(SUM(b.total_amount), 0) AS revenue
                FROM coupons c
                LEFT JOIN bookings b ON b.coupon_id = c.coupon_id AND b.status = 'Completed'
                    AND ${this.buildDateCondition('b.booking_date', range.startDate, range.endDate)}
                GROUP BY c.coupon_id, c.coupon_code, c.discount_value, c.expiry_date
                ORDER BY used_count DESC
            `;
            const [rows] = await db.query(sql);
            return res.json({ success: true, data: rows, period: range });
        } catch (error) {
            console.error('❌ getCouponPerformance error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  14. NỘI DUNG WEBSITE
    // =============================================================
    static async getContentStats(req, res) {
        try {
            const [movies] = await db.query(
                `SELECT COUNT(*) AS total, SUM(status = 'Đang chiếu') AS showing, SUM(status = 'Sắp chiếu') AS upcoming FROM movies`
            );
            const [actors] = await db.query(`SELECT COUNT(*) AS total FROM actors`);
            const [genres] = await db.query(`SELECT COUNT(*) AS total FROM genres`);
            const [cinemas] = await db.query(`SELECT COUNT(*) AS total FROM cinemas`);
            const [rooms] = await db.query(`SELECT COUNT(*) AS total FROM rooms`);
            const [showtimes] = await db.query(`SELECT COUNT(*) AS total FROM showtimes WHERE start_time >= NOW()`);
            const [products] = await db.query(`SELECT COUNT(*) AS total, SUM(status = 1) AS active FROM product_menu`);
            const [blogs] = await db.query(`SELECT COUNT(*) AS total, SUM(is_active = 1) AS active FROM blog_cinema`);
            const [news] = await db.query(`SELECT COUNT(*) AS total FROM news`);
            const [promotions] = await db.query(`SELECT COUNT(*) AS total, SUM(is_active = 1) AS active FROM promotions`);
            const [banners] = await db.query(`SELECT COUNT(*) AS total, SUM(is_active = 1) AS active FROM banners`);
            const [reviews] = await db.query(`SELECT COUNT(*) AS total, COALESCE(AVG(rating_score), 0) AS average_rating FROM reviews`);

            return res.json({
                success: true,
                movies: movies[0],
                actors: Number(actors[0]?.total) || 0,
                genres: Number(genres[0]?.total) || 0,
                cinemas: Number(cinemas[0]?.total) || 0,
                rooms: Number(rooms[0]?.total) || 0,
                upcomingShowtimes: Number(showtimes[0]?.total) || 0,
                products: products[0],
                blogs: blogs[0],
                news: Number(news[0]?.total) || 0,
                promotions: promotions[0],
                banners: banners[0],
                reviews: {
                    total: Number(reviews[0]?.total) || 0,
                    averageRating: Number(reviews[0]?.average_rating) || 0
                }
            });
        } catch (error) {
            console.error('❌ getContentStats error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  15. USER STATUS
    // =============================================================
    static async getUserStatus(req, res) {
        try {
            const [rows] = await db.query(`
                SELECT status, COUNT(*) AS total
                FROM users
                WHERE role = 'customer'
                GROUP BY status
                ORDER BY total DESC
            `);
            return res.json({ success: true, data: rows });
        } catch (error) {
            console.error('❌ getUserStatus error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  16. OTP STATS
    // =============================================================
    static async getOtpStats(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const sql = `
                SELECT purpose, status, COUNT(*) AS total
                FROM otp_logs
                WHERE ${this.buildDateCondition('created_at', range.startDate, range.endDate)}
                GROUP BY purpose, status
                ORDER BY purpose, total DESC
            `;
            const [rows] = await db.query(sql);
            return res.json({ success: true, data: rows, period: range });
        } catch (error) {
            console.error('❌ getOtpStats error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  17. REVIEW STATS
    // =============================================================
    static async getReviewStats(req, res) {
        try {
            const [rows] = await db.query(`
                SELECT m.movie_id, m.title,
                       COUNT(r.review_id) AS review_count,
                       COALESCE(AVG(r.rating_score), 0) AS average_rating
                FROM movies m
                LEFT JOIN reviews r ON r.movie_id = m.movie_id
                GROUP BY m.movie_id, m.title
                ORDER BY average_rating DESC
            `);
            return res.json({ success: true, data: rows });
        } catch (error) {
            console.error('❌ getReviewStats error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  18. GHẾ / CÔNG SUẤT TOÀN HỆ THỐNG
    // =============================================================
    static async getSeatPerformance(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const sql = `
                SELECT
                    COUNT(DISTINCT st.showtime_id) AS showtimes,
                    COALESCE(SUM(r.total_seats), 0) AS capacity,
                    COUNT(DISTINCT CASE WHEN b.status = 'Completed' AND bd.seat_id IS NOT NULL THEN bd.booking_detail_id END) AS sold_tickets
                FROM showtimes st
                INNER JOIN rooms r ON r.room_id = st.room_id
                LEFT JOIN bookings b ON b.showtime_id = st.showtime_id
                LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id AND bd.seat_id IS NOT NULL
                WHERE st.start_time >= ? AND st.start_time < DATE_ADD(?, INTERVAL 1 DAY)
            `;
            const [rows] = await db.query(sql, [range.startDate, range.endDate]);
            const row = rows[0] || {};
            const capacity = Number(row.capacity) || 0;
            const sold = Number(row.sold_tickets) || 0;
            return res.json({
                success: true,
                data: {
                    showtimes: Number(row.showtimes) || 0,
                    capacity,
                    soldTickets: sold,
                    emptySeats: Math.max(capacity - sold, 0),
                    occupancy: capacity > 0 ? parseFloat((sold / capacity * 100).toFixed(1)) : 0
                },
                period: range
            });
        } catch (error) {
            console.error('❌ getSeatPerformance error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =============================================================
    //  HELPER TÍNH % THAY ĐỔI
    // =============================================================
    static calcPercent(current, previous) {
        const cur = Number(current) || 0;
        const prev = Number(previous) || 0;
        if (prev === 0) return cur === 0 ? 0 : 100;
        return parseFloat(((cur - prev) / prev * 100).toFixed(1));
    }

    static getPreviousStart(start, end) {
        const s = new Date(start);
        const e = new Date(end);
        const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
        const prevEnd = new Date(s);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - diff + 1);
        return prevStart.toISOString().split('T')[0];
    }

    static getPreviousEnd(start, end) {
        const s = new Date(start);
        const prevEnd = new Date(s);
        prevEnd.setDate(prevEnd.getDate() - 1);
        return prevEnd.toISOString().split('T')[0];
    }
}

module.exports = DashboardController;