import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const { user, admin, loading } = useAuth();
    const hostname = window.location.hostname;

    // 1. Giao diện Loading
    if (loading) {
        return (
            <div style={{ 
                display: 'flex', justifyContent: 'center', alignItems: 'center', 
                height: '100vh', background: '#0a0a0a', color: '#ff4d4d', fontFamily: 'sans-serif' 
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '10px', fontSize: '24px' }}>🔐</div>
                    <div>Đang xác thực quyền truy cập...</div>
                </div>
            </div>
        );
    }

    /**
     * 2. Xác định domain hiện tại
     * Ở production: admin.quangdungcinema.id.vn
     * Ở dev: localhost (tùy cổng ông set cho admin)
     */
    const isAdminDomain = hostname.startsWith('admin.');

    if (isAdminDomain) {
        // --- TRANG ADMIN ---
        // Chỉ cho phép nếu state 'admin' có dữ liệu và đúng role admin
        if (!admin || admin.role !== 'admin') {
            console.warn("Truy cập bị chặn: Yêu cầu quyền Admin");
            return <Navigate to="/login" state={{ from: location }} replace />;
        }
    } else {
        // --- TRANG USER (KHÁCH) ---
        // Cho phép vào nếu có 'user' HOẶC là 'admin' đang lướt trang chủ
        const hasAccess = user || admin;
        
        if (!hasAccess) {
            console.warn("Truy cập bị chặn: Vui lòng đăng nhập");
            return <Navigate to="/login" state={{ from: location }} replace />;
        }
    }

    // 3. Mọi thứ OK -> Cho phép truy cập
    return children;
};

export default ProtectedRoute;