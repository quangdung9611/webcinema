import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext'; 
import '../styles/AdminHeader.css';

const AdminHeader = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    // Thêm loading từ context để tránh đá user nhầm khi đang check auth
    const { user, loading, clearAuth } = useAuth(); 

    useEffect(() => {
        // Chỉ đá đi nếu đã check xong (loading = false) mà không thấy user admin
        if (!loading && (!user || user.role !== 'admin')) {
            navigate('/admin/login');
        }
    }, [user, loading, navigate]);

    const handleLogout = async () => {
        try {
            // SỬA URL: Gọi đúng cổng admin/api như mình đã cấu hình ở server.js
            await axios.post('https://webcinema-zb8z.onrender.com/admin/api/auth/logout', {}, {
                withCredentials: true
            });
        } catch (error) {
            console.error("Lỗi đăng xuất Admin:", error);
        } finally {
            // Dọn dẹp state
            if (clearAuth) clearAuth(); 
            
            // Thông báo cập nhật auth cho toàn hệ thống
            window.dispatchEvent(new Event('authChange'));
            
            // Về trang login của admin
            navigate('/admin/login');
        }
    };

    return (
        <header className="admin-header-main">
            <div className="admin-header-wrapper-left">
                <button 
                    className="admin-hamburger-trigger"
                    onClick={toggleSidebar}
                    aria-label="Toggle Sidebar"
                >
                    <Menu size={24} />
                </button>

                <div className="admin-brand-logo">
                    <Link to="/admin">ADMIN PANEL</Link>
                </div>
            </div>

            <div className="admin-header-profile-section">
                <span className="admin-header-welcome-text">
                    {/* Hiển thị tên Dũng nếu có user, không thì để placeholder */}
                    Xin chào <strong>{user?.full_name || user?.username || "Admin"}</strong>
                </span>

                <button 
                    className="btn-header-auth-logout" 
                    onClick={handleLogout}
                >
                    Đăng xuất
                </button>
            </div>
        </header>
    );
};

export default AdminHeader;