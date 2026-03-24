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
                // ✅ Giữ nguyên link API của Dũng
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
            await axios.post('https://webcinema-zb8z.onrender.com/api/admin/auth/logout', {}, {
                withCredentials: true
            });
            
            sessionStorage.clear(); 
            window.dispatchEvent(new Event('authChange'));
            navigate('/admin/login');
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
            navigate('/admin/login');
        }
    };

    return (
        <header className="admin-header-main"> {/* Đổi class tổng */}
            <div className="admin-header-wrapper-left"> {/* Đổi class cụm trái */}
                <button 
                    className="admin-hamburger-trigger" /* Đổi class nút menu */
                    onClick={toggleSidebar}
                    aria-label="Toggle Sidebar"
                >
                    <Menu size={24} />
                </button>

                <div className="admin-brand-logo"> {/* Đổi class logo */}
                    <Link to="/admin">ADMIN PANEL</Link>
                </div>
            </div>

            <div className="admin-header-profile-section"> {/* Đổi class cụm phải - CỰC QUAN TRỌNG */}
                <span className="admin-header-welcome-text"> {/* Đổi class text chào */}
                    Xin chào <strong>{adminData?.full_name || adminData?.username || "Quang Dũng"}</strong>
                </span>

                <button 
                    className="btn-header-auth-logout" /* Đổi class nút logout để không bị đè CSS */
                    onClick={handleLogout}
                >
                    Đăng xuất
                </button>
            </div>
        </header>
    );
};

export default AdminHeader;