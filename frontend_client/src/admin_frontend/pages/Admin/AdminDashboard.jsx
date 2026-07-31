import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Film, Ticket, Users, DollarSign, MoreHorizontal,
    Calendar, TrendingUp
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
    BarChart, Bar
} from 'recharts';
import '../../styles/AdminDashboard.css';

const AdminDashboard = () => {
    // State cho thống kê tổng quan
    const [stats, setStats] = useState({
        movies: 0, tickets: 0, users: 0, revenue: 0
    });

    // State cho từng biểu đồ
    const [revenueTrend, setRevenueTrend] = useState([]);
    const [revenueByMovie, setRevenueByMovie] = useState([]);
    const [ticketsByMovie, setTicketsByMovie] = useState([]);
    const [topMovies, setTopMovies] = useState([]);

    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('week');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showCustomPicker, setShowCustomPicker] = useState(false);

    const COLORS = ['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#94a3b8'];

    // Hàm lấy khoảng thời gian
    const getDateRange = useCallback((range) => {
        const end = new Date();
        const start = new Date();
        switch (range) {
            case 'week': start.setDate(end.getDate() - 7); break;
            case 'month': start.setMonth(end.getMonth() - 1); break;
            case 'quarter': start.setMonth(end.getMonth() - 3); break;
            case 'custom':
                return {
                    start: customStart || start.toISOString().split('T')[0],
                    end: customEnd || end.toISOString().split('T')[0]
                };
            default: start.setDate(end.getDate() - 7);
        }
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    }, [customStart, customEnd]);

    // Hàm fetch tất cả dữ liệu
    const fetchAllData = useCallback(async (range = timeRange) => {
        setLoading(true);
        try {
            const { start, end } = getDateRange(range);

            // 1. Thống kê tổng quan
            const resStats = await axios.get(
                `https://api.quangdungcinema.id.vn/admin/api/manage/stats?period=${range !== 'custom' ? range : ''}`,
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

            // 2. Doanh thu theo ngày (Line)
            const resTrend = await axios.get(
                `https://api.quangdungcinema.id.vn/admin/api/manage/revenue-trend?startDate=${start}&endDate=${end}`,
                { withCredentials: true }
            );
            if (resTrend.data.success) {
                setRevenueTrend(resTrend.data.data || []);
            }

            // 3. Doanh thu theo phim (Pie)
            const resPie = await axios.get(
                `https://api.quangdungcinema.id.vn/admin/api/manage/revenue-by-movie?startDate=${start}&endDate=${end}`,
                { withCredentials: true }
            );
            if (resPie.data.success) {
                setRevenueByMovie(resPie.data.data || []);
            }

            // 4. Số vé theo phim (Bar)
            const resBar = await axios.get(
                `https://api.quangdungcinema.id.vn/admin/api/manage/tickets-by-movie?startDate=${start}&endDate=${end}`,
                { withCredentials: true }
            );
            if (resBar.data.success) {
                setTicketsByMovie(resBar.data.data || []);
            }

            // 5. Top phim doanh thu cao (có thể không cần khoảng thời gian)
            const resTop = await axios.get(
                `https://api.quangdungcinema.id.vn/admin/api/manage/top-movies?limit=5`,
                { withCredentials: true }
            );
            if (resTop.data.success) {
                setTopMovies(resTop.data.movies || []);
            }
        } catch (error) {
            console.error('Dashboard Error:', error);
        } finally {
            setLoading(false);
        }
    }, [timeRange, getDateRange]);

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleRangeChange = (range) => {
        setTimeRange(range);
        if (range !== 'custom') {
            setShowCustomPicker(false);
            fetchAllData(range);
        } else {
            setShowCustomPicker(true);
            if (customStart && customEnd) fetchAllData('custom');
        }
    };

    const handleCustomApply = () => {
        if (customStart && customEnd) fetchAllData('custom');
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="dashboard-skeleton-grid">
                    {[...Array(4)].map((_, i) => <div key={i} className="skeleton-stat-card" />)}
                    <div className="skeleton-chart-card" />
                    <div className="skeleton-pie-card" />
                    <div className="skeleton-table-card" />
                    <div className="skeleton-top-movie-card" />
                </div>
            </div>
        );
    }

    return (
        <div className="cinema-dashboard">
            {/* STAT CARDS */}
            <div className="dashboard-stats-row">
                <div className="stat-card purple">
                    <div className="stat-icon"><Film size={28} /></div>
                    <div className="stat-content">
                        <p>TỔNG SỐ PHIM</p>
                        <h2>{stats.movies}</h2>
                    </div>
                    <button className="stat-more-btn"><MoreHorizontal size={18} /></button>
                </div>
                <div className="stat-card blue">
                    <div className="stat-icon"><Ticket size={28} /></div>
                    <div className="stat-content">
                        <p>TỔNG VÉ ĐÃ BÁN</p>
                        <h2>{stats.tickets}</h2>
                    </div>
                    <button className="stat-more-btn"><MoreHorizontal size={18} /></button>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon"><Users size={28} /></div>
                    <div className="stat-content">
                        <p>TỔNG NGƯỜI DÙNG</p>
                        <h2>{stats.users}</h2>
                    </div>
                    <button className="stat-more-btn"><MoreHorizontal size={18} /></button>
                </div>
                <div className="stat-card silver">
                    <div className="stat-icon"><DollarSign size={28} /></div>
                    <div className="stat-content">
                        <p>DOANH THU</p>
                        <h2>{stats.revenue.toLocaleString('vi-VN')} đ</h2>
                    </div>
                    <button className="stat-more-btn"><MoreHorizontal size={18} /></button>
                </div>
            </div>

            {/* LINE + PIE */}
            <div className="dashboard-charts-grid">
                <div className="chart-card revenue-chart">
                    <div className="chart-header">
                        <h3>DOANH THU THEO THỜI GIAN</h3>
                        <div className="chart-filter-group">
                            <button className={`filter-btn ${timeRange === 'week' ? 'active' : ''}`} onClick={() => handleRangeChange('week')}>7 ngày</button>
                            <button className={`filter-btn ${timeRange === 'month' ? 'active' : ''}`} onClick={() => handleRangeChange('month')}>30 ngày</button>
                            <button className={`filter-btn ${timeRange === 'quarter' ? 'active' : ''}`} onClick={() => handleRangeChange('quarter')}>3 tháng</button>
                            <button className={`filter-btn custom ${timeRange === 'custom' ? 'active' : ''}`} onClick={() => handleRangeChange('custom')}>
                                <Calendar size={14} /> Tùy chỉnh
                            </button>
                        </div>
                    </div>

                    {showCustomPicker && (
                        <div className="custom-date-picker">
                            <div className="date-input-group">
                                <label>Từ ngày</label>
                                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} max={customEnd || undefined} />
                            </div>
                            <div className="date-input-group">
                                <label>Đến ngày</label>
                                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} min={customStart || undefined} max={new Date().toISOString().split('T')[0]} />
                            </div>
                            <button className="apply-date-btn" onClick={handleCustomApply}>Áp dụng</button>
                        </div>
                    )}

                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={revenueTrend}>
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
                                        data={revenueByMovie}
                                        cx="50%" cy="50%"
                                        innerRadius={60} outerRadius={90}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {revenueByMovie.map((entry, index) => (
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
                            {revenueByMovie.map((movie, index) => (
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

            {/* BAR CHART + TOP MOVIES */}
            <div className="dashboard-bottom-grid">
                <div className="chart-card bar-chart">
                    <div className="chart-header">
                        <h3>SỐ VÉ BÁN THEO PHIM</h3>
                    </div>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={ticketsByMovie}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="movieName" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(232,232,232,0.2)', borderRadius: '8px', color: '#fff' }}
                                />
                                <Bar dataKey="ticketCount" fill="#a855f7" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="top-movie-card">
                    <div className="card-header">
                        <h3>PHIM DOANH THU CAO</h3>
                    </div>
                    <div className="top-movie-list">
                        {topMovies.length > 0 ? (
                            topMovies.map((movie, index) => (
                                <div className="top-movie-item" key={index}>
                                    <div className="top-movie-left">
                                        <span className="rank">{index + 1}</span>
                                        <div className="movie-poster-placeholder" />
                                        <div>
                                            <h4>{movie.title}</h4>
                                            <p>{movie.revenue?.toLocaleString('vi-VN') || 0} đ</p>
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