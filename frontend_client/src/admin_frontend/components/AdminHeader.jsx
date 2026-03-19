import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import axios from 'axios';
import '../styles/AdminHeader.css';

const AdminHeader = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    const [adminData, setAdminData] = useState(null);

    useEffect(() => {
        const fetchAdminProfile = async () => {
            try {
                // [SỬA TẠI ĐÂY]: Phải gọi đúng cổng /admin/api mới có admintoken
                const response = await axios.get('https://webcinema-zb8z.onrender.com/api/auth/admin/me', {
                    withCredentials: true // Luôn phải có cái này khi dùng Cookie
                });

                if (response.data.user && response.data.user.role === 'admin') {
                    setAdminData(response.data.user);
                } else {
                    navigate('/admin/login');
                }
            } catch (error) {
                console.error("Lỗi lấy thông tin Admin tại Header:", error);
                // Nếu lỗi 401 thì mới đá về, tránh lỗi mạng làm mất trang
                if (error.response?.status === 401) {
                    navigate('/admin/login');
                }
            }
        };

        fetchAdminProfile();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            // [SỬA TẠI ĐÂY]: Logout cũng phải gọi cổng Admin để xóa đúng Cookie Path
            await axios.post('https://webcinema-zb8z.onrender.com/api/auth/admin/logout', {}, {
                withCredentials: true
            });
            
            sessionStorage.clear(); 
            navigate('/admin/login');
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
            navigate('/admin/login');
        }
    };

    if (!adminData) return null;

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
                    <Link to="/admin">ADMIN PANEL</Link>
                </div>
            </div>

            <div className="admin-info">
                <span className="admin-name">
                    Xin chào <strong>{adminData?.full_name || adminData?.username}</strong>
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