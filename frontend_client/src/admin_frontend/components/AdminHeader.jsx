import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/api';
import socketService from '../../api/socket'; // 🟢 THÊM: Import socket service
import {
    Menu,
    Search,
    Bell,
    ChevronDown,
    LogOut
} from 'lucide-react';

import '../styles/AdminHeader.css';

const AdminHeader = ({ toggleSidebar }) => {

    const navigate = useNavigate();

    const [admin, setAdmin] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    // 🟢 THÊM: State cho modal session expired
    const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
    const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');
    const [newDevice, setNewDevice] = useState('');

    // =========================================================
    // LOAD ADMIN INFO
    // =========================================================

    useEffect(() => {

        const fetchAdmin = async () => {

            try {

                const res = await api.get('/admin/api/auth/me');
                const adminUser = res.data?.user || null;
                setAdmin(adminUser);

                // 🟢 Kết nối WebSocket cho admin
                if (adminUser) {
                    socketService.connect(adminUser.user_id, adminUser.user_id);
                    console.log('🟢 [ADMIN HEADER] Đã kết nối WebSocket cho admin:', adminUser.user_id);
                }

            } catch (error) {

                console.error(
                    'Không thể lấy thông tin Admin:',
                    error
                );

                // 🟢 Ngắt kết nối WebSocket nếu lỗi
                socketService.disconnect();

                // Bất kể status 401 hay lỗi khác, đều chuyển về trang Admin Login
                navigate('/login', { replace: true });

            }

        };

        fetchAdmin();

    }, [navigate]);

    // =========================================================
    // 🟢 LẮNG NGHE SỰ KIỆN SESSION EXPIRED
    // =========================================================

    useEffect(() => {
        const handleSessionExpired = (event) => {
            console.log('🔴 [ADMIN HEADER] Session expired:', event.detail);
            
            const detail = event.detail || {};
            const message = detail.message || 'Tài khoản admin đã được đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.';
            const device = detail.newDevice || '';
            
            setSessionExpiredMessage(message);
            setNewDevice(device);
            setShowSessionExpiredModal(true);
            
            // Xóa admin state
            setAdmin(null);
            
            // Ngắt kết nối WebSocket
            socketService.disconnect();
        };

        // 🟢 Lắng nghe sự kiện tokenInvalid
        const handleTokenInvalid = (event) => {
            console.log('🔴 [ADMIN HEADER] Token invalid:', event.detail);
            setAdmin(null);
            socketService.disconnect();
        };

        // 🟢 Lắng nghe sự kiện unauthorized
        const handleUnauthorized = (event) => {
            console.log('🔴 [ADMIN HEADER] Unauthorized:', event.detail);
            setAdmin(null);
            socketService.disconnect();
        };

        window.addEventListener('sessionExpired', handleSessionExpired);
        window.addEventListener('tokenInvalid', handleTokenInvalid);
        window.addEventListener('unauthorized', handleUnauthorized);

        return () => {
            window.removeEventListener('sessionExpired', handleSessionExpired);
            window.removeEventListener('tokenInvalid', handleTokenInvalid);
            window.removeEventListener('unauthorized', handleUnauthorized);
        };
    }, []);

    // =========================================================
    // 🟢 HANDLE SESSION EXPIRED CONFIRM
    // =========================================================

    const handleSessionExpiredConfirm = () => {
        console.log('🔴 [ADMIN HEADER] User xác nhận đăng nhập lại');
        setShowSessionExpiredModal(false);
        setSessionExpiredMessage('');
        setNewDevice('');
        
        // Ngắt kết nối WebSocket
        socketService.disconnect();
        
        navigate('/login', { replace: true, state: { expired: true } });
    };

    // =========================================================
    // LOGOUT
    // =========================================================

    const handleLogout = async () => {

        try {

            await api.post('/admin/api/auth/logout');

        } catch (error) {

            console.error(
                'Lỗi đăng xuất Admin:',
                error
            );

        } finally {

            // 🟢 Ngắt kết nối WebSocket
            socketService.disconnect();

            setAdmin(null);
            setShowDropdown(false);

            navigate('/login', {
                replace: true
            });

        }

    };

    // =========================================================
    // TOGGLE USER DROPDOWN
    // =========================================================

    const toggleDropdown = () => {

        setShowDropdown(prev => !prev);

    };

    return (
        <>
            <header className="admin-header-main">

                {/* =================================================
                    LEFT
                ================================================= */}

                <div className="admin-header-left">

                    <button
                        className="admin-hamburger-trigger"
                        onClick={toggleSidebar}
                        aria-label="Toggle Sidebar"
                    >
                        <Menu size={24} />
                    </button>

                    {/* LOGO */}

                    <Link
                        to="/"
                        className="admin-brand-logo"
                    >

                        <img
                            src="https://api.quangdungcinema.id.vn/uploads/logo/logocinema.png"
                            alt="Cinema Star"
                            className="admin-logo-image"
                        />

                    </Link>

                </div>


                {/* =================================================
                    CENTER
                ================================================= */}

                <div className="admin-header-search-wrapper">

                    <Search
                        size={18}
                        className="admin-search-icon"
                    />

                    <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        className="admin-search-input"
                    />

                </div>


                {/* =================================================
                    RIGHT
                ================================================= */}

                <div className="admin-header-right">

                    {/* =================================================
                        NOTIFICATION
                    ================================================= */}

                    <button
                        className="admin-notification-btn"
                        type="button"
                    >

                        <Bell size={20} />

                        <span className="admin-notification-badge">
                            5
                        </span>

                    </button>


                    {/* =================================================
                        USER
                    ================================================= */}

                    <div
                        className="admin-user-dropdown"
                        onClick={toggleDropdown}
                    >

                        <div className="admin-user-avatar">

                            <img
                                src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                                    admin?.full_name || 'Admin'
                                )}`}
                                alt="Admin Avatar"
                            />

                        </div>


                        <div className="admin-user-info">

                            <span className="admin-user-greeting">
                                Xin chào,
                            </span>

                            <strong className="admin-user-name">

                                {admin?.full_name ||
                                    admin?.username ||
                                    'Quản trị viên'}

                            </strong>

                        </div>


                        <ChevronDown
                            size={18}
                            className={`admin-user-arrow ${
                                showDropdown ? 'rotate' : ''
                            }`}
                        />

                    </div>


                    {/* =================================================
                        LOGOUT
                    ================================================= */}

                    <button
                        className="admin-logout-btn"
                        onClick={handleLogout}
                        type="button"
                    >

                        <LogOut size={18} />

                        <span>
                            Đăng xuất
                        </span>

                    </button>

                </div>

            </header>

            {/* 🟢 MODAL SESSION EXPIRED */}
            {showSessionExpiredModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-icon">🔐</div>
                        <h2>Phiên đăng nhập Admin đã hết hạn</h2>
                        <p className="message">{sessionExpiredMessage}</p>
                        {newDevice && (
                            <div className="device-info">
                                <span>📱 Thiết bị mới: <strong>{newDevice}</strong></span>
                            </div>
                        )}
                        <p className="warning">
                            Để đảm bảo an toàn, vui lòng đăng nhập lại.
                        </p>
                        <button 
                            className="btn-primary" 
                            onClick={handleSessionExpiredConfirm}
                        >
                            Đăng nhập lại
                        </button>
                    </div>
                </div>
            )}
        </>
    );

};

export default AdminHeader;