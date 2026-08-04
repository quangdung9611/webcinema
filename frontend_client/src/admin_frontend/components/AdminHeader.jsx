import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/api';
import {
    Menu,
    Search,
    Bell,
    ChevronDown,
    LogOut
} from 'lucide-react';

import '../styles/AdminHeader.css';

const AdminHeader = ({ toggleSidebar }) => {

    const navigate = useNavigate();

    const [admin, setAdmin] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // =========================================================
    // LOAD ADMIN INFO
    // =========================================================

    useEffect(() => {

        const fetchAdmin = async () => {

            try {

                const res = await api.get('/admin/api/auth/me');

                setAdmin(res.data?.user || null);

            } catch (error) {

                console.error(
                    'Không thể lấy thông tin Admin:',
                    error
                );

                // --- SỬA TẠI ĐÂY ---
                // Bất kể status 401 hay lỗi khác, đều chuyển về trang Admin Login
                // Vì api.js đã không còn tự động window.location.href nữa
                navigate('/admin/login', { replace: true });

            }

        };

        fetchAdmin();

    }, [navigate]);

    // =========================================================
    // LOGOUT
    // =========================================================

    const handleLogout = async () => {

        try {

            await api.post('/admin/api/auth/logout');

        } catch (error) {

            console.error(
                'Lỗi đăng xuất Admin:',
                error
            );

        } finally {

            setAdmin(null);
            setShowDropdown(false);

            // --- SỬA TẠI ĐÂY ---
            // Chuyển về đúng trang Admin Login, không chuyển sang trang User Login
            navigate('/admin/login', {
                replace: true
            });

        }

    };

    // =========================================================
    // TOGGLE USER DROPDOWN
    // =========================================================

    const toggleDropdown = () => {

        setShowDropdown(prev => !prev);

    };

    return (

        <header className="admin-header-main">

            {/* =================================================
                LEFT
            ================================================= */}

            <div className="admin-header-left">

                <button
                    className="admin-hamburger-trigger"
                    onClick={toggleSidebar}
                    aria-label="Toggle Sidebar"
                >
                    <Menu size={24} />
                </button>

                {/* LOGO */}

                <Link
                    to="/"
                    className="admin-brand-logo"
                >

                    <img
                        src="https://api.quangdungcinema.id.vn/uploads/logo/logocinema.png"
                        alt="Cinema Star"
                        className="admin-logo-image"
                    />

                </Link>

            </div>


            {/* =================================================
                CENTER
            ================================================= */}

            <div className="admin-header-search-wrapper">

                <Search
                    size={18}
                    className="admin-search-icon"
                />

                <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    className="admin-search-input"
                />

            </div>


            {/* =================================================
                RIGHT
            ================================================= */}

            <div className="admin-header-right">

                {/* =================================================
                    NOTIFICATION
                ================================================= */}

                <button
                    className="admin-notification-btn"
                    type="button"
                >

                    <Bell size={20} />

                    <span className="admin-notification-badge">
                        5
                    </span>

                </button>


                {/* =================================================
                    USER
                ================================================= */}

                <div
                    className="admin-user-dropdown"
                    onClick={toggleDropdown}
                >

                    <div className="admin-user-avatar">

                        <img
                            src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                                admin?.full_name || 'Admin'
                            )}`}
                            alt="Admin Avatar"
                        />

                    </div>


                    <div className="admin-user-info">

                        <span className="admin-user-greeting">
                            Xin chào,
                        </span>

                        <strong className="admin-user-name">

                            {admin?.full_name ||
                                admin?.username ||
                                'Quản trị viên'}

                        </strong>

                    </div>


                    <ChevronDown
                        size={18}
                        className={`admin-user-arrow ${
                            showDropdown ? 'rotate' : ''
                        }`}
                    />

                </div>


                {/* =================================================
                    LOGOUT
                ================================================= */}

                <button
                    className="admin-logout-btn"
                    onClick={handleLogout}
                    type="button"
                >

                    <LogOut size={18} />

                    <span>
                        Đăng xuất
                    </span>

                </button>

            </div>

        </header>

    );

};

export default AdminHeader;