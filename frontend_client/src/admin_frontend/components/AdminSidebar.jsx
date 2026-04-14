import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Film, Star, 
  Theater, Building2, DoorOpen, Armchair, Ticket,
  TicketPercent, ShoppingBag, X, Tags, Newspaper, Clock
} from 'lucide-react';

import '../styles/Sidebar.css';

const AdminSidebar = ({ sidebarOpen, closeSidebar }) => {
    const location = useLocation();

    // ĐÃ LOẠI BỎ /admin Ở TẤT CẢ CÁC ĐƯỜNG DẪN
    const menuItems = [
        { path: '/', icon: <LayoutDashboard size={20}/>, label: 'Dashboard' },
        { path: '/users', icon: <Users size={20}/>, label: 'Quản lý User' },
        { path: '/movies', icon: <Film size={20}/>, label: 'Quản lý phim' },
        { path: '/news', icon: <Newspaper size={20}/>, label: 'Quản lý Tin tức' },
        { path: '/actors', icon: <Star size={20}/>, label: 'Quản lý Diễn viên' },
        { path: '/genres', icon: <Theater size={20}/>, label: 'Quản lý Thể Loại' },
        { path: '/movie-genres', icon: <Tags size={20}/>, label: 'Gán thể loại phim' },
        { path: '/movie-actors', icon: <Tags size={20}/>, label: 'Gán diễn viên Phim' },
        { path: '/cinemas', icon: <Building2 size={20}/>, label: 'Quản lý Rạp Chiếu' },
        { path: '/showtimes', icon: <Clock size={20}/>, label: 'Quản lý Suất Chiếu' },
        { path: '/rooms', icon: <DoorOpen size={20}/>, label: 'Quản lý Phòng Chiếu' },
        { path: '/seats', icon: <Armchair size={20}/>, label: 'Quản lý Ghế Ngồi' },
        { path: '/tickets', icon: <Ticket size={20}/>, label: 'Quản lý vé' },
        { path: '/coupons', icon: <TicketPercent size={20}/>, label: 'Quản lý Coupon' },
        { path: '/bookings', icon: <ShoppingBag size={20}/>, label: 'Quản lý đơn hàng' },
    ];

    return (
        <>
            {/* ===== Overlay (Tablet & Mobile) ===== */}
            {sidebarOpen && (
                <div 
                    className="sidebar-overlay"
                    onClick={closeSidebar}
                />
            )}

            {/* ===== Sidebar ===== */}
            <div className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>

                <div className="sidebar-header">
                    <h2 className="sidebar-title">CINEMA STAR</h2>

                    <button 
                        className="sidebar-close-btn"
                        onClick={closeSidebar}
                    >
                        <X size={22} />
                    </button>
                </div>

                <ul className="sidebar-menu">
                    {menuItems.map((item) => (
                        <li key={item.path} className="sidebar-item">
                            <Link 
                                to={item.path}
                                onClick={closeSidebar}
                                className={`sidebar-link ${
                                    // Kiểm tra active dựa trên path mới không có /admin
                                    location.pathname === item.path || location.pathname.startsWith(item.path + '/') 
                                    ? 'active' : ''
                                }`}
                            >
                                <span className="link-icon">{item.icon}</span>
                                <span className="link-text">{item.label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
};

export default AdminSidebar;