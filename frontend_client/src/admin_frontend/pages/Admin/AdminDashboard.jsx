import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Film, Ticket, Users, DollarSign, Calendar, RefreshCcw } from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend, BarChart, Bar 
} from 'recharts';
import '../../styles/AdminDashboard.css'; 

const AdminDashboard = () => {
    const [stats, setStats] = useState({ movies: 0, tickets: 0, users: 0, revenue: 0 });
    const [chartData, setChartData] = useState({ daily: [], movies: [], tickets: [] });
    const [loading, setLoading] = useState(true);
    
    // Khởi tạo ngày mặc định (Có thể dùng moment hoặc date-fns để lấy ngày hiện tại)
    const [startDate, setStartDate] = useState('2026-03-07');
    const [endDate, setEndDate] = useState('2026-03-14');

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    const fetchDashboardData = async (start = startDate, end = endDate) => {
        setLoading(true);
        try {
            // [CẬP NHẬT 1]: Đổi prefix thành /admin/api/manage/stats
            const resStats = await axios.get('https://webcinema-zb8z.onrender.com/admin/api/manage/stats', {
                withCredentials: true 
            });
            
            if (resStats.data.success) {
                setStats({
                    movies: resStats.data.movies,
                    tickets: resStats.data.tickets,
                    users: resStats.data.users,
                    revenue: resStats.data.revenue
                });
            }

            // [CẬP NHẬT 2]: Đổi prefix thành /admin/api/manage/revenue-chart
            const resChart = await axios.get(`https://webcinema-zb8z.onrender.com/admin/api/manage/revenue-chart?startDate=${start}&endDate=${end}`, {
                withCredentials: true
            });
            
            if (resChart.data.success) {
                setChartData({
                    daily: resChart.data.dailyData,
                    movies: resChart.data.movieData,
                    tickets: resChart.data.ticketData 
                });
            }
        } catch (error) {
            console.error("Lỗi kết nối API Dashboard:", error);
            // Nếu trả về 401 hoặc 403, ProtectedRoute của ông sẽ tự động đá user về login
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleUpdateFilter = () => {
        fetchDashboardData(startDate, endDate);
    };

    if (loading) return (
        <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: '#00468f', fontWeight: 'bold' }}>
            <RefreshCcw className="spin-icon" size={24} style={{ marginRight: '10px' }} />
            ĐANG TẢI DỮ LIỆU THỰC TẾ...
        </div>
    );

    return (
        <div className="dashboard-content">
            <div className="dashboard-header">
                <h1>Bảng điều khiển Admin</h1>
                <p>Chào mừng <strong>Quang Dũng</strong>! Hệ thống đang vận hành ổn định.</p>
            </div>
            
            <div className="dashboard-stats-grid">
                <div className="stat-card-new card-blue">
                    <div className="stat-data"><span>Tổng số phim</span><h2>{stats.movies}</h2></div>
                    <div className="stat-icon"><Film size={28} /></div>
                </div>
                <div className="stat-card-new card-red">
                    <div className="stat-data"><span>Vé đã bán</span><h2>{stats.tickets}</h2></div>
                    <div className="stat-icon"><Ticket size={28} /></div>
                </div>
                <div className="stat-card-new card-green">
                    <div className="stat-data"><span>Người dùng</span><h2>{stats.users}</h2></div>
                    <div className="stat-icon"><Users size={28} /></div>
                </div>
                <div className="stat-card-new card-gold">
                    <div className="stat-data"><span>Doanh thu</span><h2>{stats.revenue.toLocaleString('vi-VN')}đ</h2></div>
                    <div className="stat-icon"><DollarSign size={28} /></div>
                </div>
            </div>

            {/* BỘ LỌC KIỂU ACB ONE */}
            <div className="acb-filter-container">
                <div className="filter-title">
                    <Calendar size={20} /> <span>Tuỳ chọn thời gian</span>
                </div>
                <div className="filter-controls">
                    <div className="filter-group">
                        <label>Từ ngày</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="filter-group">
                        <label>Đến ngày</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <button className="btn-update-acb" onClick={handleUpdateFilter}>
                        <RefreshCcw size={16} /> CẬP NHẬT
                    </button>
                </div>
            </div>
            
            <div className="dashboard-charts-container">
                <div className="chart-box">
                    <h3>Doanh thu theo thời gian</h3>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData.daily}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                                <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN').format(value) + 'đ'} />
                                <Line type="monotone" dataKey="daily_total" stroke="#00468f" strokeWidth={3} dot={{ r: 6, fill: '#00468f' }} name="Doanh thu" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-box">
                    <h3>Tỷ trọng doanh thu phim</h3>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={chartData.movies} cx="50%" cy="50%" labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                                    {chartData.movies.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => new Intl.NumberFormat('vi-VN').format(value) + 'đ'} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-box full-width">
                    <h3>Chi tiết số lượng vé bán ra theo phim</h3>
                    <div className="chart-wrapper taller">
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={chartData.tickets}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="movieName" />
                                <YAxis allowDecimals={false} />
                                <Tooltip cursor={{fill: '#f5f5f5'}} />
                                <Bar dataKey="ticketCount" fill="#00468f" radius={[6, 6, 0, 0]} name="Số vé đã bán" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;