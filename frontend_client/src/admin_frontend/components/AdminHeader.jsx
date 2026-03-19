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
                // ✅ SỬA 1: Đảo admin lên trước auth để không bị lỗi 404
                const response = await axios.get('https://webcinema-zb8z.onrender.com/api/admin/auth/me', {
                    withCredentials: true 
                });

                if (response.data.user && response.data.user.role === 'admin') {
                    setAdminData(response.data.user);
                } else {
                    navigate('/admin/login');
                }
            } catch (error) {
                console.error("Lỗi lấy thông tin Admin tại Header:", error);
                if (error.response?.status === 401) {
                    navigate('/admin/login');
                }
            }
        };

        fetchAdminProfile();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            // ✅ SỬA 2: Đảo link logout cho đúng chuẩn Server
            await axios.post('https://webcinema-zb8z.onrender.com/api/admin/auth/logout', {}, {
                withCredentials: true
            });
            
            sessionStorage.clear(); 
            // Bắn tin hiệu cho AuthContext (nếu có dùng) cũng được cập nhật luôn
            window.dispatchEvent(new Event('authChange'));
            navigate('/admin/login');
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
            navigate('/admin/login');
        }
    };

    // ✅ SỬA 3: Không dùng "if (!adminData) return null" nữa 
    // để tránh việc Header bị biến mất khi đang load.
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
                    {/* Nếu có data thì hiện tên, chưa có thì hiện tạm tên ông */}
                    Xin chào <strong>{adminData?.full_name || adminData?.username || "Quang Dũng"}</strong>
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