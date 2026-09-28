import React, { useEffect, useMemo, useState } from 'react';
import api from '../../../api/api';
import * as XLSX from 'xlsx';
import {
    Activity,
    AlertCircle,
    Armchair,
    BarChart3,
    CalendarDays,
    CircleDollarSign,
    Clapperboard,
    Clock3,
    Download,
    Eye,
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
    X,
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
    Cell,
} from 'recharts';

import '../../styles/AdminDashboard.css';

// =============================================================
// API ENDPOINTS
// =============================================================

const API = {
    stats: '/admin/api/dashboard/stats',
    periodComparison: '/admin/api/dashboard/period-comparison',
    revenueTrend: '/admin/api/dashboard/revenue-trend',
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
    revenueByHour: '/admin/api/dashboard/revenue-by-hour',
    revenueBySeatType: '/admin/api/dashboard/revenue-by-seat-type',
    revenueByWeekday: '/admin/api/dashboard/revenue-by-weekday',
    revenueByRoomType: '/admin/api/dashboard/revenue-by-room-type',
    topShowtimes: '/admin/api/dashboard/top-showtimes',
    bookingDetail: (id) => `/admin/api/dashboard/bookings/${id}`,
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

const CHART_COLORS = ['#d6b36a', '#6c9eff', '#a886ff', '#5ed6a0', '#ef6a72'];

const SEAT_TYPE_COLORS = {
    STANDARD: '#9297a3',
    VIP: '#d6b36a',
    DELUXE: '#a886ff',
    RECLINER: '#6c9eff',
    COUPLE: '#ef6a72',
};

const EMPTY_STATE = {
    stats: null,
    periodComparison: [],
    revenueTrend: [],
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
    revenueByHour: [],
    revenueBySeatType: [],
    revenueByWeekday: [],
    revenueByRoomType: [],
    topShowtimes: [],
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

const moneyShort = (value) => {
    const n = Number(value) || 0;
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return `${n}`;
};

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

const formatDateShort = (date) => {
    if (!date) return '--';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
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

const formatDateTime = (date) => {
    if (!date) return '--';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
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
// GHẾ — FRONTEND
// Luôn ưu tiên ghép seat_row + seat_number => A1, A2, B10...
// =============================================================

const getSeatLabel = (seat) => {
    if (!seat) return '--';

    if (seat.seat_row != null && seat.seat_number != null) {
        return `${String(seat.seat_row).trim()}${seat.seat_number}`;
    }

    if (seat.seat_label != null && String(seat.seat_label).trim() !== '') {
        return String(seat.seat_label).trim();
    }

    return '--';
};

const getSeatList = (item) => {
    if (!item) return [];

    if (Array.isArray(item.seats)) {
        return item.seats;
    }

    return [];
};

const formatSeatsText = (item) => {
    const seats = getSeatList(item);

    return seats
        .map((seat) => {
            const label = getSeatLabel(seat);
            const type = seat?.seat_type ? ` ${seat.seat_type}` : '';
            return `${label}${type}`;
        })
        .join(', ');
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

    // Export Excel state
    const [exporting, setExporting] = useState(false);

    // Modal chi tiết đơn hàng
    const [detailModal, setDetailModal] = useState({
        open: false,
        loading: false,
        data: null,
    });

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
    const periodComparisonData = data.periodComparison || [];
    const revenueTrendData = data.revenueTrend || [];

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

    const activeHourData = useMemo(() => {
        return (data.revenueByHour || []).filter(
            (item) => item.revenue > 0 || item.orders > 0
        );
    }, [data.revenueByHour]);

    const maxHourRevenue = useMemo(() => {
        return Math.max(...activeHourData.map((h) => h.revenue), 1);
    }, [activeHourData]);

    const maxWeekdayRevenue = useMemo(() => {
        return Math.max(
            ...(data.revenueByWeekday || []).map((w) => w.revenue),
            1
        );
    }, [data.revenueByWeekday]);

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
                ['periodComparison', API.periodComparison],
                ['revenueTrend', API.revenueTrend],
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
                ['revenueByHour', API.revenueByHour],
                ['revenueBySeatType', API.revenueBySeatType],
                ['revenueByWeekday', API.revenueByWeekday],
                ['revenueByRoomType', API.revenueByRoomType],
                ['topShowtimes', API.topShowtimes],
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
                            ...(key === 'topShowtimes' && { limit: 10 }),
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
                    case 'stats': nextData.stats = response; break;
                    case 'periodComparison': nextData.periodComparison = response.data || []; break;
                    case 'revenueTrend': nextData.revenueTrend = response.data || []; break;
                    case 'transactions':
                        nextData.transactions = Array.isArray(response.data)
                            ? response.data.map((item) => ({
                                ...item,
                                seats: Array.isArray(item?.seats) ? item.seats : [],
                            }))
                            : [];
                        nextData.transactionPagination = response.pagination || EMPTY_STATE.transactionPagination;
                        nextData.transactionPeriod = response.period || null;
                        break;
                    case 'topMovies': nextData.topMovies = response.movies || response.data || []; break;
                    case 'bookingStatus': nextData.bookingStatus = response.data || []; break;
                    case 'userGrowth': nextData.userGrowth = response.data || []; break;
                    case 'topCustomers': nextData.topCustomers = response.data || []; break;
                    case 'products': nextData.products = response.data || []; break;
                    case 'cinemas': nextData.cinemas = response.data || []; break;
                    case 'rooms': nextData.rooms = response.data || []; break;
                    case 'showtimes': nextData.showtimes = response.data || []; break;
                    case 'coupons': nextData.coupons = response.data || []; break;
                    case 'content': nextData.content = response.data || response; break;
                    case 'userStatus': nextData.userStatus = response.data || []; break;
                    case 'otp': nextData.otp = response.data || []; break;
                    case 'reviews': nextData.reviews = response.data || []; break;
                    case 'seats': nextData.seats = response.data || null; break;
                    case 'revenueByHour': nextData.revenueByHour = response.data || []; break;
                    case 'revenueBySeatType': nextData.revenueBySeatType = response.data || []; break;
                    case 'revenueByWeekday': nextData.revenueByWeekday = response.data || []; break;
                    case 'revenueByRoomType': nextData.revenueByRoomType = response.data || []; break;
                    case 'topShowtimes': nextData.topShowtimes = response.data || []; break;
                    default: break;
                }
            });

            // ========================================================
            // FALLBACK GHẾ:
            // Một số response giao dịch có thể không mang seats[] dù
            // booking vẫn có vé. Khi đó lấy lại từ endpoint chi tiết
            // booking đã có sẵn và gắn vào transaction ở frontend.
            // Chỉ gọi cho những booking đang thiếu seats.
            // ========================================================
            if (nextData.transactions.length > 0) {
                const transactionsWithSeats = await Promise.all(
                    nextData.transactions.map(async (item) => {
                        if (Array.isArray(item.seats) && item.seats.length > 0) {
                            return item;
                        }

                        if (!item.booking_id) {
                            return item;
                        }

                        try {
                            const detailResponse = await api.get(
                                API.bookingDetail(item.booking_id)
                            );

                            const detail = detailResponse?.data?.success
                                ? detailResponse.data.data
                                : null;

                            if (detail && Array.isArray(detail.seats)) {
                                return {
                                    ...item,
                                    seats: detail.seats,
                                    ticket_count:
                                        item.ticket_count != null
                                            ? item.ticket_count
                                            : detail.seat_count ?? detail.seats.length,
                                };
                            }
                        } catch (detailError) {
                            console.warn(
                                `Không lấy được ghế booking ${item.booking_id}:`,
                                detailError
                            );
                        }

                        return item;
                    })
                );

                nextData.transactions = transactionsWithSeats;
            }

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

    const openDetailModal = async (bookingId) => {
        setDetailModal({ open: true, loading: true, data: null });
        try {
            const res = await api.get(API.bookingDetail(bookingId));
            if (res.data?.success) {
                setDetailModal({ open: true, loading: false, data: res.data.data });
            } else {
                setDetailModal({ open: true, loading: false, data: null });
            }
        } catch (err) {
            console.error('Load booking detail error:', err);
            setDetailModal({ open: true, loading: false, data: null });
        }
    };

    const closeDetailModal = () => {
        setDetailModal({ open: false, loading: false, data: null });
    };

    const handleExportExcel = () => {
        if (!data.transactions || data.transactions.length === 0) {
            setError('Không có giao dịch để xuất Excel.');
            return;
        }

        try {
            setExporting(true);

            const excelData = data.transactions.map((item, index) => {
                const seatsText = formatSeatsText(item);

                return {
                    'STT': index + 1,
                    'Mã đơn': item.booking_id,
                    'Ngày đặt': formatDate(item.booking_date),
                    'Giờ đặt': formatTime(item.booking_date),
                    'Khách hàng': item.customer_name || 'Khách lẻ',
                    'Email': item.email || '',
                    'Phim': item.movie_title || '',
                    'Suất chiếu': formatShowtime(item.start_time),
                    'Rạp': item.cinema_name || '',
                    'Phòng': item.room_name || '',
                    'Ghế': seatsText || 'Không',
                    'Số vé': item.ticket_count || 0,
                    'Tổng tiền (VNĐ)': Number(item.total_amount) || 0,
                    'Trạng thái': item.status === 'Completed' ? 'Hoàn thành' :
                                  item.status === 'Pending' ? 'Đang xử lý' :
                                  item.status === 'Cancelled' ? 'Đã hủy' : item.status,
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(excelData);

            worksheet['!cols'] = [
                { wch: 5 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
                { wch: 22 }, { wch: 28 }, { wch: 30 }, { wch: 10 },
                { wch: 25 }, { wch: 12 }, { wch: 30 }, { wch: 8 },
                { wch: 16 }, { wch: 14 },
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Giao dịch');

            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
            const fileName = `giao-dich-${dateStr}-${timeStr}.xlsx`;

            XLSX.writeFile(workbook, fileName);
        } catch (err) {
            console.error('❌ Lỗi xuất Excel:', err);
            setError('Không thể xuất file Excel. Vui lòng thử lại.');
        } finally {
            setExporting(false);
        }
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
                        className="export-excel-btn"
                        onClick={handleExportExcel}
                        disabled={loading || exporting || data.transactions.length === 0}
                    >
                        <Download size={17} />
                        <span>{exporting ? 'Đang xuất...' : 'Xuất giao dịch'}</span>
                    </button>
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
                    isMoney={true}
                    comparisonLabel="so với kỳ trước"
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
                    isMoney={false}
                    comparisonLabel="so với kỳ trước"
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
                    isMoney={false}
                    comparisonLabel="so với kỳ trước"
                    loading={loading}
                />
                <KpiCard
                    title="Khách hàng"
                    value={number(stats.users)}
                    icon={<Users />}
                    iconClass="green"
                    change={null}
                    isMoney={false}
                    comparisonLabel="tổng khách hàng"
                    loading={loading}
                />
            </section>

            {/* CHARTS SECTION */}
            <section className="dashboard-grid grid-charts">
                <div className="dashboard-card chart-card">
                    <CardHeader icon={<BarChart3 />} title="So sánh doanh thu theo kỳ" subtitle="Doanh thu các mốc thời gian" />
                    <div className="chart-container">
                        {periodComparisonData.length === 0 ? (
                            <EmptyChart />
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={periodComparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="label" tick={{ fill: '#9297a3', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#9297a3', fontSize: 11 }} tickFormatter={(v) => moneyShort(v)} />
                                    <Tooltip
                                        contentStyle={{ background: '#16181d', border: '1px solid rgba(214,179,106,0.18)', borderRadius: 8 }}
                                        formatter={(value) => [money(value), 'Doanh thu']}
                                        labelStyle={{ color: '#f4f4f5' }}
                                    />
                                    <Bar dataKey="currentRevenue" name="Doanh thu hiện tại" fill="#d6b36a" radius={[4, 4, 0, 0]}>
                                        {periodComparisonData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="chart-legend-compact">
                        {periodComparisonData.map((item, index) => (
                            <div className="legend-item" key={item.period}>
                                <span className="legend-dot" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                                <span>{item.label}</span>
                                <strong>{money(item.currentRevenue)}</strong>
                                <span className={`change-badge ${item.change >= 0 ? 'positive' : 'negative'}`}>
                                    {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dashboard-card chart-card">
                    <CardHeader icon={<TrendingUp />} title="Xu hướng doanh thu" subtitle="Doanh thu theo ngày trong kỳ" />
                    <div className="chart-container">
                        {revenueTrendData.length === 0 ? (
                            <EmptyChart />
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={revenueTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: '#9297a3', fontSize: 10 }}
                                        tickFormatter={(v) => formatDateShort(v)}
                                        interval={Math.max(0, Math.floor(revenueTrendData.length / 20))}
                                    />
                                    <YAxis tick={{ fill: '#9297a3', fontSize: 11 }} tickFormatter={(v) => moneyShort(v)} />
                                    <Tooltip
                                        contentStyle={{ background: '#16181d', border: '1px solid rgba(214,179,106,0.18)', borderRadius: 8 }}
                                        formatter={(value) => [money(value), 'Doanh thu']}
                                        labelFormatter={(label) => formatDate(label)}
                                        labelStyle={{ color: '#f4f4f5' }}
                                    />
                                    <Legend wrapperStyle={{ color: '#9297a3' }} />
                                    <Line type="monotone" dataKey="revenue" stroke="#d6b36a" strokeWidth={2.5} dot={{ r: 2.5, fill: '#d6b36a' }} name="Doanh thu" />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="chart-summary">
                        {revenueTrendData.length > 0 && (
                            <>
                                <span>Ngày cao nhất: <strong>{formatDate(revenueTrendData.reduce((a, b) => a.revenue > b.revenue ? a : b).date)}</strong></span>
                                <span>Doanh thu cao nhất: <strong>{money(revenueTrendData.reduce((a, b) => a.revenue > b.revenue ? a : b).revenue)}</strong></span>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* DOANH THU THEO GIỜ + THỨ */}
            <section className="dashboard-grid grid-charts">
                <div className="dashboard-card chart-card">
                    <CardHeader icon={<Clock3 />} title="Doanh thu theo giờ" subtitle="Khung giờ nào bán chạy nhất trong ngày" />
                    <div className="chart-container">
                        {activeHourData.length === 0 ? (
                            <EmptyChart />
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={activeHourData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="label" tick={{ fill: '#9297a3', fontSize: 10 }} />
                                    <YAxis tick={{ fill: '#9297a3', fontSize: 11 }} tickFormatter={(v) => moneyShort(v)} />
                                    <Tooltip
                                        contentStyle={{ background: '#16181d', border: '1px solid rgba(214,179,106,0.18)', borderRadius: 8 }}
                                        formatter={(value, name) => {
                                            if (name === 'Doanh thu') return [money(value), name];
                                            return [number(value), name];
                                        }}
                                        labelStyle={{ color: '#f4f4f5' }}
                                    />
                                    <Bar dataKey="revenue" name="Doanh thu" fill="#6c9eff" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="chart-legend-compact">
                        {activeHourData.map((item) => (
                            <div className="legend-item" key={item.hour}>
                                <span className="legend-dot" style={{ background: item.revenue === maxHourRevenue ? '#d6b36a' : '#6c9eff' }} />
                                <span>{item.label}</span>
                                <strong>{moneyShort(item.revenue)}</strong>
                                <span className="legend-meta">{number(item.tickets)} vé</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dashboard-card chart-card">
                    <CardHeader icon={<CalendarDays />} title="Doanh thu theo ngày trong tuần" subtitle="Ngày nào đông khách nhất" />
                    <div className="chart-container">
                        {(data.revenueByWeekday || []).length === 0 ? (
                            <EmptyChart />
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={data.revenueByWeekday}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="label" tick={{ fill: '#9297a3', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#9297a3', fontSize: 11 }} tickFormatter={(v) => moneyShort(v)} />
                                    <Tooltip
                                        contentStyle={{ background: '#16181d', border: '1px solid rgba(214,179,106,0.18)', borderRadius: 8 }}
                                        formatter={(value) => [money(value), 'Doanh thu']}
                                        labelStyle={{ color: '#f4f4f5' }}
                                    />
                                    <Bar dataKey="revenue" name="Doanh thu" radius={[4, 4, 0, 0]}>
                                        {(data.revenueByWeekday || []).map((entry, index) => (
                                            <Cell key={`weekday-${index}`} fill={entry.revenue === maxWeekdayRevenue ? '#d6b36a' : '#a886ff'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="chart-legend-compact">
                        {(data.revenueByWeekday || []).map((item) => (
                            <div className="legend-item" key={item.weekday}>
                                <span className="legend-dot" style={{ background: item.revenue === maxWeekdayRevenue ? '#d6b36a' : '#a886ff' }} />
                                <span>{item.label}</span>
                                <strong>{moneyShort(item.revenue)}</strong>
                                <span className="legend-meta">{number(item.orders)} đơn</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* DOANH THU THEO LOẠI GHẾ + PHÒNG */}
            <section className="dashboard-grid grid-charts">
                <div className="dashboard-card chart-card">
                    <CardHeader icon={<Armchair />} title="Doanh thu theo loại ghế" subtitle="Loại ghế nào mang lại doanh thu cao nhất" />
                    <div className="chart-container">
                        {(data.revenueBySeatType || []).length === 0 ? (
                            <EmptyChart />
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={data.revenueBySeatType} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis type="number" tick={{ fill: '#9297a3', fontSize: 11 }} tickFormatter={(v) => moneyShort(v)} />
                                    <YAxis type="category" dataKey="label" tick={{ fill: '#9297a3', fontSize: 11 }} width={80} />
                                    <Tooltip
                                        contentStyle={{ background: '#16181d', border: '1px solid rgba(214,179,106,0.18)', borderRadius: 8 }}
                                        formatter={(value) => [money(value), 'Doanh thu']}
                                        labelStyle={{ color: '#f4f4f5' }}
                                    />
                                    <Bar dataKey="revenue" name="Doanh thu" radius={[0, 4, 4, 0]}>
                                        {(data.revenueBySeatType || []).map((entry, index) => (
                                            <Cell key={`seat-${index}`} fill={SEAT_TYPE_COLORS[entry.seat_type] || CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="chart-legend-compact">
                        {(data.revenueBySeatType || []).map((item, index) => (
                            <div className="legend-item" key={item.seat_type || index}>
                                <span className="legend-dot" style={{ background: SEAT_TYPE_COLORS[item.seat_type] || CHART_COLORS[index % CHART_COLORS.length] }} />
                                <span>{item.label}</span>
                                <strong>{money(item.revenue)}</strong>
                                <span className="legend-meta">{number(item.tickets)} vé ({item.percent}%)</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dashboard-card chart-card">
                    <CardHeader icon={<Film />} title="Doanh thu theo loại phòng" subtitle="2D / 3D / VIP / IMAX - loại nào lời nhất" />
                    <div className="chart-container">
                        {(data.revenueByRoomType || []).length === 0 ? (
                            <EmptyChart />
                        ) : (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={data.revenueByRoomType}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="room_type" tick={{ fill: '#9297a3', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#9297a3', fontSize: 11 }} tickFormatter={(v) => moneyShort(v)} />
                                    <Tooltip
                                        contentStyle={{ background: '#16181d', border: '1px solid rgba(214,179,106,0.18)', borderRadius: 8 }}
                                        formatter={(value) => [money(value), 'Doanh thu']}
                                        labelStyle={{ color: '#f4f4f5' }}
                                    />
                                    <Bar dataKey="revenue" name="Doanh thu" radius={[4, 4, 0, 0]}>
                                        {(data.revenueByRoomType || []).map((entry, index) => (
                                            <Cell key={`room-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="chart-legend-compact">
                        {(data.revenueByRoomType || []).map((item, index) => (
                            <div className="legend-item" key={item.room_type || index}>
                                <span className="legend-dot" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                                <span>{item.room_type}</span>
                                <strong>{money(item.revenue)}</strong>
                                <span className="legend-meta">{number(item.showtimes)} suất • TB {moneyShort(item.avgRevenuePerShowtime)}/suất</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* TRANSACTIONS TABLE */}
            <div className="full-card">
                <div className="dashboard-card revenue-card premium-card">
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
                            <TransactionTable
                                transactions={data.transactions}
                                onViewDetail={openDetailModal}
                            />
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
            </div>

            {/* SEAT + TOP MOVIES + BOOKING STATUS */}
            <section className="dashboard-grid grid-three">
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

            {/* TOP SUẤT CHIẾU */}
            <section className="dashboard-card full-card premium-card">
                <CardHeader
                    icon={<Clapperboard />}
                    title="Top suất chiếu doanh thu cao nhất"
                    subtitle="Những suất chiếu bán chạy nhất trong kỳ"
                />
                {(data.topShowtimes || []).length === 0 ? (
                    <EmptyList />
                ) : (
                    <div className="top-showtime-list">
                        <div className="top-showtime-head">
                            <span>#</span>
                            <span>Suất chiếu</span>
                            <span>Phim</span>
                            <span>Rạp / Phòng</span>
                            <span>Vé</span>
                            <span>Lấp đầy</span>
                            <span>Doanh thu</span>
                        </div>
                        {data.topShowtimes.map((st, index) => (
                            <div className="top-showtime-row" key={st.showtime_id || index}>
                                <span className="rank">{String(index + 1).padStart(2, '0')}</span>
                                <span className="showtime-time">
                                    {formatShowtime(st.start_time)}
                                </span>
                                <span className="showtime-movie" title={st.movie_title}>
                                    {st.movie_title || '--'}
                                </span>
                                <span className="showtime-location">
                                    {st.cinema_name || '--'}
                                    {st.room_name ? ` • ${st.room_name}` : ''}
                                    {st.room_type ? ` (${st.room_type})` : ''}
                                </span>
                                <span className="showtime-tickets">
                                    {number(st.tickets)} / {number(st.total_seats)}
                                </span>
                                <span className="showtime-occupancy-cell">
                                    <span
                                        className="occupancy-bar"
                                        style={{
                                            width: `${Math.min(st.occupancy, 100)}%`,
                                            background:
                                                st.occupancy >= 80
                                                    ? '#5ed6a0'
                                                    : st.occupancy >= 50
                                                    ? '#d6b36a'
                                                    : '#ef6a72',
                                        }}
                                    />
                                    <span className="occupancy-text">
                                        {st.occupancy}%
                                    </span>
                                </span>
                                <span className="showtime-revenue">{money(st.revenue)}</span>
                            </div>
                        ))}
                    </div>
                )}
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

            {/* MODAL CHI TIẾT ĐƠN HÀNG */}
            {detailModal.open && (
                <div className="booking-detail-overlay" onClick={closeDetailModal}>
                    <div
                        className="booking-detail-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="booking-detail-header">
                            <h2>
                                Chi tiết đơn hàng #
                                {detailModal.data?.booking_id || ''}
                            </h2>
                            <button
                                type="button"
                                className="booking-detail-close"
                                onClick={closeDetailModal}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {detailModal.loading ? (
                            <div className="booking-detail-loading">
                                <RefreshCw size={24} className="spin" />
                                <span>Đang tải chi tiết...</span>
                            </div>
                        ) : !detailModal.data ? (
                            <div className="booking-detail-loading">
                                <AlertCircle size={24} />
                                <span>Không thể tải chi tiết đơn hàng.</span>
                            </div>
                        ) : (
                            <div className="booking-detail-body">
                                <section className="detail-section">
                                    <h3 className="detail-section-title">
                                        <UserRound size={16} /> Khách hàng
                                    </h3>
                                    <div className="detail-section-body">
                                        <p><strong>Họ tên:</strong> {detailModal.data.customer?.full_name || '--'}</p>
                                        <p><strong>Email:</strong> {detailModal.data.customer?.email || '--'}</p>
                                        {detailModal.data.customer?.phone && (
                                            <p><strong>SĐT:</strong> {detailModal.data.customer.phone}</p>
                                        )}
                                    </div>
                                </section>

                                <section className="detail-section">
                                    <h3 className="detail-section-title">
                                        <Film size={16} /> Suất chiếu
                                    </h3>
                                    <div className="detail-section-body">
                                        <p className="movie-name-highlight">
                                            {detailModal.data.movie?.title || '--'}
                                        </p>
                                        <p>
                                            <MapPin size={14} />{' '}
                                            {detailModal.data.cinema?.name || '--'}
                                            {detailModal.data.room?.name && ` - ${detailModal.data.room.name}`}
                                            {detailModal.data.room?.type && ` (${detailModal.data.room.type})`}
                                        </p>
                                        {detailModal.data.showtime?.start_time && (
                                            <p className="time-highlight">
                                                <CalendarDays size={14} />{' '}
                                                {formatDateTime(detailModal.data.showtime.start_time)}
                                            </p>
                                        )}
                                    </div>
                                </section>

                                <section className="detail-section">
                                    <h3 className="detail-section-title">
                                        <Ticket size={16} /> Ghế đã đặt ({detailModal.data.seat_count || 0})
                                    </h3>
                                    <div className="detail-seat-list">
                                        {(detailModal.data.seats || []).map((s, idx) => (
                                            <div className="detail-seat-item" key={s.booking_detail_id || idx}>
                                                <span className="seat-chip">
                                                    {getSeatLabel(s)}
                                                </span>
                                                <span className="seat-type-label">{s.seat_type}</span>
                                                <span className="seat-price">{money(s.subtotal)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="detail-subtotal">
                                        Tiền vé: <strong>{money(detailModal.data.seat_total)}</strong>
                                    </div>
                                </section>

                                {detailModal.data.products?.length > 0 && (
                                    <section className="detail-section">
                                        <h3 className="detail-section-title">
                                            <Package size={16} /> Bắp nước ({detailModal.data.products.length})
                                        </h3>
                                        <div className="detail-product-list">
                                            {detailModal.data.products.map((p, idx) => (
                                                <div className="detail-product-item" key={p.booking_detail_id || idx}>
                                                    <div className="detail-product-image">
                                                        {p.image ? (
                                                            <img src={p.image} alt={p.product_name} />
                                                        ) : (
                                                            <Package size={16} />
                                                        )}
                                                    </div>
                                                    <span className="detail-product-name">{p.product_name}</span>
                                                    <span className="detail-product-qty">x{p.quantity}</span>
                                                    <span className="detail-product-price">{money(p.subtotal)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="detail-subtotal">
                                            Tiền SP: <strong>{money(detailModal.data.product_total)}</strong>
                                        </div>
                                    </section>
                                )}

                                {detailModal.data.coupon && (
                                    <section className="detail-section">
                                        <h3 className="detail-section-title">
                                            <Percent size={16} /> Coupon
                                        </h3>
                                        <div className="detail-section-body">
                                            <p>
                                                Mã: <strong>{detailModal.data.coupon.coupon_code}</strong>
                                                {' — '}
                                                Giảm: <strong>{money(detailModal.data.coupon.discount_value)}</strong>
                                            </p>
                                        </div>
                                    </section>
                                )}

                                <section className="detail-section detail-total-section">
                                    <div className="detail-total-row">
                                        <span>Mã đơn:</span>
                                        <strong>{detailModal.data.memo || '--'}</strong>
                                    </div>
                                    <div className="detail-total-row detail-total-final">
                                        <span>TỔNG THANH TOÁN</span>
                                        <strong className="detail-total-amount">
                                            {money(detailModal.data.total_amount)}
                                        </strong>
                                    </div>
                                    <div className="detail-total-status">
                                        <span className={`transaction-status-badge ${String(detailModal.data.status || '').toLowerCase()}`}>
                                            {detailModal.data.status}
                                        </span>
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                </div>
            )}

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

function KpiCard({ title, value, icon, iconClass, change, previousValue, currentValue, isMoney, comparisonLabel, loading }) {
    const hasChange = change !== null && change !== undefined;
    const positive = Number(change) >= 0;

    const formatValue = (val) => {
        if (val === undefined || val === null) return '--';
        return isMoney ? money(val) : number(val);
    };

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
                <span className="kpi-comparison">{comparisonLabel}</span>
                {hasChange && previousValue !== undefined && currentValue !== undefined && (
                    <div className="kpi-detail">
                        <span>
                            Kỳ trước: <strong>{formatValue(previousValue)}</strong>
                        </span>
                        <span>
                            Hiện tại: <strong>{formatValue(currentValue)}</strong>
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

// ✅ BẢNG GIAO DỊCH PREMIUM - USERNAME + GHẾ (LUCIDE ICON)
function TransactionTable({ transactions, onViewDetail }) {
    return (
        <table className="revenue-table">
            <colgroup>
                <col style={{ width: '110px' }} />
                <col style={{ width: '180px' }} />
                <col style={{ width: '200px' }} />
                <col style={{ width: '180px' }} />
                <col style={{ width: '180px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '70px' }} />
            </colgroup>

            <thead>
                <tr className="revenue-table-head">
                    <th>Ngày / giờ</th>
                    <th>Khách hàng</th>
                    <th>Phim & suất chiếu</th>
                    <th>Rạp & phòng</th>
                    <th>Ghế</th>
                    <th>Tổng tiền</th>
                    <th style={{ textAlign: 'center' }}>Xem</th>
                </tr>
            </thead>

            <tbody>
                {transactions.map((item, index) => {
                    const statusClass = String(item.status || '')
                        .toLowerCase()
                        .replace(/\s+/g, '-');

                    const seatsText = formatSeatsText(item);

                    return (
                        <tr className="revenue-table-row" key={item.booking_id || index}>
                            <td>
                                <div className="revenue-date">
                                    <strong>{formatDate(item.booking_date)}</strong>
                                    <span>{formatTime(item.booking_date)}</span>
                                </div>
                            </td>
                            <td>
                                {/* ✅ Chỉ username - không icon avatar */}
                                <div className="revenue-customer-name">
                                    <strong>{item.customer_name || 'Khách lẻ'}</strong>
                                    {item.email && <span>{item.email}</span>}
                                </div>
                            </td>
                            <td>
                                <div className="revenue-movie-cell">
                                    <strong className="revenue-movie" title={item.movie_title}>
                                        {item.movie_title || '--'}
                                    </strong>
                                    <span className="revenue-showtime-small">
                                        <Clock3 size={12} />
                                        {formatShowtime(item.start_time)}
                                    </span>
                                </div>
                            </td>
                            <td>
                                <div className="revenue-location-cell">
                                    <div className="revenue-location" title={item.cinema_name}>
                                        <MapPin size={13} />
                                        <span>{item.cinema_name || '--'}</span>
                                    </div>
                                    <span className="revenue-room-small">
                                        {item.room_name || '--'}
                                    </span>
                                </div>
                            </td>
                            <td>
                                {/* ✅ Chỉ ghế - bỏ sản phẩm, dùng Ticket icon */}
                                {seatsText ? (
                                    <div className="revenue-seats-only" title={seatsText}>
                                        <Ticket size={13} />
                                        <span>{seatsText}</span>
                                    </div>
                                ) : (
                                    <span className="no-product">Không có vé</span>
                                )}
                            </td>
                            <td>
                                <div className="revenue-total-cell">
                                    <strong>{money(item.total_amount)}</strong>
                                    <span className={`transaction-status-badge ${statusClass}`}>
                                        {item.status || '--'}
                                    </span>
                                </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                <button
                                    type="button"
                                    className="view-detail-btn"
                                    onClick={() => onViewDetail(item.booking_id)}
                                    title="Xem chi tiết"
                                >
                                    <Eye size={16} />
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

function EmptyChart() {
    return (
        <div className="empty-chart">
            <BarChart3 size={30} />
            <span>Chưa có dữ liệu trong kỳ này</span>
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