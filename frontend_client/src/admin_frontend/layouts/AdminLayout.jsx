import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';

import AdminSidebar from '../components/AdminSidebar';
import AdminHeader from '../components/AdminHeader';

import '../styles/AdminLayout.css';

const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    return (
        <div className="admin-container">
            {/* Sidebar bên trái */}
            <AdminSidebar 
                sidebarOpen={sidebarOpen} 
                closeSidebar={closeSidebar}
            />

            {/* Vùng nội dung bên phải */}
            <div className={`admin-right-side ${sidebarOpen ? 'sidebar-open' : ''}`}>
                
                {/* Header chứa thông tin Admin và nút Logout */}
                <AdminHeader toggleSidebar={toggleSidebar} />

                {/* Main Content: Nơi các trang con (Dashboard, UserList...) hiển thị */}
                <main className="admin-main-content">
                    {/*  */}
                    <Outlet /> 
                </main>

            </div>

            {/* Lớp phủ khi mở Sidebar trên điện thoại */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={closeSidebar}></div>
            )}
        </div>
    );
};

export default AdminLayout;