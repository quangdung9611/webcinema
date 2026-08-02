const db = require('../Config/db');

class DashboardController {

    // ============================================================
// 1. THỐNG KÊ TỔNG QUAN (toàn bộ CSDL, không lọc theo thời gian)
// ============================================================
static async getStats(req, res) {
    try {
        // --------------------------------------------------------
        // Tổng số phim
        // --------------------------------------------------------
        const [movieRes] = await db.query(`
            SELECT COUNT(*) AS total
            FROM movies
        `);

        // --------------------------------------------------------
        // Tổng user - không tính admin
        // --------------------------------------------------------
        const [userRes] = await db.query(`
            SELECT COUNT(*) AS total
            FROM users
            WHERE role != 'admin'
        `);

        // --------------------------------------------------------
        // Tổng vé đã bán
        // --------------------------------------------------------
        const [ticketRes] = await db.query(`
            SELECT COUNT(t.ticket_id) AS total
            FROM tickets t
            JOIN bookings b ON t.booking_id = b.booking_id
            WHERE b.status = 'Completed'
        `);

        // --------------------------------------------------------
        // Tổng doanh thu (toàn bộ)
        // --------------------------------------------------------
        const [revenueRes] = await db.query(`
            SELECT COALESCE(SUM(total_amount), 0) AS total
            FROM bookings
            WHERE status = 'Completed'
        `);

        const totalRevenue = Number(revenueRes[0]?.total) || 0;

        return res.status(200).json({
            success: true,
            movies: Number(movieRes[0]?.total) || 0,
            users: Number(userRes[0]?.total) || 0,
            tickets: Number(ticketRes[0]?.total) || 0,
            revenue: totalRevenue
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
    // 2. DANH SÁCH CHI TIẾT GIAO DỊCH (BẢNG)
    //    Mỗi dòng là 1 vé HOẶC 1 sản phẩm (bắp nước)
    // ============================================================
    static async getRevenueTrend(req, res) {
        try {
            const { startDate, endDate } = req.query;

            // --------------------------------------------------------
            // Ngày mặc định: 7 ngày gần nhất
            // --------------------------------------------------------
            let end = endDate || new Date().toISOString().split('T')[0];
            let start = startDate || new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            if (new Date(start) > new Date(end)) {
                [start, end] = [end, start];
            }

            // --------------------------------------------------------
            // Lấy chi tiết từ booking_details
            // Mỗi dòng là 1 vé HOẶC 1 sản phẩm
            // --------------------------------------------------------
            const [details] = await db.query(`
                SELECT
                    b.booking_id,
                    b.booking_date,
                    b.total_amount AS booking_total,
                    u.full_name AS customer_name,
                    m.title AS movie_title,
                    s.seat_row,
                    s.seat_number,
                    s.seat_type,
                    t.ticket_code,
                    bd.item_name,
                    bd.quantity,
                    bd.price AS unit_price,
                    CASE
                        WHEN bd.seat_id IS NOT NULL THEN 'Vé'
                        ELSE 'Sản phẩm'
                    END AS item_type,
                    bd.product_id,
                    bd.seat_id
                FROM booking_details bd
                JOIN bookings b ON bd.booking_id = b.booking_id
                JOIN users u ON b.user_id = u.user_id
                LEFT JOIN tickets t ON bd.seat_id = t.seat_id AND bd.booking_id = t.booking_id
                LEFT JOIN showtimes st ON b.showtime_id = st.showtime_id
                LEFT JOIN movies m ON st.movie_id = m.movie_id
                LEFT JOIN seats s ON bd.seat_id = s.seat_id
                WHERE b.status = 'Completed'
                  AND DATE(b.booking_date) BETWEEN ? AND ?
                ORDER BY b.booking_date DESC, bd.booking_detail_id ASC
            `, [start, end]);

            // --------------------------------------------------------
            // Xử lý dữ liệu
            // --------------------------------------------------------
            let totalRevenue = 0;
            let totalTickets = 0;
            let totalProducts = 0;
            const bookingIds = new Set();

            const processed = details.map(item => {
                const revenue = Number(item.unit_price) * Number(item.quantity) || 0;
                totalRevenue += revenue;

                // Tổng vé
                if (item.item_type === 'Vé') {
                    totalTickets += Number(item.quantity) || 0;
                } else {
                    totalProducts += Number(item.quantity) || 0;
                }

                bookingIds.add(item.booking_id);

                return {
                    booking_id: item.booking_id,
                    booking_date: item.booking_date,
                    customer_name: item.customer_name || 'Khách lẻ',
                    movie_title: item.movie_title || '--',
                    seat_info: item.seat_id
                        ? `${item.seat_row || ''}${item.seat_number || ''} (${item.seat_type || 'Standard'})`
                        : '--',
                    ticket_code: item.ticket_code || '--',
                    item_name: item.item_name || '--',
                    quantity: Number(item.quantity) || 0,
                    unit_price: Number(item.unit_price) || 0,
                    revenue: revenue,
                    item_type: item.item_type,
                    product_id: item.product_id,
                    seat_id: item.seat_id
                };
            });

            const totalOrders = bookingIds.size;

            // --------------------------------------------------------
            // RESPONSE
            // --------------------------------------------------------
            return res.status(200).json({
                success: true,
                data: processed,
                summary: {
                    totalRevenue: totalRevenue,
                    totalOrders: totalOrders,
                    totalTickets: totalTickets,
                    totalProducts: totalProducts,
                    totalItems: processed.length
                },
                period: { start, end }
            });

        } catch (error) {
            console.error('❌ getRevenueTrend error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy dữ liệu giao dịch.',
                error: error.message
            });
        }
    }

    // ============================================================
    // 3. DOANH THU THEO PHIM (Pie Chart)
    // ============================================================
    static async getRevenueByMovie(req, res) {
        try {
            const { startDate, endDate } = req.query;

            const end = endDate || new Date().toISOString().split('T')[0];
            const start = startDate || new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            let finalStart = start;
            let finalEnd = end;

            if (new Date(finalStart) > new Date(finalEnd)) {
                [finalStart, finalEnd] = [finalEnd, finalStart];
            }

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
            `, [finalStart, finalEnd]);

            const totalRevenue = movieRevenue.reduce(
                (sum, item) => sum + Number(item.value),
                0
            );

            const dataWithPercent = movieRevenue.map(item => {
                const value = Number(item.value) || 0;
                return {
                    movie_id: item.movie_id,
                    name: item.name,
                    value: value,
                    percent: totalRevenue > 0
                        ? ((value / totalRevenue) * 100).toFixed(1) + '%'
                        : '0%'
                };
            });

            return res.status(200).json({
                success: true,
                data: dataWithPercent,
                period: { start: finalStart, end: finalEnd },
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
    // 4. SỐ VÉ BÁN THEO PHIM (Bar Chart)
    // ============================================================
    static async getTicketsByMovie(req, res) {
        try {
            const { startDate, endDate } = req.query;

            const end = endDate || new Date().toISOString().split('T')[0];
            const start = startDate || new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            let finalStart = start;
            let finalEnd = end;

            if (new Date(finalStart) > new Date(finalEnd)) {
                [finalStart, finalEnd] = [finalEnd, finalStart];
            }

            const [ticketDetails] = await db.query(`
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
            `, [finalStart, finalEnd]);

            return res.status(200).json({
                success: true,
                data: ticketDetails.map(item => ({
                    movie_id: item.movie_id,
                    movieName: item.movieName,
                    ticketCount: Number(item.ticketCount) || 0,
                    totalRevenue: Number(item.totalRevenue) || 0
                })),
                period: { start: finalStart, end: finalEnd }
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
    // 5. TOP PHIM DOANH THU CAO
    // ============================================================
    static async getTopMovies(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;

            const [movies] = await db.query(`
                SELECT
                    m.movie_id,
                    m.title,
                    m.movie_poster AS poster,
                    m.release_date,
                    COUNT(t.ticket_id) AS tickets_sold,
                    COALESCE(SUM(b.total_amount), 0) AS revenue,
                    COUNT(DISTINCT b.booking_id) AS orders
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
    // 6. TĂNG TRƯỞNG USER
    // ============================================================
    static async getUserGrowth(req, res) {
        try {
            const days = parseInt(req.query.days) || 30;

            const startDate = new Date(
                Date.now() - days * 24 * 60 * 60 * 1000
            ).toISOString().split('T')[0];

            const [data] = await db.query(`
                SELECT
                    DATE(created_at) AS date,
                    COUNT(*) AS new_users,
                    SUM(COUNT(*)) OVER (
                        ORDER BY DATE(created_at)
                    ) AS cumulative
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
                    newUsers: Number(d.new_users) || 0,
                    cumulative: Number(d.cumulative) || 0
                }))
            });

        } catch (error) {
            console.error('❌ getUserGrowth error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy tăng trưởng người dùng.',
                error: error.message
            });
        }
    }

    // ============================================================
    // HELPER: TÍNH KHOẢNG THỜI GIAN
    // ============================================================
    static getDateRange(period) {
        const now = new Date();
        const endDate = now.toISOString().split('T')[0];
        let startDate = new Date(now);

        switch (period) {
            case 'today':
                startDate = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate()
                );
                break;
            case 'week':
                startDate.setDate(now.getDate() - 6);
                break;
            case 'month':
                startDate.setDate(now.getDate() - 29);
                break;
            case 'quarter':
                startDate.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setDate(now.getDate() - 6);
        }

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate
        };
    }
}

module.exports = DashboardController;