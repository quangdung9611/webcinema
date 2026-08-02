import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../../api/api';
import {
    Film, Ticket, Users, DollarSign,
    Calendar, TrendingUp, TrendingDown,
    RefreshCw, Search, ChevronLeft, ChevronRight,
    User, Tag, MoreHorizontal
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell,
    BarChart, Bar
} from 'recharts';
import '../../styles/AdminDashboard.css';

const AdminDashboard = () => {
    // ===== STATE =====
    const [stats, setStats] = useState({
        movies: 0, users: 0, tickets: 0, ticketsChange: 0,
        revenue: 0, revenueChange: 0
    });
    const [dailyRevenue, setDailyRevenue] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [revenueByMovie, setRevenueByMovie] = useState([]);
    const [ticketsByMovie, setTicketsByMovie] = useState([]);
    const [topMovies, setTopMovies] = useState([]);

    const [timeRange, setTimeRange] = useState('week');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 5;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const COLORS = ['#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#94a3b8', '#ec4899', '#06b6d4', '#84cc16'];
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);

    // ===== HELPER =====
    const getDateRange = useCallback((range) => {
        const end = new Date();
        const start = new Date();
        switch (range) {
            case 'today': break;
            case 'week': start.setDate(end.getDate() - 6); break;
            case 'month': start.setDate(end.getDate() - 29); break;
            case 'quarter': start.setDate(end.getDate() - 89); break;
            case 'custom': return { start: customStart || today, end: customEnd || today };
            default: start.setDate(end.getDate() - 6);
        }
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
    }, [customStart, customEnd, today]);

    // ===== FETCH DATA =====
    const fetchAllData = useCallback(async (range = timeRange, isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const { start, end } = getDateRange(range);

            // 1. Stats
            const sRes = await api.get(`/admin/api/manage/stats?period=${range === 'custom' ? 'week' : range}`);
            if (sRes.data.success) {
                setStats({
                    movies: sRes.data.movies,
                    users: sRes.data.users,
                    tickets: sRes.data.tickets,
                    ticketsChange: sRes.data.ticketsChange || 0,
                    revenue: sRes.data.revenue,
                    revenueChange: sRes.data.revenueChange || 0
                });
            }

            // 2. Daily Revenue (line)
            const dRes = await api.get(`/admin/api/manage/daily-revenue?startDate=${start}&endDate=${end}`);
            if (dRes.data.success) setDailyRevenue(dRes.data.data);

            // 3. Transactions
            const tRes = await api.get(`/admin/api/manage/transactions?startDate=${start}&endDate=${end}`);
            if (tRes.data.success) setTransactions(tRes.data.data);

            // 4. Revenue by Movie (pie)
            const rRes = await api.get(`/admin/api/manage/revenue-by-movie?startDate=${start}&endDate=${end}`);
            if (rRes.data.success) setRevenueByMovie(rRes.data.data);

            // 5. Tickets by Movie (bar)
            const bRes = await api.get(`/admin/api/manage/tickets-by-movie?startDate=${start}&endDate=${end}`);
            if (bRes.data.success) setTicketsByMovie(bRes.data.data);

            // 6. Top Movies
            const mRes = await api.get(`/admin/api/manage/top-movies?startDate=${start}&endDate=${end}&limit=5`);
            if (mRes.data.success) setTopMovies(mRes.data.movies);

        } catch (error) {
            console.error('❌ Dashboard Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [timeRange, getDateRange]);

    // ===== EFFECTS =====
    useEffect(() => { fetchAllData('week'); }, []);

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

    const handleCustomApply = () => {
        if (!customStart || !customEnd || customStart > customEnd) return;
        setCurrentPage(1);
        fetchAllData('custom');
    };

    // ===== FORMAT =====
    const formatMoney = (v) => Number(v || 0).toLocaleString('vi-VN') + ' đ';
    const formatDate = (d) => {
        if (!d) return '--';
        const dt = new Date(d);
        return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // ===== FILTER + PAGINATION =====
    const filteredData = useMemo(() => {
        let data = [...transactions];
        if (searchKeyword.trim()) {
            const kw = searchKeyword.trim().toLowerCase();
            data = data.filter(item =>
                (item.customer_name || '').toLowerCase().includes(kw) ||
                (item.movie_title || '').toLowerCase().includes(kw) ||
                (item.booking_id || '').toString().includes(kw)
            );
        }
        return data;
    }, [transactions, searchKeyword]);

    const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filteredData.slice(start, start + rowsPerPage);
    }, [filteredData, currentPage]);

    // ===== LOADING =====
    if (loading) {
        return <div className="dashboard-loading"><div className="loading-spinner" /></div>;
    }

    // ===== RENDER =====
    return (
        <div className="cinema-dashboard">

            {/* ===== STATS ROW ===== */}
            <div className="stats-row">
                <div className="stat-card purple">
                    <div className="stat-icon"><Film /></div>
                    <div className="stat-info">
                        <span className="stat-label">Tổng phim</span>
                        <h2>{stats.movies}</h2>
                    </div>
                </div>
                <div className="stat-card blue">
                    <div className="stat-icon"><Users /></div>
                    <div className="stat-info">
                        <span className="stat-label">Người dùng</span>
                        <h2>{stats.users}</h2>
                    </div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon"><Ticket /></div>
                    <div className="stat-info">
                        <span className="stat-label">Vé đã bán</span>
                        <h2>{stats.tickets}</h2>
                        <span className={`change ${stats.ticketsChange >= 0 ? 'up' : 'down'}`}>
                            {stats.ticketsChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {Math.abs(stats.ticketsChange)}%
                        </span>
                    </div>
                </div>
                <div className="stat-card silver">
                    <div className="stat-icon"><DollarSign /></div>
                    <div className="stat-info">
                        <span className="stat-label">Doanh thu</span>
                        <h2>{formatMoney(stats.revenue)}</h2>
                        <span className={`change ${stats.revenueChange >= 0 ? 'up' : 'down'}`}>
                            {stats.revenueChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {Math.abs(stats.revenueChange)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* ===== FILTER BAR ===== */}
            <div className="filter-bar">
                <div className="filter-group">
                    <button className={timeRange === 'today' ? 'active' : ''} onClick={() => handleRangeChange('today')}>Hôm nay</button>
                    <button className={timeRange === 'week' ? 'active' : ''} onClick={() => handleRangeChange('week')}>7 ngày</button>
                    <button className={timeRange === 'month' ? 'active' : ''} onClick={() => handleRangeChange('month')}>30 ngày</button>
                    <button className={timeRange === 'quarter' ? 'active' : ''} onClick={() => handleRangeChange('quarter')}>3 tháng</button>
                    <button className={`custom ${timeRange === 'custom' ? 'active' : ''}`} onClick={() => handleRangeChange('custom')}>
                        <Calendar size={14} /> Tùy chỉnh
                    </button>
                </div>
                <div className="search-box">
                    <Search size={16} />
                    <input placeholder="Tìm kiếm..." value={searchKeyword} onChange={e => { setSearchKeyword(e.target.value); setCurrentPage(1); }} />
                </div>
                <button className="refresh-btn" onClick={() => fetchAllData(timeRange, true)} disabled={refreshing}>
                    <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                </button>
            </div>

            {showCustomPicker && (
                <div className="custom-date-picker">
                    <div><label>Từ</label><input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} max={customEnd || today} /></div>
                    <div><label>Đến</label><input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} min={customStart} max={today} /></div>
                    <button onClick={handleCustomApply} disabled={!customStart || !customEnd}>Áp dụng</button>
                </div>
            )}

            {/* ===== CHARTS ROW ===== */}
            <div className="charts-row">
                <div className="chart-card line-chart">
                    <h3>📈 Doanh thu theo ngày</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={dailyRevenue}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" tick={{ fill: '#aaa' }} />
                            <YAxis tick={{ fill: '#aaa' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(232,232,232,0.2)', borderRadius: 8 }}
                                formatter={(value) => [formatMoney(value), 'Doanh thu']} />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7' }} name="Doanh thu" />
                            <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} name="Đơn hàng" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card pie-chart">
                    <h3>🍩 Doanh thu theo phim</h3>
                    {revenueByMovie.length > 0 ? (
                        <div className="pie-wrapper">
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie data={revenueByMovie} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                        {revenueByMovie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v) => [formatMoney(v), 'Doanh thu']} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="pie-legend">
                                {revenueByMovie.map((m, i) => (
                                    <div key={i}><span className="dot" style={{ background: COLORS[i % COLORS.length] }}></span>{m.name} <span>{m.percent}</span></div>
                                ))}
                            </div>
                        </div>
                    ) : <div className="empty-state">Chưa có dữ liệu</div>}
                </div>
            </div>

            {/* ===== BAR CHART + TOP MOVIES ===== */}
            <div className="charts-row">
                <div className="chart-card bar-chart">
                    <h3>📊 Số vé bán theo phim</h3>
                    {ticketsByMovie.length > 0 ? (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={ticketsByMovie}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="movieName" tick={{ fill: '#aaa', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#aaa' }} />
                                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(232,232,232,0.2)', borderRadius: 8 }} />
                                <Bar dataKey="ticketCount" fill="#3b82f6" radius={[6,6,0,0]} name="Số vé" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="empty-state">Chưa có dữ liệu</div>}
                </div>

                <div className="chart-card top-movies">
                    <h3>🏆 Top phim doanh thu cao</h3>
                    {topMovies.length > 0 ? (
                        topMovies.map((m, i) => (
                            <div className="top-item" key={i}>
                                <span className="rank">#{i+1}</span>
                                <div className="info">
                                    <h4>{m.title}</h4>
                                    <p>{formatMoney(m.revenue)}</p>
                                </div>
                                <span className="badge">{m.tickets_sold} vé</span>
                            </div>
                        ))
                    ) : <div className="empty-state">Chưa có dữ liệu</div>}
                </div>
            </div>

            {/* ===== TRANSACTION TABLE ===== */}
            <div className="table-card">
                <h3>📋 Chi tiết giao dịch</h3>
                <div className="table-wrapper">
                    {paginatedData.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>Ngày</th>
                                    <th>Khách hàng</th>
                                    <th>Phim</th>
                                    <th>Chi tiết</th>
                                    <th>Vé</th>
                                    <th>SP</th>
                                    <th className="right">Tổng tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.map(row => (
                                    <tr key={row.booking_id}>
                                        <td>{formatDate(row.booking_date)}</td>
                                        <td>{row.customer_name}</td>
                                        <td>{row.movie_title}</td>
                                        <td className="detail-cell">{row.detail_summary}</td>
                                        <td>{row.ticket_count}</td>
                                        <td>{row.product_count}</td>
                                        <td className="right">{formatMoney(row.total_amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <div className="empty-state">Không có giao dịch</div>}
                </div>
                {filteredData.length > 0 && (
                    <div className="pagination">
                        <span>Trang {currentPage} / {totalPages}</span>
                        <div>
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p-1)}><ChevronLeft size={16} /></button>
                            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p+1)}><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;