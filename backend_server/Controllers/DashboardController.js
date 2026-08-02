const db = require('../Config/db');

class DashboardController {

    /* ============================================================
        HELPER
    ============================================================ */

    static normalizeDate(value, fallback) {
        if (!value) return fallback;
        const date = new Date(`${value}T00:00:00`);
        if (Number.isNaN(date.getTime())) return fallback;
        return date.toISOString().split('T')[0];
    }

    static getDateRange(period = 'week', startDate, endDate) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (period === 'custom') {
            let start = this.normalizeDate(startDate, today.toISOString().split('T')[0]);
            let end = this.normalizeDate(endDate, today.toISOString().split('T')[0]);
            if (start > end) [start, end] = [end, start];
            return { startDate: start, endDate: end };
        }

        let start = new Date(today);
        let end = new Date(today);

        switch (period) {
            case 'today': break;
            case 'week': start.setDate(start.getDate() - 6); break;
            case 'month': start.setDate(start.getDate() - 29); break;
            case 'quarter': start.setDate(start.getDate() - 89); break;
            case 'year': start.setFullYear(start.getFullYear() - 1); break;
            default: start.setDate(start.getDate() - 6);
        }

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        };
    }

    static getPreviousDateRange(startDate, endDate) {
        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T00:00:00`);
        const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const previousEnd = new Date(start);
        previousEnd.setDate(previousEnd.getDate() - 1);
        const previousStart = new Date(previousEnd);
        previousStart.setDate(previousStart.getDate() - diff + 1);
        return {
            startDate: previousStart.toISOString().split('T')[0],
            endDate: previousEnd.toISOString().split('T')[0]
        };
    }

    static getFilters(req) {
        const { movieId, cinemaId, roomId } = req.query;
        const conditions = [];
        const params = [];
        if (movieId) { conditions.push('st.movie_id = ?'); params.push(Number(movieId)); }
        if (cinemaId) { conditions.push('st.cinema_id = ?'); params.push(Number(cinemaId)); }
        if (roomId) { conditions.push('st.room_id = ?'); params.push(Number(roomId)); }
        return { conditions, params };
    }

    static percentChange(current, previous) {
        current = Number(current) || 0;
        previous = Number(previous) || 0;
        if (previous === 0) return current === 0 ? 0 : 100;
        return Number(((current - previous) / previous * 100).toFixed(1));
    }

    static money(value) {
        return Number(value) || 0;
    }


    /* ============================================================
        1. DASHBOARD OVERVIEW – KPI + SO SÁNH KỲ TRƯỚC
    ============================================================ */
    static async getStats(req, res) {
        try {
            const { period = 'week', startDate, endDate } = req.query;
            const range = this.getDateRange(period, startDate, endDate);
            const previous = this.getPreviousDateRange(range.startDate, range.endDate);

            const [movieTotalRes, userTotalRes, currentRes, previousRes] = await Promise.all([
                db.query(`SELECT COUNT(*) AS total FROM movies`),
                db.query(`SELECT COUNT(*) AS total FROM users WHERE role = 'customer'`),
                db.query(`
                    SELECT
                        COUNT(DISTINCT b.booking_id) AS orders,
                        COUNT(DISTINCT CASE WHEN bd.seat_id IS NOT NULL THEN bd.booking_detail_id END) AS tickets,
                        COALESCE(SUM(CASE WHEN bd.seat_id IS NOT NULL THEN bd.quantity * bd.price END), 0) AS ticket_revenue,
                        COALESCE(SUM(CASE WHEN bd.product_id IS NOT NULL THEN bd.quantity * bd.price END), 0) AS product_revenue,
                        COALESCE(SUM(b.total_amount), 0) AS revenue
                    FROM bookings b
                    LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id
                    WHERE b.status = 'Completed'
                      AND b.booking_date >= ? AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                `, [range.startDate, range.endDate]),
                db.query(`
                    SELECT
                        COUNT(DISTINCT b.booking_id) AS orders,
                        COUNT(DISTINCT CASE WHEN bd.seat_id IS NOT NULL THEN bd.booking_detail_id END) AS tickets,
                        COALESCE(SUM(b.total_amount), 0) AS revenue
                    FROM bookings b
                    LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id
                    WHERE b.status = 'Completed'
                      AND b.booking_date >= ? AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                `, [previous.startDate, previous.endDate])
            ]);

            const movieTotal = Number(movieTotalRes[0][0]?.total) || 0;
            const userTotal = Number(userTotalRes[0][0]?.total) || 0;
            const current = currentRes[0][0] || {};
            const old = previousRes[0][0] || {};

            const revenue = Number(current.revenue) || 0;
            const previousRevenue = Number(old.revenue) || 0;
            const orders = Number(current.orders) || 0;
            const previousOrders = Number(old.orders) || 0;
            const tickets = Number(current.tickets) || 0;
            const previousTickets = Number(old.tickets) || 0;

            return res.status(200).json({
                success: true,
                movies: movieTotal,
                users: userTotal,
                tickets,
                revenue,
                orders,
                ticketRevenue: Number(current.ticket_revenue) || 0,
                productRevenue: Number(current.product_revenue) || 0,
                period: range,
                comparison: {
                    revenue: {
                        current: revenue,
                        previous: previousRevenue,
                        diff: revenue - previousRevenue,
                        change: this.percentChange(revenue, previousRevenue)
                    },
                    orders: {
                        current: orders,
                        previous: previousOrders,
                        diff: orders - previousOrders,
                        change: this.percentChange(orders, previousOrders)
                    },
                    tickets: {
                        current: tickets,
                        previous: previousTickets,
                        diff: tickets - previousTickets,
                        change: this.percentChange(tickets, previousTickets)
                    }
                }
            });
        } catch (error) {
            console.error('❌ getStats error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        2. SO SÁNH DOANH THU THEO CÁC MỐC THỜI GIAN
        (CHO BIỂU ĐỒ CỘT SO SÁNH)
    ============================================================ */
    static async getPeriodComparison(req, res) {
        try {
            const periods = ['today', 'week', 'month', 'quarter', 'year'];
            const labels = {
                today: 'Hôm nay',
                week: '7 ngày',
                month: '30 ngày',
                quarter: '90 ngày',
                year: '1 năm'
            };
            const result = [];

            for (const period of periods) {
                const range = this.getDateRange(period);
                const previous = this.getPreviousDateRange(range.startDate, range.endDate);

                const [currentRows] = await db.query(`
                    SELECT COALESCE(SUM(total_amount), 0) AS revenue
                    FROM bookings
                    WHERE status = 'Completed'
                      AND booking_date >= ? AND booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                `, [range.startDate, range.endDate]);

                const [previousRows] = await db.query(`
                    SELECT COALESCE(SUM(total_amount), 0) AS revenue
                    FROM bookings
                    WHERE status = 'Completed'
                      AND booking_date >= ? AND booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                `, [previous.startDate, previous.endDate]);

                const currentRevenue = Number(currentRows[0]?.revenue) || 0;
                const previousRevenue = Number(previousRows[0]?.revenue) || 0;
                const diff = currentRevenue - previousRevenue;
                const change = this.percentChange(currentRevenue, previousRevenue);

                result.push({
                    period,
                    label: labels[period],
                    currentRevenue,
                    previousRevenue,
                    diff,
                    change,
                    range,
                    previousRange: previous
                });
            }

            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('❌ getPeriodComparison error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        3. XU HƯỚNG DOANH THU THEO NGÀY (LINE CHART)
        TRẢ VỀ ĐẦY ĐỦ NGÀY, KỂ CẢ NGÀY KHÔNG CÓ DỮ LIỆU
    ============================================================ */
    static async getRevenueTrend(req, res) {
        try {
            const range = this.getDateRange(
                req.query.period || 'week',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`
                SELECT
                    DATE(b.booking_date) AS date,
                    COUNT(DISTINCT b.booking_id) AS orders,
                    COALESCE(SUM(b.total_amount), 0) AS revenue,
                    COALESCE(SUM(CASE WHEN bd.seat_id IS NOT NULL THEN bd.quantity END), 0) AS tickets,
                    COALESCE(SUM(CASE WHEN bd.product_id IS NOT NULL THEN bd.quantity END), 0) AS products
                FROM bookings b
                LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id
                WHERE b.status = 'Completed'
                  AND b.booking_date >= ? AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY DATE(b.booking_date)
                ORDER BY date ASC
            `, [range.startDate, range.endDate]);

            // Tạo map dữ liệu từ database
            const dataMap = {};
            rows.forEach(row => {
                dataMap[row.date] = {
                    date: row.date,
                    orders: Number(row.orders) || 0,
                    revenue: Number(row.revenue) || 0,
                    tickets: Number(row.tickets) || 0,
                    products: Number(row.products) || 0,
                };
            });

            // Tạo mảng đầy đủ các ngày trong khoảng
            const start = new Date(range.startDate);
            const end = new Date(range.endDate);
            const fullData = [];
            const current = new Date(start);
            while (current <= end) {
                const dateStr = current.toISOString().split('T')[0];
                fullData.push({
                    date: dateStr,
                    ...(dataMap[dateStr] || { orders: 0, revenue: 0, tickets: 0, products: 0 })
                });
                current.setDate(current.getDate() + 1);
            }

            return res.status(200).json({
                success: true,
                data: fullData,
                period: range
            });
        } catch (error) {
            console.error('❌ getRevenueTrend error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        4. CHI TIẾT GIAO DỊCH
    ============================================================ */
    static async getTransactions(req, res) {
        try {
            const { startDate, endDate, page = 1, limit = 20, search = '', status = 'Completed' } = req.query;
            const range = this.getDateRange('custom', startDate, endDate);
            const pageNumber = Math.max(parseInt(page) || 1, 1);
            const limitNumber = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
            const offset = (pageNumber - 1) * limitNumber;
            const searchValue = `%${String(search).trim()}%`;
            const statusCondition = status === 'all' ? '' : 'AND b.status = ?';
            const statusParams = status === 'all' ? [] : [status];

            const [rows] = await db.query(`
                SELECT
                    b.booking_id,
                    b.booking_date,
                    b.total_amount,
                    b.status,
                    b.memo,
                    COALESCE(u.full_name, 'Khách lẻ') AS customer_name,
                    u.email,
                    m.movie_id,
                    m.title AS movie_title,
                    c.cinema_id,
                    c.cinema_name,
                    r.room_id,
                    r.room_name,
                    st.start_time,
                    COUNT(DISTINCT CASE WHEN bd.seat_id IS NOT NULL THEN bd.booking_detail_id END) AS ticket_count,
                    COUNT(DISTINCT CASE WHEN bd.product_id IS NOT NULL THEN bd.booking_detail_id END) AS product_count
                FROM bookings b
                LEFT JOIN users u ON u.user_id = b.user_id
                LEFT JOIN showtimes st ON st.showtime_id = b.showtime_id
                LEFT JOIN movies m ON m.movie_id = st.movie_id
                LEFT JOIN cinemas c ON c.cinema_id = st.cinema_id
                LEFT JOIN rooms r ON r.room_id = st.room_id
                LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id
                WHERE b.booking_date >= ? AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                ${statusCondition}
                AND ( ? = '' OR u.full_name LIKE ? OR u.email LIKE ? OR m.title LIKE ? OR b.memo LIKE ? )
                GROUP BY b.booking_id, b.booking_date, b.total_amount, b.status, b.memo,
                         u.full_name, u.email, m.movie_id, m.title, c.cinema_id, c.cinema_name,
                         r.room_id, r.room_name, st.start_time
                ORDER BY b.booking_date DESC
                LIMIT ? OFFSET ?
            `, [range.startDate, range.endDate, ...statusParams, search.trim(), searchValue, searchValue, searchValue, searchValue, limitNumber, offset]);

            const [countRows] = await db.query(`
                SELECT COUNT(*) AS total
                FROM bookings b
                LEFT JOIN users u ON u.user_id = b.user_id
                LEFT JOIN showtimes st ON st.showtime_id = b.showtime_id
                LEFT JOIN movies m ON m.movie_id = st.movie_id
                WHERE b.booking_date >= ? AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                ${statusCondition}
                AND ( ? = '' OR u.full_name LIKE ? OR u.email LIKE ? OR m.title LIKE ? OR b.memo LIKE ? )
            `, [range.startDate, range.endDate, ...statusParams, search.trim(), searchValue, searchValue, searchValue, searchValue]);

            const total = Number(countRows[0]?.total) || 0;

            return res.status(200).json({
                success: true,
                data: rows.map(row => ({
                    booking_id: row.booking_id,
                    booking_date: row.booking_date,
                    customer_name: row.customer_name,
                    email: row.email,
                    movie_id: row.movie_id,
                    movie_title: row.movie_title || '--',
                    cinema_id: row.cinema_id,
                    cinema_name: row.cinema_name || '--',
                    room_id: row.room_id,
                    room_name: row.room_name || '--',
                    start_time: row.start_time,
                    total_amount: Number(row.total_amount) || 0,
                    status: row.status,
                    memo: row.memo,
                    ticket_count: Number(row.ticket_count) || 0,
                    product_count: Number(row.product_count) || 0
                })),
                pagination: {
                    page: pageNumber,
                    limit: limitNumber,
                    total,
                    totalPages: Math.max(Math.ceil(total / limitNumber), 1)
                },
                period: range
            });
        } catch (error) {
            console.error('❌ getTransactions error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        5. DOANH THU THEO PHIM (PIE CHART)
    ============================================================ */
    static async getRevenueByMovie(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const [rows] = await db.query(`
                SELECT
                    m.movie_id,
                    m.title AS name,
                    m.movie_poster AS poster,
                    COUNT(DISTINCT bd.booking_detail_id) AS tickets,
                    COALESCE(SUM(bd.quantity * bd.price), 0) AS value
                FROM booking_details bd
                INNER JOIN bookings b ON b.booking_id = bd.booking_id AND b.status = 'Completed'
                INNER JOIN showtimes st ON st.showtime_id = b.showtime_id
                INNER JOIN movies m ON m.movie_id = st.movie_id
                WHERE bd.seat_id IS NOT NULL
                  AND b.booking_date >= ? AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY m.movie_id, m.title, m.movie_poster
                ORDER BY value DESC
            `, [range.startDate, range.endDate]);

            const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);
            const data = rows.map(row => {
                const value = Number(row.value) || 0;
                return {
                    ...row,
                    tickets: Number(row.tickets) || 0,
                    value,
                    percent: total > 0 ? parseFloat((value / total * 100).toFixed(1)) : 0
                };
            });

            return res.status(200).json({ success: true, data, total, period: range });
        } catch (error) {
            console.error('❌ getRevenueByMovie error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        6. VÉ BÁN THEO PHIM
    ============================================================ */
    static async getTicketsByMovie(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const [rows] = await db.query(`
                SELECT
                    m.movie_id,
                    m.title AS movieName,
                    COUNT(DISTINCT bd.booking_detail_id) AS ticketCount,
                    COALESCE(SUM(bd.quantity * bd.price), 0) AS totalRevenue
                FROM booking_details bd
                INNER JOIN bookings b ON b.booking_id = bd.booking_id AND b.status = 'Completed'
                INNER JOIN showtimes st ON st.showtime_id = b.showtime_id
                INNER JOIN movies m ON m.movie_id = st.movie_id
                WHERE bd.seat_id IS NOT NULL
                  AND b.booking_date >= ? AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY m.movie_id, m.title
                ORDER BY ticketCount DESC
            `, [range.startDate, range.endDate]);

            return res.status(200).json({
                success: true,
                data: rows.map(row => ({
                    movie_id: row.movie_id,
                    movieName: row.movieName,
                    ticketCount: Number(row.ticketCount) || 0,
                    totalRevenue: Number(row.totalRevenue) || 0
                })),
                period: range
            });
        } catch (error) {
            console.error('❌ getTicketsByMovie error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        7. TOP PHIM
    ============================================================ */
    static async getTopMovies(req, res) {
        try {
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const [rows] = await db.query(`
                SELECT
                    m.movie_id,
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
                WHERE b.booking_date >= ? AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY m.movie_id, m.title, m.movie_poster, m.release_date, m.status
                ORDER BY revenue DESC
                LIMIT ?
            `, [range.startDate, range.endDate, limit]);

            return res.status(200).json({
                success: true,
                movies: rows.map(row => ({
                    id: row.movie_id,
                    title: row.title,
                    poster: row.poster,
                    release_date: row.release_date,
                    status: row.status,
                    tickets_sold: Number(row.tickets_sold) || 0,
                    revenue: Number(row.revenue) || 0,
                    orders: Number(row.orders) || 0
                })),
                period: range
            });
        } catch (error) {
            console.error('❌ getTopMovies error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        8. BOOKING THEO TRẠNG THÁI
    ============================================================ */
    static async getBookingStatus(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const [rows] = await db.query(`
                SELECT status, COUNT(*) AS orders, COALESCE(SUM(total_amount), 0) AS revenue
                FROM bookings
                WHERE booking_date >= ? AND booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY status
                ORDER BY orders DESC
            `, [range.startDate, range.endDate]);

            return res.status(200).json({
                success: true,
                data: rows.map(row => ({
                    status: row.status,
                    orders: Number(row.orders) || 0,
                    revenue: Number(row.revenue) || 0
                })),
                period: range
            });
        } catch (error) {
            console.error('❌ getBookingStatus error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        9. USER GROWTH
    ============================================================ */
    static async getUserGrowth(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const [rows] = await db.query(`
                SELECT DATE(created_at) AS date, COUNT(*) AS new_users
                FROM users
                WHERE role = 'customer'
                  AND created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `, [range.startDate, range.endDate]);

            let cumulative = 0;
            const data = rows.map(row => {
                const newUsers = Number(row.new_users) || 0;
                cumulative += newUsers;
                return { date: row.date, newUsers, cumulative };
            });

            return res.status(200).json({ success: true, data, period: range });
        } catch (error) {
            console.error('❌ getUserGrowth error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        10. TOP KHÁCH HÀNG
    ============================================================ */
    static async getTopCustomers(req, res) {
        try {
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const [rows] = await db.query(`
                SELECT
                    u.user_id,
                    u.full_name,
                    u.email,
                    u.user_avatar,
                    u.points,
                    COUNT(DISTINCT b.booking_id) AS orders,
                    COUNT(DISTINCT CASE WHEN bd.seat_id IS NOT NULL THEN bd.booking_detail_id END) AS tickets,
                    COALESCE(SUM(b.total_amount), 0) AS spending
                FROM users u
                INNER JOIN bookings b ON b.user_id = u.user_id AND b.status = 'Completed'
                LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id
                WHERE u.role = 'customer'
                  AND b.booking_date >= ? AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY u.user_id, u.full_name, u.email, u.user_avatar, u.points
                ORDER BY spending DESC
                LIMIT ?
            `, [range.startDate, range.endDate, limit]);

            return res.status(200).json({
                success: true,
                data: rows.map(row => ({
                    user_id: row.user_id,
                    full_name: row.full_name,
                    email: row.email,
                    avatar: row.user_avatar,
                    points: Number(row.points) || 0,
                    orders: Number(row.orders) || 0,
                    tickets: Number(row.tickets) || 0,
                    spending: Number(row.spending) || 0
                })),
                period: range
            });
        } catch (error) {
            console.error('❌ getTopCustomers error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        11. SẢN PHẨM BÁN CHẠY
    ============================================================ */
    static async getProductPerformance(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const [rows] = await db.query(`
                SELECT
                    p.product_id,
                    p.product_name,
                    p.food_image,
                    p.category,
                    SUM(bd.quantity) AS quantity,
                    COALESCE(SUM(bd.quantity * bd.price), 0) AS revenue
                FROM booking_details bd
                INNER JOIN bookings b ON b.booking_id = bd.booking_id AND b.status = 'Completed'
                INNER JOIN product_menu p ON p.product_id = bd.product_id
                WHERE bd.product_id IS NOT NULL
                  AND b.booking_date >= ? AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY p.product_id, p.product_name, p.food_image, p.category
                ORDER BY revenue DESC
            `, [range.startDate, range.endDate]);

            return res.status(200).json({
                success: true,
                data: rows.map(row => ({
                    product_id: row.product_id,
                    product_name: row.product_name,
                    image: row.food_image,
                    category: row.category,
                    quantity: Number(row.quantity) || 0,
                    revenue: Number(row.revenue) || 0
                })),
                period: range
            });
        } catch (error) {
            console.error('❌ getProductPerformance error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        12. DOANH THU THEO RẠP
    ============================================================ */
    static async getCinemaPerformance(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const [rows] = await db.query(`
                SELECT
                    c.cinema_id,
                    c.cinema_name,
                    COUNT(DISTINCT b.booking_id) AS orders,
                    COUNT(DISTINCT bd.booking_detail_id) AS tickets,
                    COALESCE(SUM(b.total_amount), 0) AS revenue
                FROM cinemas c
                INNER JOIN showtimes st ON st.cinema_id = c.cinema_id
                INNER JOIN bookings b ON b.showtime_id = st.showtime_id AND b.status = 'Completed'
                LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id AND bd.seat_id IS NOT NULL
                WHERE b.booking_date >= ? AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY c.cinema_id, c.cinema_name
                ORDER BY revenue DESC
            `, [range.startDate, range.endDate]);

            return res.status(200).json({
                success: true,
                data: rows.map(row => ({
                    cinema_id: row.cinema_id,
                    cinema_name: row.cinema_name,
                    orders: Number(row.orders) || 0,
                    tickets: Number(row.tickets) || 0,
                    revenue: Number(row.revenue) || 0
                })),
                period: range
            });
        } catch (error) {
            console.error('❌ getCinemaPerformance error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        13. HIỆU SUẤT PHÒNG CHIẾU
    ============================================================ */
    static async getRoomPerformance(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const [rows] = await db.query(`
                SELECT
                    r.room_id,
                    r.room_name,
                    r.room_type,
                    c.cinema_name,
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
            `, [range.startDate, range.endDate]);

            return res.status(200).json({
                success: true,
                data: rows.map(row => {
                    const tickets = Number(row.tickets) || 0;
                    const capacity = Number(row.capacity) || 0;
                    return {
                        ...row,
                        showtimes: Number(row.showtimes) || 0,
                        tickets,
                        capacity,
                        occupancy: capacity > 0 ? parseFloat((tickets / capacity * 100).toFixed(1)) : 0,
                        revenue: Number(row.revenue) || 0
                    };
                }),
                period: range
            });
        } catch (error) {
            console.error('❌ getRoomPerformance error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        14. HIỆU SUẤT SUẤT CHIẾU
    ============================================================ */
    static async getShowtimePerformance(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'today', req.query.startDate, req.query.endDate);
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
            const [rows] = await db.query(`
                SELECT
                    st.showtime_id,
                    st.start_time,
                    m.title AS movie_title,
                    c.cinema_name,
                    r.room_name,
                    r.total_seats,
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
            `, [range.startDate, range.endDate, limit]);

            return res.status(200).json({
                success: true,
                data: rows.map(row => {
                    const tickets = Number(row.tickets) || 0;
                    const seats = Number(row.total_seats) || 0;
                    return {
                        ...row,
                        tickets,
                        total_seats: seats,
                        empty_seats: Math.max(seats - tickets, 0),
                        occupancy: seats > 0 ? parseFloat((tickets / seats * 100).toFixed(1)) : 0,
                        revenue: Number(row.revenue) || 0
                    };
                }),
                period: range
            });
        } catch (error) {
            console.error('❌ getShowtimePerformance error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        15. COUPON PERFORMANCE
    ============================================================ */
    static async getCouponPerformance(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const [rows] = await db.query(`
                SELECT
                    c.coupon_id,
                    c.coupon_code,
                    c.discount_value,
                    c.expiry_date,
                    COUNT(b.booking_id) AS used_count,
                    COALESCE(SUM(b.total_amount), 0) AS revenue
                FROM coupons c
                LEFT JOIN bookings b ON b.coupon_id = c.coupon_id AND b.status = 'Completed'
                    AND b.booking_date >= ? AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY c.coupon_id, c.coupon_code, c.discount_value, c.expiry_date
                ORDER BY used_count DESC
            `, [range.startDate, range.endDate]);

            return res.status(200).json({
                success: true,
                data: rows.map(row => ({
                    coupon_id: row.coupon_id,
                    coupon_code: row.coupon_code,
                    discount_value: Number(row.discount_value) || 0,
                    expiry_date: row.expiry_date,
                    used_count: Number(row.used_count) || 0,
                    revenue: Number(row.revenue) || 0
                })),
                period: range
            });
        } catch (error) {
            console.error('❌ getCouponPerformance error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        16. NỘI DUNG WEBSITE
    ============================================================ */
    static async getContentStats(req, res) {
        try {
            const [
                movies, actors, genres, cinemas, rooms, showtimes,
                products, blogs, news, promotions, banners, reviews
            ] = await Promise.all([
                db.query(`
                    SELECT
                        COUNT(*) AS total,
                        SUM(status = 'Đang chiếu') AS showing,
                        SUM(status = 'Sắp chiếu') AS upcoming,
                        SUM(status = 'Ngừng chiếu') AS stopped
                    FROM movies
                `),
                db.query(`SELECT COUNT(*) AS total FROM actors`),
                db.query(`SELECT COUNT(*) AS total FROM genres`),
                db.query(`SELECT COUNT(*) AS total FROM cinemas`),
                db.query(`SELECT COUNT(*) AS total FROM rooms`),
                db.query(`SELECT COUNT(*) AS total FROM showtimes WHERE start_time >= NOW()`),
                db.query(`SELECT COUNT(*) AS total, SUM(status = 1) AS active FROM product_menu`),
                db.query(`SELECT COUNT(*) AS total, SUM(is_active = 1) AS active FROM blog_cinema`),
                db.query(`SELECT COUNT(*) AS total FROM news`),
                db.query(`SELECT COUNT(*) AS total, SUM(is_active = 1) AS active FROM promotions`),
                db.query(`SELECT COUNT(*) AS total, SUM(is_active = 1) AS active FROM banners`),
                db.query(`SELECT COUNT(*) AS total, COALESCE(AVG(rating_score), 0) AS average_rating FROM reviews`)
            ]);

            return res.status(200).json({
                success: true,
                movies: movies[0][0],
                actors: Number(actors[0][0]?.total) || 0,
                genres: Number(genres[0][0]?.total) || 0,
                cinemas: Number(cinemas[0][0]?.total) || 0,
                rooms: Number(rooms[0][0]?.total) || 0,
                upcomingShowtimes: Number(showtimes[0][0]?.total) || 0,
                products: products[0][0],
                blogs: blogs[0][0],
                news: Number(news[0][0]?.total) || 0,
                promotions: promotions[0][0],
                banners: banners[0][0],
                reviews: {
                    total: Number(reviews[0][0]?.total) || 0,
                    averageRating: Number(reviews[0][0]?.average_rating) || 0
                }
            });
        } catch (error) {
            console.error('❌ getContentStats error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        17. USER STATUS
    ============================================================ */
    static async getUserStatus(req, res) {
        try {
            const [rows] = await db.query(`
                SELECT status, COUNT(*) AS total
                FROM users
                WHERE role = 'customer'
                GROUP BY status
                ORDER BY total DESC
            `);

            return res.status(200).json({
                success: true,
                data: rows.map(row => ({
                    status: row.status,
                    total: Number(row.total) || 0
                }))
            });
        } catch (error) {
            console.error('❌ getUserStatus error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        18. OTP STATS
    ============================================================ */
    static async getOtpStats(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const [rows] = await db.query(`
                SELECT purpose, status, COUNT(*) AS total
                FROM otp_logs
                WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY purpose, status
                ORDER BY purpose, total DESC
            `, [range.startDate, range.endDate]);

            return res.status(200).json({
                success: true,
                data: rows.map(row => ({
                    purpose: row.purpose,
                    status: row.status,
                    total: Number(row.total) || 0
                })),
                period: range
            });
        } catch (error) {
            console.error('❌ getOtpStats error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        19. REVIEW STATS
    ============================================================ */
    static async getReviewStats(req, res) {
        try {
            const [rows] = await db.query(`
                SELECT
                    m.movie_id,
                    m.title,
                    COUNT(r.review_id) AS review_count,
                    COALESCE(AVG(r.rating_score), 0) AS average_rating
                FROM movies m
                LEFT JOIN reviews r ON r.movie_id = m.movie_id
                GROUP BY m.movie_id, m.title
                ORDER BY average_rating DESC
            `);

            return res.status(200).json({
                success: true,
                data: rows.map(row => ({
                    movie_id: row.movie_id,
                    title: row.title,
                    review_count: Number(row.review_count) || 0,
                    average_rating: Number(Number(row.average_rating || 0).toFixed(1))
                }))
            });
        } catch (error) {
            console.error('❌ getReviewStats error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }


    /* ============================================================
        20. GHẾ / CÔNG SUẤT TOÀN HỆ THỐNG
    ============================================================ */
    static async getSeatPerformance(req, res) {
        try {
            const range = this.getDateRange(req.query.period || 'month', req.query.startDate, req.query.endDate);
            const [rows] = await db.query(`
                SELECT
                    COUNT(DISTINCT st.showtime_id) AS showtimes,
                    COALESCE(SUM(r.total_seats), 0) AS capacity,
                    COUNT(DISTINCT CASE WHEN b.status = 'Completed' AND bd.seat_id IS NOT NULL THEN bd.booking_detail_id END) AS sold_tickets
                FROM showtimes st
                INNER JOIN rooms r ON r.room_id = st.room_id
                LEFT JOIN bookings b ON b.showtime_id = st.showtime_id
                LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id AND bd.seat_id IS NOT NULL
                WHERE st.start_time >= ? AND st.start_time < DATE_ADD(?, INTERVAL 1 DAY)
            `, [range.startDate, range.endDate]);

            const row = rows[0] || {};
            const capacity = Number(row.capacity) || 0;
            const sold = Number(row.sold_tickets) || 0;

            return res.status(200).json({
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
}

module.exports = DashboardController;