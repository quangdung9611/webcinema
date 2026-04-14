import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext'; 
import '../styles/AdminHeader.css';

const AdminHeader = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    
    // Lấy biến admin, loading và hàm setAdmin từ AuthContext
    const { admin, loading, setAdmin } = useAuth(); 

    useEffect(() => {
        // Kiểm tra quyền hạn: Nếu đã load xong mà không có admin thì đá về login
        if (!loading && !admin) {
            navigate('/login');
        }
    }, [admin, loading, navigate]);

    const handleLogout = async () => {
        try {
            // Gọi API logout - withCredentials để Server xóa cookie admintoken
            await axios.post('https://api.quangdungcinema.id.vn/admin/api/auth/logout', {}, {
                withCredentials: true
            });
        } catch (error) {
            console.error("Lỗi đăng xuất Admin:", error);
        } finally {
            // Dọn dẹp state admin trong ứng dụng
            if (setAdmin) setAdmin(null); 
            
            // Bắn event để các tab khác (nếu có) cũng đồng bộ trạng thái
            window.dispatchEvent(new Event('authChange'));
            
            // Về trang login
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
                    {/* 🔥 SỬA CHỖ NÀY: Dùng "/" thay vì "/admin" vì domain đã là admin.rồi */}
                    <Link to="/">ADMIN PANEL</Link>
                </div>
            </div>

            <div className="admin-header-profile-section">
                <span className="admin-header-welcome-text">
                    {/* Hiển thị tên Quang Dũng từ state admin */}
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