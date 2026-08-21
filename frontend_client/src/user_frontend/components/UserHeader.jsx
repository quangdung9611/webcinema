import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/api';
import socketService from '../../api/socket'; // 🟢 THÊM: Import socket service
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
    const [showDropdown, setShowDropdown] = useState(false);
    const [cinemas, setCinemas] = useState([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeSubMenu, setActiveSubMenu] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    // 🟢 THÊM: State cho modal session expired
    const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
    const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');
    const [newDevice, setNewDevice] = useState('');

    /* =====================================================
        REFS
    ===================================================== */
    const dropdownRef = useRef(null);
    const navRef = useRef(null);

    /* =====================================================
        FETCH USER INFO
    ===================================================== */
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get('/api/auth/me');
                
                const rawData = res.data;
                let account = null;
                if (rawData?.user) account = rawData.user;
                else if (rawData?.data?.user) account = rawData.data.user;
                else if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) account = rawData;
                
                setUser(account);

                // 🟢 Nếu có user, kết nối WebSocket
                if (account) {
                    // Lấy token từ cookie (không cần lấy ra vì HttpOnly)
                    // Kết nối socket với user_id
                    socketService.connect(account.user_id, account.user_id);
                }
            } catch (error) {
                console.error('Lỗi kiểm tra đăng nhập:', error);
                setUser(null);

                if (error.response?.status !== 401) {
                    navigate('/login', { replace: true });
                }
            } finally {
                setAuthLoading(false);
            }
        };
        fetchUser();
    }, [navigate]);

    /* =====================================================
        🟢 LẮNG NGHE SỰ KIỆN SESSION EXPIRED
    ===================================================== */
    useEffect(() => {
        const handleSessionExpired = (event) => {
            console.log('🔴 [HEADER] Session expired:', event.detail);
            
            const detail = event.detail || {};
            const message = detail.message || 'Tài khoản đã được đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.';
            const device = detail.newDevice || '';
            
            setSessionExpiredMessage(message);
            setNewDevice(device);
            setShowSessionExpiredModal(true);
            
            // Xóa user state
            setUser(null);
        };

        // 🟢 Lắng nghe sự kiện userLoggedIn để reload user
        const handleUserLoggedIn = () => {
            console.log('🟢 [HEADER] User logged in, fetching user...');
            setAuthLoading(true);
            const fetchUser = async () => {
                try {
                    const res = await api.get('/api/auth/me');
                    const rawData = res.data;
                    let account = null;
                    if (rawData?.user) account = rawData.user;
                    else if (rawData?.data?.user) account = rawData.data.user;
                    else if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) account = rawData;
                    setUser(account);
                    
                    // 🟢 Kết nối WebSocket sau khi login
                    if (account) {
                        socketService.connect(account.user_id, account.user_id);
                    }
                } catch (error) {
                    console.error('Lỗi fetch user sau login:', error);
                    setUser(null);
                } finally {
                    setAuthLoading(false);
                }
            };
            fetchUser();
        };

        // 🟢 Lắng nghe sự kiện tokenInvalid
        const handleTokenInvalid = (event) => {
            console.log('🔴 [HEADER] Token invalid:', event.detail);
            setUser(null);
            socketService.disconnect();
        };

        // 🟢 Lắng nghe sự kiện unauthorized
        const handleUnauthorized = (event) => {
            console.log('🔴 [HEADER] Unauthorized:', event.detail);
            setUser(null);
            socketService.disconnect();
        };

        window.addEventListener('sessionExpired', handleSessionExpired);
        window.addEventListener('userLoggedIn', handleUserLoggedIn);
        window.addEventListener('tokenInvalid', handleTokenInvalid);
        window.addEventListener('unauthorized', handleUnauthorized);

        return () => {
            window.removeEventListener('sessionExpired', handleSessionExpired);
            window.removeEventListener('userLoggedIn', handleUserLoggedIn);
            window.removeEventListener('tokenInvalid', handleTokenInvalid);
            window.removeEventListener('unauthorized', handleUnauthorized);
        };
    }, []);

    /* =====================================================
        FETCH CINEMAS (Giữ nguyên)
    ===================================================== */
    useEffect(() => {
        const fetchCinemas = async () => {
            try {
                const response = await api.get('/api/cinemas');
                const raw = response.data?.data;
                let list = [];
                if (Array.isArray(raw)) list = raw;
                else if (raw?.data && Array.isArray(raw.data)) list = raw.data;
                else if (raw?.cinemas && Array.isArray(raw.cinemas)) list = raw.cinemas;
                setCinemas(list);
            } catch (error) {
                console.error('Lỗi lấy dữ liệu rạp:', error);
                setCinemas([]);
            }
        };
        fetchCinemas();
    }, []);

    /* =====================================================
        CLICK OUTSIDE & RESIZE (Giữ nguyên)
    ===================================================== */
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

    /* =====================================================
        LOGOUT
    ===================================================== */
    const handleLogout = async () => {
        try {
            await api.post('/api/auth/logout');
        } catch (error) {
            console.error('Lỗi khi logout:', error);
        } finally {
            // 🟢 Ngắt kết nối WebSocket
            socketService.disconnect();
            
            setUser(null);
            setShowDropdown(false);
            window.dispatchEvent(new Event('userLoggedIn')); 
            navigate('/login', { replace: true });
        }
    };

    /* =====================================================
        🟢 HANDLE SESSION EXPIRED CONFIRM
    ===================================================== */
    const handleSessionExpiredConfirm = () => {
        console.log('🔴 [HEADER] User xác nhận đăng nhập lại');
        setShowSessionExpiredModal(false);
        setSessionExpiredMessage('');
        setNewDevice('');
        
        // Ngắt kết nối WebSocket
        socketService.disconnect();
        
        navigate('/login', { replace: true, state: { expired: true } });
    };

    /* =====================================================
        UI HELPERS (Giữ nguyên)
    ===================================================== */
    const closeMobileMenu = () => {
        setIsMenuOpen(false);
        setActiveSubMenu(null);
    };

    const toggleSubMenu = (menuName, event) => {
        event.preventDefault();
        event.stopPropagation();
        setActiveSubMenu(activeSubMenu === menuName ? null : menuName);
    };

    const getAvatarUrl = (avatar) => {
        if (!avatar) return null;
        if (avatar.startsWith('http')) return avatar;
        return `https://api.quangdungcinema.id.vn/uploads/avatars/${avatar}`;
    };

    const avatarSource = user?.user_avatar || user?.avatar;
    const avatarUrl = avatarSource ? getAvatarUrl(avatarSource) : null;
    const displayName = user?.username || user?.full_name || 'Tài khoản';

    /* =====================================================
        RENDER
    ===================================================== */
    return (
        <>
            <nav className="user-navbar">
                <div className="nav-container">
                    {/* Mobile Hamburger */}
                    <button 
                        className={`hamburger ${isMenuOpen ? 'active' : ''}`} 
                        onClick={() => setIsMenuOpen(prev => !prev)} 
                        aria-label="Toggle menu"
                    >
                        <span className="bar"></span><span className="bar"></span><span className="bar"></span>
                    </button>

                    <div className="header-logo" onClick={() => { navigate('/'); closeMobileMenu(); }}>
                        <img src="https://api.quangdungcinema.id.vn/uploads/logo/logocinema.png" alt="Cinema Star Logo" />
                    </div>

                    <div className={`menu-overlay ${isMenuOpen ? 'active' : ''}`} onClick={closeMobileMenu} />

                    {/* NAVIGATION LINKS */}
                    <ul ref={navRef} className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                        <li><Link to="/" onClick={closeMobileMenu} className="menu-link">Trang chủ</Link></li>
                        <li className={`has-dropdown ${activeSubMenu === 'phim' ? 'mobile-active' : ''}`}>
                            <div className="menu-link mobile-parent" onClick={(e) => toggleSubMenu('phim', e)}>
                                <span>Phim</span><ChevronDown size={18} className="icon-down" />
                            </div>
                            <ul className="sub-menu">
                                <li><Link to="/movies/status/phim-dang-chieu" onClick={closeMobileMenu}>Phim đang chiếu</Link></li>
                                <li><Link to="/movies/status/phim-sap-chieu" onClick={closeMobileMenu}>Phim sắp chiếu</Link></li>
                            </ul>
                        </li>
                        <li className={`has-dropdown ${activeSubMenu === 'rap' ? 'mobile-active' : ''}`}>
                            <div className="menu-link mobile-parent">
                                <Link to="/cinema" onClick={closeMobileMenu}>Rạp</Link>
                                <ChevronDown size={18} className="icon-down" onClick={(e) => toggleSubMenu('rap', e)} />
                            </div>
                            <ul className="sub-menu">
                                {cinemas.map((cinema) => (
                                    <li key={cinema.cinema_id}>
                                        <Link to={`/cinema/detail/${cinema.slug}`} onClick={closeMobileMenu}>{cinema.cinema_name}</Link>
                                    </li>
                                ))}
                            </ul>
                        </li>
                        <li className={`has-dropdown ${activeSubMenu === 'goc' ? 'mobile-active' : ''}`}>
                            <div className="menu-link mobile-parent" onClick={(e) => toggleSubMenu('goc', e)}>
                                <span>Góc Điện Ảnh</span><ChevronDown size={18} className="icon-down" />
                            </div>
                            <ul className="sub-menu">
                                <li><Link to="/cinema-genre" onClick={closeMobileMenu}>Thể Loại Phim</Link></li>
                                <li><Link to="/actors" onClick={closeMobileMenu}>Diễn Viên</Link></li>
                                <li><Link to="/news" onClick={closeMobileMenu}>Tin Tức</Link></li>
                            </ul>
                        </li>
                        <li><Link to="/promotion" onClick={closeMobileMenu} className="menu-link">Khuyến mãi</Link></li>
                        <li><Link to="/blog-cinema" onClick={closeMobileMenu} className="menu-link">Blog Điện Ảnh</Link></li>
                    </ul>

                    {/* USER MENU */}
                    <div className="user-menu" ref={dropdownRef}>
                        <div className="account-trigger" onClick={() => setShowDropdown(prev => !prev)}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="avatar" className="header-avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', marginRight: '8px' }} />
                            ) : (
                                <UserCircle size={22} className="user-icon" />
                            )}
                            <span className="username-display">{authLoading ? 'Đang tải...' : displayName}</span>
                            <ChevronDown size={14} className={showDropdown ? 'rotate' : ''} />
                        </div>

                        {showDropdown && (
                            <div className="dropdown-content show">
                                {user ? (
                                    <>
                                        <div className="dropdown-user-info">
                                            <p>Chào, <strong>{displayName}</strong></p>
                                            {user.role === 'admin' && <span className="admin-badge">Quản trị viên</span>}
                                        </div>
                                        <div className="dropdown-divider" />
                                        {user.role === 'admin' && (
                                            <div className="dropdown-item admin-link" onClick={() => { navigate('/admin'); setShowDropdown(false); }}>
                                                <LayoutDashboard size={18} /><span>Trang Quản Trị</span>
                                            </div>
                                        )}
                                        <div className="dropdown-item" onClick={() => { navigate('/profile'); setShowDropdown(false); }}>
                                            <IdCard size={18} /><span>Hồ sơ</span>
                                        </div>
                                        <div className={`dropdown-item logout-btn`} onClick={handleLogout}>
                                            <LogOut size={18} /><span>Đăng xuất</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="dropdown-item" onClick={() => { navigate('/login'); setShowDropdown(false); }}>
                                            <LogIn size={18} /><span>Đăng nhập</span>
                                        </div>
                                        <div className="dropdown-item" onClick={() => { navigate('/register'); setShowDropdown(false); }}>
                                            <UserPlus size={18} /><span>Đăng Ký</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* 🟢 MODAL SESSION EXPIRED */}
            {showSessionExpiredModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-icon">🔐</div>
                        <h2>Phiên đăng nhập đã hết hạn</h2>
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

export default UserHeader;