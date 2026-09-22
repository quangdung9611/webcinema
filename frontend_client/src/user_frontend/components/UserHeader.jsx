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

import { logout } from '../../utils/authCleanup';
import { useAuth } from '../../context/AuthContext';

import {
    ChevronDown,
    UserCircle,
    IdCard,
    LogOut,
    LogIn,
    UserPlus,
    LayoutDashboard,
    Home,
    Film,
    MapPin,
    Clapperboard,
    Gift,
    Newspaper,
    Menu,
    X
} from 'lucide-react';

import '../styles/Header.css';

// ============================================================
// USER HEADER
// ============================================================
// PC
// - Hover dropdown bằng CSS
// - Hover "Rạp" sẽ trigger API cinemas
//
// MOBILE / TABLET
// - Click menu cha để mở dropdown
// - Click "Rạp" sẽ trigger API cinemas
//
// CINEMAS
// - Không gọi API khi Header mount
// - Chỉ gọi khi user mở / hover "Rạp"
// - Sau khi load thành công giữ dữ liệu trong state
// - Chặn request trùng bằng ref
// - Có retry nếu API lỗi
// ============================================================

const UserHeader = () => {
    const navigate = useNavigate();

    const {
        user: contextUser,
        isLoading: authLoading,
        refetch
    } = useAuth();

    // ========================================================
    // USER
    // ========================================================

    const [user, setUser] = useState(contextUser);

    // ========================================================
    // UI
    // ========================================================

    const [showDropdown, setShowDropdown] = useState(false);

    const [isMenuOpen, setIsMenuOpen] =
        useState(false);

    const [activeSubMenu, setActiveSubMenu] =
        useState(null);

    const [isLoggingOut, setIsLoggingOut] =
        useState(false);

    // ========================================================
    // CINEMAS
    // ========================================================

    const [cinemas, setCinemas] =
        useState([]);

    const [cinemasLoaded, setCinemasLoaded] =
        useState(false);

    const [isLoadingCinemas, setIsLoadingCinemas] =
        useState(false);

    const [cinemasError, setCinemasError] =
        useState(false);

    // ========================================================
    // TOAST
    // ========================================================

    const [toast, setToast] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    // ========================================================
    // REFS
    // ========================================================

    const dropdownRef =
        useRef(null);

    const navRef =
        useRef(null);

    const toastTimeoutRef =
        useRef(null);

    const redirectTimeoutRef =
        useRef(null);

    // --------------------------------------------------------
    // Request lock
    // --------------------------------------------------------

    const cinemasRequestRef =
        useRef(false);

    // ========================================================
    // SYNC USER
    // ========================================================

    useEffect(() => {
        setUser(contextUser);
    }, [contextUser]);

    // ========================================================
    // TOAST
    // ========================================================

    const showToast = useCallback(
        (message, type = 'success') => {
            if (
                toastTimeoutRef.current
            ) {
                clearTimeout(
                    toastTimeoutRef.current
                );

                toastTimeoutRef.current =
                    null;
            }

            setToast({
                show: true,
                message,
                type
            });

            toastTimeoutRef.current =
                setTimeout(() => {
                    setToast({
                        show: false,
                        message: '',
                        type: 'success'
                    });

                    toastTimeoutRef.current =
                        null;
                }, 4000);
        },
        []
    );

    // ========================================================
    // AUTH EVENTS
    // ========================================================

    useEffect(() => {
        const handleAuthCleanedUp =
            () => {
                setUser(null);
                setShowDropdown(false);

                try {
                    socketService.disconnect();
                } catch (error) {
                    // Silent
                }
            };

        const handleUserLoggedIn =
            () => {
                refetch().catch(() => {});
            };

        const handleSessionExpired =
            () => {
                setUser(null);
                setShowDropdown(false);

                setIsMenuOpen(false);
                setActiveSubMenu(null);

                try {
                    socketService.disconnect();
                } catch (error) {
                    // Silent
                }
            };

        window.addEventListener(
            'authCleanedUp',
            handleAuthCleanedUp
        );

        window.addEventListener(
            'userLoggedIn',
            handleUserLoggedIn
        );

        window.addEventListener(
            'sessionExpired',
            handleSessionExpired
        );

        return () => {
            window.removeEventListener(
                'authCleanedUp',
                handleAuthCleanedUp
            );

            window.removeEventListener(
                'userLoggedIn',
                handleUserLoggedIn
            );

            window.removeEventListener(
                'sessionExpired',
                handleSessionExpired
            );
        };
    }, [refetch]);

    // ========================================================
    // FETCH CINEMAS
    // ========================================================
    // Không gọi khi Header mount.
    //
    // force = false
    // -> nếu đã load thành công thì không gọi lại.
    //
    // force = true
    // -> dùng cho nút "Thử lại".
    // ========================================================

    const fetchCinemas = useCallback(
        async (force = false) => {
            // ------------------------------------------------
            // Đã load thành công
            // ------------------------------------------------

            if (
                cinemasLoaded &&
                !force
            ) {
                return;
            }

            // ------------------------------------------------
            // Đang request
            // ------------------------------------------------

            if (
                cinemasRequestRef.current
            ) {
                return;
            }

            cinemasRequestRef.current =
                true;

            setIsLoadingCinemas(true);
            setCinemasError(false);

            try {
                const response =
                    await api.get(
                        '/api/cinemas'
                    );

                console.log(
                    '📦 [HEADER] Cinemas response:',
                    response?.data
                );

                const responseData =
                    response?.data;

                let list = [];

                // ==================================================
                // FORMAT 1
                //
                // {
                //   success: true,
                //   data: [...]
                // }
                // ==================================================

                if (
                    Array.isArray(
                        responseData?.data
                    )
                ) {
                    list =
                        responseData.data;
                }

                // ==================================================
                // FORMAT 2
                //
                // {
                //   success: true,
                //   data: {
                //      data: [...]
                //   }
                // }
                // ==================================================

                else if (
                    Array.isArray(
                        responseData
                            ?.data
                            ?.data
                    )
                ) {
                    list =
                        responseData
                            .data
                            .data;
                }

                // ==================================================
                // FORMAT 3
                //
                // {
                //   success: true,
                //   data: {
                //      cinemas: [...]
                //   }
                // }
                // ==================================================

                else if (
                    Array.isArray(
                        responseData
                            ?.data
                            ?.cinemas
                    )
                ) {
                    list =
                        responseData
                            .data
                            .cinemas;
                }

                // ==================================================
                // FORMAT 4
                //
                // [...]
                // ==================================================

                else if (
                    Array.isArray(
                        responseData
                    )
                ) {
                    list =
                        responseData;
                }

                console.log(
                    '🎬 [HEADER] Parsed cinemas:',
                    list
                );

                // ------------------------------------------------
                // Lưu danh sách
                // ------------------------------------------------

                setCinemas(list);

                // ------------------------------------------------
                // API chạy thành công
                // dù list rỗng
                // ------------------------------------------------

                setCinemasLoaded(true);
                setCinemasError(false);

            } catch (error) {
                console.error(
                    '🔴 [HEADER] Cannot fetch cinemas:',
                    error
                );

                console.error(
                    '🔴 [HEADER] Status:',
                    error?.response?.status
                );

                console.error(
                    '🔴 [HEADER] Data:',
                    error?.response?.data
                );

                setCinemas([]);
                setCinemasLoaded(false);
                setCinemasError(true);

            } finally {
                cinemasRequestRef.current =
                    false;

                setIsLoadingCinemas(false);
            }
        },
        [cinemasLoaded]
    );

    // ========================================================
    // LOGOUT
    // ========================================================

    const handleLogout =
        async () => {
            if (isLoggingOut) {
                return;
            }

            setIsLoggingOut(true);

            try {
                await logout();

                setUser(null);
                setShowDropdown(false);

                showToast(
                    'Đăng xuất thành công! Hẹn gặp lại bạn 👋',
                    'success'
                );

                if (
                    redirectTimeoutRef.current
                ) {
                    clearTimeout(
                        redirectTimeoutRef.current
                    );

                    redirectTimeoutRef.current =
                        null;
                }

                redirectTimeoutRef.current =
                    setTimeout(() => {
                        navigate(
                            '/login',
                            {
                                replace: true,
                                state: {
                                    loggedOut: true,
                                    message:
                                        'Đăng xuất thành công!'
                                }
                            }
                        );

                        setIsLoggingOut(false);

                        redirectTimeoutRef.current =
                            null;
                    }, 1500);

            } catch (error) {
                console.error(
                    '🔴 [HEADER] Logout error:',
                    error
                );

                showToast(
                    'Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.',
                    'error'
                );

                if (
                    redirectTimeoutRef.current
                ) {
                    clearTimeout(
                        redirectTimeoutRef.current
                    );

                    redirectTimeoutRef.current =
                        null;
                }

                redirectTimeoutRef.current =
                    setTimeout(() => {
                        setUser(null);

                        navigate(
                            '/login',
                            {
                                replace: true
                            }
                        );

                        setIsLoggingOut(false);

                        redirectTimeoutRef.current =
                            null;
                    }, 2000);
            }
        };

    // ========================================================
    // CLEANUP TIMER
    // ========================================================

    useEffect(() => {
        return () => {
            if (
                toastTimeoutRef.current
            ) {
                clearTimeout(
                    toastTimeoutRef.current
                );
            }

            if (
                redirectTimeoutRef.current
            ) {
                clearTimeout(
                    redirectTimeoutRef.current
                );
            }
        };
    }, []);

    // ========================================================
    // CLICK OUTSIDE
    // ========================================================

    useEffect(() => {
        const handleClickOutside =
            (event) => {
                // Nav đang chứa click
                if (
                    navRef.current &&
                    navRef.current.contains(
                        event.target
                    )
                ) {
                    return;
                }

                // Account đang chứa click
                if (
                    dropdownRef.current &&
                    dropdownRef.current.contains(
                        event.target
                    )
                ) {
                    return;
                }

                setActiveSubMenu(null);
                setShowDropdown(false);
            };

        document.addEventListener(
            'mousedown',
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                'mousedown',
                handleClickOutside
            );
        };
    }, []);

    // ========================================================
    // RESIZE
    // ========================================================

    useEffect(() => {
        const handleResize =
            () => {
                if (
                    window.innerWidth >
                    1200
                ) {
                    setIsMenuOpen(false);
                    setActiveSubMenu(null);
                }
            };

        window.addEventListener(
            'resize',
            handleResize
        );

        return () => {
            window.removeEventListener(
                'resize',
                handleResize
            );
        };
    }, []);

    // ========================================================
    // CLOSE MOBILE MENU
    // ========================================================

    const closeMobileMenu =
        () => {
            setIsMenuOpen(false);
            setActiveSubMenu(null);
        };

    // ========================================================
    // TOGGLE SUB MENU
    // ========================================================
    // Dùng cho mobile/tablet.
    //
    // Desktop vẫn dùng :hover bằng CSS.
    // ========================================================

    const toggleSubMenu = (
        menuName,
        event
    ) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const isOpening =
            activeSubMenu !==
            menuName;

        setActiveSubMenu(
            isOpening
                ? menuName
                : null
        );

        // ------------------------------------------------
        // Chỉ fetch khi mở Rạp
        // ------------------------------------------------

        if (
            menuName === 'rap' &&
            isOpening
        ) {
            fetchCinemas();
        }
    };

    // ========================================================
    // DESKTOP HOVER RẠP
    // ========================================================

    const handleRapHover =
        useCallback(() => {
            if (
                window.innerWidth >
                1200
            ) {
                fetchCinemas();
            }
        }, [fetchCinemas]);

    // ========================================================
    // AVATAR URL
    // ========================================================

    const getAvatarUrl =
        (avatar) => {
            if (!avatar) {
                return null;
            }

            if (
                avatar.startsWith(
                    'http'
                )
            ) {
                return avatar;
            }

            return `https://api.quangdungcinema.id.vn/uploads/avatars/${avatar}`;
        };

    // ========================================================
    // USER INFO
    // ========================================================

    const isValidUser =
        Boolean(
            user &&
            Number(
                user.email_verified
            ) === 1
        );

    const avatarSource =
        user?.user_avatar ||
        user?.avatar;

    const avatarUrl =
        getAvatarUrl(
            avatarSource
        );

    const displayName =
        user?.username ||
        user?.full_name ||
        'Tài khoản';

    // ========================================================
    // LOGIN
    // ========================================================

    const handleLoginClick =
        () => {
            setShowDropdown(false);
            closeMobileMenu();
            navigate('/login');
        };

    // ========================================================
    // REGISTER
    // ========================================================

    const handleRegisterClick =
        () => {
            setShowDropdown(false);
            closeMobileMenu();
            navigate('/register');
        };

    // ========================================================
    // MOBILE MENU TOGGLE
    // ========================================================

    const handleMobileToggle =
        () => {
            setIsMenuOpen(
                (prev) => {
                    const next =
                        !prev;

                    if (!next) {
                        setActiveSubMenu(
                            null
                        );
                    }

                    return next;
                }
            );
        };

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <>
            {/* ==================================================
                TOAST
            ================================================== */}

            {toast.show && (
                <div
                    className={`toast-notification toast-${toast.type}`}
                >
                    <div className="toast-content">

                        <span className="toast-icon">
                            {toast.type ===
                                'success' &&
                                '✓'}

                            {toast.type ===
                                'error' &&
                                '×'}

                            {toast.type ===
                                'warning' &&
                                '!'}
                        </span>

                        <span className="toast-message">
                            {toast.message}
                        </span>

                    </div>

                    <button
                        type="button"
                        className="toast-close"
                        onClick={() => {
                            setToast({
                                show: false,
                                message: '',
                                type: 'success'
                            });

                            if (
                                toastTimeoutRef.current
                            ) {
                                clearTimeout(
                                    toastTimeoutRef.current
                                );

                                toastTimeoutRef.current =
                                    null;
                            }
                        }}
                    >
                        <X size={17} />
                    </button>
                </div>
            )}

            {/* ==================================================
                NAVBAR
            ================================================== */}

            <nav className="user-navbar">

                <div className="nav-container">

                    {/* ==================================================
                        HAMBURGER
                    ================================================== */}

                    <button
                        type="button"
                        className={`hamburger ${
                            isMenuOpen
                                ? 'active'
                                : ''
                        }`}
                        onClick={
                            handleMobileToggle
                        }
                        aria-label={
                            isMenuOpen
                                ? 'Đóng menu'
                                : 'Mở menu'
                        }
                        aria-expanded={
                            isMenuOpen
                        }
                    >
                        <span className="bar" />
                        <span className="bar" />
                        <span className="bar" />
                    </button>

                    {/* ==================================================
                        LOGO
                    ================================================== */}

                    <Link
                        to="/"
                        className="header-logo"
                        onClick={
                            closeMobileMenu
                        }
                    >
                        <img
                            src="https://res.cloudinary.com/mlznpd9x/image/upload/v1790041080/logocinema1_wuqztk.png"
                            alt="QD Cinema"
                        />
                    </Link>

                    {/* ==================================================
                        MOBILE OVERLAY
                    ================================================== */}

                    <div
                        className={`menu-overlay ${
                            isMenuOpen
                                ? 'active'
                                : ''
                        }`}
                        onClick={
                            closeMobileMenu
                        }
                    />

                    {/* ==================================================
                        NAV LINKS
                    ================================================== */}

                    <ul
                        ref={navRef}
                        className={`nav-links ${
                            isMenuOpen
                                ? 'active'
                                : ''
                        }`}
                    >

                        {/* ==================================================
                            MOBILE CLOSE
                        ================================================== */}

                        <li className="mobile-menu-header">

                            <div className="mobile-menu-brand">
                                <span className="mobile-menu-kicker">
                                    QUANG DŨNG
                                </span>

                                <span className="mobile-menu-title">
                                    CINEMA
                                </span>
                            </div>

                            <button
                                type="button"
                                className="mobile-close-btn"
                                onClick={
                                    closeMobileMenu
                                }
                                aria-label="Đóng menu"
                            >
                                <X size={21} />
                            </button>

                        </li>

                        {/* ==================================================
                            TRANG CHỦ
                        ================================================== */}

                        <li>
                            <Link
                                to="/"
                                onClick={
                                    closeMobileMenu
                                }
                                className="menu-link"
                            >
                                <span className="nav-item-left">
                                    <Home
                                        size={18}
                                        className="menu-icon"
                                    />

                                    <span>
                                        Trang chủ
                                    </span>
                                </span>
                            </Link>
                        </li>

                        {/* ==================================================
                            PHIM
                        ================================================== */}

                        <li
                            className={`has-dropdown ${
                                activeSubMenu ===
                                'phim'
                                    ? 'mobile-active'
                                    : ''
                            }`}
                        >

                            <button
                                type="button"
                                className="menu-link mobile-parent"
                                onClick={(event) =>
                                    toggleSubMenu(
                                        'phim',
                                        event
                                    )
                                }
                                aria-expanded={
                                    activeSubMenu ===
                                    'phim'
                                }
                            >
                                <span className="nav-item-left">

                                    <Film
                                        size={18}
                                        className="menu-icon"
                                    />

                                    <span>
                                        Phim
                                    </span>

                                </span>

                                <ChevronDown
                                    size={16}
                                    className="icon-down"
                                />
                            </button>

                            <ul className="sub-menu">

                                <li>
                                    <Link
                                        to="/movies/status/phim-dang-chieu"
                                        onClick={
                                            closeMobileMenu
                                        }
                                    >
                                        <span>
                                            Phim đang chiếu
                                        </span>

                                        <span className="submenu-arrow">
                                            →
                                        </span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        to="/movies/status/phim-sap-chieu"
                                        onClick={
                                            closeMobileMenu
                                        }
                                    >
                                        <span>
                                            Phim sắp chiếu
                                        </span>

                                        <span className="submenu-arrow">
                                            →
                                        </span>
                                    </Link>
                                </li>

                            </ul>
                        </li>

                        {/* ==================================================
                            RẠP
                        ================================================== */}

                        <li
                            className={`has-dropdown ${
                                activeSubMenu ===
                                'rap'
                                    ? 'mobile-active'
                                    : ''
                            }`}
                            onMouseEnter={
                                handleRapHover
                            }
                        >

                            <button
                                type="button"
                                className="menu-link mobile-parent"
                                onClick={(event) =>
                                    toggleSubMenu(
                                        'rap',
                                        event
                                    )
                                }
                                aria-expanded={
                                    activeSubMenu ===
                                    'rap'
                                }
                            >
                                <span className="nav-item-left">

                                    <MapPin
                                        size={18}
                                        className="menu-icon"
                                    />

                                    <span>
                                        Rạp
                                    </span>

                                </span>

                                <ChevronDown
                                    size={16}
                                    className="icon-down"
                                />
                            </button>

                            <ul className="sub-menu cinema-sub-menu">

                                {/* ==========================================
                                    LOADING
                                ========================================== */}

                                {isLoadingCinemas ? (
                                    <li className="sub-menu-state">

                                        <span className="loading-spinner" />

                                        <span>
                                            Đang tải hệ thống rạp...
                                        </span>

                                    </li>
                                ) : cinemasError ? (

                                    /* ======================================
                                        ERROR
                                    ====================================== */

                                    <li className="sub-menu-state sub-menu-error">

                                        <span>
                                            Không thể tải hệ thống rạp
                                        </span>

                                        <button
                                            type="button"
                                            className="cinema-retry-btn"
                                            onClick={(
                                                event
                                            ) => {
                                                event.preventDefault();
                                                event.stopPropagation();

                                                fetchCinemas(
                                                    true
                                                );
                                            }}
                                        >
                                            Thử lại
                                        </button>

                                    </li>
                                ) : cinemas.length >
                                  0 ? (

                                    /* ======================================
                                        CINEMA LIST
                                    ====================================== */

                                    cinemas.map(
                                        (
                                            cinema
                                        ) => (
                                            <li
                                                key={
                                                    cinema.cinema_id
                                                }
                                            >
                                                <Link
                                                    to={`/cinema/detail/${cinema.slug}`}
                                                    onClick={
                                                        closeMobileMenu
                                                    }
                                                >
                                                    <span className="cinema-link-left">

                                                        <MapPin
                                                            size={
                                                                15
                                                            }
                                                        />

                                                        <span>
                                                            {
                                                                cinema.cinema_name
                                                            }
                                                        </span>

                                                    </span>

                                                    <span className="submenu-arrow">
                                                        →
                                                    </span>
                                                </Link>
                                            </li>
                                        )
                                    )

                                ) : cinemasLoaded ? (

                                    /* ======================================
                                        EMPTY
                                    ====================================== */

                                    <li className="sub-menu-state">

                                        <span>
                                            Chưa có dữ liệu rạp
                                        </span>

                                    </li>

                                ) : null}

                            </ul>
                        </li>

                        {/* ==================================================
                            GÓC ĐIỆN ẢNH
                        ================================================== */}

                        <li
                            className={`has-dropdown ${
                                activeSubMenu ===
                                'goc'
                                    ? 'mobile-active'
                                    : ''
                            }`}
                        >

                            <button
                                type="button"
                                className="menu-link mobile-parent"
                                onClick={(event) =>
                                    toggleSubMenu(
                                        'goc',
                                        event
                                    )
                                }
                                aria-expanded={
                                    activeSubMenu ===
                                    'goc'
                                }
                            >
                                <span className="nav-item-left">

                                    <Clapperboard
                                        size={18}
                                        className="menu-icon"
                                    />

                                    <span>
                                        Góc điện ảnh
                                    </span>

                                </span>

                                <ChevronDown
                                    size={16}
                                    className="icon-down"
                                />
                            </button>

                            <ul className="sub-menu">

                                <li>
                                    <Link
                                        to="/actors"
                                        onClick={
                                            closeMobileMenu
                                        }
                                    >
                                        <span>
                                            Diễn viên
                                        </span>

                                        <span className="submenu-arrow">
                                            →
                                        </span>
                                    </Link>
                                </li>

                                <li>
                                    <Link
                                        to="/news"
                                        onClick={
                                            closeMobileMenu
                                        }
                                    >
                                        <span>
                                            Tin tức điện ảnh
                                        </span>

                                        <span className="submenu-arrow">
                                            →
                                        </span>
                                    </Link>
                                </li>

                            </ul>
                        </li>

                        {/* ==================================================
                            KHUYẾN MÃI
                        ================================================== */}

                        <li>
                            <Link
                                to="/promotion"
                                onClick={
                                    closeMobileMenu
                                }
                                className="menu-link"
                            >
                                <span className="nav-item-left">

                                    <Gift
                                        size={18}
                                        className="menu-icon"
                                    />

                                    <span>
                                        Khuyến mãi
                                    </span>

                                </span>
                            </Link>
                        </li>

                        {/* ==================================================
                            BLOG
                        ================================================== */}

                        <li>
                            <Link
                                to="/blog-cinema"
                                onClick={
                                    closeMobileMenu
                                }
                                className="menu-link"
                            >
                                <span className="nav-item-left">

                                    <Newspaper
                                        size={18}
                                        className="menu-icon"
                                    />

                                    <span>
                                        Blog điện ảnh
                                    </span>

                                </span>
                            </Link>
                        </li>

                    </ul>

                    {/* ==================================================
                        ACCOUNT
                    ================================================== */}

                    <div
                        className="user-menu"
                        ref={dropdownRef}
                    >

                        <button
                            type="button"
                            className={`account-trigger ${
                                showDropdown
                                    ? 'active'
                                    : ''
                            }`}
                            onClick={() =>
                                setShowDropdown(
                                    (prev) =>
                                        !prev
                                )
                            }
                            aria-expanded={
                                showDropdown
                            }
                        >

                            {isValidUser &&
                            avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="avatar"
                                    className="header-avatar"
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
                                className={
                                    showDropdown
                                        ? 'rotate'
                                        : ''
                                }
                            />

                        </button>

                        {/* ==================================================
                            ACCOUNT DROPDOWN
                        ================================================== */}

                        {showDropdown && (
                            <div className="dropdown-content">

                                {isValidUser ? (
                                    <>
                                        <div className="dropdown-user-info">

                                            <span className="dropdown-kicker">
                                                TÀI KHOẢN
                                            </span>

                                            <p>
                                                Chào,{' '}
                                                <strong>
                                                    {
                                                        displayName
                                                    }
                                                </strong>
                                            </p>

                                            {user.role ===
                                                'admin' && (
                                                <span className="admin-badge">
                                                    Quản trị viên
                                                </span>
                                            )}

                                        </div>

                                        <div className="dropdown-divider" />

                                        {/* ADMIN */}

                                        {user.role ===
                                            'admin' && (
                                            <button
                                                type="button"
                                                className="dropdown-item admin-link"
                                                onClick={() => {
                                                    navigate(
                                                        '/admin'
                                                    );

                                                    setShowDropdown(
                                                        false
                                                    );
                                                }}
                                            >
                                                <LayoutDashboard
                                                    size={
                                                        18
                                                    }
                                                />

                                                <span>
                                                    Trang quản trị
                                                </span>

                                                <span className="account-arrow">
                                                    →
                                                </span>
                                            </button>
                                        )}

                                        {/* PROFILE */}

                                        <button
                                            type="button"
                                            className="dropdown-item"
                                            onClick={() => {
                                                navigate(
                                                    '/profile'
                                                );

                                                setShowDropdown(
                                                    false
                                                );
                                            }}
                                        >
                                            <IdCard
                                                size={
                                                    18
                                                }
                                            />

                                            <span>
                                                Hồ sơ cá nhân
                                            </span>

                                            <span className="account-arrow">
                                                →
                                            </span>
                                        </button>

                                        <div className="dropdown-divider" />

                                        {/* LOGOUT */}

                                        <button
                                            type="button"
                                            className={`dropdown-item logout-btn ${
                                                isLoggingOut
                                                    ? 'loading'
                                                    : ''
                                            }`}
                                            onClick={
                                                handleLogout
                                            }
                                        >
                                            <LogOut
                                                size={
                                                    18
                                                }
                                            />

                                            <span>
                                                {isLoggingOut
                                                    ? 'Đang đăng xuất...'
                                                    : 'Đăng xuất'}
                                            </span>
                                        </button>

                                    </>
                                ) : (
                                    <>
                                        <div className="dropdown-user-info">

                                            <span className="dropdown-kicker">
                                                CINEMA STAR
                                            </span>

                                            <p>
                                                {user &&
                                                !Number(
                                                    user.email_verified
                                                )
                                                    ? '⚠️ Vui lòng xác thực email'
                                                    : 'Chưa đăng nhập'}
                                            </p>

                                        </div>

                                        <div className="dropdown-divider" />

                                        {/* LOGIN */}

                                        <button
                                            type="button"
                                            className="dropdown-item"
                                            onClick={
                                                handleLoginClick
                                            }
                                        >
                                            <LogIn
                                                size={
                                                    18
                                                }
                                            />

                                            <span>
                                                Đăng nhập
                                            </span>

                                            <span className="account-arrow">
                                                →
                                            </span>
                                        </button>

                                        {/* REGISTER */}

                                        <button
                                            type="button"
                                            className="dropdown-item"
                                            onClick={
                                                handleRegisterClick
                                            }
                                        >
                                            <UserPlus
                                                size={
                                                    18
                                                }
                                            />

                                            <span>
                                                Đăng ký
                                            </span>

                                            <span className="account-arrow">
                                                →
                                            </span>
                                        </button>

                                    </>
                                )}

                            </div>
                        )}

                    </div>

                </div>

            </nav>
        </>
    );
};

export default UserHeader;