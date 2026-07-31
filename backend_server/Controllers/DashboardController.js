const db = require('../Config/db');

class DashboardController {

    // =========================================================
    // GET DATE RANGE
    // =========================================================

    static getDateRange(period = '7d') {

        const now = new Date();

        const endDate =
            now.toISOString().split('T')[0];

        const start = new Date(now);

        switch (period) {

            case 'today':
                start.setHours(0, 0, 0, 0);
                break;

            case '7d':
                start.setDate(
                    start.getDate() - 6
                );
                break;

            case '30d':
                start.setDate(
                    start.getDate() - 29
                );
                break;

            case '3m':
                start.setMonth(
                    start.getMonth() - 3
                );
                break;

            case '12m':
                start.setFullYear(
                    start.getFullYear() - 1
                );
                break;

            default:
                start.setDate(
                    start.getDate() - 6
                );
                break;
        }

        return {
            startDate:
                start.toISOString().split('T')[0],

            endDate
        };
    }


    // =========================================================
    // FORMAT DATE
    // =========================================================

    static formatDate(date) {

        return new Date(date)
            .toISOString()
            .split('T')[0];

    }


    // =========================================================
    // BUILD DATE SERIES
    // =========================================================

    static buildDateSeries(
        startDate,
        endDate
    ) {

        const result = [];

        const current =
            new Date(`${startDate}T00:00:00`);

        const end =
            new Date(`${endDate}T00:00:00`);


        while (current <= end) {

            const date =
                current
                    .toISOString()
                    .split('T')[0];

            result.push(date);

            current.setDate(
                current.getDate() + 1
            );
        }


        return result;
    }


    // =========================================================
    // FORMAT LABEL
    // =========================================================

    static formatDateLabel(date) {

        const [year, month, day] =
            date.split('-');

        return `${day}/${month}`;

    }


    // =========================================================
    // CALCULATE CHANGE %
    // =========================================================

    static calculateChange(
        current,
        previous
    ) {

        current =
            Number(current) || 0;

        previous =
            Number(previous) || 0;


        if (previous === 0) {

            if (current === 0) {
                return 0;
            }

            return 100;
        }


        return Number(
            (
                ((current - previous) /
                    previous) *
                100
            ).toFixed(1)
        );
    }


    // =========================================================
    // 1. OVERVIEW
    //
    // GET /dashboard/overview
    // =========================================================

    static async getOverview(req, res) {

        try {

            const {
                period = '7d',
                startDate: customStart,
                endDate: customEnd
            } = req.query;


            let startDate;
            let endDate;


            if (
                customStart &&
                customEnd
            ) {

                startDate = customStart;
                endDate = customEnd;

            } else {

                const range =
                    DashboardController
                        .getDateRange(period);

                startDate =
                    range.startDate;

                endDate =
                    range.endDate;
            }


            // =================================================
            // PREVIOUS PERIOD
            // =================================================

            const start =
                new Date(
                    `${startDate}T00:00:00`
                );

            const end =
                new Date(
                    `${endDate}T00:00:00`
                );


            const duration =
                Math.max(
                    1,
                    Math.round(
                        (
                            end - start
                        ) /
                        (
                            1000 *
                            60 *
                            60 *
                            24
                        )
                    ) + 1
                );


            const previousEnd =
                new Date(start);

            previousEnd.setDate(
                previousEnd.getDate() - 1
            );


            const previousStart =
                new Date(previousEnd);

            previousStart.setDate(
                previousStart.getDate() -
                duration +
                1
            );


            const previousStartDate =
                DashboardController.formatDate(
                    previousStart
                );

            const previousEndDate =
                DashboardController.formatDate(
                    previousEnd
                );


            // =================================================
            // TOTAL MOVIES
            // =================================================

            const [
                movieResult
            ] = await db.query(`
                SELECT COUNT(*) AS total
                FROM movies
            `);


            // =================================================
            // TOTAL USERS
            // =================================================

            const [
                userResult
            ] = await db.query(`
                SELECT COUNT(*) AS total
                FROM users
                WHERE role != 'admin'
            `);


            // =================================================
            // CURRENT PERIOD
            // =================================================

            const [
                currentResult
            ] = await db.query(`
                SELECT

                    COALESCE(
                        SUM(
                            CASE
                                WHEN b.status = 'Completed'
                                THEN b.total_amount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS revenue,

                    COUNT(
                        DISTINCT
                        CASE
                            WHEN b.status = 'Completed'
                            THEN b.booking_id
                        END
                    ) AS orders

                FROM bookings b

                WHERE DATE(b.booking_date)
                BETWEEN ? AND ?
            `, [
                startDate,
                endDate
            ]);


            // =================================================
            // CURRENT TICKETS
            // =================================================

            const [
                currentTicketsResult
            ] = await db.query(`
                SELECT COUNT(t.ticket_id) AS total

                FROM tickets t

                INNER JOIN bookings b
                    ON t.booking_id = b.booking_id

                WHERE b.status = 'Completed'

                    AND DATE(b.booking_date)
                    BETWEEN ? AND ?
            `, [
                startDate,
                endDate
            ]);


            // =================================================
            // NEW USERS
            // =================================================

            const [
                currentUsersResult
            ] = await db.query(`
                SELECT COUNT(*) AS total

                FROM users

                WHERE role != 'admin'

                    AND DATE(created_at)
                    BETWEEN ? AND ?
            `, [
                startDate,
                endDate
            ]);


            // =================================================
            // PREVIOUS PERIOD
            // =================================================

            const [
                previousResult
            ] = await db.query(`
                SELECT

                    COALESCE(
                        SUM(total_amount),
                        0
                    ) AS revenue,

                    COUNT(*) AS orders

                FROM bookings

                WHERE status = 'Completed'

                    AND DATE(booking_date)
                    BETWEEN ? AND ?
            `, [
                previousStartDate,
                previousEndDate
            ]);


            const [
                previousTicketsResult
            ] = await db.query(`
                SELECT COUNT(t.ticket_id) AS total

                FROM tickets t

                INNER JOIN bookings b
                    ON t.booking_id = b.booking_id

                WHERE b.status = 'Completed'

                    AND DATE(b.booking_date)
                    BETWEEN ? AND ?
            `, [
                previousStartDate,
                previousEndDate
            ]);


            const [
                previousUsersResult
            ] = await db.query(`
                SELECT COUNT(*) AS total

                FROM users

                WHERE role != 'admin'

                    AND DATE(created_at)
                    BETWEEN ? AND ?
            `, [
                previousStartDate,
                previousEndDate
            ]);


            // =================================================
            // VALUES
            // =================================================

            const revenue =
                Number(
                    currentResult[0]?.revenue
                ) || 0;


            const tickets =
                Number(
                    currentTicketsResult[0]?.total
                ) || 0;


            const users =
                Number(
                    userResult[0]?.total
                ) || 0;


            const movies =
                Number(
                    movieResult[0]?.total
                ) || 0;


            const orders =
                Number(
                    currentResult[0]?.orders
                ) || 0;


            const newUsers =
                Number(
                    currentUsersResult[0]?.total
                ) || 0;


            const previousRevenue =
                Number(
                    previousResult[0]?.revenue
                ) || 0;


            const previousTickets =
                Number(
                    previousTicketsResult[0]?.total
                ) || 0;


            const previousUsers =
                Number(
                    previousUsersResult[0]?.total
                ) || 0;


            return res.status(200).json({

                success: true,

                period: {
                    period,
                    startDate,
                    endDate
                },

                kpi: {

                    revenue,
                    revenueChange:
                        DashboardController
                            .calculateChange(
                                revenue,
                                previousRevenue
                            ),

                    tickets,
                    ticketsChange:
                        DashboardController
                            .calculateChange(
                                tickets,
                                previousTickets
                            ),

                    users,

                    newUsers,

                    usersChange:
                        DashboardController
                            .calculateChange(
                                newUsers,
                                previousUsers
                            ),

                    movies,

                    orders

                }

            });


        } catch (error) {

            console.error(
                '❌ Dashboard Overview:',
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    'Lỗi lấy tổng quan dashboard.',

                error:
                    error.message

            });

        }

    }


    // =========================================================
    // 2. ANALYTICS
    //
    // GET /dashboard/analytics
    // =========================================================

    static async getAnalytics(req, res) {

        try {

            const {
                period = '7d',
                startDate: customStart,
                endDate: customEnd
            } = req.query;


            let startDate;
            let endDate;


            if (
                customStart &&
                customEnd
            ) {

                startDate = customStart;
                endDate = customEnd;

            } else {

                const range =
                    DashboardController
                        .getDateRange(period);

                startDate =
                    range.startDate;

                endDate =
                    range.endDate;
            }


            // =================================================
            // 1. REVENUE BY DAY
            // =================================================

            const [
                revenueRows
            ] = await db.query(`

                SELECT

                    DATE(booking_date)
                        AS booking_day,

                    COALESCE(
                        SUM(total_amount),
                        0
                    ) AS revenue

                FROM bookings

                WHERE status = 'Completed'

                    AND DATE(booking_date)
                    BETWEEN ? AND ?

                GROUP BY
                    DATE(booking_date)

                ORDER BY
                    DATE(booking_date) ASC

            `, [
                startDate,
                endDate
            ]);


            const revenueMap =
                new Map();


            revenueRows.forEach(row => {

                const date =
                    DashboardController.formatDate(
                        row.booking_day
                    );


                revenueMap.set(
                    date,
                    Number(row.revenue) || 0
                );

            });


            const dates =
                DashboardController.buildDateSeries(
                    startDate,
                    endDate
                );


            const revenue =
                dates.map(date => ({

                    date,

                    label:
                        DashboardController
                            .formatDateLabel(
                                date
                            ),

                    value:
                        revenueMap.get(date) || 0

                }));


            // =================================================
            // 2. TICKETS BY DAY
            // =================================================

            const [
                ticketRows
            ] = await db.query(`

                SELECT

                    DATE(b.booking_date)
                        AS booking_day,

                    COUNT(t.ticket_id)
                        AS tickets

                FROM tickets t

                INNER JOIN bookings b
                    ON t.booking_id =
                       b.booking_id

                WHERE b.status =
                    'Completed'

                    AND DATE(b.booking_date)
                    BETWEEN ? AND ?

                GROUP BY
                    DATE(b.booking_date)

                ORDER BY
                    DATE(b.booking_date) ASC

            `, [
                startDate,
                endDate
            ]);


            const ticketMap =
                new Map();


            ticketRows.forEach(row => {

                const date =
                    DashboardController.formatDate(
                        row.booking_day
                    );


                ticketMap.set(
                    date,
                    Number(row.tickets) || 0
                );

            });


            const tickets =
                dates.map(date => ({

                    date,

                    label:
                        DashboardController
                            .formatDateLabel(
                                date
                            ),

                    value:
                        ticketMap.get(date) || 0

                }));


            // =================================================
            // 3. TOP MOVIES
            //
            // IMPORTANT:
            // Do NOT SUM booking amount after JOIN tickets
            // =================================================

            const [
                topMovies
            ] = await db.query(`

                SELECT

                    m.movie_id AS id,

                    m.title,

                    m.movie_poster AS poster,

                    COALESCE(
                        revenue_data.revenue,
                        0
                    ) AS revenue,

                    COALESCE(
                        ticket_data.tickets_sold,
                        0
                    ) AS tickets_sold,

                    COALESCE(
                        order_data.orders,
                        0
                    ) AS orders

                FROM movies m

                LEFT JOIN (

                    SELECT

                        s.movie_id,

                        SUM(
                            b.total_amount
                        ) AS revenue

                    FROM bookings b

                    INNER JOIN showtimes s
                        ON b.showtime_id =
                           s.showtime_id

                    WHERE b.status =
                        'Completed'

                        AND DATE(b.booking_date)
                        BETWEEN ? AND ?

                    GROUP BY
                        s.movie_id

                ) revenue_data

                    ON revenue_data.movie_id =
                       m.movie_id


                LEFT JOIN (

                    SELECT

                        s.movie_id,

                        COUNT(t.ticket_id)
                            AS tickets_sold

                    FROM tickets t

                    INNER JOIN bookings b
                        ON t.booking_id =
                           b.booking_id

                    INNER JOIN showtimes s
                        ON t.showtime_id =
                           s.showtime_id

                    WHERE b.status =
                        'Completed'

                        AND DATE(b.booking_date)
                        BETWEEN ? AND ?

                    GROUP BY
                        s.movie_id

                ) ticket_data

                    ON ticket_data.movie_id =
                       m.movie_id


                LEFT JOIN (

                    SELECT

                        s.movie_id,

                        COUNT(
                            DISTINCT b.booking_id
                        ) AS orders

                    FROM bookings b

                    INNER JOIN showtimes s
                        ON b.showtime_id =
                           s.showtime_id

                    WHERE b.status =
                        'Completed'

                        AND DATE(b.booking_date)
                        BETWEEN ? AND ?

                    GROUP BY
                        s.movie_id

                ) order_data

                    ON order_data.movie_id =
                       m.movie_id


                WHERE
                    COALESCE(
                        revenue_data.revenue,
                        0
                    ) > 0

                ORDER BY
                    revenue DESC

                LIMIT 10

            `, [
                startDate,
                endDate,

                startDate,
                endDate,

                startDate,
                endDate
            ]);


            const formattedTopMovies =
                topMovies.map(movie => ({

                    id:
                        movie.id,

                    title:
                        movie.title,

                    poster:
                        movie.poster,

                    revenue:
                        Number(movie.revenue) || 0,

                    tickets:
                        Number(movie.tickets_sold) || 0,

                    orders:
                        Number(movie.orders) || 0

                }));


            // =================================================
            // 4. USER GROWTH
            // =================================================

            const [
                userRows
            ] = await db.query(`

                SELECT

                    DATE(created_at)
                        AS created_day,

                    COUNT(*) AS new_users

                FROM users

                WHERE role != 'admin'

                    AND DATE(created_at)
                    BETWEEN ? AND ?

                GROUP BY
                    DATE(created_at)

                ORDER BY
                    DATE(created_at) ASC

            `, [
                startDate,
                endDate
            ]);


            // =================================================
            // USERS BEFORE START DATE
            // =================================================

            const [
                baselineRows
            ] = await db.query(`

                SELECT COUNT(*) AS total

                FROM users

                WHERE role != 'admin'

                    AND DATE(created_at) < ?

            `, [
                startDate
            ]);


            let cumulative =
                Number(
                    baselineRows[0]?.total
                ) || 0;


            const userMap =
                new Map();


            userRows.forEach(row => {

                const date =
                    DashboardController.formatDate(
                        row.created_day
                    );


                userMap.set(
                    date,
                    Number(row.new_users) || 0
                );

            });


            const userGrowth =
                dates.map(date => {

                    const newUsers =
                        userMap.get(date) || 0;


                    cumulative += newUsers;


                    return {

                        date,

                        label:
                            DashboardController
                                .formatDateLabel(
                                    date
                                ),

                        newUsers,

                        cumulative

                    };

                });


            // =================================================
            // RESPONSE
            // =================================================

            return res.status(200).json({

                success: true,

                period: {
                    period,
                    startDate,
                    endDate
                },

                revenue,

                tickets,

                topMovies:
                    formattedTopMovies,

                userGrowth

            });


        } catch (error) {

            console.error(
                '❌ Dashboard Analytics:',
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    'Lỗi lấy dữ liệu phân tích dashboard.',

                error:
                    error.message

            });

        }

    }


    // =========================================================
    // 3. RECENT ACTIVITY
    //
    // GET /dashboard/recent-activity
    // =========================================================

    static async getRecentActivity(req, res) {

        try {

            const limit =
                Math.min(
                    parseInt(
                        req.query.limit
                    ) || 8,
                    20
                );


            // =================================================
            // RECENT BOOKINGS
            // =================================================

            const [
                bookingRows
            ] = await db.query(`

                SELECT

                    b.booking_id,

                    b.total_amount,

                    b.booking_date,

                    b.status,

                    u.username,

                    u.email

                FROM bookings b

                LEFT JOIN users u
                    ON b.user_id =
                       u.user_id

                ORDER BY
                    b.booking_date DESC

                LIMIT ?

            `, [
                limit
            ]);


            // =================================================
            // RECENT USERS
            // =================================================

            const [
                userRows
            ] = await db.query(`

                SELECT

                    user_id,

                    username,

                    email,

                    created_at

                FROM users

                WHERE role != 'admin'

                ORDER BY
                    created_at DESC

                LIMIT ?

            `, [
                limit
            ]);


            const activities = [];


            // =================================================
            // BOOKING ACTIVITIES
            // =================================================

            bookingRows.forEach(item => {

                activities.push({

                    id:
                        `booking-${item.booking_id}`,

                    type:
                        'booking',

                    title:
                        item.status === 'Completed'
                            ? 'Đặt vé thành công'
                            : 'Đơn đặt vé mới',

                    description:
                        item.username
                            ? `${item.username} đã đặt vé`
                            : 'Có đơn đặt vé mới',

                    amount:
                        Number(
                            item.total_amount
                        ) || 0,

                    date:
                        item.booking_date

                });

            });


            // =================================================
            // USER ACTIVITIES
            // =================================================

            userRows.forEach(item => {

                activities.push({

                    id:
                        `user-${item.user_id}`,

                    type:
                        'user',

                    title:
                        'Người dùng mới',

                    description:
                        item.username ||
                        item.email ||
                        'Người dùng mới đăng ký',

                    amount:
                        null,

                    date:
                        item.created_at

                });

            });


            // =================================================
            // SORT
            // =================================================

            activities.sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            );


            return res.status(200).json({

                success: true,

                activities:
                    activities.slice(
                        0,
                        limit
                    )

            });


        } catch (error) {

            console.error(
                '❌ Dashboard Recent Activity:',
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    'Lỗi lấy hoạt động gần đây.',

                error:
                    error.message

            });

        }

    }


    // =========================================================
    // LEGACY STATS
    //
    // Giữ lại để không làm hỏng API cũ.
    // =========================================================

    static async getStats(req, res) {

        try {

            const {
                period = '7d'
            } = req.query;


            const range =
                DashboardController
                    .getDateRange(period);


            const [
                movieResult
            ] = await db.query(`
                SELECT COUNT(*) AS total
                FROM movies
            `);


            const [
                userResult
            ] = await db.query(`
                SELECT COUNT(*) AS total
                FROM users
                WHERE role != 'admin'
            `);


            const [
                ticketResult
            ] = await db.query(`
                SELECT COUNT(t.ticket_id) AS total

                FROM tickets t

                INNER JOIN bookings b
                    ON t.booking_id =
                       b.booking_id

                WHERE b.status =
                    'Completed'

                    AND DATE(b.booking_date)
                    BETWEEN ? AND ?
            `, [
                range.startDate,
                range.endDate
            ]);


            const [
                revenueResult
            ] = await db.query(`
                SELECT

                    COALESCE(
                        SUM(total_amount),
                        0
                    ) AS total

                FROM bookings

                WHERE status =
                    'Completed'

                    AND DATE(booking_date)
                    BETWEEN ? AND ?
            `, [
                range.startDate,
                range.endDate
            ]);


            return res.status(200).json({

                success: true,

                movies:
                    Number(
                        movieResult[0]?.total
                    ) || 0,

                users:
                    Number(
                        userResult[0]?.total
                    ) || 0,

                tickets:
                    Number(
                        ticketResult[0]?.total
                    ) || 0,

                revenue:
                    Number(
                        revenueResult[0]?.total
                    ) || 0

            });


        } catch (error) {

            console.error(
                '❌ getStats:',
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    'Lỗi thống kê.',

                error:
                    error.message

            });

        }

    }

}


module.exports = DashboardController;