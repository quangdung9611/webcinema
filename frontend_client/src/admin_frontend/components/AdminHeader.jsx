import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; 
import '../styles/AdminHeader.css';

const AdminHeader = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    
    // 🔥 Lấy api từ context để hưởng lợi từ Interceptor Origin
    const { admin, loading, setAdmin, api, clearAuth } = useAuth(); 

    useEffect(() => {
        // Nếu đã load xong mà không thấy admin thì đá về login ngay
        if (!loading && !admin) {
            navigate('/login');
        }
    }, [admin, loading, navigate]);

    const handleLogout = async () => {
        try {
            /**
             * 🔥 Dùng instance 'api' từ AuthContext:
             * 1. Nó tự gửi withCredentials: true
             * 2. Nó tự gửi Origin header để Backend bẻ lái domain xóa cookie
             */
            await api.post('/admin/api/auth/logout');
        } catch (error) {
            console.error("Lỗi đăng xuất Admin:", error);
        } finally {
            // Dọn sạch state ở Frontend
            if (clearAuth) {
                clearAuth();
            } else {
                setAdmin(null);
            }
            
            // Bắn event đồng bộ các tab
            window.dispatchEvent(new Event('authChange'));
            
            // Quay về login
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
                    {/* Vì subdomain là admin. rồi nên Link to="/" sẽ là trang chủ Admin */}
                    <Link to="/">ADMIN PANEL</Link>
                </div>
            </div>

            <div className="admin-header-profile-section">
                <span className="admin-header-welcome-text">
                    Xin chào <strong>{admin?.full_name || "Quản trị viên"}</strong>
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