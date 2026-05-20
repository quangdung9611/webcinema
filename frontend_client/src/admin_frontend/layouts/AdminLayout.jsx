import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';

import AdminHeader from '../components/AdminHeader';
import AdminSidebar from '../components/AdminSidebar';

import '../styles/AdminLayout.css';

const AdminLayout = () => {

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    return (
        <div className="admin-layout">

            {/* ================= HEADER ================= */}

            <AdminHeader toggleSidebar={toggleSidebar} />

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
                        <Outlet />
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