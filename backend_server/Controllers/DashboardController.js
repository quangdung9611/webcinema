const db = require('../Config/db');

class DashboardController {

    // ============================================================
    // 1. THỐNG KÊ TỔNG QUAN
    // ============================================================
    static async getStats(req, res) {
        try {
            const { period } = req.query;

            let dateFilter = '';
            let params = [];
            let startDate;
            let endDate;

            if (period) {
                const range = DashboardController.getDateRange(period);

                startDate = range.startDate;
                endDate = range.endDate;

                dateFilter = 'AND DATE(booking_date) BETWEEN ? AND ?';
                params = [startDate, endDate];
            }

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
                JOIN bookings b
                    ON t.booking_id = b.booking_id
                WHERE b.status = 'Completed'
            `);

            // --------------------------------------------------------
            // Tổng doanh thu
            // --------------------------------------------------------
            let revenueQuery = `
                SELECT COALESCE(SUM(total_amount), 0) AS total
                FROM bookings
                WHERE status = 'Completed'
            `;

            if (dateFilter) {
                revenueQuery += ` ${dateFilter}`;
            }

            const [revenueRes] = await db.query(
                revenueQuery,
                params
            );

            const totalRevenue =
                Number(revenueRes[0]?.total) || 0;

            let response = {
                success: true,
                movies: Number(movieRes[0]?.total) || 0,
                users: Number(userRes[0]?.total) || 0,
                tickets: Number(ticketRes[0]?.total) || 0,
                revenue: totalRevenue
            };

            // --------------------------------------------------------
            // Thống kê theo khoảng thời gian
            // --------------------------------------------------------
            if (period) {

                // User mới
                const [newUsersRes] = await db.query(`
                    SELECT COUNT(*) AS total
                    FROM users
                    WHERE role != 'admin'
                      AND DATE(created_at) BETWEEN ? AND ?
                `, [
                    startDate,
                    endDate
                ]);

                // Đơn hàng mới
                const [newOrdersRes] = await db.query(`
                    SELECT COUNT(*) AS total
                    FROM bookings
                    WHERE status = 'Completed'
                      AND DATE(booking_date) BETWEEN ? AND ?
                `, [
                    startDate,
                    endDate
                ]);

                // ----------------------------------------------------
                // Khoảng thời gian trước đó
                // ----------------------------------------------------
                const start = new Date(startDate);
                const end = new Date(endDate);

                const duration =
                    Math.round(
                        (end - start) /
                        (1000 * 60 * 60 * 24)
                    ) + 1;

                const prevEnd = new Date(start);
                prevEnd.setDate(
                    prevEnd.getDate() - 1
                );

                const prevStart = new Date(prevEnd);
                prevStart.setDate(
                    prevStart.getDate() - duration + 1
                );

                const prevStartStr =
                    prevStart.toISOString().split('T')[0];

                const prevEndStr =
                    prevEnd.toISOString().split('T')[0];

                // ----------------------------------------------------
                // Doanh thu kỳ trước
                // ----------------------------------------------------
                const [prevRevenueRes] = await db.query(`
                    SELECT COALESCE(SUM(total_amount), 0) AS total
                    FROM bookings
                    WHERE status = 'Completed'
                      AND DATE(booking_date) BETWEEN ? AND ?
                `, [
                    prevStartStr,
                    prevEndStr
                ]);

                const prevRevenue =
                    Number(prevRevenueRes[0]?.total) || 0;

                const revenueGrowth =
                    prevRevenue > 0
                        ? ((totalRevenue - prevRevenue) /
                            prevRevenue) * 100
                        : 0;

                response = {
                    ...response,
                    new_users:
                        Number(newUsersRes[0]?.total) || 0,

                    new_orders:
                        Number(newOrdersRes[0]?.total) || 0,

                    revenue_growth:
                        Math.round(
                            revenueGrowth * 10
                        ) / 10,

                    period
                };
            }

            return res.status(200).json(response);

        } catch (error) {

            console.error(
                '❌ getStats error:',
                error
            );

            return res.status(500).json({
                success: false,
                message: 'Lỗi thống kê.',
                error: error.message
            });
        }
    }


    // ============================================================
    // 2. BẢNG DOANH THU THEO NGÀY
    //
    // Không dùng Line Chart nữa.
    //
    // Trả về:
    // - date
    // - formattedDate
    // - orders
    // - tickets
    // - revenue
    //
    // Đồng thời tạo đủ ngày trong khoảng lọc.
    // Ngày không có dữ liệu => 0.
    // ============================================================
    static async getRevenueTrend(req, res) {

        try {

            const { startDate, endDate } = req.query;

            // --------------------------------------------------------
            // Ngày mặc định:
            // 7 ngày gần nhất
            // --------------------------------------------------------
            let end =
                endDate ||
                new Date()
                    .toISOString()
                    .split('T')[0];

            let start =
                startDate ||
                new Date(
                    Date.now() -
                    6 * 24 * 60 * 60 * 1000
                )
                    .toISOString()
                    .split('T')[0];

            // --------------------------------------------------------
            // Nếu start > end thì đổi lại
            // --------------------------------------------------------
            if (
                new Date(start) >
                new Date(end)
            ) {
                [start, end] = [end, start];
            }

            // --------------------------------------------------------
            // LẤY DOANH THU THEO NGÀY
            //
            // Không SELECT booking_date trực tiếp.
            // Chỉ GROUP BY DATE(booking_date)
            // => không còn lỗi ONLY_FULL_GROUP_BY.
            // --------------------------------------------------------
            const [dailyData] = await db.query(`
                SELECT
                    DATE(b.booking_date) AS date,

                    COUNT(DISTINCT b.booking_id)
                        AS orders,

                    COUNT(t.ticket_id)
                        AS tickets,

                    COALESCE(
                        SUM(b.total_amount),
                        0
                    ) AS revenue

                FROM bookings b

                LEFT JOIN tickets t
                    ON t.booking_id = b.booking_id

                WHERE b.status = 'Completed'

                  AND DATE(b.booking_date)
                      BETWEEN ? AND ?

                GROUP BY DATE(b.booking_date)

                ORDER BY DATE(b.booking_date) ASC
            `, [
                start,
                end
            ]);

            // --------------------------------------------------------
            // Chuyển dữ liệu DB thành Map
            //
            // Ví dụ:
            // {
            //   "2026-07-30": {
            //      orders: 5,
            //      tickets: 10,
            //      revenue: 590000
            //   }
            // }
            // --------------------------------------------------------
            const dataMap = new Map();

            dailyData.forEach(item => {

                const dateKey =
                    item.date instanceof Date
                        ? item.date
                            .toISOString()
                            .split('T')[0]
                        : String(item.date)
                            .split('T')[0];

                dataMap.set(
                    dateKey,
                    {
                        orders:
                            Number(item.orders) || 0,

                        tickets:
                            Number(item.tickets) || 0,

                        revenue:
                            Number(item.revenue) || 0
                    }
                );
            });

            // --------------------------------------------------------
            // TẠO ĐỦ TẤT CẢ CÁC NGÀY
            // --------------------------------------------------------
            const result = [];

            const currentDate =
                new Date(`${start}T00:00:00`);

            const lastDate =
                new Date(`${end}T00:00:00`);

            while (currentDate <= lastDate) {

                const year =
                    currentDate.getFullYear();

                const month =
                    String(
                        currentDate.getMonth() + 1
                    ).padStart(2, '0');

                const day =
                    String(
                        currentDate.getDate()
                    ).padStart(2, '0');

                const dateKey =
                    `${year}-${month}-${day}`;

                const data =
                    dataMap.get(dateKey) || {
                        orders: 0,
                        tickets: 0,
                        revenue: 0
                    };

                // ----------------------------------------------------
                // Format ngày cho frontend
                // VD: 30/07/2026
                // ----------------------------------------------------
                const formattedDate =
                    `${day}/${month}/${year}`;

                result.push({
                    date: dateKey,

                    formattedDate,

                    orders: data.orders,

                    tickets: data.tickets,

                    revenue: data.revenue
                });

                currentDate.setDate(
                    currentDate.getDate() + 1
                );
            }

            // --------------------------------------------------------
            // Tổng toàn bộ khoảng thời gian
            // --------------------------------------------------------
            const summary = result.reduce(
                (acc, item) => {

                    acc.orders += item.orders;
                    acc.tickets += item.tickets;
                    acc.revenue += item.revenue;

                    return acc;

                },
                {
                    orders: 0,
                    tickets: 0,
                    revenue: 0
                }
            );

            // --------------------------------------------------------
            // RESPONSE
            // --------------------------------------------------------
            return res.status(200).json({

                success: true,

                data: result,

                summary,

                period: {
                    start,
                    end
                }

            });

        } catch (error) {

            console.error(
                '❌ getRevenueTrend error:',
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    'Lỗi lấy dữ liệu doanh thu theo ngày.',

                error: error.message

            });
        }
    }


    // ============================================================
    // 3. DOANH THU THEO PHIM
    // ============================================================
    static async getRevenueByMovie(req, res) {

        try {

            const { startDate, endDate } = req.query;

            const end =
                endDate ||
                new Date()
                    .toISOString()
                    .split('T')[0];

            const start =
                startDate ||
                new Date(
                    Date.now() -
                    29 * 24 * 60 * 60 * 1000
                )
                    .toISOString()
                    .split('T')[0];

            let finalStart = start;
            let finalEnd = end;

            if (
                new Date(finalStart) >
                new Date(finalEnd)
            ) {
                [finalStart, finalEnd] =
                    [finalEnd, finalStart];
            }

            const [movieRevenue] =
                await db.query(`

                    SELECT

                        m.movie_id,

                        m.title AS name,

                        COALESCE(
                            SUM(b.total_amount),
                            0
                        ) AS value

                    FROM movies m

                    JOIN showtimes s
                        ON m.movie_id = s.movie_id

                    JOIN bookings b
                        ON s.showtime_id =
                           b.showtime_id

                    WHERE b.status = 'Completed'

                      AND DATE(b.booking_date)
                          BETWEEN ? AND ?

                    GROUP BY
                        m.movie_id,
                        m.title

                    ORDER BY value DESC

                `, [
                    finalStart,
                    finalEnd
                ]);

            const totalRevenue =
                movieRevenue.reduce(
                    (sum, item) =>
                        sum + Number(item.value),
                    0
                );

            const dataWithPercent =
                movieRevenue.map(item => {

                    const value =
                        Number(item.value) || 0;

                    return {
                        movie_id: item.movie_id,

                        name: item.name,

                        value,

                        percent:
                            totalRevenue > 0
                                ? (
                                    value /
                                    totalRevenue *
                                    100
                                ).toFixed(1) + '%'
                                : '0%'
                    };
                });

            return res.status(200).json({

                success: true,

                data: dataWithPercent,

                period: {
                    start: finalStart,
                    end: finalEnd
                },

                total: totalRevenue

            });

        } catch (error) {

            console.error(
                '❌ getRevenueByMovie error:',
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    'Lỗi lấy doanh thu theo phim.',

                error: error.message

            });
        }
    }


    // ============================================================
    // 4. SỐ VÉ BÁN THEO PHIM
    // ============================================================
    static async getTicketsByMovie(req, res) {

        try {

            const { startDate, endDate } = req.query;

            const end =
                endDate ||
                new Date()
                    .toISOString()
                    .split('T')[0];

            const start =
                startDate ||
                new Date(
                    Date.now() -
                    29 * 24 * 60 * 60 * 1000
                )
                    .toISOString()
                    .split('T')[0];

            let finalStart = start;
            let finalEnd = end;

            if (
                new Date(finalStart) >
                new Date(finalEnd)
            ) {
                [finalStart, finalEnd] =
                    [finalEnd, finalStart];
            }

            const [ticketDetails] =
                await db.query(`

                    SELECT

                        m.movie_id,

                        m.title AS movieName,

                        COUNT(t.ticket_id)
                            AS ticketCount,

                        COALESCE(
                            SUM(b.total_amount),
                            0
                        ) AS totalRevenue

                    FROM tickets t

                    JOIN bookings b
                        ON t.booking_id =
                           b.booking_id

                    JOIN showtimes s
                        ON t.showtime_id =
                           s.showtime_id

                    JOIN movies m
                        ON s.movie_id =
                           m.movie_id

                    WHERE b.status = 'Completed'

                      AND DATE(b.booking_date)
                          BETWEEN ? AND ?

                    GROUP BY
                        m.movie_id,
                        m.title

                    ORDER BY
                        ticketCount DESC

                `, [
                    finalStart,
                    finalEnd
                ]);

            return res.status(200).json({

                success: true,

                data: ticketDetails.map(item => ({
                    movie_id: item.movie_id,

                    movieName: item.movieName,

                    ticketCount:
                        Number(item.ticketCount) || 0,

                    totalRevenue:
                        Number(item.totalRevenue) || 0
                })),

                period: {
                    start: finalStart,
                    end: finalEnd
                }

            });

        } catch (error) {

            console.error(
                '❌ getTicketsByMovie error:',
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    'Lỗi lấy số vé theo phim.',

                error: error.message

            });
        }
    }


    // ============================================================
    // 5. TOP PHIM DOANH THU CAO
    // ============================================================
    static async getTopMovies(req, res) {

        try {

            const limit =
                parseInt(req.query.limit) || 10;

            const [movies] =
                await db.query(`

                    SELECT

                        m.movie_id,

                        m.title,

                        m.movie_poster AS poster,

                        m.release_date,

                        COUNT(t.ticket_id)
                            AS tickets_sold,

                        COALESCE(
                            SUM(b.total_amount),
                            0
                        ) AS revenue,

                        COUNT(
                            DISTINCT b.booking_id
                        ) AS orders

                    FROM movies m

                    JOIN showtimes s
                        ON m.movie_id =
                           s.movie_id

                    JOIN bookings b
                        ON s.showtime_id =
                           b.showtime_id

                    JOIN tickets t
                        ON b.booking_id =
                           t.booking_id

                    WHERE b.status = 'Completed'

                    GROUP BY

                        m.movie_id,

                        m.title,

                        m.movie_poster,

                        m.release_date

                    ORDER BY revenue DESC

                    LIMIT ?

                `, [
                    limit
                ]);

            return res.status(200).json({

                success: true,

                movies: movies.map(m => ({

                    id: m.movie_id,

                    title: m.title,

                    poster: m.poster,

                    release_date:
                        m.release_date,

                    tickets_sold:
                        Number(m.tickets_sold) || 0,

                    revenue:
                        Number(m.revenue) || 0,

                    orders:
                        Number(m.orders) || 0

                }))

            });

        } catch (error) {

            console.error(
                '❌ getTopMovies error:',
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    'Lỗi lấy top phim.',

                error: error.message

            });
        }
    }


    // ============================================================
    // 6. TĂNG TRƯỞNG USER
    // ============================================================
    static async getUserGrowth(req, res) {

        try {

            const days =
                parseInt(req.query.days) || 30;

            const startDate =
                new Date(
                    Date.now() -
                    days * 24 * 60 * 60 * 1000
                )
                    .toISOString()
                    .split('T')[0];

            const [data] =
                await db.query(`

                    SELECT

                        DATE(created_at) AS date,

                        COUNT(*) AS new_users,

                        SUM(
                            COUNT(*)
                        ) OVER (
                            ORDER BY
                                DATE(created_at)
                        ) AS cumulative

                    FROM users

                    WHERE role != 'admin'

                      AND DATE(created_at) >= ?

                    GROUP BY
                        DATE(created_at)

                    ORDER BY
                        DATE(created_at) ASC

                `, [
                    startDate
                ]);

            return res.status(200).json({

                success: true,

                data: data.map(d => ({

                    date: d.date,

                    newUsers:
                        Number(d.new_users) || 0,

                    cumulative:
                        Number(d.cumulative) || 0

                }))

            });

        } catch (error) {

            console.error(
                '❌ getUserGrowth error:',
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    'Lỗi lấy tăng trưởng người dùng.',

                error: error.message

            });
        }
    }


    // ============================================================
    // HELPER: TÍNH KHOẢNG THỜI GIAN
    // ============================================================
    static getDateRange(period) {

        const now = new Date();

        const endDate =
            now.toISOString()
                .split('T')[0];

        let startDate = new Date(now);

        switch (period) {

            case 'today':
                startDate =
                    new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate()
                    );
                break;

            case 'week':
                startDate.setDate(
                    now.getDate() - 6
                );
                break;

            case 'month':
                startDate.setDate(
                    now.getDate() - 29
                );
                break;

            case 'quarter':
                startDate.setMonth(
                    now.getMonth() - 3
                );
                break;

            case 'year':
                startDate.setFullYear(
                    now.getFullYear() - 1
                );
                break;

            default:
                startDate.setDate(
                    now.getDate() - 6
                );
        }

        return {

            startDate:
                startDate
                    .toISOString()
                    .split('T')[0],

            endDate

        };
    }
}

module.exports = DashboardController;