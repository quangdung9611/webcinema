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
    TrendingUp,
    RefreshCw,
    AlertCircle
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
    // CHART ERRORS
    // =========================================================

    const [chartErrors, setChartErrors] = useState({
        revenue: null,
        movieRevenue: null,
        tickets: null,
        userGrowth: null
    });


    // =========================================================
    // LOADING
    // =========================================================

    const [loading, setLoading] = useState(true);


    // =========================================================
    // REFRESHING
    // =========================================================

    const [refreshing, setRefreshing] = useState(false);


    // =========================================================
    // DATE FILTER
    // =========================================================

    const [timeRange, setTimeRange] = useState('week');

    const [customStart, setCustomStart] = useState('');

    const [customEnd, setCustomEnd] = useState('');

    const [showCustomPicker, setShowCustomPicker] =
        useState(false);


    // =========================================================
    // COLORS
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
    // TODAY
    // =========================================================

    const getToday = () => {

        return new Date()
            .toISOString()
            .split('T')[0];

    };


    // =========================================================
    // DATE RANGE
    // =========================================================

    const getDateRange = useCallback(
        (range) => {

            const end = new Date();

            const start = new Date();


            switch (range) {

                case 'week':

                    start.setDate(
                        end.getDate() - 6
                    );

                    break;


                case 'month':

                    start.setDate(
                        end.getDate() - 29
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
                            getToday(),

                        end:
                            customEnd ||
                            getToday()
                    };


                default:

                    start.setDate(
                        end.getDate() - 6
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
    // NORMALIZE ARRAY
    // =========================================================

    const normalizeArray = (response) => {

        if (!response) {
            return [];
        }


        if (
            response.data &&
            Array.isArray(response.data)
        ) {
            return response.data;
        }


        if (
            response.data &&
            Array.isArray(response.data.data)
        ) {
            return response.data.data;
        }


        if (
            response.data &&
            Array.isArray(response.data.rows)
        ) {
            return response.data.rows;
        }


        if (
            Array.isArray(response)
        ) {
            return response;
        }


        return [];

    };


    // =========================================================
    // FORMAT REVENUE DATA
    // =========================================================

    const normalizeRevenueData = (response) => {

        const data = normalizeArray(response);


        return data.map((item) => ({

            ...item,

            date:
                item.date ||
                item.booking_date ||
                item.day ||
                item.label ||
                '',

            revenue:
                Number(
                    item.revenue ??
                    item.totalRevenue ??
                    item.total_revenue ??
                    item.amount ??
                    item.total ??
                    0
                )

        }));

    };


    // =========================================================
    // FORMAT MOVIE REVENUE
    // =========================================================

    const normalizeMovieRevenueData = (response) => {

        const data = normalizeArray(response);


        return data.map((item) => ({

            ...item,

            id:
                item.id ||
                item.movie_id ||
                item.movieId,

            name:
                item.name ||
                item.movieName ||
                item.movie_name ||
                item.title ||
                'Không xác định',

            value:
                Number(
                    item.value ??
                    item.revenue ??
                    item.totalRevenue ??
                    item.total_revenue ??
                    0
                ),

            percent:
                item.percent ??
                item.percentage ??
                '0%'

        }));

    };


    // =========================================================
    // FORMAT TICKET DATA
    // =========================================================

    const normalizeTicketData = (response) => {

        const data = normalizeArray(response);


        return data.map((item) => ({

            ...item,

            movieName:
                item.movieName ||
                item.movie_name ||
                item.name ||
                item.title ||
                'Không xác định',

            ticketCount:
                Number(
                    item.ticketCount ??
                    item.ticket_count ??
                    item.totalTickets ??
                    item.total_tickets ??
                    item.quantity ??
                    item.count ??
                    0
                )

        }));

    };


    // =========================================================
    // FORMAT USER GROWTH
    // =========================================================

    const normalizeUserGrowthData = (response) => {

        const data = normalizeArray(response);


        return data.map((item) => ({

            ...item,

            date:
                item.date ||
                item.created_at ||
                item.day ||
                item.label ||
                '',

            newUsers:
                Number(
                    item.newUsers ??
                    item.new_users ??
                    item.userCount ??
                    item.user_count ??
                    item.count ??
                    0
                ),

            cumulative:
                Number(
                    item.cumulative ??
                    item.totalUsers ??
                    item.total_users ??
                    item.total ??
                    0
                )

        }));

    };


    // =========================================================
    // FETCH STATS
    // =========================================================

    const fetchStats = async () => {

        try {

            const response = await axios.get(
                `${API_BASE_URL}/stats`,
                {
                    withCredentials: true
                }
            );


            if (
                response.data?.success
            ) {

                setStats({

                    movies:
                        Number(
                            response.data.movies
                        ) || 0,

                    tickets:
                        Number(
                            response.data.tickets
                        ) || 0,

                    users:
                        Number(
                            response.data.users
                        ) || 0,

                    revenue:
                        Number(
                            response.data.revenue
                        ) || 0

                });

            }

        } catch (error) {

            console.error(
                '❌ Stats API Error:',
                error
            );

        }

    };


    // =========================================================
    // FETCH REVENUE
    // =========================================================

    const fetchRevenue = async (
        start,
        end
    ) => {

        try {

            const response =
                await axios.get(
                    `${API_BASE_URL}/revenue-chart`,
                    {
                        params: {
                            startDate: start,
                            endDate: end
                        },

                        withCredentials: true
                    }
                );


            console.log(
                '📊 Revenue API:',
                response.data
            );


            if (
                response.data?.success === false
            ) {

                throw new Error(
                    response.data.error ||
                    response.data.message ||
                    'Không lấy được dữ liệu doanh thu.'
                );

            }


            setChartData(
                previous => ({
                    ...previous,

                    revenue:
                        normalizeRevenueData(
                            response
                        )
                })
            );


            setChartErrors(
                previous => ({
                    ...previous,

                    revenue: null
                })
            );


        } catch (error) {

            console.error(
                '❌ Revenue Chart Error:',
                error
            );


            setChartErrors(
                previous => ({
                    ...previous,

                    revenue:
                        error.response?.data?.message ||
                        error.message ||
                        'Không thể lấy dữ liệu doanh thu.'
                })
            );


            setChartData(
                previous => ({
                    ...previous,

                    revenue: []
                })
            );

        }

    };


    // =========================================================
    // FETCH MOVIE REVENUE
    // =========================================================

    const fetchMovieRevenue = async (
        start,
        end
    ) => {

        try {

            const response =
                await axios.get(
                    `${API_BASE_URL}/movie-revenue-chart`,
                    {
                        params: {
                            startDate: start,
                            endDate: end
                        },

                        withCredentials: true
                    }
                );


            console.log(
                '🎬 Movie Revenue API:',
                response.data
            );


            if (
                response.data?.success === false
            ) {

                throw new Error(
                    response.data.error ||
                    response.data.message ||
                    'Không lấy được doanh thu theo phim.'
                );

            }


            setChartData(
                previous => ({
                    ...previous,

                    movieRevenue:
                        normalizeMovieRevenueData(
                            response
                        )
                })
            );


            setChartErrors(
                previous => ({
                    ...previous,

                    movieRevenue: null
                })
            );


        } catch (error) {

            console.error(
                '❌ Movie Revenue Error:',
                error
            );


            setChartErrors(
                previous => ({
                    ...previous,

                    movieRevenue:
                        error.response?.data?.message ||
                        error.message ||
                        'Không thể lấy dữ liệu doanh thu theo phim.'
                })
            );


            setChartData(
                previous => ({
                    ...previous,

                    movieRevenue: []
                })
            );

        }

    };


    // =========================================================
    // FETCH TICKETS
    // =========================================================

    const fetchTickets = async (
        start,
        end
    ) => {

        try {

            const response =
                await axios.get(
                    `${API_BASE_URL}/ticket-chart`,
                    {
                        params: {
                            startDate: start,
                            endDate: end
                        },

                        withCredentials: true
                    }
                );


            console.log(
                '🎟 Ticket API:',
                response.data
            );


            if (
                response.data?.success === false
            ) {

                throw new Error(
                    response.data.error ||
                    response.data.message ||
                    'Không lấy được dữ liệu vé.'
                );

            }


            setChartData(
                previous => ({
                    ...previous,

                    tickets:
                        normalizeTicketData(
                            response
                        )
                })
            );


            setChartErrors(
                previous => ({
                    ...previous,

                    tickets: null
                })
            );


        } catch (error) {

            console.error(
                '❌ Ticket Chart Error:',
                error
            );


            setChartErrors(
                previous => ({
                    ...previous,

                    tickets:
                        error.response?.data?.message ||
                        error.message ||
                        'Không thể lấy dữ liệu vé.'
                })
            );


            setChartData(
                previous => ({
                    ...previous,

                    tickets: []
                })
            );

        }

    };


    // =========================================================
    // FETCH USER GROWTH
    // =========================================================

    const fetchUserGrowth = async (
        start,
        end
    ) => {

        try {

            const response =
                await axios.get(
                    `${API_BASE_URL}/user-growth-chart`,
                    {
                        params: {
                            startDate: start,
                            endDate: end
                        },

                        withCredentials: true
                    }
                );


            console.log(
                '👥 User Growth API:',
                response.data
            );


            if (
                response.data?.success === false
            ) {

                throw new Error(
                    response.data.error ||
                    response.data.message ||
                    'Không lấy được dữ liệu người dùng.'
                );

            }


            setChartData(
                previous => ({
                    ...previous,

                    userGrowth:
                        normalizeUserGrowthData(
                            response
                        )
                })
            );


            setChartErrors(
                previous => ({
                    ...previous,

                    userGrowth: null
                })
            );


        } catch (error) {

            console.error(
                '❌ User Growth Error:',
                error
            );


            setChartErrors(
                previous => ({
                    ...previous,

                    userGrowth:
                        error.response?.data?.message ||
                        error.message ||
                        'Không thể lấy dữ liệu tăng trưởng người dùng.'
                })
            );


            setChartData(
                previous => ({
                    ...previous,

                    userGrowth: []
                })
            );

        }

    };


    // =========================================================
    // FETCH ALL DASHBOARD DATA
    // =========================================================

    const fetchDashboardData = useCallback(
        async (range = timeRange) => {

            const {
                start,
                end
            } = getDateRange(range);


            setLoading(true);


            setChartErrors({
                revenue: null,
                movieRevenue: null,
                tickets: null,
                userGrowth: null
            });


            try {

                await Promise.allSettled([

                    fetchStats(),

                    fetchRevenue(
                        start,
                        end
                    ),

                    fetchMovieRevenue(
                        start,
                        end
                    ),

                    fetchTickets(
                        start,
                        end
                    ),

                    fetchUserGrowth(
                        start,
                        end
                    )

                ]);

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

    }, []);


    // =========================================================
    // HANDLE RANGE CHANGE
    // =========================================================

    const handleRangeChange = (
        range
    ) => {

        setTimeRange(range);


        if (
            range !== 'custom'
        ) {

            setShowCustomPicker(
                false
            );


            fetchDashboardData(
                range
            );

        } else {

            setShowCustomPicker(
                true
            );

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


        if (
            customStart >
            customEnd
        ) {

            return;

        }


        fetchDashboardData(
            'custom'
        );

    };


    // =========================================================
    // REFRESH
    // =========================================================

    const handleRefresh = async () => {

        setRefreshing(true);

        await fetchDashboardData(
            timeRange
        );

        setRefreshing(false);

    };


    // =========================================================
    // FORMAT MONEY
    // =========================================================

    const formatMoney = (
        value
    ) => {

        return `${Number(
            value || 0
        ).toLocaleString(
            'vi-VN'
        )} đ`;

    };


    // =========================================================
    // FORMAT NUMBER
    // =========================================================

    const formatNumber = (
        value
    ) => {

        return Number(
            value || 0
        ).toLocaleString(
            'vi-VN'
        );

    };


    // =========================================================
    // CUSTOM TOOLTIP
    // =========================================================

    const tooltipStyle = {

        background:
            '#1a1a1a',

        border:
            '1px solid rgba(232,232,232,0.2)',

        borderRadius:
            '8px',

        color:
            '#fff'

    };


    // =========================================================
    // LOADING
    // =========================================================

    if (loading) {

        return (

            <div className="dashboard-loading">

                <div className="dashboard-skeleton-grid">

                    {[
                        1,
                        2,
                        3,
                        4
                    ].map(
                        index => (

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
                DASHBOARD HEADER
            ================================================= */}

            <div className="dashboard-main-header">

                <div>

                    <h1>
                        Tổng quan hệ thống
                    </h1>

                    <p>
                        Theo dõi hoạt động kinh doanh
                        của rạp phim
                    </p>

                </div>


                <button
                    type="button"
                    className="dashboard-refresh-btn"
                    onClick={
                        handleRefresh
                    }
                    disabled={
                        refreshing
                    }
                >

                    <RefreshCw
                        size={17}
                        className={
                            refreshing
                                ? 'refresh-spin'
                                : ''
                        }
                    />

                    Làm mới

                </button>

            </div>


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

                        <p>
                            TỔNG SỐ PHIM
                        </p>

                        <h2>
                            {formatNumber(
                                stats.movies
                            )}
                        </h2>

                    </div>


                    <button
                        className="stat-more-btn"
                        type="button"
                    >

                        <MoreHorizontal
                            size={18}
                        />

                    </button>

                </div>


                {/* TICKETS */}

                <div className="stat-card blue">

                    <div className="stat-icon">

                        <Ticket size={28} />

                    </div>


                    <div className="stat-content">

                        <p>
                            TỔNG VÉ ĐÃ BÁN
                        </p>

                        <h2>
                            {formatNumber(
                                stats.tickets
                            )}
                        </h2>

                    </div>


                    <button
                        className="stat-more-btn"
                        type="button"
                    >

                        <MoreHorizontal
                            size={18}
                        />

                    </button>

                </div>


                {/* USERS */}

                <div className="stat-card green">

                    <div className="stat-icon">

                        <Users size={28} />

                    </div>


                    <div className="stat-content">

                        <p>
                            TỔNG NGƯỜI DÙNG
                        </p>

                        <h2>
                            {formatNumber(
                                stats.users
                            )}
                        </h2>

                    </div>


                    <button
                        className="stat-more-btn"
                        type="button"
                    >

                        <MoreHorizontal
                            size={18}
                        />

                    </button>

                </div>


                {/* REVENUE */}

                <div className="stat-card silver">

                    <div className="stat-icon">

                        <DollarSign
                            size={28}
                        />

                    </div>


                    <div className="stat-content">

                        <p>
                            DOANH THU
                        </p>

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

                        <MoreHorizontal
                            size={18}
                        />

                    </button>

                </div>

            </div>


            {/* =================================================
                CHART ROW 1
            ================================================= */}

            <div className="dashboard-charts-grid">


                {/* =================================================
                    REVENUE
                ================================================= */}

                <div className="chart-card revenue-chart">


                    <div className="chart-header">

                        <div>

                            <h3>
                                DOANH THU THEO THỜI GIAN
                            </h3>

                        </div>


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

                                <Calendar
                                    size={14}
                                />

                                Tùy chỉnh

                            </button>

                        </div>

                    </div>


                    {/* CUSTOM DATE */}

                    {showCustomPicker && (

                        <div className="custom-date-picker">


                            <div className="date-input-group">

                                <label>
                                    Từ ngày
                                </label>

                                <input
                                    type="date"
                                    value={
                                        customStart
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setCustomStart(
                                            e.target.value
                                        )
                                    }
                                    max={
                                        customEnd ||
                                        getToday()
                                    }
                                />

                            </div>


                            <div className="date-input-group">

                                <label>
                                    Đến ngày
                                </label>

                                <input
                                    type="date"
                                    value={
                                        customEnd
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setCustomEnd(
                                            e.target.value
                                        )
                                    }
                                    min={
                                        customStart ||
                                        undefined
                                    }
                                    max={
                                        getToday()
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


                    {/* CHART */}

                    <div className="chart-wrapper">

                        {chartErrors.revenue ? (

                            <div className="chart-error">

                                <AlertCircle
                                    size={20}
                                />

                                <span>
                                    {
                                        chartErrors.revenue
                                    }
                                </span>

                            </div>

                        ) : chartData.revenue.length >
                          0 ? (

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
                                                Number(
                                                    value
                                                ) /
                                                1000
                                            ).toFixed(
                                                0
                                            )}k`
                                        }
                                    />


                                    <Tooltip
                                        contentStyle={
                                            tooltipStyle
                                        }
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
                                            fill:
                                                '#a855f7'
                                        }}
                                        activeDot={{
                                            r: 6
                                        }}
                                    />

                                </LineChart>

                            </ResponsiveContainer>

                        ) : (

                            <div className="no-data">

                                Chưa có dữ liệu
                                doanh thu trong
                                khoảng thời gian này.

                            </div>

                        )}

                    </div>

                </div>


                {/* =================================================
                    MOVIE REVENUE
                ================================================= */}

                <div className="chart-card pie-chart">


                    <div className="chart-header">

                        <h3>
                            TỶ LỆ DOANH THU THEO PHIM
                        </h3>

                    </div>


                    <div className="pie-layout">


                        <div className="pie-wrapper">

                            {chartErrors.movieRevenue ? (

                                <div className="chart-error">

                                    <AlertCircle
                                        size={20}
                                    />

                                    <span>
                                        {
                                            chartErrors.movieRevenue
                                        }
                                    </span>

                                </div>

                            ) : chartData.movieRevenue.length >
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
                                            innerRadius={
                                                60
                                            }
                                            outerRadius={
                                                90
                                            }
                                            paddingAngle={
                                                3
                                            }
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
                                            contentStyle={
                                                tooltipStyle
                                            }
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


                        {/* LEGEND */}

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
                    TICKETS
                ================================================= */}

                <div className="chart-card bar-chart">


                    <div className="chart-header">

                        <h3>
                            SỐ VÉ BÁN THEO PHIM
                        </h3>

                    </div>


                    <div className="chart-wrapper">

                        {chartErrors.tickets ? (

                            <div className="chart-error">

                                <AlertCircle
                                    size={20}
                                />

                                <span>
                                    {
                                        chartErrors.tickets
                                    }
                                </span>

                            </div>

                        ) : chartData.tickets.length >
                          0 ? (

                            <ResponsiveContainer
                                width="100%"
                                height={280}
                            >

                                <BarChart
                                    data={
                                        chartData.tickets
                                    }
                                    margin={{
                                        top: 10,
                                        right: 10,
                                        left: 0,
                                        bottom: 10
                                    }}
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="rgba(255,255,255,0.06)"
                                    />


                                    <XAxis
                                        dataKey="movieName"
                                        stroke="#94a3b8"
                                        tick={{
                                            fontSize: 11
                                        }}
                                    />


                                    <YAxis
                                        stroke="#94a3b8"
                                        allowDecimals={
                                            false
                                        }
                                    />


                                    <Tooltip
                                        contentStyle={
                                            tooltipStyle
                                        }
                                        formatter={(
                                            value
                                        ) => [
                                            `${formatNumber(
                                                value
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
                                trong khoảng thời
                                gian này.

                            </div>

                        )}

                    </div>

                </div>


                {/* =================================================
                    USER GROWTH
                ================================================= */}

                <div className="chart-card user-growth-chart">


                    <div className="chart-header">

                        <h3>
                            TĂNG TRƯỞNG NGƯỜI DÙNG
                        </h3>

                    </div>


                    <div className="chart-wrapper">

                        {chartErrors.userGrowth ? (

                            <div className="chart-error">

                                <AlertCircle
                                    size={20}
                                />

                                <span>
                                    {
                                        chartErrors.userGrowth
                                    }
                                </span>

                            </div>

                        ) : chartData.userGrowth.length >
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
                                                stopOpacity={
                                                    0.4
                                                }
                                            />

                                            <stop
                                                offset="100%"
                                                stopColor="#3b82f6"
                                                stopOpacity={
                                                    0
                                                }
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
                                        contentStyle={
                                            tooltipStyle
                                        }
                                        formatter={(
                                            value,
                                            name
                                        ) => {

                                            if (
                                                name ===
                                                'newUsers'
                                            ) {

                                                return [
                                                    formatNumber(
                                                        value
                                                    ),
                                                    'Người dùng mới'
                                                ];

                                            }


                                            return [
                                                formatNumber(
                                                    value
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

                                Chưa có dữ liệu
                                người dùng trong
                                khoảng thời gian này.

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

                        chartData.movieRevenue
                            .slice(0, 5)
                            .map(
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