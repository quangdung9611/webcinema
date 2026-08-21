import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import api from '../../api/api'; // 🔥 Quan trọng: Dùng api đã cấu hình
import AdminHeader from '../components/AdminHeader';
import AdminSidebar from '../components/AdminSidebar';
import '../styles/AdminLayout.css';

const AdminLayout = () => {
    const [user, setUser] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    // 🔥 Fetch user data (giống UserLayout)
    const fetchUserData = async () => {
        try {
            const res = await api.get('/admin/api/auth/me'); // Admin dùng API riêng
            
            // Xử lý lấy user object (unwrap an toàn)
            const raw = res.data;
            let account = null;
            if (raw?.user) account = raw.user;
            else if (raw?.data?.user) account = raw.data.user;
            else if (raw && typeof raw === 'object' && !Array.isArray(raw)) account = raw;

            setUser(account);
        } catch (err) {
            // api.js đã xử lý 401 ở interceptor, ở đây chỉ set null là đủ
            setUser(null);
        }
    };

    useEffect(() => {
        fetchUserData();
        // 🔥 Lắng nghe sự kiện userLoggedIn (giống UserLayout)
        window.addEventListener('userLoggedIn', fetchUserData);
        
        return () => window.removeEventListener('userLoggedIn', fetchUserData);
    }, []);

    return (
        <div className="admin-layout">

            {/* ================= HEADER ================= */}

            <AdminHeader toggleSidebar={toggleSidebar} user={user} />

            {/* ================= BODY ================= */}

            <div className="admin-body">

                {/* ================= SIDEBAR ================= */}

                <AdminSidebar
                    sidebarOpen={sidebarOpen}
                    closeSidebar={closeSidebar}
                />

                {/* ================= CONTENT ================= */}

                <main className="admin-content">

                    <div className="admin-page-wrapper">
                        {/* 
                           Truyền user và fetchUserData xuống các trang con thông qua Outlet context.
                           Các trang Admin sẽ dùng useOutletContext() để lấy.
                        */}
                        <Outlet context={{ fetchUserData, user }} />
                    </div>

                </main>

            </div>

            {/* ================= OVERLAY ================= */}

            {sidebarOpen && (
                <div
                    className="admin-overlay"
                    onClick={closeSidebar}
                />
            )}

        </div>
    );
};

export default AdminLayout;