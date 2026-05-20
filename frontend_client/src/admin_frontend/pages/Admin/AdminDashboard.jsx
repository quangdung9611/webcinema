import React, { useState, useEffect } from 'react';
import axios from 'axios';

import {
    Film,
    Ticket,
    Users,
    DollarSign,
    RefreshCcw,
    TrendingUp,
    MoreHorizontal
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

    const COLORS = [
        '#a855f7',
        '#3b82f6',
        '#22c55e',
        '#f59e0b',
        '#94a3b8'
    ];

    const fetchDashboardData = async () => {

        setLoading(true);

        try {

            const resStats = await axios.get(
                'https://api.quangdungcinema.id.vn/admin/api/manage/stats',
                {
                    withCredentials: true
                }
            );

            if (resStats.data.success) {
                setStats({
                    movies: resStats.data.movies,
                    tickets: resStats.data.tickets,
                    users: resStats.data.users,
                    revenue: resStats.data.revenue
                });
            }

            const resChart = await axios.get(
                'https://api.quangdungcinema.id.vn/admin/api/manage/revenue-chart',
                {
                    withCredentials: true
                }
            );

            if (resChart.data.success) {

                setChartData({
                    daily: resChart.data.dailyData,
                    movies: resChart.data.movieData,
                    tickets: resChart.data.ticketData
                });

            }

        } catch (error) {

            console.error('Dashboard Error:', error);

        } finally {

            setLoading(false);

        }

    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) {

        return (
            <div className="dashboard-loading">
                <RefreshCcw className="dashboard-loading-icon" />
                <span>Đang tải dữ liệu...</span>
            </div>
        );

    }

    return (

        <div className="cinema-dashboard">

            {/* ================= TOP STATS ================= */}

            <div className="dashboard-stats-row">

                <div className="dashboard-stat-card purple-card">

                    <div className="dashboard-stat-left">

                        <div className="dashboard-stat-icon purple-icon">
                            <Film size={28} />
                        </div>

                        <div className="dashboard-stat-content">

                            <p>TỔNG SỐ PHIM</p>

                            <h2>{stats.movies}</h2>

                            <span>+12 phim mới</span>

                        </div>

                    </div>

                    <button className="dashboard-more-btn">
                        <MoreHorizontal size={18} />
                    </button>

                </div>

                <div className="dashboard-stat-card blue-card">

                    <div className="dashboard-stat-left">

                        <div className="dashboard-stat-icon blue-icon">
                            <Ticket size={28} />
                        </div>

                        <div className="dashboard-stat-content">

                            <p>TỔNG VÉ ĐÃ BÁN</p>

                            <h2>{stats.tickets}</h2>

                            <span>+18.2% so với tuần trước</span>

                        </div>

                    </div>

                    <button className="dashboard-more-btn">
                        <MoreHorizontal size={18} />
                    </button>

                </div>

                <div className="dashboard-stat-card green-card">

                    <div className="dashboard-stat-left">

                        <div className="dashboard-stat-icon green-icon">
                            <Users size={28} />
                        </div>

                        <div className="dashboard-stat-content">

                            <p>TỔNG NGƯỜI DÙNG</p>

                            <h2>{stats.users}</h2>

                            <span>+24 người mới</span>

                        </div>

                    </div>

                    <button className="dashboard-more-btn">
                        <MoreHorizontal size={18} />
                    </button>

                </div>

                <div className="dashboard-stat-card gold-card">

                    <div className="dashboard-stat-left">

                        <div className="dashboard-stat-icon gold-icon">
                            <DollarSign size={28} />
                        </div>

                        <div className="dashboard-stat-content">

                            <p>DOANH THU</p>

                            <h2>
                                {stats.revenue.toLocaleString('vi-VN')} đ
                            </h2>

                            <span>+15.7% so với tuần trước</span>

                        </div>

                    </div>

                    <button className="dashboard-more-btn">
                        <MoreHorizontal size={18} />
                    </button>

                </div>

            </div>

            {/* ================= CHART AREA ================= */}

            <div className="dashboard-middle-grid">

                {/* ===== LINE CHART ===== */}

                <div className="dashboard-chart-card revenue-chart-card">

                    <div className="dashboard-card-header">

                        <h3>DOANH THU THEO THỜI GIAN</h3>

                        <button className="dashboard-chart-filter">
                            7 ngày qua
                        </button>

                    </div>

                    <div className="dashboard-chart-wrapper">

                        <ResponsiveContainer width="100%" height={320}>

                            <LineChart data={chartData.daily}>

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
                                    tickFormatter={(value) => `${value / 1000}k`}
                                />

                                <Tooltip />

                                <Line
                                    type="monotone"
                                    dataKey="daily_total"
                                    stroke="#a855f7"
                                    strokeWidth={3}
                                    dot={{
                                        r: 4,
                                        fill: '#a855f7'
                                    }}
                                />

                            </LineChart>

                        </ResponsiveContainer>

                    </div>

                </div>

                {/* ===== PIE CHART ===== */}

                <div className="dashboard-chart-card pie-chart-card">

                    <div className="dashboard-card-header">

                        <h3>TỶ LỆ DOANH THU THEO PHIM</h3>

                    </div>

                    <div className="dashboard-pie-layout">

                        <div className="dashboard-pie-wrapper">

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

                                        {
                                            chartData.movies.map((entry, index) => (
                                                <Cell
                                                    key={index}
                                                    fill={COLORS[index % COLORS.length]}
                                                />
                                            ))
                                        }

                                    </Pie>

                                </PieChart>

                            </ResponsiveContainer>

                        </div>

                        <div className="dashboard-pie-legend">

                            {
                                chartData.movies.map((movie, index) => (

                                    <div
                                        className="dashboard-legend-item"
                                        key={index}
                                    >

                                        <div className="dashboard-legend-left">

                                            <span
                                                className="dashboard-legend-color"
                                                style={{
                                                    background: COLORS[index % COLORS.length]
                                                }}
                                            />

                                            <p>{movie.name}</p>

                                        </div>

                                        <span>
                                            {movie.percent || '0%'}
                                        </span>

                                    </div>

                                ))
                            }

                        </div>

                    </div>

                </div>

            </div>

            {/* ================= BOTTOM AREA ================= */}

            <div className="dashboard-bottom-grid">

                {/* ===== RECENT TICKETS ===== */}

                <div className="dashboard-table-card">

                    <div className="dashboard-card-header">

                        <h3>DANH SÁCH VÉ BÁN GẦN ĐÂY</h3>

                    </div>

                    <div className="dashboard-table-wrapper">

                        <table className="dashboard-ticket-table">

                            <thead>

                                <tr>
                                    <th>Phim</th>
                                    <th>Số vé</th>
                                    <th>Doanh thu</th>
                                </tr>

                            </thead>

                            <tbody>

                                {
                                    chartData.tickets.map((ticket, index) => (

                                        <tr key={index}>

                                            <td>{ticket.movieName}</td>

                                            <td>{ticket.ticketCount}</td>

                                            <td>
                                                {ticket.totalRevenue?.toLocaleString('vi-VN')} đ
                                            </td>

                                        </tr>

                                    ))
                                }

                            </tbody>

                        </table>

                    </div>

                    <button className="dashboard-view-more-btn">
                        Xem tất cả vé
                    </button>

                </div>

                {/* ===== TOP MOVIES ===== */}

                <div className="dashboard-top-movie-card">

                    <div className="dashboard-card-header">

                        <h3>PHIM DOANH THU CAO</h3>

                    </div>

                    <div className="dashboard-top-movie-list">

                        {
                            chartData.movies.map((movie, index) => (

                                <div
                                    className="dashboard-top-movie-item"
                                    key={index}
                                >

                                    <div className="dashboard-top-movie-left">

                                        <span className="dashboard-rank">
                                            {index + 1}
                                        </span>

                                        <div className="dashboard-movie-poster" />

                                        <div>

                                            <h4>{movie.name}</h4>

                                            <p>
                                                {movie.value?.toLocaleString('vi-VN')} đ
                                            </p>

                                        </div>

                                    </div>

                                    <TrendingUp size={18} />

                                </div>

                            ))
                        }

                    </div>

                    <button className="dashboard-view-more-btn">
                        Xem tất cả phim
                    </button>

                </div>

            </div>

        </div>

    );

};

export default AdminDashboard;