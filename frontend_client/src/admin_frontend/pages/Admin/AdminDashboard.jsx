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
    RefreshCw
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
    const [revenueTrend, setRevenueTrend] = useState([]);
    const [revenueByMovie, setRevenueByMovie] = useState([]);
    const [topMovies, setTopMovies] = useState([]);

    /* =========================================================
        STATE - FILTER
    ========================================================= */
    const [timeRange, setTimeRange] = useState('week');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [searchRevenue, setSearchRevenue] = useState('');
    const [sortField, setSortField] = useState('date');
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

                // 2. DOANH THU THEO NGÀY
                const resTrend = await axios.get(
                    `https://api.quangdungcinema.id.vn/admin/api/manage/revenue-trend?startDate=${start}&endDate=${end}`,
                    { withCredentials: true }
                );

                if (resTrend.data.success) {
                    setRevenueTrend(Array.isArray(resTrend.data.data) ? resTrend.data.data : []);
                } else {
                    setRevenueTrend([]);
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
        setSearchRevenue('');

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
        setSearchRevenue('');
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
            year: 'numeric'
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
        SEARCH + SORT REVENUE DATA
    ========================================================= */
    const processedRevenue = useMemo(() => {
        let data = [...revenueTrend];

        // SEARCH
        if (searchRevenue.trim()) {
            const keyword = searchRevenue.trim().toLowerCase();
            data = data.filter((item) => {
                const date = formatDate(item.date).toLowerCase();
                return date.includes(keyword);
            });
        }

        // SORT
        data.sort((a, b) => {
            let valueA, valueB;
            if (sortField === 'date') {
                valueA = new Date(a.date).getTime();
                valueB = new Date(b.date).getTime();
            } else if (sortField === 'revenue') {
                valueA = Number(a.daily_total) || 0;
                valueB = Number(b.daily_total) || 0;
            } else if (sortField === 'orders') {
                valueA = Number(a.order_count ?? a.orders ?? 0);
                valueB = Number(b.order_count ?? b.orders ?? 0);
            }
            return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        });

        return data;
    }, [revenueTrend, searchRevenue, sortField, sortDirection]);

    /* =========================================================
        PAGINATION
    ========================================================= */
    const totalPages = Math.max(1, Math.ceil(processedRevenue.length / rowsPerPage));

    const paginatedRevenue = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return processedRevenue.slice(startIndex, startIndex + rowsPerPage);
    }, [processedRevenue, currentPage]);

    /* =========================================================
        TOTAL REVENUE IN TABLE
    ========================================================= */
    const tableTotalRevenue = useMemo(() => {
        return processedRevenue.reduce((sum, item) => sum + (Number(item.daily_total) || 0), 0);
    }, [processedRevenue]);

    /* =========================================================
        TOTAL ORDERS IN TABLE
    ========================================================= */
    const tableTotalOrders = useMemo(() => {
        return processedRevenue.reduce(
            (sum, item) => sum + Number(item.order_count ?? item.orders ?? 0),
            0
        );
    }, [processedRevenue]);

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
                    REVENUE TABLE
                ================================================= */}
                <div className="chart-card revenue-table-card">
                    {/* HEADER */}
                    <div className="chart-header">
                        <div>
                            <h3>DOANH THU THEO THỜI GIAN</h3>
                            <p className="section-description">
                                Theo dõi doanh thu từng ngày trong khoảng thời gian đã chọn.
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
                        {/* RANGE */}
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

                        {/* SEARCH */}
                        <div className="revenue-search">
                            <Search size={17} />
                            <input
                                type="text"
                                placeholder="Tìm theo ngày..."
                                value={searchRevenue}
                                onChange={(e) => {
                                    setSearchRevenue(e.target.value);
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
                            <strong>{formatMoney(tableTotalRevenue)}</strong>
                        </div>
                        <div className="revenue-summary-item">
                            <span>Tổng đơn hàng</span>
                            <strong>{tableTotalOrders}</strong>
                        </div>
                        <div className="revenue-summary-item">
                            <span>Số ngày</span>
                            <strong>{processedRevenue.length}</strong>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="revenue-table-container">
                        {paginatedRevenue.length > 0 ? (
                            <table className="revenue-table">
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('date')} className="sortable">
                                            <span>NGÀY</span>
                                            <ArrowUpDown size={14} />
                                        </th>
                                        <th onClick={() => handleSort('orders')} className="sortable text-center">
                                            <span>ĐƠN HÀNG</span>
                                            <ArrowUpDown size={14} />
                                        </th>
                                        <th onClick={() => handleSort('revenue')} className="sortable text-right">
                                            <span>DOANH THU</span>
                                            <ArrowUpDown size={14} />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedRevenue.map((item, index) => {
                                        const orders = Number(item.order_count ?? item.orders ?? 0);
                                        const revenue = Number(item.daily_total) || 0;
                                        return (
                                            <tr key={`${item.date}-${index}`}>
                                                <td>
                                                    <div className="revenue-date">
                                                        <Calendar size={16} />
                                                        <span>{formatDate(item.date)}</span>
                                                    </div>
                                                </td>
                                                <td className="text-center">
                                                    <span className="order-count">{orders}</span>
                                                </td>
                                                <td className="text-right">
                                                    <strong className="revenue-value">{formatMoney(revenue)}</strong>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="revenue-empty">
                                <DollarSign size={42} />
                                <h4>Chưa có dữ liệu doanh thu</h4>
                                <p>Không tìm thấy doanh thu trong khoảng thời gian này.</p>
                            </div>
                        )}
                    </div>

                    {/* PAGINATION */}
                    {processedRevenue.length > 0 && (
                        <div className="revenue-pagination">
                            <span className="pagination-info">
                                Hiển thị <strong>{(currentPage - 1) * rowsPerPage + 1}</strong> -{' '}
                                <strong>{Math.min(currentPage * rowsPerPage, processedRevenue.length)}</strong> trong tổng
                                số <strong>{processedRevenue.length}</strong> ngày
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