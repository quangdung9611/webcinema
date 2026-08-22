import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/api';
import socketService from '../../api/socket';
import SessionExpiredModal from '../components/SessionExpiredModal';
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

    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [cinemas, setCinemas] = useState([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeSubMenu, setActiveSubMenu] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
    const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');
    const [newDevice, setNewDevice] = useState('');
    const [countdown, setCountdown] = useState(10);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const dropdownRef = useRef(null);
    const navRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const isProcessingRef = useRef(false);

    // ============================================================
    // 🔥 HÀM LOGOUT THỰC TẾ
    // ============================================================
    const performLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        isProcessingRef.current = false;

        console.log('🔴 [HEADER] Đang thực hiện logout...');

        try {
            await api.post('/api/auth/logout');
        } catch (error) {
            console.error('Lỗi khi logout:', error);
        } finally {
            localStorage.removeItem('user_info');
            localStorage.removeItem('admin_info');
            socketService.disconnect();
            setUser(null);
            setShowDropdown(false);
            setShowSessionExpiredModal(false);
            setSessionExpiredMessage('');
            setNewDevice('');
            setCountdown(10);
            setIsLoggingOut(false);
            delete api.defaults.headers.common['Authorization'];
            
            // Xóa cookie
            document.cookie.split(";").forEach((c) => {
                document.cookie = c
                    .replace(/^ +/, "")
                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            
            navigate('/login', { replace: true, state: { expired: true } });
            console.log('✅ [HEADER] Logout thành công, chuyển về login');
        }
    };

    // ============================================================
    // 🔥 HÀM XỬ LÝ SESSION EXPIRED
    // ============================================================
    const handleSessionExpired = (detail) => {
        if (isProcessingRef.current || showSessionExpiredModal) {
            console.log('⚠️ [HEADER] Đang xử lý session expired, bỏ qua...');
            return;
        }

        isProcessingRef.current = true;
        console.log('🔴 [HEADER] Xử lý session expired:', detail);

        const message = detail?.message || 'Tài khoản đã được đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.';
        const device = detail?.newDevice || '';

        setSessionExpiredMessage(message);
        setNewDevice(device);
        setShowSessionExpiredModal(true);
        setCountdown(10);

        setUser(null);
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
    // FETCH USER INFO - ĐĂNG KÝ CALLBACK
    // ============================================================
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

                socketService.setOnSessionExpired(handleSessionExpired);
                
                if (account) {
                    socketService.connect(account.user_id);
                }
            } catch (error) {
                console.error('Lỗi kiểm tra đăng nhập:', error);
                setUser(null);

                if (error.response?.status === 401) {
                    socketService.disconnect();
                }
            } finally {
                setAuthLoading(false);
            }
        };
        fetchUser();

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
            isProcessingRef.current = false;
        };
    }, []);

    // ============================================================
    // LẮNG NGHE SỰ KIỆN WINDOW - FALLBACK
    // ============================================================
    useEffect(() => {
        const handleWindowSessionExpired = (event) => {
            console.log('🔴 [HEADER] Session expired event từ window:', event.detail);
            handleSessionExpired(event.detail);
        };

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
                    
                    if (account) {
                        socketService.setOnSessionExpired(handleSessionExpired);
                        socketService.connect(account.user_id);
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

        const handleTokenInvalid = () => {
            console.log('🔴 [HEADER] Token invalid');
            setUser(null);
            socketService.disconnect();
            isProcessingRef.current = false;
        };

        const handleUnauthorized = () => {
            console.log('🔴 [HEADER] Unauthorized');
            setUser(null);
            socketService.disconnect();
            isProcessingRef.current = false;
        };

        window.addEventListener('sessionExpired', handleWindowSessionExpired);
        window.addEventListener('userLoggedIn', handleUserLoggedIn);
        window.addEventListener('tokenInvalid', handleTokenInvalid);
        window.addEventListener('unauthorized', handleUnauthorized);

        return () => {
            window.removeEventListener('sessionExpired', handleWindowSessionExpired);
            window.removeEventListener('userLoggedIn', handleUserLoggedIn);
            window.removeEventListener('tokenInvalid', handleTokenInvalid);
            window.removeEventListener('unauthorized', handleUnauthorized);
        };
    }, []);

    // ============================================================
    // FETCH CINEMAS
    // ============================================================
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

    // ============================================================
    // CLICK OUTSIDE & RESIZE
    // ============================================================
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
        console.log('🔴 [HEADER] User xác nhận đăng nhập lại');
        
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        
        isProcessingRef.current = false;
        performLogout();
    };

    // ============================================================
    // UI HELPERS
    // ============================================================
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

    // ✅ KIỂM TRA USER CÓ HỢP LỆ KHÔNG (ĐÃ ĐĂNG NHẬP VÀ ĐÃ XÁC THỰC EMAIL)
    const isValidUser = user && user.email_verified === 1;

    const avatarSource = user?.user_avatar || user?.avatar;
    const avatarUrl = avatarSource ? getAvatarUrl(avatarSource) : null;
    const displayName = user?.username || user?.full_name || 'Tài khoản';

    // ============================================================
    // HANDLE ĐĂNG NHẬP - XÓA TOKEN CŨ
    // ============================================================
    const handleLoginClick = () => {
        console.log('🟢 [HEADER] Bấm đăng nhập, xóa token cũ và chuyển đến /login');
        setShowDropdown(false);
        
        // ✅ Xóa token cũ
        delete api.defaults.headers.common['Authorization'];
        localStorage.removeItem('user_info');
        localStorage.removeItem('admin_info');
        
        // ✅ Xóa cookie
        document.cookie.split(";").forEach((c) => {
            document.cookie = c
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        navigate('/login');
    };

    const handleRegisterClick = () => {
        console.log('🟢 [HEADER] Bấm đăng ký, chuyển đến /register');
        setShowDropdown(false);
        navigate('/register');
    };

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <>
            <nav className="user-navbar">
                <div className="nav-container">
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

                    <div className="user-menu" ref={dropdownRef}>
                        <div className="account-trigger" onClick={() => setShowDropdown(prev => !prev)}>
                            {isValidUser && avatarUrl ? (
                                <img src={avatarUrl} alt="avatar" className="header-avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', marginRight: '8px' }} />
                            ) : (
                                <UserCircle size={22} className="user-icon" />
                            )}
                            <span className="username-display">
                                {authLoading ? 'Đang tải...' : isValidUser ? displayName : 'Tài khoản'}
                            </span>
                            <ChevronDown size={14} className={showDropdown ? 'rotate' : ''} />
                        </div>

                        {showDropdown && (
                            <div className="dropdown-content show">
                                {isValidUser ? (
                                    // ✅ ĐÃ ĐĂNG NHẬP VÀ ĐÃ XÁC THỰC EMAIL
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
                                    // ✅ CHƯA ĐĂNG NHẬP HOẶC CHƯA XÁC THỰC EMAIL
                                    <>
                                        <div className="dropdown-user-info">
                                            <p style={{ color: '#f87171' }}>
                                                {user && !user.email_verified 
                                                    ? '⚠️ Vui lòng xác thực email' 
                                                    : 'Chưa đăng nhập'}
                                            </p>
                                        </div>
                                        <div className="dropdown-divider" />
                                        <div className="dropdown-item" onClick={handleLoginClick}>
                                            <LogIn size={18} /><span>Đăng nhập</span>
                                        </div>
                                        <div className="dropdown-item" onClick={handleRegisterClick}>
                                            <UserPlus size={18} /><span>Đăng Ký</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </nav>

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

export default UserHeader;