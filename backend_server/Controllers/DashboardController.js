const db = require('../Config/db');

class DashboardController {
    // ============================================================
    // 1. THỐNG KÊ TỔNG QUAN (có so sánh với kỳ trước)
    // ============================================================
    static async getStats(req, res) {
        try {
            const { period = 'week' } = req.query;
            const { startDate, endDate, previousStart, previousEnd } = DashboardController.getDateRangeWithCompare(period);

            // 1. Tổng phim (không thay đổi theo thời gian)
            const [movieRes] = await db.query(`SELECT COUNT(*) AS total FROM movies`);

            // 2. User (không thay đổi)
            const [userRes] = await db.query(`SELECT COUNT(*) AS total FROM users WHERE role != 'admin'`);

            // 3. Vé bán trong kỳ hiện tại
            const [ticketRes] = await db.query(`
                SELECT COUNT(t.ticket_id) AS total
                FROM tickets t
                JOIN bookings b ON t.booking_id = b.booking_id
                WHERE b.status = 'Completed' AND DATE(b.booking_date) BETWEEN ? AND ?
            `, [startDate, endDate]);

            // 4. Vé bán kỳ trước (để so sánh)
            const [prevTicketRes] = await db.query(`
                SELECT COUNT(t.ticket_id) AS total
                FROM tickets t
                JOIN bookings b ON t.booking_id = b.booking_id
                WHERE b.status = 'Completed' AND DATE(b.booking_date) BETWEEN ? AND ?
            `, [previousStart, previousEnd]);

            // 5. Doanh thu kỳ hiện tại
            const [revenueRes] = await db.query(`
                SELECT COALESCE(SUM(total_amount), 0) AS total
                FROM bookings
                WHERE status = 'Completed' AND DATE(booking_date) BETWEEN ? AND ?
            `, [startDate, endDate]);

            // 6. Doanh thu kỳ trước
            const [prevRevenueRes] = await db.query(`
                SELECT COALESCE(SUM(total_amount), 0) AS total
                FROM bookings
                WHERE status = 'Completed' AND DATE(booking_date) BETWEEN ? AND ?
            `, [previousStart, previousEnd]);

            const currentTickets = Number(ticketRes[0]?.total) || 0;
            const prevTickets = Number(prevTicketRes[0]?.total) || 0;
            const currentRevenue = Number(revenueRes[0]?.total) || 0;
            const prevRevenue = Number(prevRevenueRes[0]?.total) || 0;

            return res.status(200).json({
                success: true,
                movies: Number(movieRes[0]?.total) || 0,
                users: Number(userRes[0]?.total) || 0,
                tickets: currentTickets,
                ticketsChange: DashboardController.calcPercentChange(currentTickets, prevTickets),
                revenue: currentRevenue,
                revenueChange: DashboardController.calcPercentChange(currentRevenue, prevRevenue),
                period: { start: startDate, end: endDate }
            });
        } catch (error) {
            console.error('❌ getStats error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê.',
                error: error.message
            });
        }
    }

    // ============================================================
    // 2. DOANH THU THEO NGÀY (Line Chart)
    // ============================================================
    static async getDailyRevenue(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const { start, end } = DashboardController.getValidDates(startDate, endDate);

            const [data] = await db.query(`
                SELECT
                    DATE(booking_date) AS date,
                    COALESCE(SUM(total_amount), 0) AS revenue,
                    COUNT(booking_id) AS orders,
                    COUNT(t.ticket_id) AS tickets
                FROM bookings b
                LEFT JOIN tickets t ON b.booking_id = t.booking_id
                WHERE b.status = 'Completed'
                  AND DATE(booking_date) BETWEEN ? AND ?
                GROUP BY DATE(booking_date)
                ORDER BY DATE(booking_date) ASC
            `, [start, end]);

            // Tạo chuỗi ngày đầy đủ (bao gồm các ngày không có dữ liệu)
            const dateMap = new Map();
            let current = new Date(start);
            const endDateObj = new Date(end);
            while (current <= endDateObj) {
                const key = current.toISOString().split('T')[0];
                dateMap.set(key, { date: key, revenue: 0, orders: 0, tickets: 0 });
                current.setDate(current.getDate() + 1);
            }

            data.forEach(item => {
                const key = item.date.toISOString().split('T')[0];
                if (dateMap.has(key)) {
                    dateMap.set(key, {
                        date: key,
                        revenue: Number(item.revenue) || 0,
                        orders: Number(item.orders) || 0,
                        tickets: Number(item.tickets) || 0
                    });
                }
            });

            const result = Array.from(dateMap.values());

            return res.status(200).json({
                success: true,
                data: result,
                period: { start, end }
            });
        } catch (error) {
            console.error('❌ getDailyRevenue error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy doanh thu theo ngày.',
                error: error.message
            });
        }
    }

    // ============================================================
    // 3. CHI TIẾT GIAO DỊCH (BẢNG) - GỘP THEO BOOKING
    // ============================================================
    static async getTransactions(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const { start, end } = DashboardController.getValidDates(startDate, endDate);

            const [rows] = await db.query(`
                SELECT
                    b.booking_id,
                    b.booking_date,
                    u.full_name AS customer_name,
                    m.title AS movie_title,
                    b.total_amount,
                    GROUP_CONCAT(
                        CONCAT(
                            CASE WHEN bd.seat_id IS NOT NULL THEN 'Vé' ELSE 'SP' END,
                            ':',
                            COALESCE(bd.item_name, ''),
                            'x',
                            bd.quantity,
                            '=',
                            bd.price
                        ) SEPARATOR ' | '
                    ) AS detail_summary,
                    COUNT(DISTINCT bd.seat_id) AS ticket_count,
                    COUNT(DISTINCT CASE WHEN bd.product_id IS NOT NULL THEN bd.booking_detail_id END) AS product_count
                FROM bookings b
                JOIN users u ON b.user_id = u.user_id
                LEFT JOIN booking_details bd ON b.booking_id = bd.booking_id
                LEFT JOIN showtimes s ON b.showtime_id = s.showtime_id
                LEFT JOIN movies m ON s.movie_id = m.movie_id
                WHERE b.status = 'Completed'
                  AND DATE(b.booking_date) BETWEEN ? AND ?
                GROUP BY b.booking_id, b.booking_date, u.full_name, m.title, b.total_amount
                ORDER BY b.booking_date DESC
            `, [start, end]);

            return res.status(200).json({
                success: true,
                data: rows.map(row => ({
                    booking_id: row.booking_id,
                    booking_date: row.booking_date,
                    customer_name: row.customer_name || 'Khách lẻ',
                    movie_title: row.movie_title || '--',
                    total_amount: Number(row.total_amount) || 0,
                    detail_summary: row.detail_summary || '--',
                    ticket_count: Number(row.ticket_count) || 0,
                    product_count: Number(row.product_count) || 0
                })),
                period: { start, end }
            });
        } catch (error) {
            console.error('❌ getTransactions error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy giao dịch.',
                error: error.message
            });
        }
    }

    // ============================================================
    // 4. DOANH THU THEO PHIM (Pie Chart)
    // ============================================================
    static async getRevenueByMovie(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const { start, end } = DashboardController.getValidDates(startDate, endDate);

            const [movieRevenue] = await db.query(`
                SELECT
                    m.movie_id,
                    m.title AS name,
                    COALESCE(SUM(b.total_amount), 0) AS value
                FROM movies m
                JOIN showtimes s ON m.movie_id = s.movie_id
                JOIN bookings b ON s.showtime_id = b.showtime_id
                WHERE b.status = 'Completed'
                  AND DATE(b.booking_date) BETWEEN ? AND ?
                GROUP BY m.movie_id, m.title
                ORDER BY value DESC
            `, [start, end]);

            const totalRevenue = movieRevenue.reduce(
                (sum, item) => sum + Number(item.value),
                0
            );

            const dataWithPercent = movieRevenue.map(item => ({
                movie_id: item.movie_id,
                name: item.name,
                value: Number(item.value) || 0,
                percent: totalRevenue > 0
                    ? ((Number(item.value) / totalRevenue) * 100).toFixed(1) + '%'
                    : '0%'
            }));

            return res.status(200).json({
                success: true,
                data: dataWithPercent,
                period: { start, end },
                total: totalRevenue
            });
        } catch (error) {
            console.error('❌ getRevenueByMovie error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy doanh thu theo phim.',
                error: error.message
            });
        }
    }

    // ============================================================
    // 5. TOP PHIM DOANH THU CAO
    // ============================================================
    static async getTopMovies(req, res) {
        try {
            const { startDate, endDate, limit = 5 } = req.query;
            const { start, end } = DashboardController.getValidDates(startDate, endDate);

            const [movies] = await db.query(`
                SELECT
                    m.movie_id,
                    m.title,
                    m.movie_poster AS poster,
                    m.release_date,
                    COUNT(DISTINCT t.ticket_id) AS tickets_sold,
                    COALESCE(SUM(b.total_amount), 0) AS revenue,
                    COUNT(DISTINCT b.booking_id) AS orders
                FROM movies m
                JOIN showtimes s ON m.movie_id = s.movie_id
                JOIN bookings b ON s.showtime_id = b.showtime_id
                JOIN tickets t ON b.booking_id = t.booking_id
                WHERE b.status = 'Completed'
                  AND DATE(b.booking_date) BETWEEN ? AND ?
                GROUP BY m.movie_id, m.title, m.movie_poster, m.release_date
                ORDER BY revenue DESC
                LIMIT ?
            `, [start, end, Number(limit)]);

            return res.status(200).json({
                success: true,
                movies: movies.map(m => ({
                    id: m.movie_id,
                    title: m.title,
                    poster: m.poster,
                    release_date: m.release_date,
                    tickets_sold: Number(m.tickets_sold) || 0,
                    revenue: Number(m.revenue) || 0,
                    orders: Number(m.orders) || 0
                }))
            });
        } catch (error) {
            console.error('❌ getTopMovies error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy top phim.',
                error: error.message
            });
        }
    }

    // ============================================================
    // 6. SỐ VÉ BÁN THEO PHIM (Bar Chart)
    // ============================================================
    static async getTicketsByMovie(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const { start, end } = DashboardController.getValidDates(startDate, endDate);

            const [data] = await db.query(`
                SELECT
                    m.movie_id,
                    m.title AS movieName,
                    COUNT(t.ticket_id) AS ticketCount,
                    COALESCE(SUM(b.total_amount), 0) AS totalRevenue
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
                data: data.map(item => ({
                    movie_id: item.movie_id,
                    movieName: item.movieName,
                    ticketCount: Number(item.ticketCount) || 0,
                    totalRevenue: Number(item.totalRevenue) || 0
                })),
                period: { start, end }
            });
        } catch (error) {
            console.error('❌ getTicketsByMovie error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy số vé theo phim.',
                error: error.message
            });
        }
    }

    // ============================================================
    // HELPER: LẤY KHOẢNG THỜI GIAN + SO SÁNH
    // ============================================================
    static getDateRangeWithCompare(period) {
        const now = new Date();
        const end = now.toISOString().split('T')[0];
        let start = new Date(now);
        let prevStart = new Date(now);
        let prevEnd = new Date(now);

        switch (period) {
            case 'today':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                prevStart = new Date(start);
                prevStart.setDate(prevStart.getDate() - 1);
                prevEnd = new Date(start);
                prevEnd.setDate(prevEnd.getDate() - 1);
                break;
            case 'week':
                start.setDate(now.getDate() - 6);
                prevStart = new Date(start);
                prevStart.setDate(prevStart.getDate() - 7);
                prevEnd = new Date(start);
                prevEnd.setDate(prevEnd.getDate() - 1);
                break;
            case 'month':
                start.setDate(now.getDate() - 29);
                prevStart = new Date(start);
                prevStart.setDate(prevStart.getDate() - 30);
                prevEnd = new Date(start);
                prevEnd.setDate(prevEnd.getDate() - 1);
                break;
            case 'quarter':
                start.setDate(now.getDate() - 89);
                prevStart = new Date(start);
                prevStart.setDate(prevStart.getDate() - 90);
                prevEnd = new Date(start);
                prevEnd.setDate(prevEnd.getDate() - 1);
                break;
            case 'year':
                start.setFullYear(now.getFullYear() - 1);
                prevStart = new Date(start);
                prevStart.setFullYear(prevStart.getFullYear() - 1);
                prevEnd = new Date(start);
                prevEnd.setDate(prevEnd.getDate() - 1);
                break;
            default:
                start.setDate(now.getDate() - 6);
                prevStart = new Date(start);
                prevStart.setDate(prevStart.getDate() - 7);
                prevEnd = new Date(start);
                prevEnd.setDate(prevEnd.getDate() - 1);
        }

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end,
            previousStart: prevStart.toISOString().split('T')[0],
            previousEnd: prevEnd.toISOString().split('T')[0]
        };
    }

    static getValidDates(startDate, endDate) {
        const end = endDate || new Date().toISOString().split('T')[0];
        let start = startDate || new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        if (new Date(start) > new Date(end)) {
            [start, end] = [end, start];
        }
        return { start, end };
    }

    static calcPercentChange(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return parseFloat(((current - previous) / previous * 100).toFixed(1));
    }
}

module.exports = DashboardController;