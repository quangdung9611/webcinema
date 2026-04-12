import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext'; 
import '../styles/AdminHeader.css';

const AdminHeader = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    // Lấy user và clearAuth (đã đổi tên từ clearLocalAuth) từ Context
    const { user, clearAuth } = useAuth(); 

    useEffect(() => {
        // Nếu đã check xong (không còn loading) mà không có user hoặc không phải admin
        // Lưu ý: Logic loading đã được bọc ở AuthProvider nên ở đây user null là bị đá ngay
        if (!user || user.role !== 'admin') {
            navigate('/admin/login');
        }
    }, [user, navigate]);

    const handleLogout = async () => {
        try {
            // 1. Gọi API logout để Backend xóa sạch Cookie (admintoken & usertoken)
            // Backend mình đã sửa để xóa theo Path rồi nên cứ gọi là nó bay hết
            await axios.post('https://webcinema-zb8z.onrender.com/api/auth/logout', {}, {
                withCredentials: true
            });
        } catch (error) {
            console.error("Lỗi đăng xuất Admin:", error);
        } finally {
            // 2. DỌN DẸP STATE TRONG REACT
            // Không dùng storage nữa nên chỉ cần set user về null thông qua hàm này
            clearAuth(); 
            
            // 3. THÔNG BÁO CHO CÁC TAB/COMPONENT KHÁC CẬP NHẬT
            window.dispatchEvent(new Event('authChange'));
            
            // 4. VỀ TRANG LOGIN
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
                    Xin chào <strong>{user?.full_name || user?.username || "Quang Dũng"}</strong>
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