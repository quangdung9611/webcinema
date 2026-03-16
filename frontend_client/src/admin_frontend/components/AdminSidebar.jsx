import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Film, Star, 
  Theater, Building2, DoorOpen, Armchair, Ticket,
  TicketPercent, ShoppingBag, X, Tags, Newspaper, Clock, MonitorPlay
} from 'lucide-react';

import '../styles/Sidebar.css';

const AdminSidebar = ({ sidebarOpen, closeSidebar }) => {
    const location = useLocation();

    const menuItems = [
        { path: '/admin/dashboard', icon: <LayoutDashboard size={20}/>, label: 'Dashboard' },
        { path: '/admin/users', icon: <Users size={20}/>, label: 'Quản lý User' },
        { path: '/admin/movies', icon: <Film size={20}/>, label: 'Quản lý phim' },
        { path: '/admin/news', icon: <Newspaper size={20}/>, label: 'Quản lý Tin tức' }, // MỚI BỔ SUNG
        { path: '/admin/actors', icon: <Star size={20}/>, label: 'Quản lý Diễn viên' },
        { path: '/admin/genres', icon: <Theater size={20}/>, label: 'Quản lý Thể Loại' },
        { path: '/admin/movie-genres', icon: <Tags size={20}/>, label: 'Gán thể loại phim' },
        { path: '/admin/movie-actors', icon: <Tags size={20}/>, label: 'Gán diễn viên Phim' },
        { path: '/admin/cinemas', icon: <Building2 size={20}/>, label: 'Quản lý Rạp Chiếu' },
        { path: '/admin/showtimes', icon: <Clock size={20}/>, label: 'Quản lý Suất Chiếu' }, // Thay icon cho phù hợp thời gian
        { path: '/admin/rooms', icon: <DoorOpen size={20}/>, label: 'Quản lý Phòng Chiếu' },
        { path: '/admin/seats', icon: <Armchair size={20}/>, label: 'Quản lý Ghế Ngồi' },
        { path: '/admin/tickets', icon: <Ticket size={20}/>, label: 'Quản lý vé' },
        { path: '/admin/coupons', icon: <TicketPercent size={20}/>, label: 'Quản lý Coupon' },
        { path: '/admin/bookings', icon: <ShoppingBag size={20}/>, label: 'Quản lý đơn hàng' },
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

                {/* Header + nút đóng */}
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
                                    location.pathname.startsWith(item.path) ? 'active' : ''
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