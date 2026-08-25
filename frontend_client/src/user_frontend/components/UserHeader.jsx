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
    LayoutDashboard
} from 'lucide-react';

import '../styles/Header.css';

const UserHeader = () => {
    const navigate = useNavigate();

    const { user: contextUser, isLoading: authLoading, refetch } = useAuth();

    const [user, setUser] = useState(contextUser);
    const [showDropdown, setShowDropdown] = useState(false);
    const [cinemas, setCinemas] = useState([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeSubMenu, setActiveSubMenu] = useState(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const [toast, setToast] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    const dropdownRef = useRef(null);
    const navRef = useRef(null);
    const toastTimeoutRef = useRef(null);
    const redirectTimeoutRef = useRef(null);

    useEffect(() => {
        setUser(contextUser);
    }, [contextUser]);

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

    useEffect(() => {
        const handleAuthCleanedUp = (event) => {
            console.log('🧹 [HEADER] Auth cleaned:', event?.detail);

            setUser(null);
            setShowDropdown(false);

            try {
                socketService.disconnect();
            } catch (error) {
                console.warn('Socket disconnect error:', error);
            }
        };

        const handleUserLoggedIn = (event) => {
            console.log('🟢 [HEADER] User logged in - updating immediately');
            refetch().catch(() => {});
        };

        const handleSessionExpired = (event) => {
            console.warn('🔴 [HEADER] Session expired:', event?.detail);

            setUser(null);
            setShowDropdown(false);

            try {
                socketService.disconnect();
            } catch (error) {
                console.warn('Socket disconnect error:', error);
            }

            setIsMenuOpen(false);
            setActiveSubMenu(null);

            showToast(
                event?.detail?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                'warning'
            );
        };

        window.addEventListener('authCleanedUp', handleAuthCleanedUp);
        window.addEventListener('userLoggedIn', handleUserLoggedIn);
        window.addEventListener('sessionExpired', handleSessionExpired);

        return () => {
            window.removeEventListener('authCleanedUp', handleAuthCleanedUp);
            window.removeEventListener('userLoggedIn', handleUserLoggedIn);
            window.removeEventListener('sessionExpired', handleSessionExpired);
        };
    }, [refetch, showToast]);

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

            showToast('Đăng xuất thành công! Hẹn gặp lại bạn 👋', 'success');

            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
                redirectTimeoutRef.current = null;
            }

            redirectTimeoutRef.current = setTimeout(() => {
                navigate('/login', {
                    replace: true,
                    state: {
                        loggedOut: true,
                        message: 'Đăng xuất thành công!'
                    }
                });
                setIsLoggingOut(false);
                redirectTimeoutRef.current = null;
            }, 1500);

        } catch (error) {
            console.error('🔴 [HEADER] Logout error:', error);

            showToast('Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.', 'error');

            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
                redirectTimeoutRef.current = null;
            }

            redirectTimeoutRef.current = setTimeout(() => {
                setUser(null);
                navigate('/login', {
                    replace: true
                });
                setIsLoggingOut(false);
                redirectTimeoutRef.current = null;
            }, 2000);
        }
    };

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

    const isValidUser = Boolean(
        user &&
        Number(user.email_verified) === 1
    );

    const avatarSource = user?.user_avatar || user?.avatar;

    const avatarUrl = getAvatarUrl(avatarSource);

    const displayName = user?.username || user?.full_name || 'Tài khoản';

    const handleLoginClick = () => {
        setShowDropdown(false);
        navigate('/login');
    };

    const handleRegisterClick = () => {
        setShowDropdown(false);
        navigate('/register');
    };

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

            <nav className="user-navbar">

                <div className="nav-container">

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

                    <div
                        className={`menu-overlay ${
                            isMenuOpen ? 'active' : ''
                        }`}
                        onClick={closeMobileMenu}
                    />

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
                                            className={`dropdown-item logout-btn ${isLoggingOut ? 'loading' : ''}`}
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
        </>
    );
};

export default UserHeader;