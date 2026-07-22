import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
    ChevronDown,
    UserCircle,
    IdCard,
    LogOut,
    LogIn,
    UserPlus,
    LayoutDashboard,
} from 'lucide-react';
import '../styles/Header.css';

const UserHeader = () => {
    const navigate = useNavigate();
    const { user, clearAuth } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);
    const [cinemas, setCinemas] = useState([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeSubMenu, setActiveSubMenu] = useState(null);
    const dropdownRef = useRef(null);
    const navRef = useRef(null);

    // Đóng dropdown/submenu khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (navRef.current && navRef.current.contains(event.target)) return;
            if (dropdownRef.current && dropdownRef.current.contains(event.target)) return;
            setActiveSubMenu(null);
            setShowDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setIsMenuOpen(false);
                setActiveSubMenu(null);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchCinemas = async () => {
        try {
            const res = await axios.get('https://api.quangdungcinema.id.vn/api/cinemas', {
                withCredentials: true,
            });
            setCinemas(res.data);
        } catch (err) {
            console.error('Lỗi lấy dữ liệu rạp:', err);
        }
    };

    useEffect(() => {
        fetchCinemas();
    }, []);

    const handleLogout = async () => {
        try {
            await axios.post(
                'https://api.quangdungcinema.id.vn/api/auth/logout',
                {},
                { withCredentials: true }
            );
        } catch (err) {
            console.error('Lỗi khi logout:', err);
        } finally {
            clearAuth();
            setShowDropdown(false);
            window.dispatchEvent(new Event('authChange'));
            navigate('/');
        }
    };

    const closeMobileMenu = () => {
        setIsMenuOpen(false);
        setActiveSubMenu(null);
    };

    const toggleSubMenu = (menuName, e) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveSubMenu(activeSubMenu === menuName ? null : menuName);
    };

    // Xây dựng URL avatar nếu có
    const avatarUrl = user?.avatar
        ? `https://api.quangdungcinema.id.vn/uploads/avatars/${user.avatar}`
        : null;

    return (
        <nav className="user-navbar">
            <div className="nav-container">
                <button
                    className={`hamburger ${isMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
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
                    className={`menu-overlay ${isMenuOpen ? 'active' : ''}`}
                    onClick={closeMobileMenu}
                />

                <ul ref={navRef} className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                    <li>
                        <Link to="/" onClick={closeMobileMenu} className="menu-link">
                            Trang chủ
                        </Link>
                    </li>

                    <li className={`has-dropdown ${activeSubMenu === 'phim' ? 'mobile-active' : ''}`}>
                        <div className="menu-link mobile-parent" onClick={(e) => toggleSubMenu('phim', e)}>
                            <span>Phim</span>
                            <ChevronDown size={18} className="icon-down" />
                        </div>
                        <ul className="sub-menu">
                            <li>
                                <Link to="/movies/status/phim-dang-chieu" onClick={closeMobileMenu}>
                                    Phim đang chiếu
                                </Link>
                            </li>
                            <li>
                                <Link to="/movies/status/phim-sap-chieu" onClick={closeMobileMenu}>
                                    Phim sắp chiếu
                                </Link>
                            </li>
                        </ul>
                    </li>

                    <li className={`has-dropdown ${activeSubMenu === 'rap' ? 'mobile-active' : ''}`}>
                        <div className="menu-link mobile-parent" onClick={(e) => toggleSubMenu('rap', e)}>
                            <span>Rạp</span>
                            <ChevronDown size={18} className="icon-down" />
                        </div>
                        <ul className="sub-menu">
                            {cinemas.map((cinema) => (
                                <li key={cinema.cinema_id}>
                                    <Link to={`/cinema/${cinema.slug}`} onClick={closeMobileMenu}>
                                        {cinema.cinema_name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </li>

                    <li className={`has-dropdown ${activeSubMenu === 'goc' ? 'mobile-active' : ''}`}>
                        <div className="menu-link mobile-parent" onClick={(e) => toggleSubMenu('goc', e)}>
                            <span>Góc Điện Ảnh</span>
                            <ChevronDown size={18} className="icon-down" />
                        </div>
                        <ul className="sub-menu">
                            <li>
                                <Link to="/cinema-genre" onClick={closeMobileMenu}>
                                    Thể Loại Phim
                                </Link>
                            </li>
                            <li>
                                <Link to="/actors" onClick={closeMobileMenu}>
                                    Diễn Viên
                                </Link>
                            </li>
                            <li>
                                <Link to="/film-review" onClick={closeMobileMenu}>
                                    Bình Luận Phim
                                </Link>
                            </li>
                        </ul>
                    </li>

                    <li>
                        <Link to="/promotion" onClick={closeMobileMenu} className="menu-link">
                            Khuyến mãi
                        </Link>
                    </li>

                    <li>
                        <Link to="/blog-cinema" onClick={closeMobileMenu} className="menu-link">
                            Blog Điện Ảnh
                        </Link>
                    </li>
                </ul>

                <div className="user-menu" ref={dropdownRef}>
                    <div
                        className="account-trigger"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        {/* 👇 Thay đổi ở đây: hiển thị avatar nếu có, ngược lại vẫn icon */}
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
                                    marginRight: '8px',
                                }}
                            />
                        ) : (
                            <UserCircle size={22} className="user-icon" />
                        )}
                        <span className="username-display">
                            {user ? user.username || user.full_name : 'Tài khoản'}
                        </span>
                        <ChevronDown
                            size={14}
                            className={showDropdown ? 'rotate' : ''}
                        />
                    </div>

                    {showDropdown && (
                        <div className="dropdown-content show">
                            {user ? (
                                <>
                                    <div className="dropdown-user-info">
                                        <p>
                                            Chào, <strong>{user.username || user.full_name}</strong>
                                        </p>
                                        {user.role === 'admin' && (
                                            <span className="admin-badge">Quản trị viên</span>
                                        )}
                                    </div>
                                    <div className="dropdown-divider"></div>

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
                                    <div className="dropdown-item logout-btn" onClick={handleLogout}>
                                        <LogOut size={18} />
                                        <span>Đăng xuất</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div
                                        className="dropdown-item"
                                        onClick={() => {
                                            navigate('/login');
                                            setShowDropdown(false);
                                        }}
                                    >
                                        <LogIn size={18} />
                                        <span>Đăng nhập</span>
                                    </div>
                                    <div
                                        className="dropdown-item"
                                        onClick={() => {
                                            navigate('/register');
                                            setShowDropdown(false);
                                        }}
                                    >
                                        <UserPlus size={18} />
                                        <span>Đăng Ký</span>
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