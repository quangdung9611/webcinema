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
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#0a0a0a',
                color: '#ff4d4d',
                fontFamily: 'sans-serif'
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
        // ✅ SỬA: Kiểm tra admin tồn tại và đúng role
        if (!admin || admin.role !== 'admin') {
            console.warn("🔒 Truy cập bị chặn: Yêu cầu quyền Admin");
            return <Navigate to="/admin/login" state={{ from: location }} replace />;
        }
    } else {
        // --- TRANG USER (KHÁCH) ---
        // ✅ SỬA: Cho phép nếu có user (đã đăng nhập và xác thực email)
        const hasAccess = user && user.email_verified === 1;
        
        // Cho phép admin vào trang user (nếu muốn)
        const hasAdminAccess = admin && admin.role === 'admin';

        if (!hasAccess && !hasAdminAccess) {
            console.warn("🔒 Truy cập bị chặn: Vui lòng đăng nhập hoặc xác thực email");
            return <Navigate to="/login" state={{ from: location }} replace />;
        }

        // ✅ THÊM: Nếu user chưa xác thực email, chặn vào trang user
        if (user && user.email_verified !== 1) {
            console.warn("🔒 Truy cập bị chặn: Vui lòng xác thực email");
            return <Navigate to="/verify-email-pending" state={{ from: location }} replace />;
        }
    }

    // 3. Mọi thứ OK -> Cho phép truy cập
    return children;
};

export default ProtectedRoute;