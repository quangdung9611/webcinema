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


    /* =====================================================
        STATES
    ===================================================== */

    const [user, setUser] = useState(null);

    const [showDropdown, setShowDropdown] =
        useState(false);

    const [cinemas, setCinemas] =
        useState([]);

    const [isMenuOpen, setIsMenuOpen] =
        useState(false);

    const [activeSubMenu, setActiveSubMenu] =
        useState(null);

    const [authLoading, setAuthLoading] =
        useState(true);


    /* =====================================================
        REFS
    ===================================================== */

    const dropdownRef = useRef(null);

    const navRef = useRef(null);


    /* =====================================================
        CHECK USER LOGIN
        Không dùng AuthContext nữa
    ===================================================== */

    const checkUserAuth = useCallback(async () => {

        try {

            const response = await api.get(
                '/api/auth/me'
            );

            const account =
                response.data?.user || null;

            setUser(account);

        }

        catch (error) {

            /*
             * 401 ở đây có thể xảy ra khi
             * người dùng chưa đăng nhập.
             *
             * api.js đã có interceptor xử lý 401.
             *
             * Không redirect ở đây vì Header
             * được sử dụng cho cả user chưa login.
             */

            if (error.response?.status === 401) {

                setUser(null);

            }

            else {

                console.error(
                    'Lỗi kiểm tra đăng nhập:',
                    error
                );

                setUser(null);

            }

        }

        finally {

            setAuthLoading(false);

        }

    }, []);


    /* =====================================================
        GET USER
    ===================================================== */

    useEffect(() => {

        checkUserAuth();

    }, [checkUserAuth]);


    /* =====================================================
        CLICK OUTSIDE
    ===================================================== */

    useEffect(() => {

        const handleClickOutside = (event) => {

            if (
                navRef.current &&
                navRef.current.contains(event.target)
            ) {

                return;

            }


            if (
                dropdownRef.current &&
                dropdownRef.current.contains(event.target)
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


    /* =====================================================
        RESIZE
    ===================================================== */

    useEffect(() => {

        const handleResize = () => {

            if (window.innerWidth > 768) {

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


    /* =====================================================
        FETCH CINEMAS
    ===================================================== */

    const fetchCinemas = async () => {

        try {

            const response =
                await api.get('/api/cinemas');


            setCinemas(
                response.data || []
            );

        }

        catch (error) {

            console.error(
                'Lỗi lấy dữ liệu rạp:',
                error
            );

        }

    };


    useEffect(() => {

        fetchCinemas();

    }, []);


    /* =====================================================
        LOGOUT
    ===================================================== */

    const handleLogout = async () => {

        try {

            await api.post(
                '/api/auth/logout'
            );

        }

        catch (error) {

            console.error(
                'Lỗi khi logout:',
                error
            );

        }

        finally {

            /*
             * Không còn clearAuth()
             * Không còn authChange event
             */

            setUser(null);

            setShowDropdown(false);

            navigate('/');

        }

    };


    /* =====================================================
        CLOSE MOBILE MENU
    ===================================================== */

    const closeMobileMenu = () => {

        setIsMenuOpen(false);

        setActiveSubMenu(null);

    };


    /* =====================================================
        TOGGLE SUB MENU
    ===================================================== */

    const toggleSubMenu = (
        menuName,
        event
    ) => {

        event.preventDefault();

        event.stopPropagation();


        setActiveSubMenu(
            activeSubMenu === menuName
                ? null
                : menuName
        );

    };


    /* =====================================================
        AVATAR URL
    ===================================================== */

    const getAvatarUrl = (avatar) => {

        if (!avatar) {

            return null;

        }


        if (avatar.startsWith('http')) {

            return avatar;

        }


        return (
            `https://api.quangdungcinema.id.vn/` +
            `uploads/avatars/${avatar}`
        );

    };


    const avatarSource =
        user?.user_avatar ||
        user?.avatar;


    const avatarUrl =
        avatarSource
            ? getAvatarUrl(avatarSource)
            : null;


    /* =====================================================
        USER DISPLAY NAME
    ===================================================== */

    const displayName =
        user?.username ||
        user?.full_name ||
        'Tài khoản';


    /* =====================================================
        RENDER
    ===================================================== */

    return (

        <nav className="user-navbar">

            <div className="nav-container">


                {/* =================================================
                    MOBILE HAMBURGER
                ================================================= */}

                <button
                    className={
                        `hamburger ${
                            isMenuOpen
                                ? 'active'
                                : ''
                        }`
                    }
                    onClick={() =>
                        setIsMenuOpen(
                            prev => !prev
                        )
                    }
                    aria-label="Toggle menu"
                >

                    <span className="bar"></span>

                    <span className="bar"></span>

                    <span className="bar"></span>

                </button>


                {/* =================================================
                    LOGO
                ================================================= */}

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


                {/* =================================================
                    MOBILE OVERLAY
                ================================================= */}

                <div
                    className={
                        `menu-overlay ${
                            isMenuOpen
                                ? 'active'
                                : ''
                        }`
                    }
                    onClick={closeMobileMenu}
                />


                {/* =================================================
                    NAVIGATION
                ================================================= */}

                <ul
                    ref={navRef}
                    className={
                        `nav-links ${
                            isMenuOpen
                                ? 'active'
                                : ''
                        }`
                    }
                >

                    {/* =================================================
                        HOME
                    ================================================= */}

                    <li>

                        <Link
                            to="/"
                            onClick={closeMobileMenu}
                            className="menu-link"
                        >
                            Trang chủ
                        </Link>

                    </li>


                    {/* =================================================
                        PHIM
                    ================================================= */}

                    <li
                        className={
                            `has-dropdown ${
                                activeSubMenu === 'phim'
                                    ? 'mobile-active'
                                    : ''
                            }`
                        }
                    >

                        <div
                            className="menu-link mobile-parent"
                            onClick={(e) =>
                                toggleSubMenu(
                                    'phim',
                                    e
                                )
                            }
                        >

                            <span>
                                Phim
                            </span>

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


                    {/* =================================================
                        RẠP
                    ================================================= */}

                    <li
                        className={
                            `has-dropdown ${
                                activeSubMenu === 'rap'
                                    ? 'mobile-active'
                                    : ''
                            }`
                        }
                    >

                        <div
                            className="menu-link mobile-parent"
                            onClick={(e) =>
                                toggleSubMenu(
                                    'rap',
                                    e
                                )
                            }
                        >

                            <span>
                                Rạp
                            </span>

                            <ChevronDown
                                size={18}
                                className="icon-down"
                            />

                        </div>


                        <ul className="sub-menu">

                            {cinemas.map(
                                (cinema) => (

                                    <li
                                        key={
                                            cinema.cinema_id
                                        }
                                    >

                                        <Link
                                            to={
                                                `/cinema/${cinema.slug}`
                                            }
                                            onClick={
                                                closeMobileMenu
                                            }
                                        >

                                            {
                                                cinema.cinema_name
                                            }

                                        </Link>

                                    </li>

                                )
                            )}

                        </ul>

                    </li>


                    {/* =================================================
                        GÓC ĐIỆN ẢNH
                    ================================================= */}

                    <li
                        className={
                            `has-dropdown ${
                                activeSubMenu === 'goc'
                                    ? 'mobile-active'
                                    : ''
                            }`
                        }
                    >

                        <div
                            className="menu-link mobile-parent"
                            onClick={(e) =>
                                toggleSubMenu(
                                    'goc',
                                    e
                                )
                            }
                        >

                            <span>
                                Góc Điện Ảnh
                            </span>

                            <ChevronDown
                                size={18}
                                className="icon-down"
                            />

                        </div>


                        <ul className="sub-menu">

                            <li>

                                <Link
                                    to="/cinema-genre"
                                    onClick={
                                        closeMobileMenu
                                    }
                                >
                                    Thể Loại Phim
                                </Link>

                            </li>


                            <li>

                                <Link
                                    to="/actors"
                                    onClick={
                                        closeMobileMenu
                                    }
                                >
                                    Diễn Viên
                                </Link>

                            </li>


                            <li>

                                <Link
                                    to="/film-review"
                                    onClick={
                                        closeMobileMenu
                                    }
                                >
                                    Bình Luận Phim
                                </Link>

                            </li>

                        </ul>

                    </li>


                    {/* =================================================
                        PROMOTION
                    ================================================= */}

                    <li>

                        <Link
                            to="/promotion"
                            onClick={closeMobileMenu}
                            className="menu-link"
                        >
                            Khuyến mãi
                        </Link>

                    </li>


                    {/* =================================================
                        BLOG
                    ================================================= */}

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


                {/* =================================================
                    USER MENU
                ================================================= */}

                <div
                    className="user-menu"
                    ref={dropdownRef}
                >

                    <div
                        className="account-trigger"
                        onClick={() =>
                            setShowDropdown(
                                prev => !prev
                            )
                        }
                    >

                        {/* AVATAR */}

                        {avatarUrl ? (

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


                        {/* USERNAME */}

                        <span className="username-display">

                            {authLoading
                                ? 'Đang tải...'
                                : displayName
                            }

                        </span>


                        <ChevronDown
                            size={14}
                            className={
                                showDropdown
                                    ? 'rotate'
                                    : ''
                            }
                        />

                    </div>


                    {/* =================================================
                        DROPDOWN
                    ================================================= */}

                    {showDropdown && (

                        <div
                            className="dropdown-content show"
                        >

                            {user ? (

                                <>

                                    {/* USER INFO */}

                                    <div
                                        className="dropdown-user-info"
                                    >

                                        <p>

                                            Chào,{' '}

                                            <strong>
                                                {displayName}
                                            </strong>

                                        </p>


                                        {user.role === 'admin' && (

                                            <span className="admin-badge">
                                                Quản trị viên
                                            </span>

                                        )}

                                    </div>


                                    <div className="dropdown-divider" />


                                    {/* ADMIN */}

                                    {user.role === 'admin' && (

                                        <div
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
                                                size={18}
                                            />

                                            <span>
                                                Trang Quản Trị
                                            </span>

                                        </div>

                                    )}


                                    {/* PROFILE */}

                                    <div
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
                                            size={18}
                                        />

                                        <span>
                                            Hồ sơ
                                        </span>

                                    </div>


                                    {/* LOGOUT */}

                                    <div
                                        className={
                                            `dropdown-item logout-btn`
                                        }
                                        onClick={
                                            handleLogout
                                        }
                                    >

                                        <LogOut
                                            size={18}
                                        />

                                        <span>
                                            Đăng xuất
                                        </span>

                                    </div>

                                </>

                            ) : (

                                <>

                                    {/* LOGIN */}

                                    <div
                                        className="dropdown-item"
                                        onClick={() => {

                                            navigate(
                                                '/login'
                                            );

                                            setShowDropdown(
                                                false
                                            );

                                        }}
                                    >

                                        <LogIn
                                            size={18}
                                        />

                                        <span>
                                            Đăng nhập
                                        </span>

                                    </div>


                                    {/* REGISTER */}

                                    <div
                                        className="dropdown-item"
                                        onClick={() => {

                                            navigate(
                                                '/register'
                                            );

                                            setShowDropdown(
                                                false
                                            );

                                        }}
                                    >

                                        <UserPlus
                                            size={18}
                                        />

                                        <span>
                                            Đăng Ký
                                        </span>

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