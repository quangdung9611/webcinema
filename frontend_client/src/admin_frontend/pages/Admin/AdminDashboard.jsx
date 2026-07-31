
import React, {
    useState,
    useEffect,
    useCallback
} from 'react';

import axios from 'axios';

import {
    Film,
    Ticket,
    Users,
    DollarSign,
    MoreHorizontal,
    Calendar,
    TrendingUp
} from 'lucide-react';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    AreaChart,
    Area
} from 'recharts';

import '../../styles/AdminDashboard.css';


const AdminDashboard = () => {

    // =========================================================
    // API BASE URL
    // =========================================================

    const API_BASE_URL =
        'https://api.quangdungcinema.id.vn/admin/api/manage';


    // =========================================================
    // STATS
    // =========================================================

    const [stats, setStats] = useState({
        movies: 0,
        tickets: 0,
        users: 0,
        revenue: 0
    });


    // =========================================================
    // CHART DATA
    // =========================================================

    const [chartData, setChartData] = useState({
        revenue: [],
        movieRevenue: [],
        tickets: [],
        userGrowth: []
    });


    // =========================================================
    // LOADING
    // =========================================================

    const [loading, setLoading] = useState(true);


    // =========================================================
    // DATE FILTER
    // =========================================================

    const [timeRange, setTimeRange] = useState('week');

    const [customStart, setCustomStart] = useState('');

    const [customEnd, setCustomEnd] = useState('');

    const [showCustomPicker, setShowCustomPicker] =
        useState(false);


    // =========================================================
    // PIE COLORS
    // =========================================================

    const COLORS = [
        '#a855f7',
        '#3b82f6',
        '#22c55e',
        '#f59e0b',
        '#94a3b8',
        '#ec4899',
        '#06b6d4',
        '#8b5cf6'
    ];


    // =========================================================
    // GET DATE RANGE
    // =========================================================

    const getDateRange = useCallback(
        (range) => {

            const end = new Date();

            const start = new Date();


            switch (range) {

                case 'week':

                    start.setDate(
                        end.getDate() - 7
                    );

                    break;


                case 'month':

                    start.setMonth(
                        end.getMonth() - 1
                    );

                    break;


                case 'quarter':

                    start.setMonth(
                        end.getMonth() - 3
                    );

                    break;


                case 'custom':

                    return {
                        start:
                            customStart ||
                            start
                                .toISOString()
                                .split('T')[0],

                        end:
                            customEnd ||
                            end
                                .toISOString()
                                .split('T')[0]
                    };


                default:

                    start.setDate(
                        end.getDate() - 7
                    );

                    break;
            }


            return {
                start: start
                    .toISOString()
                    .split('T')[0],

                end: end
                    .toISOString()
                    .split('T')[0]
            };

        },
        [
            customStart,
            customEnd
        ]
    );


    // =========================================================
    // FETCH DASHBOARD DATA
    // =========================================================

    const fetchDashboardData = useCallback(
        async (range = timeRange) => {

            setLoading(true);


            try {

                const {
                    start,
                    end
                } = getDateRange(range);


                // =================================================
                // 1. STATS
                // =================================================

                const statsRequest = axios.get(
                    `${API_BASE_URL}/stats`,
                    {
                        withCredentials: true
                    }
                );


                // =================================================
                // 2. REVENUE CHART
                // =================================================

                const revenueRequest = axios.get(
                    `${API_BASE_URL}/revenue-chart`,
                    {
                        params: {
                            startDate: start,
                            endDate: end
                        },
                        withCredentials: true
                    }
                );


                // =================================================
                // 3. MOVIE REVENUE CHART
                // =================================================

                const movieRevenueRequest = axios.get(
                    `${API_BASE_URL}/movie-revenue-chart`,
                    {
                        params: {
                            startDate: start,
                            endDate: end
                        },
                        withCredentials: true
                    }
                );


                // =================================================
                // 4. TICKET CHART
                // =================================================

                const ticketRequest = axios.get(
                    `${API_BASE_URL}/ticket-chart`,
                    {
                        params: {
                            startDate: start,
                            endDate: end
                        },
                        withCredentials: true
                    }
                );


                // =================================================
                // 5. USER GROWTH CHART
                // =================================================

                const userGrowthRequest = axios.get(
                    `${API_BASE_URL}/user-growth-chart`,
                    {
                        params: {
                            startDate: start,
                            endDate: end
                        },
                        withCredentials: true
                    }
                );


                // =================================================
                // CALL ALL API IN PARALLEL
                // =================================================

                const [
                    resStats,
                    resRevenue,
                    resMovieRevenue,
                    resTickets,
                    resUserGrowth
                ] = await Promise.all([
                    statsRequest,
                    revenueRequest,
                    movieRevenueRequest,
                    ticketRequest,
                    userGrowthRequest
                ]);


                // =================================================
                // SET STATS
                // =================================================

                if (
                    resStats.data &&
                    resStats.data.success
                ) {

                    setStats({
                        movies:
                            Number(
                                resStats.data.movies
                            ) || 0,

                        tickets:
                            Number(
                                resStats.data.tickets
                            ) || 0,

                        users:
                            Number(
                                resStats.data.users
                            ) || 0,

                        revenue:
                            Number(
                                resStats.data.revenue
                            ) || 0
                    });

                }


                // =================================================
                // SET CHART DATA
                // =================================================

                setChartData({

                    // -----------------------------
                    // CHART 1
                    // -----------------------------

                    revenue:
                        resRevenue.data?.success
                            ? resRevenue.data.data || []
                            : [],


                    // -----------------------------
                    // CHART 2
                    // -----------------------------

                    movieRevenue:
                        resMovieRevenue.data?.success
                            ? resMovieRevenue.data.data || []
                            : [],


                    // -----------------------------
                    // CHART 3
                    // -----------------------------

                    tickets:
                        resTickets.data?.success
                            ? resTickets.data.data || []
                            : [],


                    // -----------------------------
                    // CHART 4
                    // -----------------------------

                    userGrowth:
                        resUserGrowth.data?.success
                            ? resUserGrowth.data.data || []
                            : []
                });


            } catch (error) {

                console.error(
                    '❌ Dashboard Error:',
                    error
                );


                // Không để dashboard crash
                setChartData({
                    revenue: [],
                    movieRevenue: [],
                    tickets: [],
                    userGrowth: []
                });


            } finally {

                setLoading(false);

            }

        },
        [
            timeRange,
            getDateRange
        ]
    );


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    useEffect(() => {

        fetchDashboardData('week');

    }, [fetchDashboardData]);


    // =========================================================
    // HANDLE RANGE CHANGE
    // =========================================================

    const handleRangeChange = (range) => {

        setTimeRange(range);


        if (range !== 'custom') {

            setShowCustomPicker(false);

            fetchDashboardData(range);

        } else {

            setShowCustomPicker(true);


            if (
                customStart &&
                customEnd
            ) {

                fetchDashboardData('custom');

            }

        }

    };


    // =========================================================
    // APPLY CUSTOM DATE
    // =========================================================

    const handleCustomApply = () => {

        if (
            !customStart ||
            !customEnd
        ) {

            return;

        }


        fetchDashboardData('custom');

    };


    // =========================================================
    // FORMAT MONEY
    // =========================================================

    const formatMoney = (value) => {

        return `${Number(value || 0).toLocaleString(
            'vi-VN'
        )} đ`;

    };


    // =========================================================
    // LOADING
    // =========================================================

    if (loading) {

        return (

            <div className="dashboard-loading">

                <div className="dashboard-skeleton-grid">

                    {[...Array(4)].map(
                        (_, index) => (

                            <div
                                key={index}
                                className="skeleton-stat-card"
                            />

                        )
                    )}


                    <div className="skeleton-chart-card" />

                    <div className="skeleton-pie-card" />

                    <div className="skeleton-table-card" />

                    <div className="skeleton-top-movie-card" />

                </div>

            </div>

        );

    }


    // =========================================================
    // RENDER
    // =========================================================

    return (

        <div className="cinema-dashboard">


            {/* =================================================
                STAT CARDS
            ================================================= */}

            <div className="dashboard-stats-row">


                {/* MOVIES */}

                <div className="stat-card purple">

                    <div className="stat-icon">
                        <Film size={28} />
                    </div>


                    <div className="stat-content">

                        <p>TỔNG SỐ PHIM</p>

                        <h2>
                            {stats.movies.toLocaleString(
                                'vi-VN'
                            )}
                        </h2>

                    </div>


                    <button
                        className="stat-more-btn"
                        type="button"
                    >
                        <MoreHorizontal size={18} />
                    </button>

                </div>


                {/* TICKETS */}

                <div className="stat-card blue">

                    <div className="stat-icon">
                        <Ticket size={28} />
                    </div>


                    <div className="stat-content">

                        <p>TỔNG VÉ ĐÃ BÁN</p>

                        <h2>
                            {stats.tickets.toLocaleString(
                                'vi-VN'
                            )}
                        </h2>

                    </div>


                    <button
                        className="stat-more-btn"
                        type="button"
                    >
                        <MoreHorizontal size={18} />
                    </button>

                </div>


                {/* USERS */}

                <div className="stat-card green">

                    <div className="stat-icon">
                        <Users size={28} />
                    </div>


                    <div className="stat-content">

                        <p>TỔNG NGƯỜI DÙNG</p>

                        <h2>
                            {stats.users.toLocaleString(
                                'vi-VN'
                            )}
                        </h2>

                    </div>


                    <button
                        className="stat-more-btn"
                        type="button"
                    >
                        <MoreHorizontal size={18} />
                    </button>

                </div>


                {/* REVENUE */}

                <div className="stat-card silver">

                    <div className="stat-icon">
                        <DollarSign size={28} />
                    </div>


                    <div className="stat-content">

                        <p>DOANH THU</p>

                        <h2>
                            {formatMoney(
                                stats.revenue
                            )}
                        </h2>

                    </div>


                    <button
                        className="stat-more-btn"
                        type="button"
                    >
                        <MoreHorizontal size={18} />
                    </button>

                </div>

            </div>


            {/* =================================================
                CHART ROW 1
            ================================================= */}

            <div className="dashboard-charts-grid">


                {/* =================================================
                    CHART 1 - REVENUE
                ================================================= */}

                <div className="chart-card revenue-chart">


                    <div className="chart-header">

                        <h3>
                            DOANH THU THEO THỜI GIAN
                        </h3>


                        <div className="chart-filter-group">


                            <button
                                type="button"
                                className={`filter-btn ${
                                    timeRange === 'week'
                                        ? 'active'
                                        : ''
                                }`}
                                onClick={() =>
                                    handleRangeChange(
                                        'week'
                                    )
                                }
                            >
                                7 ngày
                            </button>


                            <button
                                type="button"
                                className={`filter-btn ${
                                    timeRange === 'month'
                                        ? 'active'
                                        : ''
                                }`}
                                onClick={() =>
                                    handleRangeChange(
                                        'month'
                                    )
                                }
                            >
                                30 ngày
                            </button>


                            <button
                                type="button"
                                className={`filter-btn ${
                                    timeRange === 'quarter'
                                        ? 'active'
                                        : ''
                                }`}
                                onClick={() =>
                                    handleRangeChange(
                                        'quarter'
                                    )
                                }
                            >
                                3 tháng
                            </button>


                            <button
                                type="button"
                                className={`filter-btn custom ${
                                    timeRange === 'custom'
                                        ? 'active'
                                        : ''
                                }`}
                                onClick={() =>
                                    handleRangeChange(
                                        'custom'
                                    )
                                }
                            >

                                <Calendar size={14} />

                                Tùy chỉnh

                            </button>

                        </div>

                    </div>


                    {/* CUSTOM DATE PICKER */}

                    {showCustomPicker && (

                        <div className="custom-date-picker">


                            <div className="date-input-group">

                                <label>
                                    Từ ngày
                                </label>

                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) =>
                                        setCustomStart(
                                            e.target.value
                                        )
                                    }
                                    max={
                                        customEnd ||
                                        new Date()
                                            .toISOString()
                                            .split('T')[0]
                                    }
                                />

                            </div>


                            <div className="date-input-group">

                                <label>
                                    Đến ngày
                                </label>

                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) =>
                                        setCustomEnd(
                                            e.target.value
                                        )
                                    }
                                    min={
                                        customStart ||
                                        undefined
                                    }
                                    max={
                                        new Date()
                                            .toISOString()
                                            .split('T')[0]
                                    }
                                />

                            </div>


                            <button
                                type="button"
                                className="apply-date-btn"
                                onClick={
                                    handleCustomApply
                                }
                            >
                                Áp dụng
                            </button>

                        </div>

                    )}


                    {/* REVENUE LINE CHART */}

                    <div className="chart-wrapper">

                        {chartData.revenue.length > 0 ? (

                            <ResponsiveContainer
                                width="100%"
                                height={320}
                            >

                                <LineChart
                                    data={
                                        chartData.revenue
                                    }
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="rgba(255,255,255,0.06)"
                                    />


                                    <XAxis
                                        dataKey="date"
                                        stroke="#94a3b8"
                                    />


                                    <YAxis
                                        stroke="#94a3b8"
                                        tickFormatter={(
                                            value
                                        ) =>
                                            `${(
                                                Number(value) /
                                                1000
                                            ).toFixed(0)}k`
                                        }
                                    />


                                    <Tooltip
                                        contentStyle={{
                                            background:
                                                '#1a1a1a',
                                            border:
                                                '1px solid rgba(232,232,232,0.2)',
                                            borderRadius:
                                                '8px',
                                            color: '#fff'
                                        }}
                                        formatter={(
                                            value
                                        ) => [
                                            formatMoney(
                                                value
                                            ),
                                            'Doanh thu'
                                        ]}
                                    />


                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#a855f7"
                                        strokeWidth={3}
                                        dot={{
                                            r: 4,
                                            fill: '#a855f7'
                                        }}
                                        activeDot={{
                                            r: 6
                                        }}
                                    />

                                </LineChart>

                            </ResponsiveContainer>

                        ) : (

                            <div className="no-data">
                                Chưa có dữ liệu doanh thu
                            </div>

                        )}

                    </div>

                </div>


                {/* =================================================
                    CHART 2 - MOVIE REVENUE PIE
                ================================================= */}

                <div className="chart-card pie-chart">


                    <div className="chart-header">

                        <h3>
                            TỶ LỆ DOANH THU THEO PHIM
                        </h3>

                    </div>


                    <div className="pie-layout">


                        <div className="pie-wrapper">

                            {chartData.movieRevenue.length >
                            0 ? (

                                <ResponsiveContainer
                                    width="100%"
                                    height={280}
                                >

                                    <PieChart>

                                        <Pie
                                            data={
                                                chartData.movieRevenue
                                            }
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >

                                            {chartData.movieRevenue.map(
                                                (
                                                    entry,
                                                    index
                                                ) => (

                                                    <Cell
                                                        key={
                                                            entry.id ||
                                                            index
                                                        }
                                                        fill={
                                                            COLORS[
                                                                index %
                                                                COLORS.length
                                                            ]
                                                        }
                                                    />

                                                )
                                            )}

                                        </Pie>


                                        <Tooltip
                                            contentStyle={{
                                                background:
                                                    '#1a1a1a',
                                                border:
                                                    '1px solid rgba(232,232,232,0.2)',
                                                borderRadius:
                                                    '8px',
                                                color: '#fff'
                                            }}
                                            formatter={(
                                                value
                                            ) => [
                                                formatMoney(
                                                    value
                                                ),
                                                'Doanh thu'
                                            ]}
                                        />

                                    </PieChart>

                                </ResponsiveContainer>

                            ) : (

                                <div className="no-data">
                                    Chưa có dữ liệu
                                </div>

                            )}

                        </div>


                        {/* PIE LEGEND */}

                        <div className="pie-legend">

                            {chartData.movieRevenue.length >
                            0 ? (

                                chartData.movieRevenue.map(
                                    (
                                        movie,
                                        index
                                    ) => (

                                        <div
                                            className="legend-item"
                                            key={
                                                movie.id ||
                                                index
                                            }
                                        >

                                            <div className="legend-left">

                                                <span
                                                    className="legend-color"
                                                    style={{
                                                        background:
                                                            COLORS[
                                                                index %
                                                                COLORS.length
                                                            ]
                                                    }}
                                                />


                                                <p>
                                                    {
                                                        movie.name
                                                    }
                                                </p>

                                            </div>


                                            <span>
                                                {
                                                    movie.percent
                                                }
                                            </span>

                                        </div>

                                    )

                                )

                            ) : (

                                <div className="no-data">
                                    Chưa có dữ liệu
                                </div>

                            )}

                        </div>

                    </div>

                </div>

            </div>


            {/* =================================================
                CHART ROW 2
            ================================================= */}

            <div className="dashboard-bottom-grid">


                {/* =================================================
                    CHART 3 - TICKET COUNT
                ================================================= */}

                <div className="chart-card bar-chart">


                    <div className="chart-header">

                        <h3>
                            SỐ VÉ BÁN THEO PHIM
                        </h3>

                    </div>


                    <div className="chart-wrapper">

                        {chartData.tickets.length > 0 ? (

                            <ResponsiveContainer
                                width="100%"
                                height={280}
                            >

                                <BarChart
                                    data={
                                        chartData.tickets
                                    }
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="rgba(255,255,255,0.06)"
                                    />


                                    <XAxis
                                        dataKey="movieName"
                                        stroke="#94a3b8"
                                        tick={{
                                            fontSize: 12
                                        }}
                                    />


                                    <YAxis
                                        stroke="#94a3b8"
                                        allowDecimals={
                                            false
                                        }
                                    />


                                    <Tooltip
                                        contentStyle={{
                                            background:
                                                '#1a1a1a',
                                            border:
                                                '1px solid rgba(232,232,232,0.2)',
                                            borderRadius:
                                                '8px',
                                            color: '#fff'
                                        }}
                                        formatter={(
                                            value
                                        ) => [
                                            `${Number(
                                                value
                                            ).toLocaleString(
                                                'vi-VN'
                                            )} vé`,
                                            'Số vé'
                                        ]}
                                    />


                                    <Bar
                                        dataKey="ticketCount"
                                        fill="#a855f7"
                                        radius={[
                                            4,
                                            4,
                                            0,
                                            0
                                        ]}
                                    />

                                </BarChart>

                            </ResponsiveContainer>

                        ) : (

                            <div className="no-data">
                                Chưa có dữ liệu vé
                            </div>

                        )}

                    </div>

                </div>


                {/* =================================================
                    CHART 4 - USER GROWTH
                ================================================= */}

                <div className="chart-card user-growth-chart">


                    <div className="chart-header">

                        <h3>
                            TĂNG TRƯỞNG NGƯỜI DÙNG
                        </h3>

                    </div>


                    <div className="chart-wrapper">

                        {chartData.userGrowth.length >
                        0 ? (

                            <ResponsiveContainer
                                width="100%"
                                height={280}
                            >

                                <AreaChart
                                    data={
                                        chartData.userGrowth
                                    }
                                >

                                    <defs>

                                        <linearGradient
                                            id="userGrowthGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >

                                            <stop
                                                offset="0%"
                                                stopColor="#3b82f6"
                                                stopOpacity={0.4}
                                            />

                                            <stop
                                                offset="100%"
                                                stopColor="#3b82f6"
                                                stopOpacity={0}
                                            />

                                        </linearGradient>

                                    </defs>


                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="rgba(255,255,255,0.06)"
                                    />


                                    <XAxis
                                        dataKey="date"
                                        stroke="#94a3b8"
                                    />


                                    <YAxis
                                        stroke="#94a3b8"
                                        allowDecimals={
                                            false
                                        }
                                    />


                                    <Tooltip
                                        contentStyle={{
                                            background:
                                                '#1a1a1a',
                                            border:
                                                '1px solid rgba(232,232,232,0.2)',
                                            borderRadius:
                                                '8px',
                                            color: '#fff'
                                        }}
                                        formatter={(
                                            value,
                                            name
                                        ) => {

                                            if (
                                                name ===
                                                'newUsers'
                                            ) {

                                                return [
                                                    Number(
                                                        value
                                                    ).toLocaleString(
                                                        'vi-VN'
                                                    ),
                                                    'Người dùng mới'
                                                ];

                                            }


                                            return [
                                                Number(
                                                    value
                                                ).toLocaleString(
                                                    'vi-VN'
                                                ),
                                                'Tổng người dùng'
                                            ];

                                        }}
                                    />


                                    <Area
                                        type="monotone"
                                        dataKey="cumulative"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        fill="url(#userGrowthGradient)"
                                    />


                                    <Line
                                        type="monotone"
                                        dataKey="newUsers"
                                        stroke="#22c55e"
                                        strokeWidth={2}
                                        dot={{
                                            r: 3
                                        }}
                                    />

                                </AreaChart>

                            </ResponsiveContainer>

                        ) : (

                            <div className="no-data">
                                Chưa có dữ liệu người dùng
                            </div>

                        )}

                    </div>

                </div>

            </div>


            {/* =================================================
                TOP MOVIES
            ================================================= */}

            <div className="top-movie-card">


                <div className="card-header">

                    <h3>
                        PHIM DOANH THU CAO
                    </h3>

                </div>


                <div className="top-movie-list">

                    {chartData.movieRevenue.length >
                    0 ? (

                        chartData.movieRevenue.map(
                            (
                                movie,
                                index
                            ) => (

                                <div
                                    className="top-movie-item"
                                    key={
                                        movie.id ||
                                        index
                                    }
                                >


                                    <div className="top-movie-left">


                                        <span className="rank">
                                            {index + 1}
                                        </span>


                                        <div className="movie-poster-placeholder" />


                                        <div>

                                            <h4>
                                                {
                                                    movie.name
                                                }
                                            </h4>


                                            <p>
                                                {formatMoney(
                                                    movie.value
                                                )}
                                            </p>

                                        </div>

                                    </div>


                                    <TrendingUp
                                        size={18}
                                        className="trend-icon"
                                    />

                                </div>

                            )

                        )

                    ) : (

                        <div className="no-data">
                            Chưa có dữ liệu
                        </div>

                    )}

                </div>


                <button
                    type="button"
                    className="view-more-btn"
                >
                    Xem tất cả phim
                </button>

            </div>

        </div>

    );

};


export default AdminDashboard;

