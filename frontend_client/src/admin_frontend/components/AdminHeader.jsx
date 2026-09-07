// admin_frontend/components/AdminHeader.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import adminapi from '../../api/adminapi';
import socketService from '../../api/socket';
import { logout } from '../../utils/authCleanup';
import {
    Menu,
    Search,
    Bell,
    ChevronDown,
    LogOut,
    UserCircle,
    LayoutDashboard,
    Settings,
    ShieldCheck
} from 'lucide-react';

import '../styles/AdminHeader.css';

const AdminHeader = ({ toggleSidebar }) => {

    const navigate = useNavigate();

    const [admin, setAdmin] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [toast, setToast] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    const dropdownRef = useRef(null);
    const toastTimeoutRef = useRef(null);
    const redirectTimeoutRef = useRef(null);

    // ============================================================
    // TOAST
    // ============================================================
    const showToast = useCallback((message, type = 'success') => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = null;
        }

        setToast({
            show: true,
            message,
            type
        });

        toastTimeoutRef.current = setTimeout(() => {
            setToast({
                show: false,
                message: '',
                type: 'success'
            });
            toastTimeoutRef.current = null;
        }, 4000);
    }, []);

    // ============================================================
    // HÀM LOGOUT THỰC TẾ
    // ============================================================
    const performLogout = useCallback(async (redirectToLogin = true) => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);

        console.log('🔴 [ADMIN HEADER] Đang thực hiện logout...');

        try {
            await logout();
            
            if (redirectToLogin) {
                showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'warning');
            } else {
                showToast('Đăng xuất thành công! Hẹn gặp lại bạn 👋', 'success');
            }

            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
                redirectTimeoutRef.current = null;
            }

            redirectTimeoutRef.current = setTimeout(() => {
                localStorage.removeItem('admin_info');
                socketService.disconnect();
                setAdmin(null);
                setShowDropdown(false);
                setIsLoggingOut(false);
                delete adminapi.defaults.headers.common['Authorization'];
                
                if (redirectToLogin) {
                    navigate('/login', { 
                        replace: true, 
                        state: { expired: true, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' } 
                    });
                } else {
                    navigate('/login', { 
                        replace: true, 
                        state: { loggedOut: true, message: 'Đăng xuất thành công!' } 
                    });
                }
                redirectTimeoutRef.current = null;
            }, 1500);

        } catch (error) {
            console.error('🔴 [ADMIN HEADER] Logout error:', error);
            showToast('Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.', 'error');

            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
                redirectTimeoutRef.current = null;
            }

            redirectTimeoutRef.current = setTimeout(() => {
                localStorage.removeItem('admin_info');
                socketService.disconnect();
                setAdmin(null);
                setShowDropdown(false);
                setIsLoggingOut(false);
                delete adminapi.defaults.headers.common['Authorization'];
                navigate('/login', { replace: true });
                redirectTimeoutRef.current = null;
            }, 2000);
        }
    }, [isLoggingOut, navigate, showToast]);

    // ============================================================
    // LOAD ADMIN INFO
    // ============================================================
    useEffect(() => {
        const fetchAdmin = async () => {
            try {
                const res = await adminapi.get('/admin/api/auth/me');
                const adminUser = res.data?.user || null;
                setAdmin(adminUser);

                if (adminUser) {
                    socketService.connect(adminUser.user_id);
                    console.log('🟢 [ADMIN HEADER] Đã kết nối WebSocket cho admin:', adminUser.user_id);
                }
            } catch (error) {
                console.error('Không thể lấy thông tin Admin:', error);
                socketService.disconnect();
            }
        };

        fetchAdmin();

        return () => {
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
                redirectTimeoutRef.current = null;
            }
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
                toastTimeoutRef.current = null;
            }
        };
    }, []);

    // ============================================================
    // LẮNG NGHE SỰ KIỆN WINDOW - GIỐNG UserHeader
    // ============================================================
    useEffect(() => {
        const handleAuthCleanedUp = (event) => {
            console.log('🧹 [ADMIN HEADER] Auth cleaned:', event?.detail);
            setAdmin(null);
            setShowDropdown(false);
            try {
                socketService.disconnect();
            } catch (error) {
                console.warn('Socket disconnect error:', error);
            }
        };

        const handleAdminLoggedIn = (event) => {
            console.log('🟢 [ADMIN HEADER] Admin logged in - updating immediately');
            adminapi.get('/admin/api/auth/me', { force: true })
                .then(res => {
                    const adminUser = res.data?.user || null;
                    setAdmin(adminUser);
                    if (adminUser) {
                        socketService.connect(adminUser.user_id);
                    }
                })
                .catch(() => {});
        };

        const handleSessionExpired = (event) => {
            console.warn('🔴 [ADMIN HEADER] Session expired:', event?.detail);
            setAdmin(null);
            setShowDropdown(false);
            try {
                socketService.disconnect();
            } catch (error) {
                console.warn('Socket disconnect error:', error);
            }
        };

        window.addEventListener('authCleanedUp', handleAuthCleanedUp);
        window.addEventListener('adminLoggedIn', handleAdminLoggedIn);
        window.addEventListener('sessionExpired', handleSessionExpired);

        return () => {
            window.removeEventListener('authCleanedUp', handleAuthCleanedUp);
            window.removeEventListener('adminLoggedIn', handleAdminLoggedIn);
            window.removeEventListener('sessionExpired', handleSessionExpired);
        };
    }, []);

    // ============================================================
    // CLICK OUTSIDE DROPDOWN
    // ============================================================
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // ============================================================
    // LOGOUT THỦ CÔNG
    // ============================================================
    const handleLogout = async () => {
        await performLogout(false);
    };

    // ============================================================
    // TOGGLE USER DROPDOWN
    // ============================================================
    const toggleDropdown = () => {
        setShowDropdown(prev => !prev);
    };

    // ============================================================
    // GET AVATAR URL
    // ============================================================
    const getAvatarUrl = (avatar) => {
        if (!avatar) return null;
        if (avatar.startsWith('http')) return avatar;
        return `https://api.quangdungcinema.id.vn/uploads/avatars/${avatar}`;
    };

    const avatarSource = admin?.user_avatar || admin?.avatar;
    const avatarUrl = getAvatarUrl(avatarSource);
    const displayName = admin?.full_name || admin?.username || 'Quản trị viên';

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <>
            {toast.show && (
                <div className={`toast-notification toast-${toast.type}`}>
                    <div className="toast-content">
                        <span className="toast-icon">
                            {toast.type === 'success' && '✅'}
                            {toast.type === 'error' && '❌'}
                            {toast.type === 'warning' && '⚠️'}
                        </span>
                        <span className="toast-message">{toast.message}</span>
                    </div>
                    <button 
                        className="toast-close"
                        onClick={() => {
                            setToast({ show: false, message: '', type: 'success' });
                            if (toastTimeoutRef.current) {
                                clearTimeout(toastTimeoutRef.current);
                                toastTimeoutRef.current = null;
                            }
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            <header className="admin-header-main">

                <div className="admin-header-left">
                    <button
                        className="admin-hamburger-trigger"
                        onClick={toggleSidebar}
                        aria-label="Toggle Sidebar"
                    >
                        <Menu size={24} />
                    </button>

                    {/* 🔥 SỬA: /dashboard → / */}
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

                    <div 
                        className="admin-user-dropdown" 
                        ref={dropdownRef}
                        onClick={toggleDropdown}
                    >
                        <div className="admin-user-avatar">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Admin Avatar"
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        objectFit: 'cover'
                                    }}
                                />
                            ) : (
                                <UserCircle size={36} />
                            )}
                        </div>

                        <div className="admin-user-info">
                            <span className="admin-user-greeting">Xin chào,</span>
                            <strong className="admin-user-name">
                                {displayName}
                            </strong>
                        </div>

                        <ChevronDown
                            size={18}
                            className={`admin-user-arrow ${showDropdown ? 'rotate' : ''}`}
                        />
                    </div>

                    {showDropdown && (
                        <div className="admin-dropdown-content show">
                            <div className="admin-dropdown-user-info">
                                <p>
                                    Chào, <strong>{displayName}</strong>
                                </p>
                                <span className="admin-badge">
                                    <ShieldCheck size={14} />
                                    Quản trị viên
                                </span>
                            </div>

                            <div className="admin-dropdown-divider" />

                            {/* 🔥 SỬA: /dashboard → / */}
                            <div
                                className="admin-dropdown-item"
                                onClick={() => {
                                    navigate('/');
                                    setShowDropdown(false);
                                }}
                            >
                                <LayoutDashboard size={18} />
                                <span>Dashboard</span>
                            </div>

                            <div
                                className="admin-dropdown-item"
                                onClick={() => {
                                    navigate('/admin/profile');
                                    setShowDropdown(false);
                                }}
                            >
                                <UserCircle size={18} />
                                <span>Hồ sơ</span>
                            </div>

                            <div
                                className="admin-dropdown-item"
                                onClick={() => {
                                    navigate('/admin/settings');
                                    setShowDropdown(false);
                                }}
                            >
                                <Settings size={18} />
                                <span>Cài đặt</span>
                            </div>

                            <div className="admin-dropdown-divider" />

                            <div
                                className={`admin-dropdown-item admin-dropdown-logout ${isLoggingOut ? 'loading' : ''}`}
                                onClick={handleLogout}
                            >
                                <LogOut size={18} />
                                <span>
                                    {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                                </span>
                            </div>
                        </div>
                    )}

                    <button 
                        className="admin-logout-btn" 
                        onClick={handleLogout} 
                        type="button"
                        disabled={isLoggingOut}
                    >
                        <LogOut size={18} />
                        <span>{isLoggingOut ? 'Đang...' : 'Đăng xuất'}</span>
                    </button>

                </div>

            </header>
        </>
    );
};

export default AdminHeader;