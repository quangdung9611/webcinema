const db = require('../Config/db');

class DashboardController {

    // =========================================================
    // STATS
    // =========================================================
    static async getStats(req, res) {
        try {

            // Tổng số phim
            const [movieRes] = await db.query(`
                SELECT COUNT(*) AS total
                FROM movies
            `);

            // Tổng số khách hàng
            const [userRes] = await db.query(`
                SELECT COUNT(*) AS total
                FROM users
                WHERE role != 'admin'
            `);

            // Tổng số vé đã bán
            const [ticketRes] = await db.query(`
                SELECT COUNT(t.ticket_id) AS total
                FROM tickets t
                INNER JOIN bookings b
                    ON t.booking_id = b.booking_id
                WHERE b.status = 'Completed'
            `);

            // Tổng doanh thu
            const [revenueRes] = await db.query(`
                SELECT COALESCE(SUM(total_amount), 0) AS total
                FROM bookings
                WHERE status = 'Completed'
            `);

            return res.status(200).json({
                success: true,
                movies: Number(movieRes[0]?.total) || 0,
                users: Number(userRes[0]?.total) || 0,
                tickets: Number(ticketRes[0]?.total) || 0,
                revenue: Number(revenueRes[0]?.total) || 0
            });

        } catch (error) {

            console.error('❌ getStats error:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy thống kê dashboard.',
                error: error.message
            });
        }
    }


    // =========================================================
    // 1. REVENUE CHART
    // GET /revenue-chart
    // =========================================================
    static async getRevenueChart(req, res) {

        try {

            const {
                startDate,
                endDate
            } = req.query;

            const end =
                endDate ||
                new Date().toISOString().split('T')[0];

            const start =
                startDate ||
                new Date(
                    Date.now() - 7 * 24 * 60 * 60 * 1000
                ).toISOString().split('T')[0];


            const [data] = await db.query(`
                SELECT
                    DATE_FORMAT(booking_date, '%d/%m') AS date,
                    COALESCE(SUM(total_amount), 0) AS revenue
                FROM bookings
                WHERE status = 'Completed'
                    AND DATE(booking_date) BETWEEN ? AND ?
                GROUP BY DATE(booking_date)
                ORDER BY DATE(booking_date) ASC
            `, [
                start,
                end
            ]);


            return res.status(200).json({
                success: true,

                data: data.map(item => ({
                    date: item.date,
                    revenue: Number(item.revenue) || 0
                })),

                period: {
                    start,
                    end
                }
            });

        } catch (error) {

            console.error('❌ getRevenueChart error:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy biểu đồ doanh thu.',
                error: error.message
            });
        }
    }


    // =========================================================
    // 2. MOVIE REVENUE CHART
    // GET /movie-revenue-chart
    // =========================================================
    static async getMovieRevenueChart(req, res) {

        try {

            const {
                startDate,
                endDate
            } = req.query;

            const end =
                endDate ||
                new Date().toISOString().split('T')[0];

            const start =
                startDate ||
                new Date(
                    Date.now() - 7 * 24 * 60 * 60 * 1000
                ).toISOString().split('T')[0];


            const [movies] = await db.query(`
                SELECT
                    m.movie_id,
                    m.title AS name,

                    COALESCE(
                        SUM(b.total_amount),
                        0
                    ) AS revenue

                FROM movies m

                INNER JOIN showtimes s
                    ON m.movie_id = s.movie_id

                INNER JOIN bookings b
                    ON s.showtime_id = b.showtime_id

                WHERE b.status = 'Completed'
                    AND DATE(b.booking_date) BETWEEN ? AND ?

                GROUP BY
                    m.movie_id,
                    m.title

                ORDER BY revenue DESC
            `, [
                start,
                end
            ]);


            const totalRevenue = movies.reduce(
                (total, movie) =>
                    total + Number(movie.revenue || 0),
                0
            );


            const data = movies.map(movie => {

                const revenue =
                    Number(movie.revenue) || 0;

                const percent =
                    totalRevenue > 0
                        ? ((revenue / totalRevenue) * 100).toFixed(1)
                        : 0;

                return {
                    id: movie.movie_id,
                    name: movie.name,
                    value: revenue,
                    percent: `${percent}%`
                };
            });


            return res.status(200).json({
                success: true,
                data,
                totalRevenue,
                period: {
                    start,
                    end
                }
            });

        } catch (error) {

            console.error(
                '❌ getMovieRevenueChart error:',
                error
            );

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy doanh thu theo phim.',
                error: error.message
            });
        }
    }


    // =========================================================
    // 3. TICKET CHART
    // GET /ticket-chart
    // =========================================================
    static async getTicketChart(req, res) {

        try {

            const {
                startDate,
                endDate
            } = req.query;

            const end =
                endDate ||
                new Date().toISOString().split('T')[0];

            const start =
                startDate ||
                new Date(
                    Date.now() - 7 * 24 * 60 * 60 * 1000
                ).toISOString().split('T')[0];


            const [data] = await db.query(`
                SELECT

                    m.movie_id,

                    m.title AS movieName,

                    COUNT(t.ticket_id) AS ticketCount,

                    COALESCE(
                        SUM(b.total_amount),
                        0
                    ) AS revenue

                FROM tickets t

                INNER JOIN bookings b
                    ON t.booking_id = b.booking_id

                INNER JOIN showtimes s
                    ON t.showtime_id = s.showtime_id

                INNER JOIN movies m
                    ON s.movie_id = m.movie_id

                WHERE b.status = 'Completed'
                    AND DATE(b.booking_date) BETWEEN ? AND ?

                GROUP BY
                    m.movie_id,
                    m.title

                ORDER BY ticketCount DESC
            `, [
                start,
                end
            ]);


            return res.status(200).json({
                success: true,

                data: data.map(item => ({
                    id: item.movie_id,
                    movieName: item.movieName,
                    ticketCount: Number(item.ticketCount) || 0,
                    revenue: Number(item.revenue) || 0
                })),

                period: {
                    start,
                    end
                }
            });

        } catch (error) {

            console.error(
                '❌ getTicketChart error:',
                error
            );

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy biểu đồ số vé.',
                error: error.message
            });
        }
    }


    // =========================================================
    // 4. USER GROWTH CHART
    // GET /user-growth-chart
    // =========================================================
    static async getUserGrowthChart(req, res) {

        try {

            const {
                startDate,
                endDate
            } = req.query;

            const end =
                endDate ||
                new Date().toISOString().split('T')[0];

            const start =
                startDate ||
                new Date(
                    Date.now() - 30 * 24 * 60 * 60 * 1000
                ).toISOString().split('T')[0];


            const [data] = await db.query(`
                SELECT

                    DATE_FORMAT(
                        created_at,
                        '%d/%m'
                    ) AS date,

                    COUNT(*) AS newUsers

                FROM users

                WHERE role != 'admin'

                    AND DATE(created_at)
                    BETWEEN ? AND ?

                GROUP BY DATE(created_at)

                ORDER BY DATE(created_at) ASC
            `, [
                start,
                end
            ]);


            // Tính cumulative ở Node
            let cumulative = 0;

            const result = data.map(item => {

                const newUsers =
                    Number(item.newUsers) || 0;

                cumulative += newUsers;

                return {
                    date: item.date,
                    newUsers,
                    cumulative
                };
            });


            return res.status(200).json({
                success: true,
                data: result,
                period: {
                    start,
                    end
                }
            });

        } catch (error) {

            console.error(
                '❌ getUserGrowthChart error:',
                error
            );

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy biểu đồ tăng trưởng người dùng.',
                error: error.message
            });
        }
    }


    // =========================================================
    // TOP MOVIES
    // =========================================================
    static async getTopMovies(req, res) {

        try {

            const limit =
                Math.min(
                    parseInt(req.query.limit) || 10,
                    50
                );


            const [movies] = await db.query(`
                SELECT

                    m.movie_id,
                    m.title,
                    m.movie_poster AS poster,
                    m.release_date,

                    COUNT(t.ticket_id) AS tickets_sold,

                    COALESCE(
                        SUM(b.total_amount),
                        0
                    ) AS revenue,

                    COUNT(
                        DISTINCT b.booking_id
                    ) AS orders

                FROM movies m

                INNER JOIN showtimes s
                    ON m.movie_id = s.movie_id

                INNER JOIN bookings b
                    ON s.showtime_id = b.showtime_id

                INNER JOIN tickets t
                    ON b.booking_id = t.booking_id

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

                movies: movies.map(movie => ({
                    id: movie.movie_id,
                    title: movie.title,
                    poster: movie.poster,
                    release_date: movie.release_date,
                    tickets_sold:
                        Number(movie.tickets_sold) || 0,
                    revenue:
                        Number(movie.revenue) || 0,
                    orders:
                        Number(movie.orders) || 0
                }))
            });

        } catch (error) {

            console.error(
                '❌ getTopMovies error:',
                error
            );

            return res.status(500).json({
                success: false,
                message: 'Lỗi lấy top phim.',
                error: error.message
            });
        }
    }
}


module.exports = DashboardController;