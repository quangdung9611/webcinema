import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext'; 
import '../styles/AdminHeader.css';

const AdminHeader = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    
    // 1. LẤY BIẾN 'admin' RA THAY VÌ 'user'
    const { admin, loading, checkAuth, setAdmin } = useAuth(); 

    useEffect(() => {
        // Chỉ đá đi nếu đã check xong (loading = false) mà không thấy biến admin
        // Biến admin này mình đã check role='admin' sẵn trong Context rồi
        if (!loading && !admin) {
            navigate('/login');
        }
    }, [admin, loading, navigate]);

    const handleLogout = async () => {
        try {
            // SỬA URL: Gọi đúng cổng admin/api
            await axios.post('https://webcinema-zb8z.onrender.com/admin/api/auth/logout', {}, {
                withCredentials: true
            });
        } catch (error) {
            console.error("Lỗi đăng xuất Admin:", error);
        } finally {
            // 2. Dọn dẹp state của admin
            if (setAdmin) setAdmin(null); 
            
            // Thông báo cập nhật auth cho toàn hệ thống
            window.dispatchEvent(new Event('authChange'));
            
            // Về trang login của admin
            navigate('/login');
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
                    {/* 3. HIỂN THỊ TÊN TỪ BIẾN admin */}
                    Xin chào <strong>{admin?.full_name || admin?.username || "Quản trị viên"}</strong>
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