const db = require('../Config/db');

class DashboardController {

    /* ============================================================
        HELPER
    ============================================================ */

    static normalizeDate(value, fallback) {
        if (!value) return fallback;

        const date = new Date(`${value}T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return fallback;
        }

        return date.toISOString().split('T')[0];
    }

    static getDateRange(period = 'week', startDate, endDate) {

        const now = new Date();

        const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );

        if (period === 'custom') {

            let start = DashboardController.normalizeDate(
                startDate,
                today.toISOString().split('T')[0]
            );

            let end = DashboardController.normalizeDate(
                endDate,
                today.toISOString().split('T')[0]
            );

            if (start > end) {
                [start, end] = [end, start];
            }

            return { startDate: start, endDate: end };
        }

        let start = new Date(today);
        let end = new Date(today);

        switch (period) {

            case 'today':
                break;

            case 'week':
                start.setDate(start.getDate() - 6);
                break;

            case 'month':
                start.setDate(start.getDate() - 29);
                break;

            case 'quarter':
                start.setDate(start.getDate() - 89);
                break;

            case 'year':
                start.setFullYear(start.getFullYear() - 1);
                break;

            default:
                start.setDate(start.getDate() - 6);
        }

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        };
    }

    static getPreviousDateRange(startDate, endDate) {

        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T00:00:00`);

        const diff =
            Math.floor(
                (end.getTime() - start.getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1;

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

        if (movieId) {
            conditions.push('st.movie_id = ?');
            params.push(Number(movieId));
        }

        if (cinemaId) {
            conditions.push('st.cinema_id = ?');
            params.push(Number(cinemaId));
        }

        if (roomId) {
            conditions.push('st.room_id = ?');
            params.push(Number(roomId));
        }

        return { conditions, params };
    }

    static percentChange(current, previous) {

        current = Number(current) || 0;
        previous = Number(previous) || 0;

        if (previous === 0) {
            if (current === 0) return 0;
            return 100;
        }

        return Number(
            (((current - previous) / previous) * 100).toFixed(1)
        );
    }

    static money(value) {
        return Number(value) || 0;
    }


    /* ============================================================
        HELPER: Lấy booking stats trong kỳ
        Tách riêng để tránh double-count khi join booking_details
    ============================================================ */

    static async _getBookingStats(startDate, endDate) {

        const [ordersRows] = await db.query(`
            SELECT
                COUNT(DISTINCT b.booking_id) AS orders,
                COALESCE(SUM(b.total_amount), 0) AS revenue
            FROM bookings b
            WHERE b.status = 'Completed'
              AND b.booking_date >= ?
              AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
        `, [startDate, endDate]);

        const [ticketRows] = await db.query(`
            SELECT
                COUNT(DISTINCT bd.booking_detail_id) AS tickets,
                COALESCE(SUM(bd.quantity * bd.price), 0) AS ticket_revenue
            FROM booking_details bd
            INNER JOIN bookings b
                ON b.booking_id = bd.booking_id
                AND b.status = 'Completed'
            WHERE bd.seat_id IS NOT NULL
              AND b.booking_date >= ?
              AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
        `, [startDate, endDate]);

        const [productRows] = await db.query(`
            SELECT
                COALESCE(SUM(bd.quantity * bd.price), 0) AS product_revenue
            FROM booking_details bd
            INNER JOIN bookings b
                ON b.booking_id = bd.booking_id
                AND b.status = 'Completed'
            WHERE bd.product_id IS NOT NULL
              AND b.booking_date >= ?
              AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
        `, [startDate, endDate]);

        return {
            orders: Number(ordersRows[0]?.orders) || 0,
            revenue: Number(ordersRows[0]?.revenue) || 0,
            tickets: Number(ticketRows[0]?.tickets) || 0,
            ticket_revenue: Number(ticketRows[0]?.ticket_revenue) || 0,
            product_revenue: Number(productRows[0]?.product_revenue) || 0
        };
    }


    /* ============================================================
        1. DASHBOARD OVERVIEW
    ============================================================ */

    static async getStats(req, res) {

        try {

            const { period = 'week', startDate, endDate } = req.query;

            const range = DashboardController.getDateRange(
                period, startDate, endDate
            );

            const previous = DashboardController.getPreviousDateRange(
                range.startDate, range.endDate
            );

            const [
                movieTotalRes,
                userTotalRes,
                current,
                old
            ] = await Promise.all([

                db.query(`SELECT COUNT(*) AS total FROM movies`),

                db.query(`
                    SELECT COUNT(*) AS total
                    FROM users
                    WHERE role = 'customer'
                `),

                DashboardController._getBookingStats(
                    range.startDate,
                    range.endDate
                ),

                DashboardController._getBookingStats(
                    previous.startDate,
                    previous.endDate
                )
            ]);

            const movieTotal = Number(movieTotalRes[0][0]?.total) || 0;
            const userTotal = Number(userTotalRes[0][0]?.total) || 0;

            const revenue = current.revenue;
            const previousRevenue = old.revenue;

            const orders = current.orders;
            const previousOrders = old.orders;

            const tickets = current.tickets;
            const previousTickets = old.tickets;

            const revenueDiff = revenue - previousRevenue;
            const ordersDiff = orders - previousOrders;
            const ticketsDiff = tickets - previousTickets;

            return res.status(200).json({

                success: true,

                movies: movieTotal,

                users: userTotal,

                tickets,

                revenue,

                orders,

                ticketRevenue: current.ticket_revenue,

                productRevenue: current.product_revenue,

                period: range,

                comparison: {

                    revenue: {
                        current: revenue,
                        previous: previousRevenue,
                        diff: revenueDiff,
                        change: DashboardController.percentChange(
                            revenue, previousRevenue
                        )
                    },

                    orders: {
                        current: orders,
                        previous: previousOrders,
                        diff: ordersDiff,
                        change: DashboardController.percentChange(
                            orders, previousOrders
                        )
                    },

                    tickets: {
                        current: tickets,
                        previous: previousTickets,
                        diff: ticketsDiff,
                        change: DashboardController.percentChange(
                            tickets, previousTickets
                        )
                    }
                }
            });

        } catch (error) {

            console.error('❌ Dashboard getStats:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy thống kê dashboard.',
                error: error.message
            });
        }
    }


    /* ============================================================
        2. SO SÁNH DOANH THU THEO KỲ
    ============================================================ */

    static async getPeriodComparison(req, res) {

        try {

            const periods = ['today', 'week', 'month', 'quarter', 'year'];

            const results = await Promise.all(
                periods.map(async (period) => {

                    const range = DashboardController.getDateRange(period);
                    const previous = DashboardController.getPreviousDateRange(
                        range.startDate, range.endDate
                    );

                    const [currentStats, previousStats] = await Promise.all([

                        DashboardController._getBookingStats(
                            range.startDate,
                            range.endDate
                        ),

                        DashboardController._getBookingStats(
                            previous.startDate,
                            previous.endDate
                        )
                    ]);

                    const currentRevenue = currentStats.revenue;
                    const previousRevenue = previousStats.revenue;
                    const diff = currentRevenue - previousRevenue;
                    const change = DashboardController.percentChange(
                        currentRevenue, previousRevenue
                    );

                    return {
                        period,
                        label: period === 'today' ? 'Hôm nay' :
                               period === 'week' ? '7 ngày' :
                               period === 'month' ? '30 ngày' :
                               period === 'quarter' ? '90 ngày' : '1 năm',
                        currentRevenue,
                        previousRevenue,
                        diff,
                        change,
                        range,
                        previousRange: previous
                    };
                })
            );

            return res.status(200).json({
                success: true,
                data: results
            });

        } catch (error) {

            console.error('❌ getPeriodComparison:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy dữ liệu so sánh theo kỳ.',
                error: error.message
            });
        }
    }


    /* ============================================================
        3. DOANH THU THEO NGÀY
    ============================================================ */

    static async getRevenueTrend(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'week',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`

                SELECT
                    DATE(b.booking_date) AS date,
                    COUNT(DISTINCT b.booking_id) AS orders,
                    COALESCE(SUM(b.total_amount), 0) AS revenue
                FROM bookings b
                WHERE b.status = 'Completed'
                  AND b.booking_date >= ?
                  AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY DATE(b.booking_date)
                ORDER BY date ASC

            `, [range.startDate, range.endDate]);

            const [detailRows] = await db.query(`

                SELECT
                    DATE(b.booking_date) AS date,

                    COUNT(DISTINCT CASE
                        WHEN bd.seat_id IS NOT NULL
                        THEN bd.booking_detail_id
                    END) AS tickets,

                    COALESCE(SUM(CASE
                        WHEN bd.product_id IS NOT NULL
                        THEN bd.quantity
                        ELSE 0
                    END), 0) AS products

                FROM bookings b
                LEFT JOIN booking_details bd
                    ON bd.booking_id = b.booking_id
                WHERE b.status = 'Completed'
                  AND b.booking_date >= ?
                  AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY DATE(b.booking_date)
                ORDER BY date ASC

            `, [range.startDate, range.endDate]);

            const detailMap = new Map(
                detailRows.map(r => [String(r.date), r])
            );

            const merged = rows.map(row => {
                const detail = detailMap.get(String(row.date)) || {};
                return {
                    date: row.date,
                    revenue: Number(row.revenue) || 0,
                    orders: Number(row.orders) || 0,
                    tickets: Number(detail.tickets) || 0,
                    products: Number(detail.products) || 0
                };
            });

            return res.status(200).json({
                success: true,
                data: merged,
                period: range
            });

        } catch (error) {

            console.error('❌ getRevenueTrend:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy xu hướng doanh thu.',
                error: error.message
            });
        }
    }


    /* ============================================================
        4. CHI TIẾT GIAO DỊCH
    ============================================================ */

    static async getTransactions(req, res) {

        try {

            const {
                startDate,
                endDate,
                page = 1,
                limit = 20,
                search = '',
                status = 'Completed'
            } = req.query;

            const range = DashboardController.getDateRange(
                'custom', startDate, endDate
            );

            const pageNumber = Math.max(parseInt(page) || 1, 1);
            const limitNumber = Math.min(
                Math.max(parseInt(limit) || 20, 1), 100
            );

            const offset = (pageNumber - 1) * limitNumber;

            const trimmedSearch = String(search).trim();
            const searchValue = `%${trimmedSearch}%`;
            const hasSearch = trimmedSearch.length > 0;

            const statusCondition =
                status === 'all' ? '' : 'AND b.status = ?';

            const statusParams =
                status === 'all' ? [] : [status];

            const searchCondition = hasSearch
                ? `AND (
                    u.full_name LIKE ?
                    OR u.email LIKE ?
                    OR m.title LIKE ?
                    OR b.memo LIKE ?
                )`
                : '';

            const searchParams = hasSearch
                ? [searchValue, searchValue, searchValue, searchValue]
                : [];

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
                    st.start_time
                FROM bookings b
                LEFT JOIN users u
                    ON u.user_id = b.user_id
                LEFT JOIN showtimes st
                    ON st.showtime_id = b.showtime_id
                LEFT JOIN movies m
                    ON m.movie_id = st.movie_id
                LEFT JOIN cinemas c
                    ON c.cinema_id = st.cinema_id
                LEFT JOIN rooms r
                    ON r.room_id = st.room_id
                WHERE b.booking_date >= ?
                  AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                  ${statusCondition}
                  ${searchCondition}
                ORDER BY b.booking_date DESC
                LIMIT ? OFFSET ?

            `, [
                range.startDate,
                range.endDate,
                ...statusParams,
                ...searchParams,
                limitNumber,
                offset
            ]);

            const bookingIds = rows.map(r => r.booking_id);

            let detailMap = new Map();

            if (bookingIds.length > 0) {

                const placeholders = bookingIds.map(() => '?').join(',');

                const [detailRows] = await db.query(`
                    SELECT
                        booking_id,
                        COUNT(DISTINCT CASE
                            WHEN seat_id IS NOT NULL
                            THEN booking_detail_id
                        END) AS ticket_count,
                        COUNT(DISTINCT CASE
                            WHEN product_id IS NOT NULL
                            THEN booking_detail_id
                        END) AS product_count
                    FROM booking_details
                    WHERE booking_id IN (${placeholders})
                    GROUP BY booking_id
                `, bookingIds);

                detailMap = new Map(
                    detailRows.map(r => [
                        r.booking_id,
                        {
                            ticket_count: Number(r.ticket_count) || 0,
                            product_count: Number(r.product_count) || 0
                        }
                    ])
                );
            }

            const [countRows] = await db.query(`

                SELECT COUNT(*) AS total
                FROM bookings b
                LEFT JOIN users u
                    ON u.user_id = b.user_id
                LEFT JOIN showtimes st
                    ON st.showtime_id = b.showtime_id
                LEFT JOIN movies m
                    ON m.movie_id = st.movie_id
                WHERE b.booking_date >= ?
                  AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                  ${statusCondition}
                  ${searchCondition}

            `, [
                range.startDate,
                range.endDate,
                ...statusParams,
                ...searchParams
            ]);

            const total = Number(countRows[0]?.total) || 0;

            return res.status(200).json({

                success: true,

                data: rows.map(row => {
                    const detail = detailMap.get(row.booking_id) || {};
                    return {
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
                        ticket_count: detail.ticket_count || 0,
                        product_count: detail.product_count || 0
                    };
                }),

                pagination: {
                    page: pageNumber,
                    limit: limitNumber,
                    total,
                    totalPages: Math.max(Math.ceil(total / limitNumber), 1)
                },

                period: range
            });

        } catch (error) {

            console.error('❌ getTransactions:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy giao dịch.',
                error: error.message
            });
        }
    }


    /* ============================================================
        5. DOANH THU THEO PHIM
    ============================================================ */

    static async getRevenueByMovie(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`

                SELECT
                    m.movie_id,
                    m.title AS name,
                    m.movie_poster AS poster,
                    COUNT(DISTINCT bd.booking_detail_id) AS tickets,
                    COALESCE(SUM(bd.quantity * bd.price), 0) AS value
                FROM booking_details bd
                INNER JOIN bookings b
                    ON b.booking_id = bd.booking_id
                    AND b.status = 'Completed'
                INNER JOIN showtimes st
                    ON st.showtime_id = b.showtime_id
                INNER JOIN movies m
                    ON m.movie_id = st.movie_id
                WHERE bd.seat_id IS NOT NULL
                  AND b.booking_date >= ?
                  AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY m.movie_id, m.title, m.movie_poster
                ORDER BY value DESC

            `, [range.startDate, range.endDate]);

            const total = rows.reduce(
                (sum, row) => sum + Number(row.value || 0), 0
            );

            return res.status(200).json({

                success: true,

                data: rows.map(row => {
                    const value = Number(row.value) || 0;
                    return {
                        movie_id: row.movie_id,
                        name: row.name,
                        poster: row.poster,
                        tickets: Number(row.tickets) || 0,
                        value,
                        percent: total > 0
                            ? Number((value / total * 100).toFixed(1))
                            : 0
                    };
                }),

                total,
                period: range
            });

        } catch (error) {

            console.error('❌ getRevenueByMovie:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy doanh thu theo phim.',
                error: error.message
            });
        }
    }


    /* ============================================================
        6. VÉ BÁN THEO PHIM
    ============================================================ */

    static async getTicketsByMovie(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`

                SELECT
                    m.movie_id,
                    m.title AS movieName,
                    COUNT(DISTINCT bd.booking_detail_id) AS ticketCount,
                    COALESCE(SUM(bd.quantity * bd.price), 0) AS ticketRevenue
                FROM booking_details bd
                INNER JOIN bookings b
                    ON b.booking_id = bd.booking_id
                    AND b.status = 'Completed'
                INNER JOIN showtimes st
                    ON st.showtime_id = b.showtime_id
                INNER JOIN movies m
                    ON m.movie_id = st.movie_id
                WHERE bd.seat_id IS NOT NULL
                  AND b.booking_date >= ?
                  AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY m.movie_id, m.title
                ORDER BY ticketCount DESC

            `, [range.startDate, range.endDate]);

            return res.status(200).json({

                success: true,

                data: rows.map(row => ({
                    movie_id: row.movie_id,
                    movieName: row.movieName,
                    ticketCount: Number(row.ticketCount) || 0,
                    totalRevenue: Number(row.ticketRevenue) || 0
                })),

                period: range
            });

        } catch (error) {

            console.error('❌ getTicketsByMovie:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy vé theo phim.',
                error: error.message
            });
        }
    }


    /* ============================================================
        7. TOP PHIM
    ============================================================ */

    static async getTopMovies(req, res) {

        try {

            const limit = Math.min(
                Math.max(parseInt(req.query.limit) || 10, 1), 50
            );

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`

                SELECT
                    m.movie_id,
                    m.title,
                    m.movie_poster AS poster,
                    m.release_date,
                    m.status,
                    COUNT(DISTINCT bd.booking_detail_id) AS tickets_sold,
                    COUNT(DISTINCT b.booking_id) AS orders,
                    COALESCE(SUM(bd.quantity * bd.price), 0) AS ticket_revenue
                FROM movies m
                INNER JOIN showtimes st
                    ON st.movie_id = m.movie_id
                INNER JOIN bookings b
                    ON b.showtime_id = st.showtime_id
                    AND b.status = 'Completed'
                INNER JOIN booking_details bd
                    ON bd.booking_id = b.booking_id
                    AND bd.seat_id IS NOT NULL
                WHERE b.booking_date >= ?
                  AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY
                    m.movie_id, m.title, m.movie_poster,
                    m.release_date, m.status
                ORDER BY ticket_revenue DESC
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
                    revenue: Number(row.ticket_revenue) || 0,
                    orders: Number(row.orders) || 0
                })),

                period: range
            });

        } catch (error) {

            console.error('❌ getTopMovies:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy top phim.',
                error: error.message
            });
        }
    }


    /* ============================================================
        8. BOOKING THEO TRẠNG THÁI
    ============================================================ */

    static async getBookingStatus(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`

                SELECT
                    status,
                    COUNT(*) AS orders,
                    COALESCE(SUM(total_amount), 0) AS revenue
                FROM bookings
                WHERE booking_date >= ?
                  AND booking_date < DATE_ADD(?, INTERVAL 1 DAY)
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

            console.error('❌ getBookingStatus:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê trạng thái booking.',
                error: error.message
            });
        }
    }


    /* ============================================================
        9. USER GROWTH
    ============================================================ */

    static async getUserGrowth(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`

                SELECT
                    DATE(u.created_at) AS date,
                    COUNT(*) AS new_users,
                    (
                        SELECT COUNT(*)
                        FROM users u2
                        WHERE u2.role = 'customer'
                          AND DATE(u2.created_at) <= DATE(u.created_at)
                    ) AS cumulative
                FROM users u
                WHERE u.role = 'customer'
                  AND u.created_at >= ?
                  AND u.created_at < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY DATE(u.created_at)
                ORDER BY date ASC

            `, [range.startDate, range.endDate]);

            return res.status(200).json({

                success: true,

                data: rows.map(row => ({
                    date: row.date,
                    newUsers: Number(row.new_users) || 0,
                    cumulative: Number(row.cumulative) || 0
                })),

                period: range
            });

        } catch (error) {

            console.error('❌ getUserGrowth:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy tăng trưởng người dùng.',
                error: error.message
            });
        }
    }


    /* ============================================================
        10. KHÁCH HÀNG TOP
    ============================================================ */

    static async getTopCustomers(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const limit = Math.min(
                Math.max(parseInt(req.query.limit) || 10, 1), 50
            );

            const [rows] = await db.query(`

                SELECT
                    u.user_id,
                    u.full_name,
                    u.email,
                    u.user_avatar,
                    u.points,
                    COUNT(DISTINCT b.booking_id) AS orders,
                    (
                        SELECT COUNT(DISTINCT bd.booking_detail_id)
                        FROM booking_details bd
                        WHERE bd.booking_id IN (
                            SELECT b2.booking_id
                            FROM bookings b2
                            WHERE b2.user_id = u.user_id
                              AND b2.status = 'Completed'
                              AND b2.booking_date >= ?
                              AND b2.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                        )
                        AND bd.seat_id IS NOT NULL
                    ) AS tickets,
                    COALESCE(SUM(b.total_amount), 0) AS spending
                FROM users u
                INNER JOIN bookings b
                    ON b.user_id = u.user_id
                    AND b.status = 'Completed'
                WHERE u.role = 'customer'
                  AND b.booking_date >= ?
                  AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY
                    u.user_id, u.full_name, u.email,
                    u.user_avatar, u.points
                ORDER BY spending DESC
                LIMIT ?

            `, [
                range.startDate, range.endDate,
                range.startDate, range.endDate,
                limit
            ]);

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

            console.error('❌ getTopCustomers:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy top khách hàng.',
                error: error.message
            });
        }
    }


    /* ============================================================
        11. SẢN PHẨM BÁN CHẠY
    ============================================================ */

    static async getProductPerformance(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`

                SELECT
                    p.product_id,
                    p.product_name,
                    p.food_image,
                    p.category,
                    SUM(bd.quantity) AS quantity,
                    COALESCE(SUM(bd.quantity * bd.price), 0) AS revenue
                FROM booking_details bd
                INNER JOIN bookings b
                    ON b.booking_id = bd.booking_id
                    AND b.status = 'Completed'
                INNER JOIN product_menu p
                    ON p.product_id = bd.product_id
                WHERE bd.product_id IS NOT NULL
                  AND b.booking_date >= ?
                  AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY
                    p.product_id, p.product_name,
                    p.food_image, p.category
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

            console.error('❌ getProductPerformance:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê sản phẩm.',
                error: error.message
            });
        }
    }


    /* ============================================================
        12. DOANH THU THEO RẠP
    ============================================================ */

    static async getCinemaPerformance(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`

                SELECT
                    c.cinema_id,
                    c.cinema_name,
                    COUNT(DISTINCT b.booking_id) AS orders,
                    COUNT(DISTINCT CASE
                        WHEN bd.seat_id IS NOT NULL
                        THEN bd.booking_detail_id
                    END) AS tickets,
                    COALESCE(SUM(DISTINCT b.total_amount), 0) AS revenue
                FROM cinemas c
                INNER JOIN showtimes st
                    ON st.cinema_id = c.cinema_id
                INNER JOIN bookings b
                    ON b.showtime_id = st.showtime_id
                    AND b.status = 'Completed'
                LEFT JOIN booking_details bd
                    ON bd.booking_id = b.booking_id
                WHERE b.booking_date >= ?
                  AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
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

            console.error('❌ getCinemaPerformance:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê theo rạp.',
                error: error.message
            });
        }
    }


    /* ============================================================
        13. HIỆU SUẤT PHÒNG
    ============================================================ */

    static async getRoomPerformance(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`

                SELECT
                    r.room_id,
                    r.room_name,
                    r.room_type,
                    c.cinema_name,
                    COUNT(DISTINCT st.showtime_id) AS showtimes,
                    COUNT(DISTINCT CASE
                        WHEN b.status = 'Completed'
                        AND bd.seat_id IS NOT NULL
                        THEN bd.booking_detail_id
                    END) AS tickets,
                    COUNT(DISTINCT st.showtime_id) * r.total_seats AS capacity,
                    COALESCE(SUM(DISTINCT CASE
                        WHEN b.status = 'Completed'
                        THEN b.total_amount
                    END), 0) AS revenue
                FROM rooms r
                INNER JOIN cinemas c
                    ON c.cinema_id = r.cinema_id
                LEFT JOIN showtimes st
                    ON st.room_id = r.room_id
                    AND st.start_time >= ?
                    AND st.start_time < DATE_ADD(?, INTERVAL 1 DAY)
                LEFT JOIN bookings b
                    ON b.showtime_id = st.showtime_id
                LEFT JOIN booking_details bd
                    ON bd.booking_id = b.booking_id
                    AND bd.seat_id IS NOT NULL
                GROUP BY
                    r.room_id, r.room_name, r.room_type,
                    c.cinema_name, r.total_seats
                ORDER BY revenue DESC

            `, [range.startDate, range.endDate]);

            return res.status(200).json({

                success: true,

                data: rows.map(row => {
                    const tickets = Number(row.tickets) || 0;
                    const capacity = Number(row.capacity) || 0;

                    return {
                        room_id: row.room_id,
                        room_name: row.room_name,
                        room_type: row.room_type,
                        cinema_name: row.cinema_name,
                        showtimes: Number(row.showtimes) || 0,
                        tickets,
                        capacity,
                        occupancy: capacity > 0
                            ? Number((tickets / capacity * 100).toFixed(1))
                            : 0,
                        revenue: Number(row.revenue) || 0
                    };
                }),

                period: range
            });

        } catch (error) {

            console.error('❌ getRoomPerformance:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê phòng.',
                error: error.message
            });
        }
    }


    /* ============================================================
        14. HIỆU SUẤT SUẤT CHIẾU
    ============================================================ */

    static async getShowtimePerformance(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'today',
                req.query.startDate,
                req.query.endDate
            );

            const limit = Math.min(
                Math.max(parseInt(req.query.limit) || 20, 1), 100
            );

            const [rows] = await db.query(`

                SELECT
                    st.showtime_id,
                    st.start_time,
                    m.title AS movie_title,
                    c.cinema_name,
                    r.room_name,
                    r.total_seats,
                    COUNT(DISTINCT CASE
                        WHEN b.status = 'Completed'
                        AND bd.seat_id IS NOT NULL
                        THEN bd.booking_detail_id
                    END) AS tickets,
                    COALESCE(SUM(DISTINCT CASE
                        WHEN b.status = 'Completed'
                        THEN b.total_amount
                    END), 0) AS revenue
                FROM showtimes st
                INNER JOIN movies m
                    ON m.movie_id = st.movie_id
                INNER JOIN cinemas c
                    ON c.cinema_id = st.cinema_id
                INNER JOIN rooms r
                    ON r.room_id = st.room_id
                LEFT JOIN bookings b
                    ON b.showtime_id = st.showtime_id
                LEFT JOIN booking_details bd
                    ON bd.booking_id = b.booking_id
                    AND bd.seat_id IS NOT NULL
                WHERE st.start_time >= ?
                  AND st.start_time < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY
                    st.showtime_id, st.start_time,
                    m.title, c.cinema_name,
                    r.room_name, r.total_seats
                ORDER BY tickets DESC
                LIMIT ?

            `, [range.startDate, range.endDate, limit]);

            return res.status(200).json({

                success: true,

                data: rows.map(row => {
                    const tickets = Number(row.tickets) || 0;
                    const seats = Number(row.total_seats) || 0;

                    return {
                        showtime_id: row.showtime_id,
                        start_time: row.start_time,
                        movie_title: row.movie_title,
                        cinema_name: row.cinema_name,
                        room_name: row.room_name,
                        total_seats: seats,
                        tickets,
                        empty_seats: Math.max(seats - tickets, 0),
                        occupancy: seats > 0
                            ? Number((tickets / seats * 100).toFixed(1))
                            : 0,
                        revenue: Number(row.revenue) || 0
                    };
                }),

                period: range
            });

        } catch (error) {

            console.error('❌ getShowtimePerformance:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê suất chiếu.',
                error: error.message
            });
        }
    }


    /* ============================================================
        15. COUPON
    ============================================================ */

    static async getCouponPerformance(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`

                SELECT
                    c.coupon_id,
                    c.coupon_code,
                    c.discount_value,
                    c.expiry_date,
                    COUNT(b.booking_id) AS used_count,
                    COALESCE(SUM(b.total_amount), 0) AS revenue
                FROM coupons c
                LEFT JOIN bookings b
                    ON b.coupon_id = c.coupon_id
                    AND b.status = 'Completed'
                    AND b.booking_date >= ?
                    AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY
                    c.coupon_id, c.coupon_code,
                    c.discount_value, c.expiry_date
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

            console.error('❌ getCouponPerformance:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê coupon.',
                error: error.message
            });
        }
    }


    /* ============================================================
        16. NỘI DUNG WEBSITE
    ============================================================ */

    static async getContentStats(req, res) {

        try {

            const [
                movies, actors, genres, cinemas, rooms,
                showtimes, products, blogs, news,
                promotions, banners, reviews
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

                db.query(`
                    SELECT COUNT(*) AS total
                    FROM showtimes
                    WHERE start_time >= NOW()
                `),

                db.query(`
                    SELECT
                        COUNT(*) AS total,
                        SUM(status = 1) AS active
                    FROM product_menu
                `),

                db.query(`
                    SELECT
                        COUNT(*) AS total,
                        SUM(is_active = 1) AS active
                    FROM blog_cinema
                `),

                db.query(`SELECT COUNT(*) AS total FROM news`),

                db.query(`
                    SELECT
                        COUNT(*) AS total,
                        SUM(is_active = 1) AS active
                    FROM promotions
                `),

                db.query(`
                    SELECT
                        COUNT(*) AS total,
                        SUM(is_active = 1) AS active
                    FROM banners
                `),

                db.query(`
                    SELECT
                        COUNT(*) AS total,
                        COALESCE(AVG(rating_score), 0) AS average_rating
                    FROM reviews
                `)
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

            console.error('❌ getContentStats:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê nội dung.',
                error: error.message
            });
        }
    }


    /* ============================================================
        17. USER STATUS
    ============================================================ */

    static async getUserStatus(req, res) {

        try {

            const [rows] = await db.query(`

                SELECT
                    status,
                    COUNT(*) AS total
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

            console.error('❌ getUserStatus:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê trạng thái user.',
                error: error.message
            });
        }
    }


    /* ============================================================
        18. OTP / PAYMENT ACTIVITY
    ============================================================ */

    static async getOtpStats(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`

                SELECT
                    purpose,
                    status,
                    COUNT(*) AS total
                FROM otp_logs
                WHERE created_at >= ?
                  AND created_at < DATE_ADD(?, INTERVAL 1 DAY)
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

            console.error('❌ getOtpStats:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê OTP.',
                error: error.message
            });
        }
    }


    /* ============================================================
        19. REVIEW / RATING
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
                LEFT JOIN reviews r
                    ON r.movie_id = m.movie_id
                GROUP BY m.movie_id, m.title
                ORDER BY average_rating DESC

            `);

            return res.status(200).json({

                success: true,

                data: rows.map(row => ({
                    movie_id: row.movie_id,
                    title: row.title,
                    review_count: Number(row.review_count) || 0,
                    average_rating: Number(
                        Number(row.average_rating || 0).toFixed(1)
                    )
                }))
            });

        } catch (error) {

            console.error('❌ getReviewStats:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê đánh giá.',
                error: error.message
            });
        }
    }


    /* ============================================================
        20. GHẾ / CÔNG SUẤT TOÀN HỆ THỐNG
    ============================================================ */

    static async getSeatPerformance(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const [showtimeRows] = await db.query(`

                SELECT
                    COUNT(DISTINCT st.showtime_id) AS showtimes,
                    COALESCE(SUM(r.total_seats), 0) AS capacity
                FROM showtimes st
                INNER JOIN rooms r
                    ON r.room_id = st.room_id
                WHERE st.start_time >= ?
                  AND st.start_time < DATE_ADD(?, INTERVAL 1 DAY)

            `, [range.startDate, range.endDate]);

            const [soldRows] = await db.query(`

                SELECT
                    COUNT(DISTINCT CASE
                        WHEN bd.seat_id IS NOT NULL
                        THEN bd.booking_detail_id
                    END) AS sold_tickets
                FROM showtimes st
                LEFT JOIN bookings b
                    ON b.showtime_id = st.showtime_id
                    AND b.status = 'Completed'
                LEFT JOIN booking_details bd
                    ON bd.booking_id = b.booking_id
                    AND bd.seat_id IS NOT NULL
                WHERE st.start_time >= ?
                  AND st.start_time < DATE_ADD(?, INTERVAL 1 DAY)

            `, [range.startDate, range.endDate]);

            const row = showtimeRows[0] || {};
            const soldRow = soldRows[0] || {};

            const capacity = Number(row.capacity) || 0;
            const sold = Number(soldRow.sold_tickets) || 0;

            return res.status(200).json({

                success: true,

                data: {
                    showtimes: Number(row.showtimes) || 0,
                    capacity,
                    soldTickets: sold,
                    emptySeats: Math.max(capacity - sold, 0),
                    occupancy: capacity > 0
                        ? Number((sold / capacity * 100).toFixed(1))
                        : 0
                },

                period: range
            });

        } catch (error) {

            console.error('❌ getSeatPerformance:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê ghế.',
                error: error.message
            });
        }
    }


    /* ============================================================
        21. DOANH THU THEO GIỜ (MỚI)
        Phân tích khung giờ nào bán chạy nhất
    ============================================================ */

    static async getRevenueByHour(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`

                SELECT
                    HOUR(st.start_time) AS hour,
                    COUNT(DISTINCT b.booking_id) AS orders,
                    COUNT(DISTINCT CASE
                        WHEN bd.seat_id IS NOT NULL
                        THEN bd.booking_detail_id
                    END) AS tickets,
                    COALESCE(SUM(DISTINCT b.total_amount), 0) AS revenue
                FROM showtimes st
                INNER JOIN bookings b
                    ON b.showtime_id = st.showtime_id
                    AND b.status = 'Completed'
                LEFT JOIN booking_details bd
                    ON bd.booking_id = b.booking_id
                WHERE b.booking_date >= ?
                  AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY HOUR(st.start_time)
                ORDER BY hour ASC

            `, [range.startDate, range.endDate]);

            const hourMap = new Map(
                rows.map(r => [Number(r.hour), r])
            );

            const result = [];
            for (let h = 0; h < 24; h++) {
                const row = hourMap.get(h) || {};
                result.push({
                    hour: h,
                    label: `${String(h).padStart(2, '0')}:00`,
                    orders: Number(row.orders) || 0,
                    tickets: Number(row.tickets) || 0,
                    revenue: Number(row.revenue) || 0
                });
            }

            return res.status(200).json({
                success: true,
                data: result,
                period: range
            });

        } catch (error) {

            console.error('❌ getRevenueByHour:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê doanh thu theo giờ.',
                error: error.message
            });
        }
    }


    /* ============================================================
        22. DOANH THU THEO LOẠI GHẾ (MỚI)
        Ghế VIP/Couple/Standard nào lời nhất
    ============================================================ */

    static async getRevenueBySeatType(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`

                SELECT
                    s.seat_type,
                    COUNT(DISTINCT bd.booking_detail_id) AS tickets,
                    COALESCE(SUM(bd.quantity * bd.price), 0) AS revenue
                FROM booking_details bd
                INNER JOIN bookings b
                    ON b.booking_id = bd.booking_id
                    AND b.status = 'Completed'
                INNER JOIN seats s
                    ON s.seat_id = bd.seat_id
                WHERE bd.seat_id IS NOT NULL
                  AND b.booking_date >= ?
                  AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY s.seat_type
                ORDER BY revenue DESC

            `, [range.startDate, range.endDate]);

            const total = rows.reduce(
                (sum, row) => sum + Number(row.revenue || 0), 0
            );

            const seatLabels = {
                STANDARD: 'Thường',
                VIP: 'VIP',
                DELUXE: 'Deluxe',
                RECLINER: 'Recliner',
                COUPLE: 'Couple'
            };

            return res.status(200).json({

                success: true,

                data: rows.map(row => {
                    const revenue = Number(row.revenue) || 0;
                    return {
                        seat_type: row.seat_type,
                        label: seatLabels[row.seat_type] || row.seat_type,
                        tickets: Number(row.tickets) || 0,
                        revenue,
                        percent: total > 0
                            ? Number((revenue / total * 100).toFixed(1))
                            : 0
                    };
                }),

                total,
                period: range
            });

        } catch (error) {

            console.error('❌ getRevenueBySeatType:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê doanh thu theo loại ghế.',
                error: error.message
            });
        }
    }


    /* ============================================================
        23. DOANH THU THEO NGÀY TRONG TUẦN (MỚI)
        T2-CN ngày nào đông khách
    ============================================================ */

    static async getRevenueByWeekday(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`

                SELECT
                    DAYOFWEEK(b.booking_date) AS weekday,
                    COUNT(DISTINCT b.booking_id) AS orders,
                    COUNT(DISTINCT CASE
                        WHEN bd.seat_id IS NOT NULL
                        THEN bd.booking_detail_id
                    END) AS tickets,
                    COALESCE(SUM(DISTINCT b.total_amount), 0) AS revenue
                FROM bookings b
                LEFT JOIN booking_details bd
                    ON bd.booking_id = b.booking_id
                WHERE b.status = 'Completed'
                  AND b.booking_date >= ?
                  AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY DAYOFWEEK(b.booking_date)
                ORDER BY weekday ASC

            `, [range.startDate, range.endDate]);

            const weekdayLabels = {
                1: 'Chủ nhật',
                2: 'Thứ 2',
                3: 'Thứ 3',
                4: 'Thứ 4',
                5: 'Thứ 5',
                6: 'Thứ 6',
                7: 'Thứ 7'
            };

            const weekdayMap = new Map(
                rows.map(r => [Number(r.weekday), r])
            );

            const result = [];
            const order = [2, 3, 4, 5, 6, 7, 1];
            for (const w of order) {
                const row = weekdayMap.get(w) || {};
                result.push({
                    weekday: w,
                    label: weekdayLabels[w],
                    orders: Number(row.orders) || 0,
                    tickets: Number(row.tickets) || 0,
                    revenue: Number(row.revenue) || 0
                });
            }

            return res.status(200).json({
                success: true,
                data: result,
                period: range
            });

        } catch (error) {

            console.error('❌ getRevenueByWeekday:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê doanh thu theo ngày trong tuần.',
                error: error.message
            });
        }
    }


    /* ============================================================
        24. DOANH THU THEO LOẠI PHÒNG (MỚI)
        2D/3D/VIP/IMAX cái nào lời nhất
    ============================================================ */

    static async getRevenueByRoomType(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const [rows] = await db.query(`

                SELECT
                    r.room_type,
                    COUNT(DISTINCT st.showtime_id) AS showtimes,
                    COUNT(DISTINCT b.booking_id) AS orders,
                    COUNT(DISTINCT CASE
                        WHEN bd.seat_id IS NOT NULL
                        THEN bd.booking_detail_id
                    END) AS tickets,
                    COALESCE(SUM(DISTINCT b.total_amount), 0) AS revenue
                FROM rooms r
                INNER JOIN showtimes st
                    ON st.room_id = r.room_id
                INNER JOIN bookings b
                    ON b.showtime_id = st.showtime_id
                    AND b.status = 'Completed'
                LEFT JOIN booking_details bd
                    ON bd.booking_id = b.booking_id
                WHERE b.booking_date >= ?
                  AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY r.room_type
                ORDER BY revenue DESC

            `, [range.startDate, range.endDate]);

            const total = rows.reduce(
                (sum, row) => sum + Number(row.revenue || 0), 0
            );

            return res.status(200).json({

                success: true,

                data: rows.map(row => {
                    const revenue = Number(row.revenue) || 0;
                    const showtimes = Number(row.showtimes) || 0;
                    return {
                        room_type: row.room_type,
                        showtimes,
                        orders: Number(row.orders) || 0,
                        tickets: Number(row.tickets) || 0,
                        revenue,
                        avgRevenuePerShowtime: showtimes > 0
                            ? Math.round(revenue / showtimes)
                            : 0,
                        percent: total > 0
                            ? Number((revenue / total * 100).toFixed(1))
                            : 0
                    };
                }),

                total,
                period: range
            });

        } catch (error) {

            console.error('❌ getRevenueByRoomType:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê doanh thu theo loại phòng.',
                error: error.message
            });
        }
    }


    /* ============================================================
        25. TOP SUẤT CHIẾU THEO DOANH THU (MỚI)
        Suất nào bán chạy nhất (xếp theo doanh thu)
    ============================================================ */

    static async getTopShowtimes(req, res) {

        try {

            const range = DashboardController.getDateRange(
                req.query.period || 'month',
                req.query.startDate,
                req.query.endDate
            );

            const limit = Math.min(
                Math.max(parseInt(req.query.limit) || 10, 1), 50
            );

            const [rows] = await db.query(`

                SELECT
                    st.showtime_id,
                    st.start_time,
                    m.title AS movie_title,
                    c.cinema_name,
                    r.room_name,
                    r.room_type,
                    r.total_seats,
                    COUNT(DISTINCT b.booking_id) AS orders,
                    COUNT(DISTINCT CASE
                        WHEN bd.seat_id IS NOT NULL
                        THEN bd.booking_detail_id
                    END) AS tickets,
                    COALESCE(SUM(DISTINCT b.total_amount), 0) AS revenue
                FROM showtimes st
                INNER JOIN movies m
                    ON m.movie_id = st.movie_id
                INNER JOIN cinemas c
                    ON c.cinema_id = st.cinema_id
                INNER JOIN rooms r
                    ON r.room_id = st.room_id
                INNER JOIN bookings b
                    ON b.showtime_id = st.showtime_id
                    AND b.status = 'Completed'
                LEFT JOIN booking_details bd
                    ON bd.booking_id = b.booking_id
                WHERE b.booking_date >= ?
                  AND b.booking_date < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY
                    st.showtime_id, st.start_time,
                    m.title, c.cinema_name,
                    r.room_name, r.room_type, r.total_seats
                ORDER BY revenue DESC
                LIMIT ?

            `, [range.startDate, range.endDate, limit]);

            return res.status(200).json({

                success: true,

                data: rows.map(row => {
                    const tickets = Number(row.tickets) || 0;
                    const seats = Number(row.total_seats) || 0;

                    return {
                        showtime_id: row.showtime_id,
                        start_time: row.start_time,
                        movie_title: row.movie_title,
                        cinema_name: row.cinema_name,
                        room_name: row.room_name,
                        room_type: row.room_type,
                        total_seats: seats,
                        orders: Number(row.orders) || 0,
                        tickets,
                        occupancy: seats > 0
                            ? Number((tickets / seats * 100).toFixed(1))
                            : 0,
                        revenue: Number(row.revenue) || 0
                    };
                }),

                period: range
            });

        } catch (error) {

            console.error('❌ getTopShowtimes:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy top suất chiếu.',
                error: error.message
            });
        }
    }


    /* ============================================================
        26. CHI TIẾT 1 ĐƠN HÀNG (MỚI)
        Click row trong transaction table → xem chi tiết
    ============================================================ */

    static async getBookingDetail(req, res) {

        try {

            const { id } = req.params;

            const bookingId = parseInt(id);

            if (!bookingId || bookingId < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'ID đơn hàng không hợp lệ.'
                });
            }

            const [bookingRows] = await db.query(`

                SELECT
                    b.booking_id,
                    b.booking_date,
                    b.total_amount,
                    b.status,
                    b.memo,
                    b.email AS booking_email,
                    b.coupon_id,
                    u.user_id,
                    u.full_name AS customer_name,
                    u.email AS customer_email,
                    u.phone AS customer_phone,
                    m.movie_id,
                    m.title AS movie_title,
                    m.movie_poster,
                    m.duration AS movie_duration,
                    c.cinema_id,
                    c.cinema_name,
                    c.address AS cinema_address,
                    r.room_id,
                    r.room_name,
                    r.room_type,
                    st.showtime_id,
                    st.start_time,
                    cp.coupon_code,
                    cp.discount_value
                FROM bookings b
                LEFT JOIN users u
                    ON u.user_id = b.user_id
                LEFT JOIN showtimes st
                    ON st.showtime_id = b.showtime_id
                LEFT JOIN movies m
                    ON m.movie_id = st.movie_id
                LEFT JOIN cinemas c
                    ON c.cinema_id = st.cinema_id
                LEFT JOIN rooms r
                    ON r.room_id = st.room_id
                LEFT JOIN coupons cp
                    ON cp.coupon_id = b.coupon_id
                WHERE b.booking_id = ?

            `, [bookingId]);

            if (bookingRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng.'
                });
            }

            const booking = bookingRows[0];

            const [detailRows] = await db.query(`

                SELECT
                    bd.booking_detail_id,
                    bd.item_name,
                    bd.quantity,
                    bd.price,
                    bd.seat_id,
                    bd.product_id,
                    s.seat_row,
                    s.seat_number,
                    s.seat_type,
                    p.product_name,
                    p.food_image,
                    p.category
                FROM booking_details bd
                LEFT JOIN seats s
                    ON s.seat_id = bd.seat_id
                LEFT JOIN product_menu p
                    ON p.product_id = bd.product_id
                WHERE bd.booking_id = ?
                ORDER BY
                    bd.seat_id IS NULL,
                    s.seat_row ASC,
                    s.seat_number ASC

            `, [bookingId]);

            const seats = [];
            const products = [];

            detailRows.forEach(row => {
                if (row.seat_id) {
                    seats.push({
                        booking_detail_id: row.booking_detail_id,
                        seat_id: row.seat_id,
                        seat_row: row.seat_row,
                        seat_number: row.seat_number,
                        seat_type: row.seat_type,
                        seat_label: `${row.seat_row}${row.seat_number}`,
                        price: Number(row.price) || 0,
                        quantity: Number(row.quantity) || 1,
                        subtotal: (Number(row.price) || 0) * (Number(row.quantity) || 1)
                    });
                } else if (row.product_id) {
                    products.push({
                        booking_detail_id: row.booking_detail_id,
                        product_id: row.product_id,
                        product_name: row.product_name,
                        image: row.food_image,
                        category: row.category,
                        quantity: Number(row.quantity) || 1,
                        price: Number(row.price) || 0,
                        subtotal: (Number(row.price) || 0) * (Number(row.quantity) || 1)
                    });
                }
            });

            const seatTotal = seats.reduce((sum, s) => sum + s.subtotal, 0);
            const productTotal = products.reduce((sum, p) => sum + p.subtotal, 0);

            return res.status(200).json({

                success: true,

                data: {
                    booking_id: booking.booking_id,
                    booking_date: booking.booking_date,
                    status: booking.status,
                    total_amount: Number(booking.total_amount) || 0,
                    memo: booking.memo,

                    customer: {
                        user_id: booking.user_id,
                        full_name: booking.customer_name || 'Khách lẻ',
                        email: booking.customer_email || booking.booking_email,
                        phone: booking.customer_phone
                    },

                    movie: {
                        movie_id: booking.movie_id,
                        title: booking.movie_title,
                        poster: booking.movie_poster,
                        duration: booking.movie_duration
                    },

                    cinema: {
                        cinema_id: booking.cinema_id,
                        name: booking.cinema_name,
                        address: booking.cinema_address
                    },
                    room: {
                        room_id: booking.room_id,
                        name: booking.room_name,
                        type: booking.room_type
                    },

                    showtime: {
                        showtime_id: booking.showtime_id,
                        start_time: booking.start_time
                    },

                    coupon: booking.coupon_id ? {
                        coupon_id: booking.coupon_id,
                        coupon_code: booking.coupon_code,
                        discount_value: Number(booking.discount_value) || 0
                    } : null,

                    seats,
                    products,

                    seat_total: seatTotal,
                    product_total: productTotal,
                    seat_count: seats.length,
                    product_count: products.reduce((sum, p) => sum + p.quantity, 0)
                }
            });

        } catch (error) {

            console.error('❌ getBookingDetail:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy chi tiết đơn hàng.',
                error: error.message
            });
        }
    }
}


module.exports = DashboardController;