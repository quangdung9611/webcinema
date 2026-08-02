import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../api/api';

import {
    Activity,
    AlertCircle,
    BarChart3,
    CalendarDays,
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
} from 'lucide-react';

import '../../styles/AdminDashboard.css';

// =============================================================
// API ENDPOINTS
// =============================================================

const API = {
    stats: '/admin/api/dashboard/stats',
    transactions: '/admin/api/dashboard/transactions',
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
    seats: '/admin/api/dashboard/seat-performance',
};

// =============================================================
// CONSTANTS
// =============================================================

const PERIODS = [
    { value: 'today', label: 'Hôm nay' },
    { value: 'week', label: '7 ngày' },
    { value: 'month', label: '30 ngày' },
    { value: 'quarter', label: '90 ngày' },
    { value: 'year', label: '1 năm' },
    { value: 'custom', label: 'Tùy chỉnh' },
];

const EMPTY_STATE = {
    stats: null,
    transactions: [],
    transactionPagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    transactionPeriod: null,
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
    seats: null,
};

// =============================================================
// HELPERS
// =============================================================

const money = (value) =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);

const number = (value) =>
    new Intl.NumberFormat('vi-VN').format(Number(value) || 0);

const percent = (value) => {
    const n = Number(value) || 0;
    return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
};

const formatDate = (date) => {
    if (!date) return '--';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

const formatTime = (date) => {
    if (!date) return '--';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatShowtime = (value) => {
    if (!value) return '--';
    if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) {
        return value.substring(0, 5);
    }
    return formatTime(value);
};

const getPoster = (poster) => {
    if (!poster) return null;
    if (poster.startsWith('http://') || poster.startsWith('https://')) {
        return poster;
    }
    return poster;
};

const getPeriodDates = (period, customStartDate, customEndDate) => {
    if (period === 'custom') {
        return { startDate: customStartDate || '', endDate: customEndDate || '' };
    }

    const today = new Date();
    const end = new Date(today);
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);

    switch (period) {
        case 'today': break;
        case 'week': start.setDate(start.getDate() - 6); break;
        case 'month': start.setDate(start.getDate() - 29); break;
        case 'quarter': start.setDate(start.getDate() - 89); break;
        case 'year': start.setFullYear(start.getFullYear() - 1); break;
        default: start.setDate(start.getDate() - 6);
    }

    const toInputDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    return { startDate: toInputDate(start), endDate: toInputDate(end) };
};

const getPeriodLabel = (period) => {
    const found = PERIODS.find((p) => p.value === period);
    return found ? found.label : period;
};

// =============================================================
// MAIN COMPONENT
// =============================================================

function AdminDashboard() {
    // ---- State ----
    const [period, setPeriod] = useState('week');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [data, setData] = useState(EMPTY_STATE);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [showCustom, setShowCustom] = useState(false);

    // Transaction filters
    const [transactionSearch, setTransactionSearch] = useState('');
    const [transactionPage, setTransactionPage] = useState(1);
    const [transactionStatus, setTransactionStatus] = useState('Completed');

    // ---- Computed ----
    const queryParams = useMemo(() => {
        const params = { period };
        if (period === 'custom' && startDate && endDate) {
            params.startDate = startDate;
            params.endDate = endDate;
        }
        return params;
    }, [period, startDate, endDate]);

    const transactionDates = useMemo(
        () => getPeriodDates(period, startDate, endDate),
        [period, startDate, endDate]
    );

    const stats = data.stats || {};
    const comparison = stats.comparison || {};
    const content = data.content || {};
    const seatData = data.seats || {};
    const transactionPagination = data.transactionPagination || EMPTY_STATE.transactionPagination;

    const maxCinemaRevenue = Math.max(
        ...data.cinemas.map((item) => Number(item.revenue) || 0),
        1
    );

    const totalBookingStatus = data.bookingStatus.reduce(
        (sum, item) => sum + Number(item.orders) || 0,
        0
    );

    const totalUserStatus = data.userStatus.reduce(
        (sum, item) => sum + Number(item.total) || 0,
        0
    );

    // ---- Fetch ----
    const fetchDashboard = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError('');

            if (period === 'custom' && (!startDate || !endDate)) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const requests = [
                ['stats', API.stats],
                ['transactions', API.transactions],
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
                ['seats', API.seats],
            ];

            const responses = await Promise.allSettled(
                requests.map(([key, url]) => {
                    if (key === 'transactions') {
                        return api.get(url, {
                            params: {
                                startDate: transactionDates.startDate,
                                endDate: transactionDates.endDate,
                                page: transactionPage,
                                limit: 20,
                                search: transactionSearch,
                                status: transactionStatus,
                            },
                        });
                    }
                    return api.get(url, {
                        params: {
                            ...queryParams,
                            ...(key === 'topMovies' && { limit: 10 }),
                            ...(key === 'topCustomers' && { limit: 10 }),
                            ...(key === 'showtimes' && { limit: 10 }),
                        },
                    });
                })
            );

            const nextData = { ...EMPTY_STATE };

            responses.forEach((result, index) => {
                const [key] = requests[index];
                if (result.status !== 'fulfilled' || !result.value?.data?.success) {
                    console.error(`Dashboard API failed: ${key}`, result.reason || result.value?.data);
                    return;
                }
                const response = result.value.data;

                switch (key) {
                    case 'stats':
                        nextData.stats = response;
                        break;
                    case 'transactions':
                        nextData.transactions = Array.isArray(response.data) ? response.data : [];
                        nextData.transactionPagination = response.pagination || EMPTY_STATE.transactionPagination;
                        nextData.transactionPeriod = response.period || null;
                        break;
                    case 'topMovies':
                        nextData.topMovies = response.movies || response.data || [];
                        break;
                    case 'bookingStatus':
                        nextData.bookingStatus = response.data || [];
                        break;
                    case 'userGrowth':
                        nextData.userGrowth = response.data || [];
                        break;
                    case 'topCustomers':
                        nextData.topCustomers = response.data || [];
                        break;
                    case 'products':
                        nextData.products = response.data || [];
                        break;
                    case 'cinemas':
                        nextData.cinemas = response.data || [];
                        break;
                    case 'rooms':
                        nextData.rooms = response.data || [];
                        break;
                    case 'showtimes':
                        nextData.showtimes = response.data || [];
                        break;
                    case 'coupons':
                        nextData.coupons = response.data || [];
                        break;
                    case 'content':
                        nextData.content = response.data || response;
                        break;
                    case 'userStatus':
                        nextData.userStatus = response.data || [];
                        break;
                    case 'otp':
                        nextData.otp = response.data || [];
                        break;
                    case 'reviews':
                        nextData.reviews = response.data || [];
                        break;
                    case 'seats':
                        nextData.seats = response.data || null;
                        break;
                    default:
                        break;
                }
            });

            setData(nextData);
        } catch (err) {
            console.error('Dashboard error:', err);
            setError('Không thể tải dữ liệu dashboard.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // ---- Effects ----
    useEffect(() => {
        fetchDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryParams, transactionDates, transactionPage, transactionSearch, transactionStatus]);

    // ---- Handlers ----
    const handlePeriodChange = (value) => {
        setPeriod(value);
        setTransactionPage(1);
        setShowCustom(value === 'custom');
    };

    const handleCustomSubmit = () => {
        if (!startDate || !endDate) {
            setError('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.');
            return;
        }
        if (startDate > endDate) {
            setError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
            return;
        }
        setError('');
        setPeriod('custom');
        setShowCustom(true);
        setTransactionPage(1);
    };

    const handleTransactionSearch = (e) => {
        setTransactionSearch(e.target.value);
        setTransactionPage(1);
    };

    const handleTransactionStatus = (e) => {
        setTransactionStatus(e.target.value);
        setTransactionPage(1);
    };

    // ---- Render helpers ----
    const renderPeriodTabs = () => (
        <div className="period-tabs">
            {PERIODS.map((item) => (
                <button
                    key={item.value}
                    type="button"
                    className={`period-tab ${period === item.value ? 'active' : ''}`}
                    onClick={() => handlePeriodChange(item.value)}
                >
                    {item.label}
                </button>
            ))}
        </div>
    );

    const renderCustomDate = () => {
        if (!showCustom || period !== 'custom') return null;
        return (
            <div className="custom-date">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <span>—</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                <button type="button" onClick={handleCustomSubmit}>
                    Áp dụng
                </button>
            </div>
        );
    };

    const renderError = () => {
        if (!error) return null;
        return (
            <div className="dashboard-error">
                <AlertCircle size={19} />
                <span>{error}</span>
                <button type="button" onClick={() => fetchDashboard(true)}>
                    Thử lại
                </button>
            </div>
        );
    };

    // ---- Render ----
    return (
        <div className="dashboard-page">
            {/* HEADER */}
            <header className="dashboard-header">
                <div className="dashboard-heading">
                    <div className="dashboard-heading-icon">
                        <LayoutDashboard size={22} />
                    </div>
                    <div>
                        <span className="dashboard-eyebrow">QUANG DUNG CINEMA</span>
                        <h1>Tổng quan hệ thống</h1>
                        <p>Theo dõi hoạt động kinh doanh và hiệu suất rạp phim.</p>
                    </div>
                </div>
                <div className="dashboard-actions">
                    <button
                        type="button"
                        className="refresh-button"
                        onClick={() => fetchDashboard(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw size={17} className={refreshing ? 'spin' : ''} />
                        <span>Làm mới</span>
                    </button>
                </div>
            </header>

            {/* FILTER */}
            <section className="dashboard-filter">
                <div className="filter-left">
                    <div className="filter-label">
                        <CalendarDays size={17} />
                        <span>Khoảng thời gian</span>
                    </div>
                    {renderPeriodTabs()}
                </div>
                {renderCustomDate()}
                <div className="current-period">
                    <span>Đang xem</span>
                    <strong>{getPeriodLabel(period)}</strong>
                </div>
            </section>

            {renderError()}

            {/* KPI CARDS */}
            <section className="kpi-grid">
                <KpiCard
                    title="Tổng doanh thu"
                    value={money(stats.revenue)}
                    icon={<CircleDollarSign />}
                    iconClass="gold"
                    change={comparison.revenue?.change}
                    previousValue={comparison.revenue?.previous}
                    currentValue={comparison.revenue?.current}
                    comparison="so với kỳ trước"
                    loading={loading}
                />
                <KpiCard
                    title="Đơn đặt vé"
                    value={number(stats.orders)}
                    icon={<Ticket />}
                    iconClass="blue"
                    change={comparison.orders?.change}
                    previousValue={comparison.orders?.previous}
                    currentValue={comparison.orders?.current}
                    comparison="so với kỳ trước"
                    loading={loading}
                />
                <KpiCard
                    title="Vé đã bán"
                    value={number(stats.tickets)}
                    icon={<Clapperboard />}
                    iconClass="purple"
                    change={comparison.tickets?.change}
                    previousValue={comparison.tickets?.previous}
                    currentValue={comparison.tickets?.current}
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

            {/* TRANSACTIONS + SEAT */}
            <section className="dashboard-grid grid-main">
                {/* Transactions Table */}
                <div className="dashboard-card revenue-card">
                    <CardHeader icon={<TrendingUp />} title="Chi tiết giao dịch" subtitle="Danh sách đơn đặt vé và doanh thu trong kỳ" />

                    <div className="transaction-toolbar">
                        <div className="transaction-search">
                            <input
                                type="text"
                                value={transactionSearch}
                                onChange={handleTransactionSearch}
                                placeholder="Tìm khách hàng, email, phim, ghi chú..."
                            />
                        </div>
                        <div className="transaction-status">
                            <select value={transactionStatus} onChange={handleTransactionStatus}>
                                <option value="Completed">Hoàn thành</option>
                                <option value="Pending">Đang xử lý</option>
                                <option value="Cancelled">Đã hủy</option>
                                <option value="all">Tất cả</option>
                            </select>
                        </div>
                    </div>

                    <div className="revenue-summary">
                        <div>
                            <span>Tổng doanh thu</span>
                            <strong>{money(stats.revenue)}</strong>
                        </div>
                        <div>
                            <span>Số đơn</span>
                            <strong>{number(transactionPagination.total)}</strong>
                        </div>
                        <div>
                            <span>Vé đã bán</span>
                            <strong>{number(stats.tickets)}</strong>
                        </div>
                    </div>

                    <div className="revenue-table-wrapper">
                        {data.transactions.length === 0 ? (
                            <div className="revenue-empty">
                                <TrendingUp size={32} />
                                <strong>Chưa có giao dịch</strong>
                                <span>Không có đơn hàng phù hợp trong khoảng thời gian này.</span>
                            </div>
                        ) : (
                            <TransactionTable transactions={data.transactions} />
                        )}
                    </div>

                    {transactionPagination.totalPages > 1 && (
                        <div className="transaction-pagination">
                            <button
                                type="button"
                                disabled={transactionPage <= 1}
                                onClick={() => setTransactionPage((p) => Math.max(p - 1, 1))}
                            >
                                Trước
                            </button>
                            <span>
                                Trang <strong>{transactionPagination.page}</strong> /{' '}
                                <strong>{transactionPagination.totalPages}</strong>
                            </span>
                            <button
                                type="button"
                                disabled={transactionPage >= transactionPagination.totalPages}
                                onClick={() =>
                                    setTransactionPage((p) => Math.min(p + 1, transactionPagination.totalPages))
                                }
                            >
                                Sau
                            </button>
                        </div>
                    )}
                </div>

                {/* Seat Capacity */}
                <div className="dashboard-card seat-card">
                    <CardHeader icon={<Ticket />} title="Công suất toàn hệ thống" subtitle="Tình trạng sử dụng ghế" />
                    <div className="seat-circle-wrap">
                        <div
                            className="seat-circle"
                            style={{
                                '--progress': `${Math.min(Number(seatData.occupancy) || 0, 100) * 3.6}deg`,
                            }}
                        >
                            <div className="seat-circle-inner">
                                <strong>{Number(seatData.occupancy) || 0}%</strong>
                                <span>lấp đầy</span>
                            </div>
                        </div>
                    </div>
                    <div className="seat-stats">
                        <div>
                            <span>Suất chiếu</span>
                            <strong>{number(seatData.showtimes)}</strong>
                        </div>
                        <div>
                            <span>Tổng ghế</span>
                            <strong>{number(seatData.capacity)}</strong>
                        </div>
                        <div>
                            <span>Đã bán</span>
                            <strong>{number(seatData.soldTickets)}</strong>
                        </div>
                        <div>
                            <span>Còn trống</span>
                            <strong>{number(seatData.emptySeats)}</strong>
                        </div>
                    </div>
                </div>
            </section>

            {/* TOP MOVIES + BOOKING STATUS */}
            <section className="dashboard-grid grid-two">
                <div className="dashboard-card">
                    <CardHeader icon={<Film />} title="Top phim" subtitle="Phim có doanh thu vé cao nhất" />
                    <div className="movie-ranking">
                        {data.topMovies.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.topMovies.map((movie, index) => (
                                <div className="movie-ranking-item" key={movie.id || movie.movie_id || index}>
                                    <div className="ranking-number">{String(index + 1).padStart(2, '0')}</div>
                                    <div className="movie-poster">
                                        {getPoster(movie.poster) ? (
                                            <img src={getPoster(movie.poster)} alt={movie.title || 'Movie'} />
                                        ) : (
                                            <Film size={20} />
                                        )}
                                    </div>
                                    <div className="movie-info">
                                        <strong>{movie.title || '--'}</strong>
                                        <span>{movie.tickets_sold} vé • {movie.orders || 0} đơn</span>
                                    </div>
                                    <div className="movie-revenue">{money(movie.revenue)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="dashboard-card">
                    <CardHeader icon={<Activity />} title="Trạng thái booking" subtitle="Phân bổ đơn đặt vé" />
                    <div className="status-list">
                        {data.bookingStatus.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.bookingStatus.map((item, index) => {
                                const value = Number(item.orders) || 0;
                                const width = Math.min((value / (totalBookingStatus || 1)) * 100, 100);
                                const statusClass = String(item.status || '')
                                    .toLowerCase()
                                    .replace(/\s+/g, '-');
                                return (
                                    <div className="status-row" key={`${item.status}-${index}`}>
                                        <div className="status-row-top">
                                            <span className="status-name">
                                                <i className={`status-dot ${statusClass}`} />
                                                {item.status || '--'}
                                            </span>
                                            <strong>{number(value)}</strong>
                                        </div>
                                        <div className="progress-track">
                                            <div className="progress-fill" style={{ width: `${width}%` }} />
                                        </div>
                                        <div className="status-meta">{money(item.revenue)}</div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </section>

            {/* CINEMA PERFORMANCE */}
            <section className="dashboard-card full-card">
                <CardHeader icon={<MapPin />} title="Hiệu suất theo rạp" subtitle="So sánh doanh thu và lượng vé giữa các rạp" />
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
                        data.cinemas.map((cinema) => {
                            const revenue = Number(cinema.revenue) || 0;
                            return (
                                <div className="table-row" key={cinema.cinema_id || cinema.id}>
                                    <strong>{cinema.cinema_name || '--'}</strong>
                                    <span>{number(cinema.orders)}</span>
                                    <span>{number(cinema.tickets)}</span>
                                    <strong className="money">{money(revenue)}</strong>
                                    <div className="mini-progress">
                                        <div style={{ width: `${(revenue / maxCinemaRevenue) * 100}%` }} />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            {/* ROOMS + SHOWTIMES */}
            <section className="dashboard-grid grid-two">
                <div className="dashboard-card">
                    <CardHeader icon={<LayoutDashboard />} title="Hiệu suất phòng" subtitle="Tỷ lệ lấp đầy từng phòng" />
                    <div className="room-list">
                        {data.rooms.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.rooms.slice(0, 8).map((room) => {
                                const occupancy = Number(room.occupancy) || 0;
                                return (
                                    <div className="room-item" key={room.room_id || room.id}>
                                        <div className="room-info">
                                            <strong>{room.room_name || '--'}</strong>
                                            <span>{room.cinema_name || '--'} • {room.room_type || '--'}</span>
                                        </div>
                                        <div className="room-progress">
                                            <div className="room-progress-top">
                                                <span>{occupancy}%</span>
                                                <strong>{money(room.revenue)}</strong>
                                            </div>
                                            <div className="progress-track">
                                                <div className="progress-fill" style={{ width: `${Math.min(occupancy, 100)}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="dashboard-card">
                    <CardHeader icon={<Clock3 />} title="Suất chiếu nổi bật" subtitle="Các suất có lượng vé cao" />
                    <div className="showtime-list">
                        {data.showtimes.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.showtimes.slice(0, 8).map((showtime) => (
                                <div className="showtime-item" key={showtime.showtime_id || showtime.id}>
                                    <div className="showtime-time">{formatShowtime(showtime.start_time)}</div>
                                    <div className="showtime-info">
                                        <strong>{showtime.movie_title || '--'}</strong>
                                        <span>{showtime.cinema_name || '--'} • {showtime.room_name || '--'}</span>
                                    </div>
                                    <div className="showtime-occupancy">
                                        <strong>{showtime.occupancy || 0}%</strong>
                                        <span>{showtime.tickets || 0} / {showtime.total_seats || 0}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* CUSTOMERS + PRODUCTS */}
            <section className="dashboard-grid grid-two">
                <div className="dashboard-card">
                    <CardHeader icon={<UserRound />} title="Khách hàng nổi bật" subtitle="Khách có mức chi tiêu cao nhất" />
                    <div className="customer-list">
                        {data.topCustomers.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.topCustomers.map((customer, index) => (
                                <div className="customer-item" key={customer.user_id || customer.id || index}>
                                    <div className="customer-rank">{index + 1}</div>
                                    <div className="customer-avatar">
                                        {customer.avatar ? (
                                            <img src={customer.avatar} alt={customer.full_name || 'Customer'} />
                                        ) : (
                                            <UserRound size={17} />
                                        )}
                                    </div>
                                    <div className="customer-info">
                                        <strong>{customer.full_name || '--'}</strong>
                                        <span>{customer.email || '--'}</span>
                                    </div>
                                    <div className="customer-money">
                                        <strong>{money(customer.spending)}</strong>
                                        <span>{customer.orders || 0} đơn</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="dashboard-card">
                    <CardHeader icon={<Package />} title="Sản phẩm bán chạy" subtitle="Đồ ăn và sản phẩm có doanh thu cao" />
                    <div className="product-list">
                        {data.products.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.products.slice(0, 8).map((product) => (
                                <div className="product-item" key={product.product_id || product.id}>
                                    <div className="product-image">
                                        {product.image ? (
                                            <img src={product.image} alt={product.product_name || 'Product'} />
                                        ) : (
                                            <Package size={18} />
                                        )}
                                    </div>
                                    <div className="product-info">
                                        <strong>{product.product_name || '--'}</strong>
                                        <span>{product.category || '--'} • {product.quantity || 0} sản phẩm</span>
                                    </div>
                                    <strong className="product-revenue">{money(product.revenue)}</strong>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* USER STATUS + GROWTH */}
            <section className="dashboard-grid grid-two">
                <div className="dashboard-card">
                    <CardHeader icon={<Users />} title="Trạng thái khách hàng" subtitle="Phân bổ tài khoản khách hàng" />
                    <div className="user-status-grid">
                        {data.userStatus.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.userStatus.map((item) => {
                                const value = Number(item.total) || 0;
                                return (
                                    <div className="user-status-item" key={item.status}>
                                        <div className="user-status-top">
                                            <span>{item.status || '--'}</span>
                                            <strong>{number(value)}</strong>
                                        </div>
                                        <div className="progress-track">
                                            <div className="progress-fill" style={{ width: `${(value / (totalUserStatus || 1)) * 100}%` }} />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="dashboard-card">
                    <CardHeader icon={<TrendingUp />} title="Tăng trưởng người dùng" subtitle="Khách hàng mới trong kỳ" />
                    <div className="growth-list">
                        {data.userGrowth.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.userGrowth.slice(-8).map((item, index) => {
                                const newUsers = Number(item.newUsers) || 0;
                                return (
                                    <div className="growth-item" key={item.date || index}>
                                        <span>
                                            {item.date
                                                ? new Date(item.date).toLocaleDateString('vi-VN', {
                                                      day: '2-digit',
                                                      month: '2-digit',
                                                  })
                                                : '--'}
                                        </span>
                                        <div className="growth-bar-wrap">
                                            <div className="growth-bar" style={{ width: `${Math.min(newUsers * 10, 100)}%` }} />
                                        </div>
                                        <strong>+{number(newUsers)}</strong>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </section>

            {/* CONTENT STATS */}
            <section className="dashboard-card full-card">
                <CardHeader icon={<BarChart3 />} title="Nội dung website" subtitle="Tổng quan tài nguyên đang có trên hệ thống" />
                <div className="content-grid">
                    <ContentItem icon={<Film />} label="Phim" value={content.movies?.total} meta={content.movies ? `${content.movies.showing || 0} đang chiếu` : ''} />
                    <ContentItem icon={<Star />} label="Diễn viên" value={content.actors} />
                    <ContentItem icon={<Clapperboard />} label="Thể loại" value={content.genres} />
                    <ContentItem icon={<MapPin />} label="Rạp" value={content.cinemas} />
                    <ContentItem icon={<LayoutDashboard />} label="Phòng" value={content.rooms} />
                    <ContentItem icon={<Clock3 />} label="Suất chiếu" value={content.upcomingShowtimes} />
                    <ContentItem icon={<Package />} label="Sản phẩm" value={content.products?.total} meta={content.products ? `${content.products.active || 0} đang hoạt động` : ''} />
                    <ContentItem icon={<Activity />} label="Blog" value={content.blogs?.total} meta={content.blogs ? `${content.blogs.active || 0} đang hoạt động` : ''} />
                    <ContentItem icon={<Percent />} label="Khuyến mãi" value={content.promotions?.total} />
                    <ContentItem icon={<Ticket />} label="Banner" value={content.banners?.total} />
                    <ContentItem icon={<Star />} label="Đánh giá" value={content.reviews?.total} meta={content.reviews ? `${Number(content.reviews.averageRating).toFixed(1)} / 5` : ''} />
                    <ContentItem icon={<Activity />} label="Tin tức" value={content.news} />
                </div>
            </section>

            {/* REVIEWS + COUPONS + OTP */}
            <section className="dashboard-grid grid-three">
                <div className="dashboard-card">
                    <CardHeader icon={<Star />} title="Đánh giá phim" subtitle="Điểm đánh giá trung bình" />
                    <div className="review-list">
                        {data.reviews.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.reviews.slice(0, 7).map((movie, index) => (
                                <div className="review-item" key={movie.movie_id || movie.id || index}>
                                    <div className="review-info">
                                        <strong>{movie.title || '--'}</strong>
                                        <span>{movie.review_count} đánh giá</span>
                                    </div>
                                    <div className="review-score">
                                        <Star size={15} fill="currentColor" />
                                        <strong>{movie.average_rating}</strong>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="dashboard-card">
                    <CardHeader icon={<Percent />} title="Coupon" subtitle="Hiệu quả mã giảm giá" />
                    <div className="coupon-list">
                        {data.coupons.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.coupons.slice(0, 7).map((coupon, index) => (
                                <div className="coupon-item" key={coupon.coupon_id || coupon.id || index}>
                                    <div>
                                        <strong>{coupon.coupon_code || '--'}</strong>
                                        <span>{coupon.used_count} lượt dùng</span>
                                    </div>
                                    <strong>{money(coupon.revenue)}</strong>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="dashboard-card">
                    <CardHeader icon={<Activity />} title="OTP Activity" subtitle="Hoạt động xác thực" />
                    <div className="otp-list">
                        {data.otp.length === 0 ? (
                            <EmptyList />
                        ) : (
                            data.otp.slice(0, 8).map((item, index) => (
                                <div className="otp-item" key={`${item.purpose}-${item.status}-${index}`}>
                                    <div>
                                        <strong>{item.purpose || '--'}</strong>
                                        <span>{item.status || '--'}</span>
                                    </div>
                                    <strong>{number(item.total)}</strong>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="dashboard-footer">
                <div>
                    <span className="footer-dot" />
                    Hệ thống đang hoạt động
                </div>
                <span>Quang Dung Cinema Admin Dashboard</span>
            </footer>
        </div>
    );
}

// =============================================================
// SUB-COMPONENTS
// =============================================================

function KpiCard({ title, value, icon, iconClass, change, previousValue, currentValue, comparison, loading }) {
    const hasChange = change !== null && change !== undefined;
    const positive = Number(change) >= 0;

    return (
        <div className="kpi-card">
            <div className="kpi-card-top">
                <div className={`kpi-icon ${iconClass}`}>{icon}</div>
                {hasChange && (
                    <div className={`kpi-change ${positive ? 'positive' : 'negative'}`}>
                        <span>{positive ? '↑' : '↓'}</span>
                        <span>{percent(change)}</span>
                    </div>
                )}
            </div>
            <div className="kpi-content">
                <span className="kpi-title">{title}</span>
                <strong className="kpi-value">{loading ? '...' : value}</strong>
                <span className="kpi-comparison">{comparison}</span>
                {hasChange && previousValue !== undefined && currentValue !== undefined && (
                    <div className="kpi-detail">
                        <span>
                            Kỳ trước: <strong>{typeof value === 'string' && value.includes('₫') ? money(previousValue) : number(previousValue)}</strong>
                        </span>
                        <span>
                            Hiện tại: <strong>{typeof value === 'string' && value.includes('₫') ? money(currentValue) : number(currentValue)}</strong>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function CardHeader({ icon, title, subtitle }) {
    return (
        <div className="card-header">
            <div className="card-header-icon">{icon}</div>
            <div className="card-header-content">
                <h2>{title}</h2>
                <p>{subtitle}</p>
            </div>
        </div>
    );
}

function ContentItem({ icon, label, value, meta }) {
    return (
        <div className="content-item">
            <div className="content-item-icon">{icon}</div>
            <div className="content-item-info">
                <span>{label}</span>
                <strong>{number(value)}</strong>
                {meta && <small>{meta}</small>}
            </div>
        </div>
    );
}

function TransactionTable({ transactions }) {
    return (
        <div className="revenue-table">
            <div className="revenue-table-head">
                <span>Ngày / giờ</span>
                <span>Khách hàng</span>
                <span>Phim</span>
                <span>Suất chiếu</span>
                <span>Rạp</span>
                <span>Phòng</span>
                <span>Vé</span>
                <span>Bắp nước</span>
                <span>Tổng tiền</span>
            </div>
            <div className="revenue-table-body">
                {transactions.map((item, index) => {
                    const statusClass = String(item.status || '')
                        .toLowerCase()
                        .replace(/\s+/g, '-');
                    return (
                        <div className="revenue-table-row" key={item.booking_id || index}>
                            <div className="revenue-date">
                                <strong>{formatDate(item.booking_date)}</strong>
                                <span>{formatTime(item.booking_date)}</span>
                            </div>
                            <div className="revenue-customer">
                                <div className="revenue-avatar">
                                    <UserRound size={16} />
                                </div>
                                <div>
                                    <strong>{item.customer_name || 'Khách lẻ'}</strong>
                                    {item.email && <span>{item.email}</span>}
                                </div>
                            </div>
                            <div className="revenue-movie" title={item.movie_title}>
                                {item.movie_title || '--'}
                            </div>
                            <div>
                                <span className="ticket-badge">{formatShowtime(item.start_time)}</span>
                            </div>
                            <div className="revenue-location" title={item.cinema_name}>
                                <MapPin size={14} />
                                <span>{item.cinema_name || '--'}</span>
                            </div>
                            <div>
                                <span className="room-badge">{item.room_name || '--'}</span>
                            </div>
                            <div>
                                <span className="seat-badge">{Number(item.ticket_count) || 0} vé</span>
                            </div>
                            <div className="revenue-products">
                                {Number(item.product_count) > 0 ? (
                                    <>
                                        <Package size={14} />
                                        <span>{item.product_count} SP</span>
                                    </>
                                ) : (
                                    <span className="no-product">Không</span>
                                )}
                            </div>
                            <div className="revenue-total">
                                <strong>{money(item.total_amount)}</strong>
                                <span className={`transaction-status-badge ${statusClass}`}>
                                    {item.status || '--'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function EmptyList() {
    return (
        <div className="empty-list">
            <span>Chưa có dữ liệu</span>
        </div>
    );
}

// =============================================================
// EXPORT
// =============================================================

export default AdminDashboard;