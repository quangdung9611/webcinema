import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import {
    Menu,
    Search,
    Bell,
    ChevronDown,
    LogOut
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

import '../styles/AdminHeader.css';

const AdminHeader = ({ toggleSidebar }) => {

    const navigate = useNavigate();

    const {
        admin,
        loading,
        setAdmin,
        api,
        clearAuth
    } = useAuth();

    useEffect(() => {

        if (!loading && !admin) {
            navigate('/login');
        }

    }, [admin, loading, navigate]);

    // =========================================
    // LOGOUT
    // =========================================

    const handleLogout = async () => {

        try {

            await api.post('/admin/api/auth/logout');

        } catch (error) {

            console.error('Lỗi đăng xuất Admin:', error);

        } finally {

            if (clearAuth) {
                clearAuth();
            } else {
                setAdmin(null);
            }

            window.dispatchEvent(
                new Event('authChange')
            );

            navigate('/login');
        }
    };

    return (

        <header className="admin-header-main">

            {/* =========================================
                LEFT
            ========================================= */}

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

            {/* =========================================
                CENTER
            ========================================= */}

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

            {/* =========================================
                RIGHT
            ========================================= */}

            <div className="admin-header-right">

                {/* NOTIFICATION */}

                <button className="admin-notification-btn">

                    <Bell size={20} />

                    <span className="admin-notification-badge">
                        5
                    </span>

                </button>

                {/* USER */}

                <div className="admin-user-dropdown">

                    <div className="admin-user-avatar">

                        <img
                            src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${admin?.full_name || 'Admin'}`}
                            alt="Admin Avatar"
                        />

                    </div>

                    <div className="admin-user-info">

                        <span className="admin-user-greeting">
                            Xin chào,
                        </span>

                        <strong className="admin-user-name">
                            {admin?.full_name || 'Quản trị viên'}
                        </strong>

                    </div>

                    <ChevronDown
                        size={18}
                        className="admin-user-arrow"
                    />

                </div>

                {/* LOGOUT */}

                <button
                    className="admin-logout-btn"
                    onClick={handleLogout}
                >

                    <LogOut size={18} />

                    <span>Đăng xuất</span>

                </button>

            </div>

        </header>
    );
};

export default AdminHeader;