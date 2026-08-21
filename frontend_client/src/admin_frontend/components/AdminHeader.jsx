import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/api';
import socketService from '../../api/socket';
import SessionExpiredModal from '../../user_frontend/components/SessionExpiredModal';
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
    const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
    const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');
    const [newDevice, setNewDevice] = useState('');
    const [countdown, setCountdown] = useState(10);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const countdownIntervalRef = useRef(null);
    const isProcessingRef = useRef(false);

    // ============================================================
    // 🔥 HÀM LOGOUT THỰC TẾ
    // ============================================================
    const performLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        isProcessingRef.current = false;

        console.log('🔴 [ADMIN HEADER] Đang thực hiện logout...');

        try {
            await api.post('/admin/api/auth/logout');
        } catch (error) {
            console.error('Lỗi khi logout:', error);
        } finally {
            localStorage.removeItem('admin_info');
            socketService.disconnect();
            setAdmin(null);
            setShowDropdown(false);
            setShowSessionExpiredModal(false);
            setSessionExpiredMessage('');
            setNewDevice('');
            setCountdown(10);
            setIsLoggingOut(false);
            delete api.defaults.headers.common['Authorization'];
            navigate('/login', { replace: true, state: { expired: true } });
            console.log('✅ [ADMIN HEADER] Logout thành công, chuyển về login');
        }
    };

    // ============================================================
    // 🔥 HÀM XỬ LÝ SESSION EXPIRED - DÙNG CHUNG
    // ============================================================
    const handleSessionExpired = (detail) => {
        if (isProcessingRef.current || showSessionExpiredModal) {
            console.log('⚠️ [ADMIN HEADER] Đang xử lý session expired, bỏ qua...');
            return;
        }

        isProcessingRef.current = true;
        console.log('🔴 [ADMIN HEADER] Xử lý session expired:', detail);

        const message = detail?.message || 'Tài khoản admin đã được đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.';
        const device = detail?.newDevice || '';

        setSessionExpiredMessage(message);
        setNewDevice(device);
        setShowSessionExpiredModal(true);
        setCountdown(10);

        setAdmin(null);
        socketService.disconnect();

        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }

        countdownIntervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                    performLogout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // ============================================================
    // LOAD ADMIN INFO - ĐĂNG KÝ CALLBACK
    // ============================================================
    useEffect(() => {
        const fetchAdmin = async () => {
            try {
                const res = await api.get('/admin/api/auth/me');
                const adminUser = res.data?.user || null;
                setAdmin(adminUser);

                socketService.setOnSessionExpired(handleSessionExpired);

                if (adminUser) {
                    socketService.connect(adminUser.user_id);
                    console.log('🟢 [ADMIN HEADER] Đã kết nối WebSocket cho admin:', adminUser.user_id);
                }
            } catch (error) {
                console.error('Không thể lấy thông tin Admin:', error);
                socketService.disconnect();
                navigate('/login', { replace: true });
            }
        };

        fetchAdmin();

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
            isProcessingRef.current = false;
        };
    }, [navigate]);

    // ============================================================
    // LẮNG NGHE SỰ KIỆN WINDOW - FALLBACK
    // ============================================================
    useEffect(() => {
        const handleWindowSessionExpired = (event) => {
            console.log('🔴 [ADMIN HEADER] Session expired event từ window:', event.detail);
            handleSessionExpired(event.detail);
        };

        const handleTokenInvalid = () => {
            console.log('🔴 [ADMIN HEADER] Token invalid');
            setAdmin(null);
            socketService.disconnect();
            isProcessingRef.current = false;
        };

        const handleUnauthorized = () => {
            console.log('🔴 [ADMIN HEADER] Unauthorized');
            setAdmin(null);
            socketService.disconnect();
            isProcessingRef.current = false;
        };

        window.addEventListener('sessionExpired', handleWindowSessionExpired);
        window.addEventListener('tokenInvalid', handleTokenInvalid);
        window.addEventListener('unauthorized', handleUnauthorized);

        return () => {
            window.removeEventListener('sessionExpired', handleWindowSessionExpired);
            window.removeEventListener('tokenInvalid', handleTokenInvalid);
            window.removeEventListener('unauthorized', handleUnauthorized);
        };
    }, []);

    // ============================================================
    // LOGOUT THỦ CÔNG
    // ============================================================
    const handleLogout = async () => {
        await performLogout();
    };

    // ============================================================
    // HANDLE SESSION EXPIRED CONFIRM
    // ============================================================
    const handleSessionExpiredConfirm = () => {
        console.log('🔴 [ADMIN HEADER] User xác nhận đăng nhập lại');
        
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        
        isProcessingRef.current = false;
        performLogout();
    };

    // ============================================================
    // TOGGLE USER DROPDOWN
    // ============================================================
    const toggleDropdown = () => {
        setShowDropdown(prev => !prev);
    };

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <>
            <header className="admin-header-main">

                <div className="admin-header-left">
                    <button
                        className="admin-hamburger-trigger"
                        onClick={toggleSidebar}
                        aria-label="Toggle Sidebar"
                    >
                        <Menu size={24} />
                    </button>

                    <Link to="/" className="admin-brand-logo">
                        <img
                            src="https://api.quangdungcinema.id.vn/uploads/logo/logocinema.png"
                            alt="Cinema Star"
                            className="admin-logo-image"
                        />
                    </Link>
                </div>

                <div className="admin-header-search-wrapper">
                    <Search size={18} className="admin-search-icon" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        className="admin-search-input"
                    />
                </div>

                <div className="admin-header-right">

                    <button className="admin-notification-btn" type="button">
                        <Bell size={20} />
                        <span className="admin-notification-badge">5</span>
                    </button>

                    <div className="admin-user-dropdown" onClick={toggleDropdown}>
                        <div className="admin-user-avatar">
                            <img
                                src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                                    admin?.full_name || 'Admin'
                                )}`}
                                alt="Admin Avatar"
                            />
                        </div>

                        <div className="admin-user-info">
                            <span className="admin-user-greeting">Xin chào,</span>
                            <strong className="admin-user-name">
                                {admin?.full_name || admin?.username || 'Quản trị viên'}
                            </strong>
                        </div>

                        <ChevronDown
                            size={18}
                            className={`admin-user-arrow ${showDropdown ? 'rotate' : ''}`}
                        />
                    </div>

                    <button className="admin-logout-btn" onClick={handleLogout} type="button">
                        <LogOut size={18} />
                        <span>Đăng xuất</span>
                    </button>

                </div>

            </header>

            {/* 🔥 SESSION EXPIRED MODAL - DÙNG COMPONENT CHUNG */}
            <SessionExpiredModal
                isOpen={showSessionExpiredModal}
                onConfirm={handleSessionExpiredConfirm}
                message={sessionExpiredMessage}
                newDevice={newDevice}
                autoRedirect={true}
                redirectDelay={countdown}
            />
        </>
    );
};

export default AdminHeader;