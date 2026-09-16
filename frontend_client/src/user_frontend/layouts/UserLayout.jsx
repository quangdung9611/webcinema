import React from 'react';
import { Outlet } from 'react-router-dom';

import UserHeader from '../components/UserHeader';
import UserFooter from '../components/UserFooter';

import '../styles/UserLayout.css';

// ============================================================
// USER LAYOUT
// ============================================================
// UserLayout chỉ chịu trách nhiệm:
// - Header
// - Nội dung page hiện tại
// - Footer
//
// Không tự gọi /api/auth/me ở đây.
// Auth đã được quản lý bởi AuthContext / UserHeader.
// ============================================================

const UserLayout = () => {
    return (
        <div className="user-site-container">

            {/* ==================================================
                HEADER
            ================================================== */}
            <header className="user-header-section">
                <UserHeader />
            </header>

            {/* ==================================================
                MAIN CONTENT
                Outlet render đúng page hiện tại theo route.
                
                Ví dụ:
                /blog-cinema
                    → BlogCinema

                /movies/detail/:slug
                    → MovieDetail

                /booking/:slug
                    → Booking
            ================================================== */}
            <main className="user-main-content">
                <Outlet />
            </main>

            {/* ==================================================
                FOOTER
            ================================================== */}
            <footer className="user-footer-section">
                <UserFooter />
            </footer>

        </div>
    );
};

export default UserLayout;