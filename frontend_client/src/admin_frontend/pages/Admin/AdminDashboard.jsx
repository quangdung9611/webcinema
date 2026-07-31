import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

import {
    Film,
    Ticket,
    Users,
    DollarSign,
    MoreHorizontal,
    Calendar,
    TrendingUp,
    Search,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    User,
    Tag
} from 'lucide-react';

import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip
} from 'recharts';

import '../../styles/AdminDashboard.css';

const AdminDashboard = () => {
    /* =========================================================
        STATE - THỐNG KÊ TỔNG QUAN
    ========================================================= */
    const [stats, setStats] = useState({
        movies: 0,
        tickets: 0,
        users: 0,
        revenue: 0
    });

    /* =========================================================
        STATE - DỮ LIỆU DASHBOARD
    ========================================================= */
    // Chi tiết giao dịch (bảng)
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        totalTickets: 0,
        totalProducts: 0
    });

    // Biểu đồ tròn
    const [revenueByMovie, setRevenueByMovie] = useState([]);

    // Top phim
    const [topMovies, setTopMovies] = useState([]);

    /* =========================================================
        STATE - FILTER
    ========================================================= */
    const [timeRange, setTimeRange] = useState('week');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [sortField, setSortField] = useState('booking_date');
    const [sortDirection, setSortDirection] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    /* =========================================================
        STATE - LOADING
    ========================================================= */
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    /* =========================================================
        COLORS
    ========================================================= */
    const COLORS = [
        '#a855f7',
        '#3b82f6',
        '#22c55e',
        '#f59e0b',
        '#94a3b8',
        '#ec4899',
        '#06b6d4',
        '#84cc16'
    ];

    /* =========================================================
        TODAY
    ========================================================= */
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);

    /* =========================================================
        GET DATE RANGE
    ========================================================= */
    const getDateRange = useCallback(
        (range) => {
            const end = new Date();
            const start = new Date();

            switch (range) {
                case 'week':
                    start.setDate(end.getDate() - 6);
                    break;
                case 'month':
                    start.setDate(end.getDate() - 29);
                    break;
                case 'quarter':
                    start.setDate(end.getDate() - 89);
                    break;
                case 'custom':
                    return {
                        start: customStart || today,
                        end: customEnd || today
                    };
                default:
                    start.setDate(end.getDate() - 6);
            }

            return {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0]
            };
        },
        [customStart, customEnd, today]
    );

    /* =========================================================
        FETCH DASHBOARD
    ========================================================= */
    const fetchAllData = useCallback(
        async (range = timeRange, isRefresh = false) => {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            try {
                const { start, end } = getDateRange(range);

                // 1. STATS
                const statsPeriod = range !== 'custom' ? range : '';
                const resStats = await axios.get(
                    `https://api.quangdungcinema.id.vn/admin/api/manage/stats?period=${statsPeriod}`,
                    { withCredentials: true }
                );

                if (resStats.data.success) {
                    setStats({
                        movies: Number(resStats.data.movies) || 0,
                        tickets: Number(resStats.data.tickets) || 0,
                        users: Number(resStats.data.users) || 0,
                        revenue: Number(resStats.data.revenue) || 0
                    });
                }

                // 2. CHI TIẾT GIAO DỊCH (BẢNG)
                const resTrend = await axios.get(
                    `https://api.quangdungcinema.id.vn/admin/api/manage/revenue-trend?startDate=${start}&endDate=${end}`,
                    { withCredentials: true }
                );

                if (resTrend.data.success) {
                    setTransactions(Array.isArray(resTrend.data.data) ? resTrend.data.data : []);
                    setSummary(resTrend.data.summary || {
                        totalRevenue: 0,
                        totalOrders: 0,
                        totalTickets: 0,
                        totalProducts: 0
                    });
                } else {
                    setTransactions([]);
                    setSummary({
                        totalRevenue: 0,
                        totalOrders: 0,
                        totalTickets: 0,
                        totalProducts: 0
                    });
                }

                // 3. DOANH THU THEO PHIM
                const resMovie = await axios.get(
                    `https://api.quangdungcinema.id.vn/admin/api/manage/revenue-by-movie?startDate=${start}&endDate=${end}`,
                    { withCredentials: true }
                );

                if (resMovie.data.success) {
                    setRevenueByMovie(Array.isArray(resMovie.data.data) ? resMovie.data.data : []);
                } else {
                    setRevenueByMovie([]);
                }

                // 4. TOP PHIM
                const resTop = await axios.get(
                    `https://api.quangdungcinema.id.vn/admin/api/manage/top-movies?limit=5`,
                    { withCredentials: true }
                );

                if (resTop.data.success) {
                    setTopMovies(Array.isArray(resTop.data.movies) ? resTop.data.movies : []);
                } else {
                    setTopMovies([]);
                }

            } catch (error) {
                console.error('❌ Dashboard Error:', error);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [timeRange, getDateRange]
    );

    /* =========================================================
        INITIAL LOAD
    ========================================================= */
    useEffect(() => {
        fetchAllData('week');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* =========================================================
        CHANGE RANGE
    ========================================================= */
    const handleRangeChange = (range) => {
        setTimeRange(range);
        setCurrentPage(1);
        setSearchKeyword('');

        if (range !== 'custom') {
            setShowCustomPicker(false);
            fetchAllData(range);
        } else {
            setShowCustomPicker(true);
        }
    };

    /* =========================================================
        APPLY CUSTOM DATE
    ========================================================= */
    const handleCustomApply = () => {
        if (!customStart || !customEnd) return;
        if (customStart > customEnd) return;

        setCurrentPage(1);
        setSearchKeyword('');
        fetchAllData('custom');
    };

    /* =========================================================
        REFRESH
    ========================================================= */
    const handleRefresh = () => {
        fetchAllData(timeRange, true);
    };

    /* =========================================================
        FORMAT DATE
    ========================================================= */
    const formatDate = (date) => {
        if (!date) return '--';
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return date;
        return d.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    /* =========================================================
        FORMAT MONEY
    ========================================================= */
    const formatMoney = (value) => {
        return Number(value || 0).toLocaleString('vi-VN') + ' đ';
    };

    /* =========================================================
        SORT
    ========================================================= */
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    /* =========================================================
        SEARCH + SORT TRANSACTIONS
    ========================================================= */
    const processedData = useMemo(() => {
        let data = [...transactions];

        // SEARCH
        if (searchKeyword.trim()) {
            const keyword = searchKeyword.trim().toLowerCase();
            data = data.filter((item) => {
                const customer = (item.customer_name || '').toLowerCase();
                const movie = (item.movie_title || '').toLowerCase();
                const itemName = (item.item_name || '').toLowerCase();
                const ticketCode = (item.ticket_code || '').toLowerCase();
                return customer.includes(keyword) ||
                    movie.includes(keyword) ||
                    itemName.includes(keyword) ||
                    ticketCode.includes(keyword);
            });
        }

        // SORT
        data.sort((a, b) => {
            let valueA, valueB;

            if (sortField === 'booking_date') {
                valueA = new Date(a.booking_date).getTime();
                valueB = new Date(b.booking_date).getTime();
            } else if (sortField === 'customer_name') {
                valueA = a.customer_name || '';
                valueB = b.customer_name || '';
                return sortDirection === 'asc'
                    ? valueA.localeCompare(valueB)
                    : valueB.localeCompare(valueA);
            } else if (sortField === 'movie_title') {
                valueA = a.movie_title || '';
                valueB = b.movie_title || '';
                return sortDirection === 'asc'
                    ? valueA.localeCompare(valueB)
                    : valueB.localeCompare(valueA);
            } else if (sortField === 'revenue') {
                valueA = a.revenue || 0;
                valueB = b.revenue || 0;
            } else {
                valueA = a[sortField] || '';
                valueB = b[sortField] || '';
            }

            if (typeof valueA === 'number' && typeof valueB === 'number') {
                return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
            }

            return 0;
        });

        return data;
    }, [transactions, searchKeyword, sortField, sortDirection]);

    /* =========================================================
        PAGINATION
    ========================================================= */
    const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return processedData.slice(startIndex, startIndex + rowsPerPage);
    }, [processedData, currentPage]);

    /* =========================================================
        LOADING
    ========================================================= */
    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="dashboard-skeleton-grid">
                    {[...Array(4)].map((_, index) => (
                        <div key={index} className="skeleton-stat-card" />
                    ))}
                    <div className="skeleton-revenue-table" />
                    <div className="skeleton-pie-card" />
                    <div className="skeleton-top-movie-card" />
                </div>
            </div>
        );
    }

    /* =========================================================
        RENDER
    ========================================================= */
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
                        <h2>{stats.movies}</h2>
                    </div>
                    <button className="stat-more-btn">
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
                        <h2>{stats.tickets}</h2>
                    </div>
                    <button className="stat-more-btn">
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
                        <h2>{stats.users}</h2>
                    </div>
                    <button className="stat-more-btn">
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
                        <h2>{formatMoney(stats.revenue)}</h2>
                    </div>
                    <button className="stat-more-btn">
                        <MoreHorizontal size={18} />
                    </button>
                </div>
            </div>

            {/* =================================================
                MAIN CONTENT
            ================================================= */}
            <div className="dashboard-main-grid">
                {/* =================================================
                    TRANSACTION TABLE
                ================================================= */}
                <div className="chart-card revenue-table-card">
                    {/* HEADER */}
                    <div className="chart-header">
                        <div>
                            <h3>CHI TIẾT GIAO DỊCH</h3>
                            <p className="section-description">
                                Danh sách chi tiết các vé và sản phẩm đã bán trong khoảng thời gian chọn.
                            </p>
                        </div>
                        <button
                            className="refresh-dashboard-btn"
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <RefreshCw size={16} className={refreshing ? 'refresh-spinning' : ''} />
                            Làm mới
                        </button>
                    </div>

                    {/* FILTER */}
                    <div className="revenue-filter-area">
                        <div className="chart-filter-group">
                            <button
                                className={`filter-btn ${timeRange === 'week' ? 'active' : ''}`}
                                onClick={() => handleRangeChange('week')}
                            >
                                7 ngày
                            </button>
                            <button
                                className={`filter-btn ${timeRange === 'month' ? 'active' : ''}`}
                                onClick={() => handleRangeChange('month')}
                            >
                                30 ngày
                            </button>
                            <button
                                className={`filter-btn ${timeRange === 'quarter' ? 'active' : ''}`}
                                onClick={() => handleRangeChange('quarter')}
                            >
                                3 tháng
                            </button>
                            <button
                                className={`filter-btn custom ${timeRange === 'custom' ? 'active' : ''}`}
                                onClick={() => handleRangeChange('custom')}
                            >
                                <Calendar size={14} />
                                Tùy chỉnh
                            </button>
                        </div>

                        <div className="revenue-search">
                            <Search size={17} />
                            <input
                                type="text"
                                placeholder="Tìm theo tên khách, phim, mã vé..."
                                value={searchKeyword}
                                onChange={(e) => {
                                    setSearchKeyword(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                    </div>

                    {/* CUSTOM DATE */}
                    {showCustomPicker && (
                        <div className="custom-date-picker">
                            <div className="date-input-group">
                                <label>Từ ngày</label>
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    max={customEnd || today}
                                />
                            </div>
                            <div className="date-input-group">
                                <label>Đến ngày</label>
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    min={customStart || undefined}
                                    max={today}
                                />
                            </div>
                            <button
                                className="apply-date-btn"
                                onClick={handleCustomApply}
                                disabled={!customStart || !customEnd}
                            >
                                Áp dụng
                            </button>
                        </div>
                    )}

                    {/* SUMMARY */}
                    <div className="revenue-summary">
                        <div className="revenue-summary-item">
                            <span>Tổng doanh thu</span>
                            <strong>{formatMoney(summary.totalRevenue)}</strong>
                        </div>
                        <div className="revenue-summary-item">
                            <span>Tổng đơn hàng</span>
                            <strong>{summary.totalOrders}</strong>
                        </div>
                        <div className="revenue-summary-item">
                            <span>Tổng vé</span>
                            <strong>{summary.totalTickets}</strong>
                        </div>
                        <div className="revenue-summary-item">
                            <span>Tổng sản phẩm</span>
                            <strong>{summary.totalProducts}</strong>
                        </div>
                        <div className="revenue-summary-item">
                            <span>Số dòng</span>
                            <strong>{processedData.length}</strong>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="revenue-table-container">
                        {paginatedData.length > 0 ? (
                            <table className="revenue-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('booking_date')} className="sortable">
                                            <span>NGÀY</span>
                                            <ArrowUpDown size={14} />
                                        </th>
                                        <th onClick={() => handleSort('customer_name')} className="sortable">
                                            <span>KHÁCH HÀNG</span>
                                            <ArrowUpDown size={14} />
                                        </th>
                                        <th onClick={() => handleSort('movie_title')} className="sortable">
                                            <span>PHIM</span>
                                            <ArrowUpDown size={14} />
                                        </th>
                                        <th>
                                            <span>CHI TIẾT</span>
                                        </th>
                                        <th className="text-center">SL</th>
                                        <th className="text-right">ĐƠN GIÁ</th>
                                        <th onClick={() => handleSort('revenue')} className="sortable text-right">
                                            <span>THÀNH TIỀN</span>
                                            <ArrowUpDown size={14} />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.map((item, index) => (
                                        <tr key={index}>
                                            <td>
                                                <div className="revenue-date">
                                                    <Calendar size={16} />
                                                    <span>{formatDate(item.booking_date)}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <User size={14} />
                                                    <span>{item.customer_name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Film size={14} />
                                                    <span>{item.movie_title}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                    {item.item_type === 'Vé' ? (
                                                        <>
                                                            <Tag size={14} />
                                                            <span>{item.seat_info}</span>
                                                            {item.ticket_code && (
                                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                                    ({item.ticket_code})
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span style={{ color: 'var(--text-secondary)' }}>🍿</span>
                                                            <span>{item.item_name}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-center">{item.quantity}</td>
                                            <td className="text-right">{formatMoney(item.unit_price)}</td>
                                            <td className="text-right">
                                                <strong style={{ color: 'var(--white-pure)' }}>
                                                    {formatMoney(item.revenue)}
                                                </strong>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="revenue-empty">
                                <DollarSign size={42} />
                                <h4>Chưa có giao dịch</h4>
                                <p>Không tìm thấy giao dịch nào trong khoảng thời gian này.</p>
                            </div>
                        )}
                    </div>

                    {/* PAGINATION */}
                    {processedData.length > 0 && (
                        <div className="revenue-pagination">
                            <span className="pagination-info">
                                Hiển thị <strong>{(currentPage - 1) * rowsPerPage + 1}</strong> -{' '}
                                <strong>{Math.min(currentPage * rowsPerPage, processedData.length)}</strong> trong tổng
                                số <strong>{processedData.length}</strong> dòng
                            </span>
                            <div className="pagination-buttons">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                >
                                    <ChevronLeft size={17} />
                                </button>
                                <span className="page-number">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                >
                                    <ChevronRight size={17} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* =================================================
                    PIE CHART
                ================================================= */}
                <div className="chart-card pie-chart">
                    <div className="chart-header">
                        <div>
                            <h3>TỶ LỆ DOANH THU THEO PHIM</h3>
                            <p className="section-description">Phân bổ doanh thu theo từng phim.</p>
                        </div>
                    </div>
                    {revenueByMovie.length > 0 ? (
                        <div className="pie-layout">
                            <div className="pie-wrapper">
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={revenueByMovie}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={95}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {revenueByMovie.map((_, index) => (
                                                <Cell
                                                    key={index}
                                                    fill={COLORS[index % COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                background: '#1a1a1a',
                                                border: '1px solid rgba(232,232,232,0.2)',
                                                borderRadius: '8px',
                                                color: '#fff'
                                            }}
                                            formatter={(value) => [formatMoney(value), 'Doanh thu']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="pie-legend">
                                {revenueByMovie.map((movie, index) => (
                                    <div className="legend-item" key={index}>
                                        <div className="legend-left">
                                            <span
                                                className="legend-color"
                                                style={{ background: COLORS[index % COLORS.length] }}
                                            />
                                            <p>{movie.name}</p>
                                        </div>
                                        <span>{movie.percent || '0%'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="revenue-empty">
                            <DollarSign size={42} />
                            <h4>Chưa có dữ liệu</h4>
                        </div>
                    )}
                </div>
            </div>

            {/* =================================================
                TOP MOVIES
            ================================================= */}
            <div className="top-movie-card">
                <div className="card-header">
                    <div>
                        <h3>PHIM DOANH THU CAO</h3>
                        <p className="section-description">Top phim có doanh thu cao nhất.</p>
                    </div>
                </div>
                <div className="top-movie-list">
                    {topMovies.length > 0 ? (
                        topMovies.map((movie, index) => (
                            <div className="top-movie-item" key={movie.id || index}>
                                <div className="top-movie-left">
                                    <span className="rank">{String(index + 1).padStart(2, '0')}</span>
                                    <div className="movie-poster-placeholder">
                                        {movie.poster && <img src={movie.poster} alt={movie.title} />}
                                    </div>
                                    <div>
                                        <h4>{movie.title}</h4>
                                        <p>{formatMoney(movie.revenue)}</p>
                                    </div>
                                </div>
                                <TrendingUp size={18} className="trend-icon" />
                            </div>
                        ))
                    ) : (
                        <div className="no-data">Chưa có dữ liệu</div>
                    )}
                </div>
                <button className="view-more-btn">Xem tất cả phim</button>
            </div>
        </div>
    );
};

export default AdminDashboard;