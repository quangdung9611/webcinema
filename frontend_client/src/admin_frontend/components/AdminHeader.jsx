import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; // Nhớ kiểm tra đúng đường dẫn file AuthContext của ông nhé
import '../styles/AdminHeader.css';

const AdminHeader = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    
    // ✅ LẤY USER TỪ CONTEXT: Không cần useEffect, không cần useState adminData nữa
    const { user, setUser } = useAuth(); 

    const handleLogout = async () => {
        try {
            // ✅ ĐỔI LINK LOGOUT: Khớp với cấu trúc /api/admin/... ở Server
            await axios.post('https://webcinema-zb8z.onrender.com/api/admin/auth/logout', {}, {
                withCredentials: true
            });
            
            // Xóa sạch dữ liệu ở Frontend
            setUser(null);
            sessionStorage.clear(); 

            // Bắn tín hiệu để các component khác biết đã logout
            window.dispatchEvent(new Event('authChange'));
            
            navigate('/admin/login');
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
            setUser(null);
            navigate('/admin/login');
        }
    };

    // Nếu chưa có user thì không hiện Header để tránh lỗi hiển thị
    if (!user) return null;

    return (
        <header className="admin-header">
            <div className="admin-header-left">
                <button 
                    className="hamburger-btn" 
                    onClick={toggleSidebar}
                    aria-label="Toggle Sidebar"
                >
                    <Menu size={24} />
                </button>

                <div className="admin-logo">
                    <Link to="/admin/dashboard">ADMIN PANEL</Link>
                </div>
            </div>

            <div className="admin-info">
                <span className="admin-name">
                    {/* ✅ HIỂN THỊ TÊN TỪ CONTEXT */}
                    Xin chào <strong>{user?.full_name || user?.username || 'Admin'}</strong>
                </span>

                <button 
                    className="btn-admin-logout" 
                    onClick={handleLogout}
                >
                    Đăng xuất
                </button>
            </div>
        </header>
    );
};

export default AdminHeader;