import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

import {
    Film,
    Ticket,
    Users,
    DollarSign,
    RefreshCcw,
    TrendingUp,
    MoreHorizontal,
    Calendar,
    ChevronDown
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
    Cell
} from 'recharts';

import '../../styles/AdminDashboard.css';

const AdminDashboard = () => {
    // =========================
    // STATE
    // =========================
    const [stats, setStats] = useState({
        movies: 0,
        tickets: 0,
        users: 0,
        revenue: 0
    });

    const [chartData, setChartData] = useState({
        daily: [],
        movies: [],
        tickets: []
    });

    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('week'); // week | month | quarter | custom
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showCustomPicker, setShowCustomPicker] = useState(false);

    const COLORS = ['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#94a3b8'];

    // =========================
    // HELPERS
    // =========================
    const getDateRange = useCallback((range) => {
        const end = new Date();
        const start = new Date();
        switch (range) {
            case 'week':
                start.setDate(end.getDate() - 7);
                break;
            case 'month':
                start.setMonth(end.getMonth() - 1);
                break;
            case 'quarter':
                start.setMonth(end.getMonth() - 3);
                break;
            case 'custom':
                return {
                    start: customStart || start.toISOString().split('T')[0],
                    end: customEnd || end.toISOString().split('T')[0]
                };
            default:
                start.setDate(end.getDate() - 7);
        }
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    }, [customStart, customEnd]);

    // =========================
    // FETCH DATA
    // =========================
    const fetchDashboardData = useCallback(async (range = timeRange) => {
        setLoading(true);
        try {
            const { start, end } = getDateRange(range);

            // 1. Thống kê tổng quan
            const resStats = await axios.get(
                'https://api.quangdungcinema.id.vn/admin/api/manage/stats',
                { withCredentials: true }
            );
            if (resStats.data.success) {
                setStats({
                    movies: resStats.data.movies,
                    tickets: resStats.data.tickets,
                    users: resStats.data.users,
                    revenue: resStats.data.revenue
                });
            }

            // 2. Dữ liệu biểu đồ theo khoảng thời gian
            const resChart = await axios.get(
                `https://api.quangdungcinema.id.vn/admin/api/manage/revenue-chart?startDate=${start}&endDate=${end}`,
                { withCredentials: true }
            );
            if (resChart.data.success) {
                setChartData({
                    daily: resChart.data.dailyData || [],
                    movies: resChart.data.movieData || [],
                    tickets: resChart.data.ticketData || []
                });
            }
        } catch (error) {
            console.error('Dashboard Error:', error);
        } finally {
            setLoading(false);
        }
    }, [timeRange, getDateRange]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // =========================
    // HANDLE RANGE CHANGE
    // =========================
    const handleRangeChange = (range) => {
        setTimeRange(range);
        if (range !== 'custom') {
            setShowCustomPicker(false);
            fetchDashboardData(range);
        } else {
            setShowCustomPicker(true);
            // Nếu đã có ngày tùy chỉnh, fetch luôn
            if (customStart && customEnd) {
                fetchDashboardData('custom');
            }
        }
    };

    const handleCustomApply = () => {
        if (customStart && customEnd) {
            fetchDashboardData('custom');
        }
    };

    // =========================
    // LOADING SKELETON
    // =========================
    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="dashboard-skeleton-grid">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton-stat-card" />
                    ))}
                    <div className="skeleton-chart-card" />
                    <div className="skeleton-pie-card" />
                    <div className="skeleton-table-card" />
                    <div className="skeleton-top-movie-card" />
                </div>
            </div>
        );
    }

    // =========================
    // RENDER
    // =========================
    return (
        <div className="cinema-dashboard">
            {/* STAT CARDS */}
            <div className="dashboard-stats-row">
                <div className="stat-card purple">
                    <div className="stat-icon"><Film size={28} /></div>
                    <div className="stat-content">
                        <p>TỔNG SỐ PHIM</p>
                        <h2>{stats.movies}</h2>
                        <span>+12 phim mới</span>
                    </div>
                    <button className="stat-more-btn"><MoreHorizontal size={18} /></button>
                </div>
                <div className="stat-card blue">
                    <div className="stat-icon"><Ticket size={28} /></div>
                    <div className="stat-content">
                        <p>TỔNG VÉ ĐÃ BÁN</p>
                        <h2>{stats.tickets}</h2>
                        <span>+18.2% so với tuần trước</span>
                    </div>
                    <button className="stat-more-btn"><MoreHorizontal size={18} /></button>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon"><Users size={28} /></div>
                    <div className="stat-content">
                        <p>TỔNG NGƯỜI DÙNG</p>
                        <h2>{stats.users}</h2>
                        <span>+24 người mới</span>
                    </div>
                    <button className="stat-more-btn"><MoreHorizontal size={18} /></button>
                </div>
                <div className="stat-card silver">
                    <div className="stat-icon"><DollarSign size={28} /></div>
                    <div className="stat-content">
                        <p>DOANH THU</p>
                        <h2>{stats.revenue.toLocaleString('vi-VN')} đ</h2>
                        <span>+15.7% so với tuần trước</span>
                    </div>
                    <button className="stat-more-btn"><MoreHorizontal size={18} /></button>
                </div>
            </div>

            {/* CHARTS GRID */}
            <div className="dashboard-charts-grid">
                <div className="chart-card revenue-chart">
                    <div className="chart-header">
                        <h3>DOANH THU THEO THỜI GIAN</h3>
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
                    </div>

                    {/* Custom date picker */}
                    {showCustomPicker && (
                        <div className="custom-date-picker">
                            <div className="date-input-group">
                                <label>Từ ngày</label>
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    max={customEnd || undefined}
                                />
                            </div>
                            <div className="date-input-group">
                                <label>Đến ngày</label>
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    min={customStart || undefined}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <button className="apply-date-btn" onClick={handleCustomApply}>
                                Áp dụng
                            </button>
                        </div>
                    )}

                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={chartData.daily}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="date" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" tickFormatter={(value) => `${value / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(232,232,232,0.2)', borderRadius: '8px', color: '#fff' }}
                                    formatter={(value) => [`${value.toLocaleString('vi-VN')} đ`, 'Doanh thu']}
                                />
                                <Line type="monotone" dataKey="daily_total" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#a855f7' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card pie-chart">
                    <div className="chart-header">
                        <h3>TỶ LỆ DOANH THU THEO PHIM</h3>
                    </div>
                    <div className="pie-layout">
                        <div className="pie-wrapper">
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={chartData.movies}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {chartData.movies.map((entry, index) => (
                                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(232,232,232,0.2)', borderRadius: '8px', color: '#fff' }}
                                        formatter={(value) => [`${value.toLocaleString('vi-VN')} đ`, 'Doanh thu']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="pie-legend">
                            {chartData.movies.map((movie, index) => (
                                <div className="legend-item" key={index}>
                                    <div className="legend-left">
                                        <span className="legend-color" style={{ background: COLORS[index % COLORS.length] }} />
                                        <p>{movie.name}</p>
                                    </div>
                                    <span>{movie.percent || '0%'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* BOTTOM GRID */}
            <div className="dashboard-bottom-grid">
                <div className="table-card">
                    <div className="card-header">
                        <h3>DANH SÁCH VÉ BÁN GẦN ĐÂY</h3>
                    </div>
                    <div className="table-wrapper">
                        <table className="ticket-table">
                            <thead>
                                <tr>
                                    <th>Phim</th>
                                    <th>Số vé</th>
                                    <th>Doanh thu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {chartData.tickets.length > 0 ? (
                                    chartData.tickets.map((ticket, index) => (
                                        <tr key={index}>
                                            <td>{ticket.movieName}</td>
                                            <td>{ticket.ticketCount}</td>
                                            <td>{ticket.totalRevenue?.toLocaleString('vi-VN') || 0} đ</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="3" className="no-data">Chưa có dữ liệu</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <button className="view-more-btn">Xem tất cả vé</button>
                </div>

                <div className="top-movie-card">
                    <div className="card-header">
                        <h3>PHIM DOANH THU CAO</h3>
                    </div>
                    <div className="top-movie-list">
                        {chartData.movies.length > 0 ? (
                            chartData.movies.map((movie, index) => (
                                <div className="top-movie-item" key={index}>
                                    <div className="top-movie-left">
                                        <span className="rank">{index + 1}</span>
                                        <div className="movie-poster-placeholder" />
                                        <div>
                                            <h4>{movie.name}</h4>
                                            <p>{movie.value?.toLocaleString('vi-VN') || 0} đ</p>
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
        </div>
    );
};

export default AdminDashboard;