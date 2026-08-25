import React, {
    useState,
    useEffect,
    useRef,
    useCallback
} from 'react';

import {
    useNavigate,
    Link
} from 'react-router-dom';

import api from '../../api/api';
import socketService from '../../api/socket';

import {
    logout
} from '../../utils/authCleanup';

import {
    ChevronDown,
    UserCircle,
    IdCard,
    LogOut,
    LogIn,
    UserPlus,
    LayoutDashboard
} from 'lucide-react';

import '../styles/Header.css';

// ============================================================
// USER HEADER
// ============================================================

const UserHeader = () => {
    const navigate = useNavigate();

    // ========================================================
    // STATE
    // ========================================================

    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [cinemas, setCinemas] = useState([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeSubMenu, setActiveSubMenu] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // ========================================================
    // REFS
    // ========================================================

    const dropdownRef = useRef(null);
    const navRef = useRef(null);
    const isMountedRef = useRef(true);

    // ========================================================
    // FETCH USER
    // ========================================================

    const fetchUser = useCallback(async () => {
        try {
            const res = await api.get('/api/auth/me');
            const raw = res?.data;
            const account = raw?.user ||
                raw?.data?.user ||
                (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null);

            if (isMountedRef.current) {
                setUser(account);
            }

            if (account?.user_id) {
                socketService.connect(account.user_id);
            }

            console.log('🟢 [HEADER] User loaded:', account?.user_id);
        } catch (error) {
            console.log('🔵 [HEADER] No active user session');
            if (isMountedRef.current) {
                setUser(null);
            }
            try {
                socketService.disconnect();
            } catch (socketError) {
                console.warn('Socket disconnect error:', socketError);
            }
        } finally {
            if (isMountedRef.current) {
                setAuthLoading(false);
            }
        }
    }, []);

    // ========================================================
    // INITIAL FETCH USER
    // ========================================================

    useEffect(() => {
        isMountedRef.current = true;
        fetchUser();

        return () => {
            isMountedRef.current = false;
        };
    }, [fetchUser]);

    // ========================================================
    // 🔥 SOCKET EVENT - PHÁT HIỆN SESSION EXPIRED TỪ SERVER
    // ========================================================

    useEffect(() => {
        const handleSocketSessionExpired = (detail) => {
            console.warn('🔴 [HEADER] Socket session_expired received:', detail);

            if (!isMountedRef.current) return;

            // Reset user state
            setUser(null);
            setShowDropdown(false);
            setAuthLoading(false);
            setIsMenuOpen(false);
            setActiveSubMenu(null);

            // Disconnect socket
            try {
                socketService.disconnect();
            } catch (error) {
                console.warn('Socket disconnect error:', error);
            }

            // 🔥 Dispatch event để các component khác biết
            window.dispatchEvent(new CustomEvent('sessionExpired', {
                detail: {
                    code: detail?.code || 'SESSION_EXPIRED',
                    type: detail?.type || 'device',
                    message: detail?.message || 'Tài khoản đã được đăng nhập trên thiết bị khác.',
                    source: 'socket',
                    fromSocket: true,
                    timestamp: new Date().toISOString()
                }
            }));

            // 🔥 Dispatch authCleanedUp
            window.dispatchEvent(new CustomEvent('authCleanedUp', {
                detail: {
                    reason: 'SESSION_EXPIRED',
                    message: detail?.message || 'Tài khoản đã được đăng nhập trên thiết bị khác.',
                    timestamp: new Date().toISOString()
                }
            }));

            // 🔥 Redirect về login
            navigate('/login', { replace: true });
        };

        // Đăng ký callback với socket
        socketService.setOnSessionExpired(handleSocketSessionExpired);

        return () => {
            socketService.setOnSessionExpired(null);
        };
    }, [navigate]);

    // ========================================================
    // 🔥 AUTH EVENTS - LẮNG NGHE TỪ WINDOW
    // ========================================================

    useEffect(() => {
        // ====================================================
        // SESSION EXPIRED - Từ API interceptor hoặc socket
        // ====================================================

        const handleSessionExpired = () => {
            console.warn('🔴 [HEADER] Session expired event received');

            if (!isMountedRef.current) return;

            setUser(null);
            setShowDropdown(false);
            setAuthLoading(false);
            setIsMenuOpen(false);
            setActiveSubMenu(null);

            try {
                socketService.disconnect();
            } catch (e) {
                // Bỏ qua
            }
        };

        // ====================================================
        // AUTH CLEANED UP
        // ====================================================

        const handleAuthCleanedUp = () => {
            console.log('🧹 [HEADER] Auth cleaned event received');

            if (!isMountedRef.current) return;

            setUser(null);
            setShowDropdown(false);
            setAuthLoading(false);

            try {
                socketService.disconnect();
            } catch (e) {
                // Bỏ qua
            }
        };

        // ====================================================
        // 🔥 USER LOGGED IN - CẬP NHẬT NGAY
        // ====================================================

        const handleUserLoggedIn = async () => {
            console.log('🟢 [HEADER] User logged in event received');

            if (!isMountedRef.current) return;

            setAuthLoading(true);

            try {
                const res = await api.get('/api/auth/me', { force: true });
                const raw = res?.data;
                const account = raw?.user || 
                    raw?.data?.user || 
                    (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null);

                if (isMountedRef.current) {
                    setUser(account);
                }

                if (account?.user_id) {
                    socketService.connect(account.user_id);
                }

                console.log('🟢 [HEADER] User updated after login:', account?.user_id);
            } catch (error) {
                console.log('🔵 [HEADER] Cannot fetch user after login');
                if (isMountedRef.current) {
                    setUser(null);
                }
            } finally {
                if (isMountedRef.current) {
                    setAuthLoading(false);
                }
            }
        };

        // ====================================================
        // ĐĂNG KÝ CÁC EVENT
        // ====================================================

        window.addEventListener('sessionExpired', handleSessionExpired);
        window.addEventListener('authCleanedUp', handleAuthCleanedUp);
        window.addEventListener('userLoggedIn', handleUserLoggedIn);

        return () => {
            window.removeEventListener('sessionExpired', handleSessionExpired);
            window.removeEventListener('authCleanedUp', handleAuthCleanedUp);
            window.removeEventListener('userLoggedIn', handleUserLoggedIn);
        };
    }, []);

    // ========================================================
    // 🔥 LOGOUT CHỦ ĐỘNG
    // ========================================================

    const handleLogout = useCallback(async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);

        try {
            await logout();
            
            if (isMountedRef.current) {
                setUser(null);
                setShowDropdown(false);
            }

            navigate('/login', { 
                replace: true, 
                state: { loggedOut: true } 
            });
        } catch (error) {
            console.error('🔴 [HEADER] Logout error:', error);
            
            if (isMountedRef.current) {
                setUser(null);
            }
            
            navigate('/login', { replace: true });
        } finally {
            if (isMountedRef.current) {
                setIsLoggingOut(false);
            }
        }
    }, [isLoggingOut, navigate]);

    // ========================================================
    // FETCH CINEMAS
    // ========================================================

    useEffect(() => {
        const fetchCinemas = async () => {
            try {
                const response = await api.get('/api/cinemas');
                const raw = response?.data?.data;
                let list = [];

                if (Array.isArray(raw)) {
                    list = raw;
                } else if (Array.isArray(raw?.data)) {
                    list = raw.data;
                } else if (Array.isArray(raw?.cinemas)) {
                    list = raw.cinemas;
                }

                if (isMountedRef.current) {
                    setCinemas(list);
                }
            } catch (error) {
                console.error('🔴 [HEADER] Cannot fetch cinemas:', error);
                if (isMountedRef.current) {
                    setCinemas([]);
                }
            }
        };

        fetchCinemas();

        return () => {
            // Cleanup
        };
    }, []);

    // ========================================================
    // CLICK OUTSIDE - ĐÓNG MENU
    // ========================================================

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (navRef.current && navRef.current.contains(event.target)) {
                return;
            }

            if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
                return;
            }

            setActiveSubMenu(null);
            setShowDropdown(false);
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // ========================================================
    // RESPONSIVE - TỰ ĐỘNG ĐÓNG MENU KHI RESIZE
    // ========================================================

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setIsMenuOpen(false);
                setActiveSubMenu(null);
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // ========================================================
    // HELPERS
    // ========================================================

    const closeMobileMenu = useCallback(() => {
        setIsMenuOpen(false);
        setActiveSubMenu(null);
    }, []);

    const toggleSubMenu = useCallback((menuName, event) => {
        event.preventDefault();
        event.stopPropagation();
        setActiveSubMenu((current) => current === menuName ? null : menuName);
    }, []);

    const getAvatarUrl = useCallback((avatar) => {
        if (!avatar) return null;
        if (avatar.startsWith('http')) return avatar;
        return `https://api.quangdungcinema.id.vn/uploads/avatars/${avatar}`;
    }, []);

    // ========================================================
    // USER INFO
    // ========================================================

    const isValidUser = Boolean(user && Number(user.email_verified) === 1);
    const avatarSource = user?.user_avatar || user?.avatar;
    const avatarUrl = getAvatarUrl(avatarSource);
    const displayName = user?.username || user?.full_name || 'Tài khoản';

    const handleLoginClick = useCallback(() => {
        setShowDropdown(false);
        navigate('/login');
    }, [navigate]);

    const handleRegisterClick = useCallback(() => {
        setShowDropdown(false);
        navigate('/register');
    }, [navigate]);

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <nav className="user-navbar">
            <div className="nav-container">

                {/* ============================================
                    HAMBURGER MENU
                ============================================ */}

                <button
                    className={`hamburger ${isMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                    aria-label="Toggle menu"
                >
                    <span className="bar" />
                    <span className="bar" />
                    <span className="bar" />
                </button>

                {/* ============================================
                    LOGO
                ============================================ */}

                <div
                    className="header-logo"
                    onClick={() => {
                        navigate('/');
                        closeMobileMenu();
                    }}
                >
                    <img
                        src="https://api.quangdungcinema.id.vn/uploads/logo/logocinema.png"
                        alt="Cinema Star Logo"
                    />
                </div>

                {/* ============================================
                    MOBILE OVERLAY
                ============================================ */}

                <div
                    className={`menu-overlay ${isMenuOpen ? 'active' : ''}`}
                    onClick={closeMobileMenu}
                />

                {/* ============================================
                    NAVIGATION LINKS
                ============================================ */}

                <ul
                    ref={navRef}
                    className={`nav-links ${isMenuOpen ? 'active' : ''}`}
                >
                    {/* TRANG CHỦ */}
                    <li>
                        <Link
                            to="/"
                            onClick={closeMobileMenu}
                            className="menu-link"
                        >
                            Trang chủ
                        </Link>
                    </li>

                    {/* PHIM */}
                    <li
                        className={`has-dropdown ${
                            activeSubMenu === 'phim' ? 'mobile-active' : ''
                        }`}
                    >
                        <div
                            className="menu-link mobile-parent"
                            onClick={(event) => toggleSubMenu('phim', event)}
                        >
                            <span>Phim</span>
                            <ChevronDown size={18} className="icon-down" />
                        </div>

                        <ul className="sub-menu">
                            <li>
                                <Link
                                    to="/movies/status/phim-dang-chieu"
                                    onClick={closeMobileMenu}
                                >
                                    Phim đang chiếu
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/movies/status/phim-sap-chieu"
                                    onClick={closeMobileMenu}
                                >
                                    Phim sắp chiếu
                                </Link>
                            </li>
                        </ul>
                    </li>

                    {/* RẠP */}
                    <li
                        className={`has-dropdown ${
                            activeSubMenu === 'rap' ? 'mobile-active' : ''
                        }`}
                    >
                        <div className="menu-link mobile-parent">
                            <Link to="/cinema" onClick={closeMobileMenu}>
                                Rạp
                            </Link>
                            <ChevronDown
                                size={18}
                                className="icon-down"
                                onClick={(event) => toggleSubMenu('rap', event)}
                            />
                        </div>

                        <ul className="sub-menu">
                            {cinemas.map((cinema) => (
                                <li key={cinema.cinema_id}>
                                    <Link
                                        to={`/cinema/detail/${cinema.slug}`}
                                        onClick={closeMobileMenu}
                                    >
                                        {cinema.cinema_name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </li>

                    {/* GÓC ĐIỆN ẢNH */}
                    <li
                        className={`has-dropdown ${
                            activeSubMenu === 'goc' ? 'mobile-active' : ''
                        }`}
                    >
                        <div
                            className="menu-link mobile-parent"
                            onClick={(event) => toggleSubMenu('goc', event)}
                        >
                            <span>Góc Điện Ảnh</span>
                            <ChevronDown size={18} className="icon-down" />
                        </div>

                        <ul className="sub-menu">
                            <li>
                                <Link to="/actors" onClick={closeMobileMenu}>
                                    Diễn Viên
                                </Link>
                            </li>
                            <li>
                                <Link to="/news" onClick={closeMobileMenu}>
                                    Tin Tức
                                </Link>
                            </li>
                        </ul>
                    </li>

                    {/* KHUYẾN MÃI */}
                    <li>
                        <Link
                            to="/promotion"
                            onClick={closeMobileMenu}
                            className="menu-link"
                        >
                            Khuyến mãi
                        </Link>
                    </li>

                    {/* BLOG ĐIỆN ẢNH */}
                    <li>
                        <Link
                            to="/blog-cinema"
                            onClick={closeMobileMenu}
                            className="menu-link"
                        >
                            Blog Điện Ảnh
                        </Link>
                    </li>
                </ul>

                {/* ============================================
                    USER MENU - DROPDOWN
                ============================================ */}

                <div className="user-menu" ref={dropdownRef}>
                    {/* TRIGGER */}
                    <div
                        className="account-trigger"
                        onClick={() => setShowDropdown((prev) => !prev)}
                    >
                        {isValidUser && avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt="avatar"
                                className="header-avatar"
                                style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    marginRight: '8px'
                                }}
                            />
                        ) : (
                            <UserCircle size={22} className="user-icon" />
                        )}

                        <span className="username-display">
                            {authLoading 
                                ? 'Đang tải...' 
                                : isValidUser 
                                    ? displayName 
                                    : 'Tài khoản'
                            }
                        </span>

                        <ChevronDown 
                            size={14} 
                            className={showDropdown ? 'rotate' : ''} 
                        />
                    </div>

                    {/* DROPDOWN CONTENT */}
                    {showDropdown && (
                        <div className="dropdown-content show">
                            {isValidUser ? (
                                // ====================================
                                // ĐÃ ĐĂNG NHẬP
                                // ====================================
                                <>
                                    <div className="dropdown-user-info">
                                        <p>
                                            Chào, <strong>{displayName}</strong>
                                        </p>
                                        {user.role === 'admin' && (
                                            <span className="admin-badge">
                                                Quản trị viên
                                            </span>
                                        )}
                                    </div>

                                    <div className="dropdown-divider" />

                                    {user.role === 'admin' && (
                                        <div
                                            className="dropdown-item admin-link"
                                            onClick={() => {
                                                navigate('/admin');
                                                setShowDropdown(false);
                                            }}
                                        >
                                            <LayoutDashboard size={18} />
                                            <span>Trang Quản Trị</span>
                                        </div>
                                    )}

                                    <div
                                        className="dropdown-item"
                                        onClick={() => {
                                            navigate('/profile');
                                            setShowDropdown(false);
                                        }}
                                    >
                                        <IdCard size={18} />
                                        <span>Hồ sơ</span>
                                    </div>

                                    <div
                                        className={`dropdown-item logout-btn ${
                                            isLoggingOut ? 'loading' : ''
                                        }`}
                                        onClick={handleLogout}
                                    >
                                        <LogOut size={18} />
                                        <span>
                                            {isLoggingOut 
                                                ? 'Đang đăng xuất...' 
                                                : 'Đăng xuất'
                                            }
                                        </span>
                                    </div>
                                </>
                            ) : (
                                // ====================================
                                // CHƯA ĐĂNG NHẬP
                                // ====================================
                                <>
                                    <div className="dropdown-user-info">
                                        <p style={{ color: '#f87171' }}>
                                            {user && !Number(user.email_verified)
                                                ? '⚠️ Vui lòng xác thực email'
                                                : 'Chưa đăng nhập'
                                            }
                                        </p>
                                    </div>

                                    <div className="dropdown-divider" />

                                    <div
                                        className="dropdown-item"
                                        onClick={handleLoginClick}
                                    >
                                        <LogIn size={18} />
                                        <span>Đăng nhập</span>
                                    </div>

                                    <div
                                        className="dropdown-item"
                                        onClick={handleRegisterClick}
                                    >
                                        <UserPlus size={18} />
                                        <span>Đăng ký</span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </nav>
    );
};

export default UserHeader;