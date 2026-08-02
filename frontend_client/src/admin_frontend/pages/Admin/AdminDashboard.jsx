import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
    Activity,
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    CircleDollarSign,
    Clapperboard,
    Clock3,
    Film,
    LayoutDashboard,
    MapPin,
    Package,
    Percent,
    RefreshCw,
    Star,
    Ticket,
    TrendingUp,
    UserRound,
    Users,
    XCircle
} from 'lucide-react';

import '../../styles/AdminDashboard.css';

const BASE_URL = 'https://api.quangdungcinema.id.vn';

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
| Nếu route backend của bạn khác, chỉ cần sửa các URL bên dưới.
|--------------------------------------------------------------------------
*/
const API = {
    stats: '/admin/api/dashboard/stats',
    revenueTrend: '/admin/api/dashboard/revenue-trend',
    topMovies: '/admin/api/dashboard/top-movies',
    bookingStatus: '/admin/api/dashboard/booking-status',
    userGrowth: '/admin/api/dashboard/user-growth',
    topCustomers: '/admin/api/dashboard/top-customers',
    products: '/admin/api/dashboard/product-performance',
    cinemas: '/admin/api/dashboard/cinema-performance',
    rooms: '/admin/api/dashboard/room-performance',
    showtimes: '/admin/api/dashboard/showtime-performance',
    coupons: '/admin/api/dashboard/coupon-performance',
    content: '/admin/api/dashboard/content-stats',
    userStatus: '/admin/api/dashboard/user-status',
    otp: '/admin/api/dashboard/otp-stats',
    reviews: '/admin/api/dashboard/review-stats',
    seats: '/admin/api/dashboard/seat-performance'
};

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true
});

const PERIODS = [
    { value: 'today', label: 'Hôm nay' },
    { value: 'week', label: '7 ngày' },
    { value: 'month', label: '30 ngày' },
    { value: 'quarter', label: '90 ngày' },
    { value: 'year', label: '1 năm' },
    { value: 'custom', label: 'Tùy chỉnh' }
];

const money = (value) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
};

const number = (value) => {
    return new Intl.NumberFormat('vi-VN').format(
        Number(value) || 0
    );
};

const percent = (value) => {
    const n = Number(value) || 0;
    return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
};

const formatDate = (date) => {
    if (!date) return '--';

    return new Date(date).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const formatTime = (date) => {
    if (!date) return '--';

    return new Date(date).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getPoster = (poster) => {
    if (!poster) return null;

    if (
        poster.startsWith('http://') ||
        poster.startsWith('https://')
    ) {
        return poster;
    }

    return poster;
};

const emptyState = {
    stats: null,
    revenueTrend: [],
    topMovies: [],
    bookingStatus: [],
    userGrowth: [],
    topCustomers: [],
    products: [],
    cinemas: [],
    rooms: [],
    showtimes: [],
    coupons: [],
    content: null,
    userStatus: [],
    otp: [],
    reviews: [],
    seats: null
};

function AdminDashboard() {
    const [period, setPeriod] = useState('week');

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [data, setData] = useState(emptyState);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const [showCustom, setShowCustom] = useState(false);

    const queryParams = useMemo(() => {
        const params = {
            period
        };

        if (
            period === 'custom' &&
            startDate &&
            endDate
        ) {
            params.startDate = startDate;
            params.endDate = endDate;
        }

        return params;
    }, [period, startDate, endDate]);

    const fetchDashboard = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError('');

            const requests = [
                ['stats', API.stats],
                ['revenueTrend', API.revenueTrend],
                ['topMovies', API.topMovies],
                ['bookingStatus', API.bookingStatus],
                ['userGrowth', API.userGrowth],
                ['topCustomers', API.topCustomers],
                ['products', API.products],
                ['cinemas', API.cinemas],
                ['rooms', API.rooms],
                ['showtimes', API.showtimes],
                ['coupons', API.coupons],
                ['content', API.content],
                ['userStatus', API.userStatus],
                ['otp', API.otp],
                ['reviews', API.reviews],
                ['seats', API.seats]
            ];

            const responses = await Promise.allSettled(
                requests.map(([key, url]) =>
                    api.get(url, {
                        params: {
                            ...queryParams,
                            ...(key === 'topMovies' && {
                                limit: 10
                            }),
                            ...(key === 'topCustomers' && {
                                limit: 10
                            }),
                            ...(key === 'showtimes' && {
                                limit: 10
                            })
                        }
                    })
                )
            );

            const nextData = {
                ...emptyState
            };

            responses.forEach((result, index) => {
                const [key] = requests[index];

                if (
                    result.status === 'fulfilled' &&
                    result.value?.data?.success
                ) {
                    const response = result.value.data;

                    if (key === 'stats') {
                        nextData.stats = response;
                    } else if (key === 'revenueTrend') {
                        nextData.revenueTrend =
                            response.data || [];
                    } else if (key === 'topMovies') {
                        nextData.topMovies =
                            response.movies || [];
                    } else if (key === 'bookingStatus') {
                        nextData.bookingStatus =
                            response.data || [];
                    } else if (key === 'userGrowth') {
                        nextData.userGrowth =
                            response.data || [];
                    } else if (key === 'topCustomers') {
                        nextData.topCustomers =
                            response.data || [];
                    } else if (key === 'products') {
                        nextData.products =
                            response.data || [];
                    } else if (key === 'cinemas') {
                        nextData.cinemas =
                            response.data || [];
                    } else if (key === 'rooms') {
                        nextData.rooms =
                            response.data || [];
                    } else if (key === 'showtimes') {
                        nextData.showtimes =
                            response.data || [];
                    } else if (key === 'coupons') {
                        nextData.coupons =
                            response.data || [];
                    } else if (key === 'content') {
                        nextData.content = response;
                    } else if (key === 'userStatus') {
                        nextData.userStatus =
                            response.data || [];
                    } else if (key === 'otp') {
                        nextData.otp =
                            response.data || [];
                    } else if (key === 'reviews') {
                        nextData.reviews =
                            response.data || [];
                    } else if (key === 'seats') {
                        nextData.seats =
                            response.data || null;
                    }
                }
            });

            setData(nextData);
        } catch (err) {
            console.error(
                'Dashboard error:',
                err
            );

            setError(
                'Không thể tải dữ liệu dashboard.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, [queryParams]);

    const handlePeriodChange = (value) => {
        setPeriod(value);

        if (value === 'custom') {
            setShowCustom(true);
            return;
        }

        setShowCustom(false);
    };

    const handleCustomSubmit = () => {
        if (!startDate || !endDate) return;

        setPeriod('custom');
        fetchDashboard();
    };

    const stats = data.stats || {};

    const comparison = stats.comparison || {};

    const content = data.content || {};

    const seatData = data.seats || {};

    const maxRevenue = Math.max(
        ...data.revenueTrend.map(
            item => Number(item.revenue) || 0
        ),
        1
    );

    const maxCinemaRevenue = Math.max(
        ...data.cinemas.map(
            item => Number(item.revenue) || 0
        ),
        1
    );

    const maxRoomRevenue = Math.max(
        ...data.rooms.map(
            item => Number(item.revenue) || 0
        ),
        1
    );

    const totalBookingStatus = data.bookingStatus.reduce(
        (sum, item) =>
            sum + Number(item.orders || 0),
        0
    );

    const totalUserStatus = data.userStatus.reduce(
        (sum, item) =>
            sum + Number(item.total || 0),
        0
    );

    return (
        <div className="dashboard-page">

            {/* =====================================================
                HEADER
            ===================================================== */}

            <header className="dashboard-header">

                <div className="dashboard-heading">

                    <div className="dashboard-heading-icon">
                        <LayoutDashboard size={22} />
                    </div>

                    <div>
                        <span className="dashboard-eyebrow">
                            QUANG DUNG CINEMA
                        </span>

                        <h1>
                            Tổng quan hệ thống
                        </h1>

                        <p>
                            Theo dõi hoạt động kinh doanh
                            và hiệu suất rạp phim.
                        </p>
                    </div>

                </div>

                <div className="dashboard-actions">

                    <button
                        className="refresh-button"
                        onClick={() => fetchDashboard(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw
                            size={17}
                            className={
                                refreshing
                                    ? 'spin'
                                    : ''
                            }
                        />

                        <span>
                            Làm mới
                        </span>
                    </button>

                </div>

            </header>


            {/* =====================================================
                FILTER
            ===================================================== */}

            <section className="dashboard-filter">

                <div className="filter-left">

                    <div className="filter-label">
                        <CalendarDays size={17} />
                        <span>
                            Khoảng thời gian
                        </span>
                    </div>

                    <div className="period-tabs">

                        {PERIODS.map(item => (
                            <button
                                key={item.value}
                                className={
                                    period === item.value
                                        ? 'period-tab active'
                                        : 'period-tab'
                                }
                                onClick={() =>
                                    handlePeriodChange(
                                        item.value
                                    )
                                }
                            >
                                {item.label}
                            </button>
                        ))}

                    </div>

                </div>

                {period === 'custom' && (
                    <div className="custom-date">

                        <input
                            type="date"
                            value={startDate}
                            onChange={e =>
                                setStartDate(
                                    e.target.value
                                )
                            }
                        />

                        <span>—</span>

                        <input
                            type="date"
                            value={endDate}
                            onChange={e =>
                                setEndDate(
                                    e.target.value
                                )
                            }
                        />

                        <button
                            onClick={handleCustomSubmit}
                        >
                            Áp dụng
                        </button>

                    </div>
                )}

                <div className="current-period">
                    <span>Đang xem</span>
                    <strong>
                        {stats.period?.startDate
                            ? `${formatDate(
                                stats.period.startDate
                            )} — ${formatDate(
                                stats.period.endDate
                            )}`
                            : '--'}
                    </strong>
                </div>

            </section>


            {error && (
                <div className="dashboard-error">
                    <AlertCircle size={19} />
                    <span>{error}</span>

                    <button
                        onClick={() =>
                            fetchDashboard(true)
                        }
                    >
                        Thử lại
                    </button>
                </div>
            )}


            {/* =====================================================
                KPI
            ===================================================== */}

            <section className="kpi-grid">

                <KpiCard
                    title="Tổng doanh thu"
                    value={money(stats.revenue)}
                    icon={<CircleDollarSign />}
                    iconClass="gold"
                    change={comparison.revenue?.change}
                    comparison="so với kỳ trước"
                    loading={loading}
                />

                <KpiCard
                    title="Đơn đặt vé"
                    value={number(stats.orders)}
                    icon={<Ticket />}
                    iconClass="blue"
                    change={comparison.orders?.change}
                    comparison="so với kỳ trước"
                    loading={loading}
                />

                <KpiCard
                    title="Vé đã bán"
                    value={number(stats.tickets)}
                    icon={<Clapperboard />}
                    iconClass="purple"
                    change={comparison.tickets?.change}
                    comparison="so với kỳ trước"
                    loading={loading}
                />

                <KpiCard
                    title="Khách hàng"
                    value={number(stats.users)}
                    icon={<Users />}
                    iconClass="green"
                    change={null}
                    comparison="tổng khách hàng"
                    loading={loading}
                />

            </section>


            {/* =====================================================
                REVENUE + SEAT
            ===================================================== */}

            <section className="dashboard-grid grid-main">

                <div className="dashboard-card revenue-card">

                    <CardHeader
                        icon={<TrendingUp />}
                        title="Doanh thu theo ngày"
                        subtitle="Doanh thu và số đơn trong kỳ"
                    />

                    <div className="revenue-summary">

                        <div>
                            <span>Tổng doanh thu</span>
                            <strong>
                                {money(stats.revenue)}
                            </strong>
                        </div>

                        <div>
                            <span>Tiền vé</span>
                            <strong>
                                {money(
                                    stats.ticketRevenue
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Sản phẩm</span>
                            <strong>
                                {money(
                                    stats.productRevenue
                                )}
                            </strong>
                        </div>

                    </div>

                    <div className="revenue-chart">

                        {data.revenueTrend.length === 0 ? (
                            <EmptyChart />
                        ) : (
                            data.revenueTrend.map(
                                (item, index) => {

                                    const revenue =
                                        Number(
                                            item.revenue
                                        ) || 0;

                                    const height =
                                        Math.max(
                                            (
                                                revenue /
                                                maxRevenue
                                            ) * 100,
                                            4
                                        );

                                    return (
                                        <div
                                            className="chart-column"
                                            key={
                                                `${item.date}-${index}`
                                            }
                                        >
                                            <div className="chart-tooltip">
                                                <strong>
                                                    {money(
                                                        revenue
                                                    )}
                                                </strong>
                                                <span>
                                                    {
                                                        item.orders
                                                    } đơn
                                                </span>
                                            </div>

                                            <div className="chart-bar-wrap">

                                                <div
                                                    className="chart-bar"
                                                    style={{
                                                        height:
                                                            `${height}%`
                                                    }}
                                                />

                                            </div>

                                            <span className="chart-date">
                                                {new Date(
                                                    item.date
                                                ).toLocaleDateString(
                                                    'vi-VN',
                                                    {
                                                        day: '2-digit',
                                                        month: '2-digit'
                                                    }
                                                )}
                                            </span>
                                        </div>
                                    );
                                }
                            )
                        )}

                    </div>

                </div>


                <div className="dashboard-card seat-card">

                    <CardHeader
                        icon={<Ticket />}
                        title="Công suất toàn hệ thống"
                        subtitle="Tình trạng sử dụng ghế"
                    />

                    <div className="seat-circle-wrap">

                        <div
                            className="seat-circle"
                            style={{
                                '--progress':
                                    `${Math.min(
                                        Number(
                                            seatData.occupancy
                                        ) || 0,
                                        100
                                    ) * 3.6}deg`
                            }}
                        >
                            <div className="seat-circle-inner">
                                <strong>
                                    {
                                        Number(
                                            seatData.occupancy
                                        ) || 0
                                    }%
                                </strong>
                                <span>
                                    lấp đầy
                                </span>
                            </div>
                        </div>

                    </div>

                    <div className="seat-stats">

                        <div>
                            <span>Suất chiếu</span>
                            <strong>
                                {number(
                                    seatData.showtimes
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Tổng ghế</span>
                            <strong>
                                {number(
                                    seatData.capacity
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Đã bán</span>
                            <strong>
                                {number(
                                    seatData.soldTickets
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Còn trống</span>
                            <strong>
                                {number(
                                    seatData.emptySeats
                                )}
                            </strong>
                        </div>

                    </div>

                </div>

            </section>


            {/* =====================================================
                TOP MOVIES + BOOKING STATUS
            ===================================================== */}

            <section className="dashboard-grid grid-two">

                <div className="dashboard-card">

                    <CardHeader
                        icon={<Film />}
                        title="Top phim"
                        subtitle="Phim có doanh thu vé cao nhất"
                    />

                    <div className="movie-ranking">

                        {data.topMovies.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.topMovies.map(
                                (movie, index) => (
                                    <div
                                        className="movie-ranking-item"
                                        key={movie.id}
                                    >

                                        <div className="ranking-number">
                                            {String(
                                                index + 1
                                            ).padStart(2, '0')}
                                        </div>

                                        <div className="movie-poster">

                                            {getPoster(
                                                movie.poster
                                            ) ? (
                                                <img
                                                    src={getPoster(
                                                        movie.poster
                                                    )}
                                                    alt={
                                                        movie.title
                                                    }
                                                />
                                            ) : (
                                                <Film
                                                    size={20}
                                                />
                                            )}

                                        </div>

                                        <div className="movie-info">

                                            <strong>
                                                {movie.title}
                                            </strong>

                                            <span>
                                                {
                                                    movie.tickets_sold
                                                } vé •{' '}
                                                {
                                                    movie.orders
                                                } đơn
                                            </span>

                                        </div>

                                        <div className="movie-revenue">
                                            {money(
                                                movie.revenue
                                            )}
                                        </div>

                                    </div>
                                )
                            )
                        )}

                    </div>

                </div>


                <div className="dashboard-card">

                    <CardHeader
                        icon={<Activity />}
                        title="Trạng thái booking"
                        subtitle="Phân bổ đơn đặt vé"
                    />

                    <div className="status-list">

                        {data.bookingStatus.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.bookingStatus.map(
                                (item, index) => {

                                    const total =
                                        totalBookingStatus ||
                                        1;

                                    const value =
                                        Number(
                                            item.orders
                                        ) || 0;

                                    const width =
                                        Math.min(
                                            (
                                                value /
                                                total
                                            ) * 100,
                                            100
                                        );

                                    const statusClass =
                                        String(
                                            item.status
                                        )
                                            .toLowerCase()
                                            .replace(
                                                /\s+/g,
                                                '-'
                                            );

                                    return (
                                        <div
                                            className="status-row"
                                            key={
                                                `${item.status}-${index}`
                                            }
                                        >

                                            <div className="status-row-top">

                                                <span className="status-name">
                                                    <i
                                                        className={
                                                            `status-dot ${statusClass}`
                                                        }
                                                    />

                                                    {
                                                        item.status
                                                    }
                                                </span>

                                                <strong>
                                                    {
                                                        number(
                                                            value
                                                        )
                                                    }
                                                </strong>

                                            </div>

                                            <div className="progress-track">
                                                <div
                                                    className="progress-fill"
                                                    style={{
                                                        width:
                                                            `${width}%`
                                                    }}
                                                />
                                            </div>

                                            <div className="status-meta">
                                                {money(
                                                    item.revenue
                                                )}
                                            </div>

                                        </div>
                                    );
                                }
                            )
                        )}

                    </div>

                </div>

            </section>


            {/* =====================================================
                CINEMA
            ===================================================== */}

            <section className="dashboard-card full-card">

                <CardHeader
                    icon={<MapPin />}
                    title="Hiệu suất theo rạp"
                    subtitle="So sánh doanh thu và lượng vé giữa các rạp"
                />

                <div className="cinema-table">

                    <div className="table-head">
                        <span>Rạp</span>
                        <span>Đơn hàng</span>
                        <span>Vé bán</span>
                        <span>Doanh thu</span>
                        <span>Hiệu suất</span>
                    </div>

                    {data.cinemas.length === 0 ? (
                        <EmptyList />
                    ) : (
                        data.cinemas.map(
                            cinema => {

                                const revenue =
                                    Number(
                                        cinema.revenue
                                    ) || 0;

                                const width =
                                    (
                                        revenue /
                                        maxCinemaRevenue
                                    ) * 100;

                                return (
                                    <div
                                        className="table-row"
                                        key={
                                            cinema.cinema_id
                                        }
                                    >

                                        <strong>
                                            {
                                                cinema.cinema_name
                                            }
                                        </strong>

                                        <span>
                                            {number(
                                                cinema.orders
                                            )}
                                        </span>

                                        <span>
                                            {number(
                                                cinema.tickets
                                            )}
                                        </span>

                                        <strong className="money">
                                            {money(
                                                revenue
                                            )}
                                        </strong>

                                        <div className="mini-progress">
                                            <div
                                                style={{
                                                    width:
                                                        `${width}%`
                                                }}
                                            />
                                        </div>

                                    </div>
                                );
                            }
                        )
                    )}

                </div>

            </section>


            {/* =====================================================
                ROOMS + SHOWTIMES
            ===================================================== */}

            <section className="dashboard-grid grid-two">

                <div className="dashboard-card">

                    <CardHeader
                        icon={<LayoutDashboard />}
                        title="Hiệu suất phòng"
                        subtitle="Tỷ lệ lấp đầy từng phòng"
                    />

                    <div className="room-list">

                        {data.rooms.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.rooms.slice(0, 8).map(
                                room => {

                                    const occupancy =
                                        Number(
                                            room.occupancy
                                        ) || 0;

                                    const revenue =
                                        Number(
                                            room.revenue
                                        ) || 0;

                                    const width =
                                        Math.min(
                                            occupancy,
                                            100
                                        );

                                    return (
                                        <div
                                            className="room-item"
                                            key={
                                                room.room_id
                                            }
                                        >

                                            <div className="room-info">

                                                <strong>
                                                    {
                                                        room.room_name
                                                    }
                                                </strong>

                                                <span>
                                                    {
                                                        room.cinema_name
                                                    } • {
                                                        room.room_type
                                                    }
                                                </span>

                                            </div>

                                            <div className="room-progress">

                                                <div className="room-progress-top">
                                                    <span>
                                                        {occupancy}%
                                                    </span>

                                                    <strong>
                                                        {money(
                                                            revenue
                                                        )}
                                                    </strong>
                                                </div>

                                                <div className="progress-track">
                                                    <div
                                                        className="progress-fill"
                                                        style={{
                                                            width:
                                                                `${width}%`
                                                        }}
                                                    />
                                                </div>

                                            </div>

                                        </div>
                                    );
                                }
                            )
                        )}

                    </div>

                </div>


                <div className="dashboard-card">

                    <CardHeader
                        icon={<Clock3 />}
                        title="Suất chiếu nổi bật"
                        subtitle="Các suất có lượng vé cao"
                    />

                    <div className="showtime-list">

                        {data.showtimes.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.showtimes.slice(0, 8).map(
                                showtime => (
                                    <div
                                        className="showtime-item"
                                        key={
                                            showtime.showtime_id
                                        }
                                    >

                                        <div className="showtime-time">
                                            {formatTime(
                                                showtime.start_time
                                            )}
                                        </div>

                                        <div className="showtime-info">

                                            <strong>
                                                {
                                                    showtime.movie_title
                                                }
                                            </strong>

                                            <span>
                                                {
                                                    showtime.cinema_name
                                                } • {
                                                    showtime.room_name
                                                }
                                            </span>

                                        </div>

                                        <div className="showtime-occupancy">

                                            <strong>
                                                {
                                                    showtime.occupancy
                                                }%
                                            </strong>

                                            <span>
                                                {
                                                    showtime.tickets
                                                } / {
                                                    showtime.total_seats
                                                }
                                            </span>

                                        </div>

                                    </div>
                                )
                            )
                        )}

                    </div>

                </div>

            </section>


            {/* =====================================================
                CUSTOMERS + PRODUCTS
            ===================================================== */}

            <section className="dashboard-grid grid-two">

                <div className="dashboard-card">

                    <CardHeader
                        icon={<UserRound />}
                        title="Khách hàng nổi bật"
                        subtitle="Khách có mức chi tiêu cao nhất"
                    />

                    <div className="customer-list">

                        {data.topCustomers.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.topCustomers.map(
                                (customer, index) => (
                                    <div
                                        className="customer-item"
                                        key={
                                            customer.user_id
                                        }
                                    >

                                        <div className="customer-rank">
                                            {index + 1}
                                        </div>

                                        <div className="customer-avatar">

                                            {customer.avatar ? (
                                                <img
                                                    src={
                                                        customer.avatar
                                                    }
                                                    alt={
                                                        customer.full_name
                                                    }
                                                />
                                            ) : (
                                                <UserRound
                                                    size={17}
                                                />
                                            )}

                                        </div>

                                        <div className="customer-info">

                                            <strong>
                                                {
                                                    customer.full_name
                                                }
                                            </strong>

                                            <span>
                                                {
                                                    customer.email
                                                }
                                            </span>

                                        </div>

                                        <div className="customer-money">

                                            <strong>
                                                {money(
                                                    customer.spending
                                                )}
                                            </strong>

                                            <span>
                                                {
                                                    customer.orders
                                                } đơn
                                            </span>

                                        </div>

                                    </div>
                                )
                            )
                        )}

                    </div>

                </div>


                <div className="dashboard-card">

                    <CardHeader
                        icon={<Package />}
                        title="Sản phẩm bán chạy"
                        subtitle="Đồ ăn và sản phẩm có doanh thu cao"
                    />

                    <div className="product-list">

                        {data.products.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.products.slice(0, 8).map(
                                product => (
                                    <div
                                        className="product-item"
                                        key={
                                            product.product_id
                                        }
                                    >

                                        <div className="product-image">

                                            {product.image ? (
                                                <img
                                                    src={
                                                        product.image
                                                    }
                                                    alt={
                                                        product.product_name
                                                    }
                                                />
                                            ) : (
                                                <Package
                                                    size={18}
                                                />
                                            )}

                                        </div>

                                        <div className="product-info">

                                            <strong>
                                                {
                                                    product.product_name
                                                }
                                            </strong>

                                            <span>
                                                {
                                                    product.category
                                                } • {
                                                    product.quantity
                                                } sản phẩm
                                            </span>

                                        </div>

                                        <strong className="product-revenue">
                                            {money(
                                                product.revenue
                                            )}
                                        </strong>

                                    </div>
                                )
                            )
                        )}

                    </div>

                </div>

            </section>


            {/* =====================================================
                USER STATUS + GROWTH
            ===================================================== */}

            <section className="dashboard-grid grid-two">

                <div className="dashboard-card">

                    <CardHeader
                        icon={<Users />}
                        title="Trạng thái khách hàng"
                        subtitle="Phân bổ tài khoản khách hàng"
                    />

                    <div className="user-status-grid">

                        {data.userStatus.map(
                            item => {

                                const total =
                                    totalUserStatus ||
                                    1;

                                const value =
                                    Number(
                                        item.total
                                    ) || 0;

                                const width =
                                    (
                                        value /
                                        total
                                    ) * 100;

                                return (
                                    <div
                                        className="user-status-item"
                                        key={
                                            item.status
                                        }
                                    >

                                        <div className="user-status-top">

                                            <span>
                                                {item.status}
                                            </span>

                                            <strong>
                                                {number(
                                                    value
                                                )}
                                            </strong>

                                        </div>

                                        <div className="progress-track">
                                            <div
                                                className="progress-fill"
                                                style={{
                                                    width:
                                                        `${width}%`
                                                }}
                                            />
                                        </div>

                                    </div>
                                );
                            }
                        )}

                    </div>

                </div>


                <div className="dashboard-card">

                    <CardHeader
                        icon={<TrendingUp />}
                        title="Tăng trưởng người dùng"
                        subtitle="Khách hàng mới trong kỳ"
                    />

                    <div className="growth-list">

                        {data.userGrowth.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.userGrowth
                                .slice(-8)
                                .map(item => (
                                    <div
                                        className="growth-item"
                                        key={
                                            item.date
                                        }
                                    >

                                        <span>
                                            {new Date(
                                                item.date
                                            ).toLocaleDateString(
                                                'vi-VN',
                                                {
                                                    day: '2-digit',
                                                    month: '2-digit'
                                                }
                                            )}
                                        </span>

                                        <div className="growth-bar-wrap">
                                            <div
                                                className="growth-bar"
                                                style={{
                                                    width:
                                                        `${Math.min(
                                                            Number(
                                                                item.newUsers
                                                            ) * 10,
                                                            100
                                                        )}%`
                                                }}
                                            />
                                        </div>

                                        <strong>
                                            +{
                                                number(
                                                    item.newUsers
                                                )
                                            }
                                        </strong>

                                    </div>
                                ))
                        )}

                    </div>

                </div>

            </section>


            {/* =====================================================
                CONTENT STATS
            ===================================================== */}

            <section className="dashboard-card full-card">

                <CardHeader
                    icon={<BarChart3 />}
                    title="Nội dung website"
                    subtitle="Tổng quan tài nguyên đang có trên hệ thống"
                />

                <div className="content-grid">

                    <ContentItem
                        icon={<Film />}
                        label="Phim"
                        value={content.movies?.total}
                        meta={
                            content.movies
                                ? `${content.movies.showing || 0} đang chiếu`
                                : ''
                        }
                    />

                    <ContentItem
                        icon={<Star />}
                        label="Diễn viên"
                        value={content.actors}
                    />

                    <ContentItem
                        icon={<Clapperboard />}
                        label="Thể loại"
                        value={content.genres}
                    />

                    <ContentItem
                        icon={<MapPin />}
                        label="Rạp"
                        value={content.cinemas}
                    />

                    <ContentItem
                        icon={<LayoutDashboard />}
                        label="Phòng"
                        value={content.rooms}
                    />

                    <ContentItem
                        icon={<Clock3 />}
                        label="Suất chiếu"
                        value={
                            content.upcomingShowtimes
                        }
                    />

                    <ContentItem
                        icon={<Package />}
                        label="Sản phẩm"
                        value={
                            content.products?.total
                        }
                        meta={
                            content.products
                                ? `${content.products.active || 0} đang hoạt động`
                                : ''
                        }
                    />

                    <ContentItem
                        icon={<Activity />}
                        label="Blog"
                        value={
                            content.blogs?.total
                        }
                        meta={
                            content.blogs
                                ? `${content.blogs.active || 0} đang hoạt động`
                                : ''
                        }
                    />

                    <ContentItem
                        icon={<Percent />}
                        label="Khuyến mãi"
                        value={
                            content.promotions?.total
                        }
                    />

                    <ContentItem
                        icon={<Ticket />}
                        label="Banner"
                        value={
                            content.banners?.total
                        }
                    />

                    <ContentItem
                        icon={<Star />}
                        label="Đánh giá"
                        value={
                            content.reviews?.total
                        }
                        meta={
                            content.reviews
                                ? `${Number(
                                    content.reviews.averageRating
                                ).toFixed(1)} / 5`
                                : ''
                        }
                    />

                    <ContentItem
                        icon={<Activity />}
                        label="Tin tức"
                        value={content.news}
                    />

                </div>

            </section>


            {/* =====================================================
                REVIEWS + COUPONS + OTP
            ===================================================== */}

            <section className="dashboard-grid grid-three">

                <div className="dashboard-card">

                    <CardHeader
                        icon={<Star />}
                        title="Đánh giá phim"
                        subtitle="Điểm đánh giá trung bình"
                    />

                    <div className="review-list">

                        {data.reviews
                            .slice(0, 7)
                            .map(movie => (
                                <div
                                    className="review-item"
                                    key={
                                        movie.movie_id
                                    }
                                >

                                    <div className="review-info">
                                        <strong>
                                            {
                                                movie.title
                                            }
                                        </strong>

                                        <span>
                                            {
                                                movie.review_count
                                            } đánh giá
                                        </span>
                                    </div>

                                    <div className="review-score">

                                        <Star
                                            size={15}
                                            fill="currentColor"
                                        />

                                        <strong>
                                            {
                                                movie.average_rating
                                            }
                                        </strong>

                                    </div>

                                </div>
                            ))}

                    </div>

                </div>


                <div className="dashboard-card">

                    <CardHeader
                        icon={<Percent />}
                        title="Coupon"
                        subtitle="Hiệu quả mã giảm giá"
                    />

                    <div className="coupon-list">

                        {data.coupons
                            .slice(0, 7)
                            .map(coupon => (
                                <div
                                    className="coupon-item"
                                    key={
                                        coupon.coupon_id
                                    }
                                >

                                    <div>
                                        <strong>
                                            {
                                                coupon.coupon_code
                                            }
                                        </strong>

                                        <span>
                                            {
                                                coupon.used_count
                                            } lượt dùng
                                        </span>
                                    </div>

                                    <strong>
                                        {money(
                                            coupon.revenue
                                        )}
                                    </strong>

                                </div>
                            ))}

                    </div>

                </div>


                <div className="dashboard-card">

                    <CardHeader
                        icon={<Activity />}
                        title="OTP Activity"
                        subtitle="Hoạt động xác thực"
                    />

                    <div className="otp-list">

                        {data.otp.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.otp
                                .slice(0, 8)
                                .map((item, index) => (
                                    <div
                                        className="otp-item"
                                        key={
                                            `${item.purpose}-${item.status}-${index}`
                                        }
                                    >

                                        <div>
                                            <strong>
                                                {
                                                    item.purpose
                                                }
                                            </strong>

                                            <span>
                                                {
                                                    item.status
                                                }
                                            </span>
                                        </div>

                                        <strong>
                                            {
                                                number(
                                                    item.total
                                                )
                                            }
                                        </strong>

                                    </div>
                                ))
                        )}

                    </div>

                </div>

            </section>


            {/* =====================================================
                FOOTER
            ===================================================== */}

            <footer className="dashboard-footer">

                <div>
                    <span className="footer-dot" />
                    Hệ thống đang hoạt động
                </div>

                <span>
                    Quang Dung Cinema Admin Dashboard
                </span>

            </footer>

        </div>
    );
}


/* ============================================================
    COMPONENTS
============================================================ */

function KpiCard({
    title,
    value,
    icon,
    iconClass,
    change,
    comparison,
    loading
}) {
    const positive =
        Number(change) >= 0;

    return (
        <div className="kpi-card">

            <div className="kpi-top">

                <div className={`kpi-icon ${iconClass}`}>
                    {icon}
                </div>

                {change !== null &&
                    change !== undefined && (
                        <div
                            className={
                                positive
                                    ? 'kpi-change positive'
                                    : 'kpi-change negative'
                            }
                        >
                            {positive ? (
                                <ArrowUpRight
                                    size={14}
                                />
                            ) : (
                                <ArrowDownRight
                                    size={14}
                                />
                            )}

                            {percent(change)}
                        </div>
                    )}

            </div>

            <div className="kpi-content">

                <span>
                    {title}
                </span>

                <strong>
                    {loading
                        ? '...'
                        : value}
                </strong>

                <small>
                    {comparison}
                </small>

            </div>

        </div>
    );
}


function CardHeader({
    icon,
    title,
    subtitle
}) {
    return (
        <div className="card-header">

            <div className="card-title-wrap">

                <div className="card-icon">
                    {icon}
                </div>

                <div>
                    <h2>
                        {title}
                    </h2>

                    <p>
                        {subtitle}
                    </p>
                </div>

            </div>

            <ChevronDown
                size={18}
                className="card-more"
            />

        </div>
    );
}


function ContentItem({
    icon,
    label,
    value,
    meta
}) {
    return (
        <div className="content-item">

            <div className="content-icon">
                {icon}
            </div>

            <div>
                <span>
                    {label}
                </span>

                <strong>
                    {number(value)}
                </strong>

                {meta && (
                    <small>
                        {meta}
                    </small>
                )}
            </div>

        </div>
    );
}


function EmptyChart() {
    return (
        <div className="empty-chart">
            <BarChart3 size={30} />
            <span>
                Chưa có dữ liệu trong kỳ này
            </span>
        </div>
    );
}


function EmptyList() {
    return (
        <div className="empty-list">
            <AlertCircle size={20} />
            <span>
                Chưa có dữ liệu
            </span>
        </div>
    );
}

export default AdminDashboard;