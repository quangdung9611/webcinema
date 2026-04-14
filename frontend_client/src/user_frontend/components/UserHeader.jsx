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
    LayoutDashboard 
} from 'lucide-react'; 
import '../styles/Header.css';

const UserHeader = () => {
    const navigate = useNavigate();
    // Dùng clearAuth thay cho clearLocalAuth
    const { user, clearAuth } = useAuth(); 
    const [showDropdown, setShowDropdown] = useState(false);
    const [cinemas, setCinemas] = useState([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeSubMenu, setActiveSubMenu] = useState(null);
    const dropdownRef = useRef(null);
    const navRef = useRef(null);

    // Đóng menu khi click ra ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (navRef.current && !navRef.current.contains(event.target)) {
                setActiveSubMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchCinemas = async () => {
        try {
            const res = await axios.get('https://api.quangdungcinema.id.vn/api/cinemas');
            setCinemas(res.data);
        } catch (err) { 
            console.error("Lỗi lấy dữ liệu rạp:", err); 
        }
    };

    useEffect(() => {
        fetchCinemas();
    }, []);

    const handleLogout = async () => {
        try {
            // Bước 1: Gọi API xóa Cookie tại Backend (xóa cả usertoken và admintoken)
            await axios.post('https://api.quangdungcinema.id.vn/api/auth/logout', {}, { 
                withCredentials: true 
            });
        } catch (err) {
            console.error("Lỗi khi logout:", err);
        } finally {
            // Bước 2: Dọn dẹp RAM (State) - Không còn Storage nào để xóa ở đây
            clearAuth(); 
            setShowDropdown(false);
            
            // Bước 3: Bắn sự kiện đồng bộ giữa các tab
            window.dispatchEvent(new Event('authChange'));
            
            // Bước 4: Chuyển hướng
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

    return (
        <nav className="user-navbar">
            <div className="nav-container">
                <button 
                    className={`hamburger ${isMenuOpen ? 'active' : ''}`} 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                </button>

                <div className="logo" onClick={() => { navigate('/'); closeMobileMenu(); }}>
                    CINEMA<span>STAR</span>
                </div>
                
                {isMenuOpen && <div className="menu-overlay" onClick={closeMobileMenu}></div>}

                <ul ref={navRef} className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                    <li><Link to="/" onClick={closeMobileMenu}>Trang chủ</Link></li>
                    
                    <li className={`has-dropdown ${activeSubMenu === 'phim' ? 'mobile-active' : ''}`}>
                        <Link to="#" onClick={(e) => toggleSubMenu('phim', e)}>
                            Phim <ChevronDown size={14} className="icon-down" />
                        </Link>
                        <ul className="sub-menu">
                            <li><Link to="/movies/status/phim-dang-chieu" onClick={closeMobileMenu}>Phim đang chiếu</Link></li>
                            <li><Link to="/movies/status/phim-sap-chieu" onClick={closeMobileMenu}>Phim sắp chiếu</Link></li>
                        </ul>
                    </li>

                    <li className={`has-dropdown ${activeSubMenu === 'rap' ? 'mobile-active' : ''}`}>
                        <Link to="#" onClick={(e) => toggleSubMenu('rap', e)}>
                            Rạp <ChevronDown size={14} className="icon-down" />
                        </Link>
                        <ul className="sub-menu">
                            {cinemas.map((cinema) => (
                                <li key={cinema.cinema_id}>
                                    <Link to={`/cinema/${cinema.slug}`} onClick={closeMobileMenu}>{cinema.cinema_name}</Link>
                                </li>
                            ))}
                        </ul>
                    </li>

                    <li className={`has-dropdown ${activeSubMenu === 'goc' ? 'mobile-active' : ''}`}>
                        <Link to="#" onClick={(e) => toggleSubMenu('goc', e)}>
                            Góc Điện Ảnh <ChevronDown size={14} className="icon-down" />
                        </Link>
                        <ul className="sub-menu">
                            <li><Link to="/cinema-genre" onClick={closeMobileMenu}>Thể Loại Phim</Link></li>
                            <li><Link to="/actors" onClick={closeMobileMenu}>Diễn Viên</Link></li>
                            <li><Link to="/film-review" onClick={closeMobileMenu}>Bình Luận Phim</Link></li>
                        </ul>
                    </li>

                    <li><Link to="/promotion" onClick={closeMobileMenu}>Khuyến mãi</Link></li>
                </ul>

                <div className="user-menu" ref={dropdownRef}>
                    <div className="account-trigger" onClick={() => setShowDropdown(!showDropdown)}>
                        <UserCircle size={22} className="user-icon" />
                        <span className="username-display">{user ? (user.username || user.full_name) : "Tài khoản"}</span>
                        <ChevronDown size={14} className={showDropdown ? 'rotate' : ''} />
                    </div>

                    {showDropdown && (
                        <div className="dropdown-content show">
                            {user ? (
                                <>
                                    <div className="dropdown-user-info">
                                        <p>Chào, <strong>{user.username || user.full_name}</strong></p>
                                        {user.role === 'admin' && <span className="admin-badge">Quản trị viên</span>}
                                    </div>
                                    <div className="dropdown-divider"></div>
                                    
                                    {user.role === 'admin' && (
                                        <div className="dropdown-item admin-link" onClick={() => {navigate('/admin'); setShowDropdown(false);}}>
                                            <LayoutDashboard size={18} /> <span>Trang Quản Trị</span>
                                        </div>
                                    )}

                                    <div className="dropdown-item" onClick={() => {navigate('/profile'); setShowDropdown(false);}}>
                                        <IdCard size={18} /> <span>Hồ sơ</span>
                                    </div>
                                    <div className="dropdown-item logout-btn" onClick={handleLogout}>
                                        <LogOut size={18} /> <span>Đăng xuất</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="dropdown-item" onClick={() => {navigate('/login'); setShowDropdown(false);}}>
                                        <LogIn size={18} /> <span>Đăng nhập</span>
                                    </div>
                                    <div className="dropdown-item" onClick={() => {navigate('/register'); setShowDropdown(false);}}>
                                        <UserPlus size={18} /> <span>Đăng Ký</span>
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