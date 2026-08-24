import React, {
    useState,
    useEffect,
    useRef,
    useCallback // 🔥 THÊM
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

    const checkIntervalRef = useRef(null); // 🔥 THÊM
    const isCheckingRef = useRef(false); // 🔥 THÊM

    // ========================================================
    // 🔥 CHECK SESSION NHANH
    // ========================================================

    const checkSession = useCallback(async () => {
        // Không check nếu đang loading hoặc đã có user
        if (authLoading) return;
        if (isCheckingRef.current) return;
        if (!user) return; // Chỉ check khi đã có user

        isCheckingRef.current = true;

        try {
            const result = await api.checkSession();

            if (!result || !result.valid) {
                // Session không hợp lệ -> reset user
                console.warn('🔴 [HEADER] Session invalid, resetting user...');
                setUser(null);
                setShowDropdown(false);
                setAuthLoading(false);

                // Ngắt socket
                try {
                    socketService.disconnect();
                } catch (error) {
                    console.warn('Socket disconnect error:', error);
                }

                // Dispatch event để đồng bộ
                window.dispatchEvent(new CustomEvent('authCleanedUp', {
                    detail: {
                        reason: 'SESSION_INVALID',
                        message: 'Phiên đăng nhập không còn hợp lệ',
                        timestamp: new Date().toISOString()
                    }
                }));
            }
        } catch (error) {
            // Bỏ qua lỗi
        } finally {
            isCheckingRef.current = false;
        }
    }, [user, authLoading]);

    // ========================================================
    // FETCH USER
    // ========================================================

    const fetchUser = async () => {
        try {
            const res = await api.get('/api/auth/me');

            const raw = res?.data;

            const account = raw?.user ||
                raw?.data?.user ||
                (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null);

            setUser(account);

            if (account?.user_id) {
                socketService.connect(account.user_id);
            }

            console.log('🟢 [HEADER] User loaded:', account?.user_id);
        } catch (error) {
            console.log('🔵 [HEADER] No active user session');

            setUser(null);

            try {
                socketService.disconnect();
            } catch (socketError) {
                console.warn('Socket disconnect error:', socketError);
            }
        } finally {
            setAuthLoading(false);
        }
    };

    // ========================================================
    // INITIAL FETCH USER
    // ========================================================

    useEffect(() => {
        fetchUser();

        return () => {
            // Header unmount thì không bắt buộc
            // disconnect socket ở đây nếu SessionGuard quản lý.
        };
    }, []);

    // ========================================================
    // 🔥 START POLLING KHI CÓ USER
    // ========================================================

    useEffect(() => {
        // Clear interval cũ
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }

        // Chỉ start polling khi có user
        if (user) {
            console.log('🔄 [HEADER] Start polling session check every 3s');
            checkIntervalRef.current = setInterval(() => {
                checkSession();
            }, 3000); // Check mỗi 3 giây
        }

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
            }
        };
    }, [user, checkSession]);

    // ========================================================
    // 🔥 CHECK KHI USER TƯƠNG TÁC
    // ========================================================

    useEffect(() => {
        if (!user) return;

        let activityTimeout = null;

        const handleActivity = () => {
            // Debounce
            if (activityTimeout) {
                clearTimeout(activityTimeout);
            }

            activityTimeout = setTimeout(() => {
                checkSession();
            }, 500);
        };

        // Lắng nghe các sự kiện tương tác
        const events = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, handleActivity, { passive: true });
        });

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, handleActivity);
            });
            if (activityTimeout) {
                clearTimeout(activityTimeout);
            }
        };
    }, [user, checkSession]);

    // ========================================================
    // 🔥 AUTH EVENTS - THÊM XỬ LÝ SESSION EXPIRED REAL-TIME
    // ========================================================

    useEffect(() => {
        // =====================================================
        // 1. AUTH CLEANED UP - từ SessionGuard
        // =====================================================
        const handleAuthCleanedUp = (event) => {
            console.log('🧹 [HEADER] Auth cleaned:', event?.detail);

            setUser(null);
            setShowDropdown(false);
            setAuthLoading(false);

            // Ngắt socket
            try {
                socketService.disconnect();
            } catch (error) {
                console.warn('Socket disconnect error:', error);
            }
        };

        // =====================================================
        // 2. USER LOGGED IN
        // =====================================================
        const handleUserLoggedIn = () => {
            console.log('🟢 [HEADER] User logged in');

            setAuthLoading(true);
            fetchUser();
        };

        // =====================================================
        // 🔥 3. SESSION EXPIRED - XỬ LÝ REAL-TIME
        // =====================================================
        const handleSessionExpired = (event) => {
            console.warn('🔴 [HEADER] Session expired real-time:', event?.detail);

            // Reset user state ngay lập tức
            setUser(null);
            setShowDropdown(false);
            setAuthLoading(false);

            // Ngắt socket
            try {
                socketService.disconnect();
            } catch (error) {
                console.warn('Socket disconnect error:', error);
            }

            // Đóng menu mobile
            setIsMenuOpen(false);
            setActiveSubMenu(null);

            // Dispatch authCleanedUp để đồng bộ
            window.dispatchEvent(new CustomEvent('authCleanedUp', {
                detail: {
                    reason: event?.detail?.code || 'SESSION_EXPIRED',
                    message: event?.detail?.message || 'Phiên đăng nhập đã hết hạn',
                    timestamp: new Date().toISOString()
                }
            }));
        };

        // =====================================================
        // 4. TOKEN EXPIRED - XỬ LÝ REAL-TIME
        // =====================================================
        const handleTokenExpired = (event) => {
            console.warn('⏰ [HEADER] Token expired real-time:', event?.detail);

            // Reset user state ngay lập tức
            setUser(null);
            setShowDropdown(false);
            setAuthLoading(false);

            // Ngắt socket
            try {
                socketService.disconnect();
            } catch (error) {
                console.warn('Socket disconnect error:', error);
            }

            // Đóng menu mobile
            setIsMenuOpen(false);
            setActiveSubMenu(null);
        };

        // =====================================================
        // 5. DEVICE LOGGED OUT - XỬ LÝ REAL-TIME
        // =====================================================
        const handleDeviceLoggedOut = (event) => {
            console.warn('📱 [HEADER] Device logged out real-time:', event?.detail);

            // Reset user state ngay lập tức
            setUser(null);
            setShowDropdown(false);
            setAuthLoading(false);

            // Ngắt socket
            try {
                socketService.disconnect();
            } catch (error) {
                console.warn('Socket disconnect error:', error);
            }

            // Đóng menu mobile
            setIsMenuOpen(false);
            setActiveSubMenu(null);
        };

        // =====================================================
        // ĐĂNG KÝ TẤT CẢ EVENT
        // =====================================================
        window.addEventListener('authCleanedUp', handleAuthCleanedUp);
        window.addEventListener('userLoggedIn', handleUserLoggedIn);
        window.addEventListener('sessionExpired', handleSessionExpired);
        window.addEventListener('tokenExpired', handleTokenExpired);
        window.addEventListener('deviceLoggedOut', handleDeviceLoggedOut);

        return () => {
            window.removeEventListener('authCleanedUp', handleAuthCleanedUp);
            window.removeEventListener('userLoggedIn', handleUserLoggedIn);
            window.removeEventListener('sessionExpired', handleSessionExpired);
            window.removeEventListener('tokenExpired', handleTokenExpired);
            window.removeEventListener('deviceLoggedOut', handleDeviceLoggedOut);
        };
    }, []);

    // ========================================================
    // LOGOUT CHỦ ĐỘNG
    //
    // Logout khác Session Expired:
    //
    // - Gọi API logout
    // - cleanup auth
    // - redirect login
    // ========================================================

    const handleLogout = async () => {
        if (isLoggingOut) {
            return;
        }

        setIsLoggingOut(true);

        console.log('🔴 [HEADER] Logging out...');

        try {
            await logout();

            setUser(null);
            setShowDropdown(false);

            navigate('/login', {
                replace: true,
                state: {
                    loggedOut: true
                }
            });
        } catch (error) {
            console.error('🔴 [HEADER] Logout error:', error);

            // Dù logout API lỗi
            // vẫn redirect về login.
            setUser(null);

            navigate('/login', {
                replace: true
            });
        } finally {
            setIsLoggingOut(false);
        }
    };

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

                setCinemas(list);
            } catch (error) {
                console.error('🔴 [HEADER] Cannot fetch cinemas:', error);
                setCinemas([]);
            }
        };

        fetchCinemas();
    }, []);

    // ========================================================
    // CLICK OUTSIDE
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
    // RESPONSIVE
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

    const closeMobileMenu = () => {
        setIsMenuOpen(false);
        setActiveSubMenu(null);
    };

    const toggleSubMenu = (menuName, event) => {
        event.preventDefault();
        event.stopPropagation();

        setActiveSubMenu((current) =>
            current === menuName ? null : menuName
        );
    };

    const getAvatarUrl = (avatar) => {
        if (!avatar) {
            return null;
        }

        if (avatar.startsWith('http')) {
            return avatar;
        }

        return `https://api.quangdungcinema.id.vn/uploads/avatars/${avatar}`;
    };

    // ========================================================
    // USER INFO
    // ========================================================

    const isValidUser = Boolean(
        user &&
        Number(user.email_verified) === 1
    );

    const avatarSource = user?.user_avatar || user?.avatar;

    const avatarUrl = getAvatarUrl(avatarSource);

    const displayName = user?.username || user?.full_name || 'Tài khoản';

    // ========================================================
    // LOGIN / REGISTER
    // ========================================================

    const handleLoginClick = () => {
        setShowDropdown(false);
        navigate('/login');
    };

    const handleRegisterClick = () => {
        setShowDropdown(false);
        navigate('/register');
    };

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <nav className="user-navbar">

            <div className="nav-container">

                {/* HAMBURGER */}

                <button
                    className={`hamburger ${
                        isMenuOpen ? 'active' : ''
                    }`}
                    onClick={() =>
                        setIsMenuOpen((prev) => !prev)
                    }
                    aria-label="Toggle menu"
                >
                    <span className="bar" />
                    <span className="bar" />
                    <span className="bar" />
                </button>

                {/* LOGO */}

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

                {/* MOBILE OVERLAY */}

                <div
                    className={`menu-overlay ${
                        isMenuOpen ? 'active' : ''
                    }`}
                    onClick={closeMobileMenu}
                />

                {/* NAVIGATION */}

                <ul
                    ref={navRef}
                    className={`nav-links ${
                        isMenuOpen ? 'active' : ''
                    }`}
                >

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
                            onClick={(event) =>
                                toggleSubMenu('phim', event)
                            }
                        >
                            <span>Phim</span>

                            <ChevronDown
                                size={18}
                                className="icon-down"
                            />
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

                            <Link
                                to="/cinema"
                                onClick={closeMobileMenu}
                            >
                                Rạp
                            </Link>

                            <ChevronDown
                                size={18}
                                className="icon-down"
                                onClick={(event) =>
                                    toggleSubMenu('rap', event)
                                }
                            />

                        </div>

                        <ul className="sub-menu">

                            {cinemas.map((cinema) => (
                                <li
                                    key={cinema.cinema_id}
                                >
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
                            onClick={(event) =>
                                toggleSubMenu('goc', event)
                            }
                        >
                            <span>Góc Điện Ảnh</span>

                            <ChevronDown
                                size={18}
                                className="icon-down"
                            />
                        </div>

                        <ul className="sub-menu">

                            <li>
                                <Link
                                    to="/actors"
                                    onClick={closeMobileMenu}
                                >
                                    Diễn Viên
                                </Link>
                            </li>

                            <li>
                                <Link
                                    to="/news"
                                    onClick={closeMobileMenu}
                                >
                                    Tin Tức
                                </Link>
                            </li>

                        </ul>
                    </li>

                    <li>
                        <Link
                            to="/promotion"
                            onClick={closeMobileMenu}
                            className="menu-link"
                        >
                            Khuyến mãi
                        </Link>
                    </li>

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

                {/* USER MENU */}

                <div
                    className="user-menu"
                    ref={dropdownRef}
                >

                    <div
                        className="account-trigger"
                        onClick={() =>
                            setShowDropdown((prev) => !prev)
                        }
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
                            <UserCircle
                                size={22}
                                className="user-icon"
                            />
                        )}

                        <span className="username-display">

                            {authLoading
                                ? 'Đang tải...'
                                : isValidUser
                                    ? displayName
                                    : 'Tài khoản'}

                        </span>

                        <ChevronDown
                            size={14}
                            className={showDropdown ? 'rotate' : ''}
                        />

                    </div>

                    {showDropdown && (

                        <div className="dropdown-content show">

                            {isValidUser ? (

                                <>

                                    <div className="dropdown-user-info">

                                        <p>
                                            Chào,{' '}
                                            <strong>{displayName}</strong>
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
                                        className="dropdown-item logout-btn"
                                        onClick={handleLogout}
                                    >

                                        <LogOut size={18} />

                                        <span>

                                            {isLoggingOut
                                                ? 'Đang đăng xuất...'
                                                : 'Đăng xuất'}

                                        </span>

                                    </div>

                                </>

                            ) : (

                                <>

                                    <div className="dropdown-user-info">

                                        <p
                                            style={{
                                                color: '#f87171'
                                            }}
                                        >

                                            {user &&
                                            !Number(user.email_verified)
                                                ? '⚠️ Vui lòng xác thực email'
                                                : 'Chưa đăng nhập'}

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