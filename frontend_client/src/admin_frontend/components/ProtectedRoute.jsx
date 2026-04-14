import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// 🔥 KHAI BÁO DOMAIN ĐỒNG BỘ VỚI AUTHCONTEXT VÀ BACKEND
const USER_DOMAIN = "quangdungcinema.id.vn";
const ADMIN_DOMAIN = "admin.quangdungcinema.id.vn";

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const { user, admin, loading } = useAuth();
    const hostname = window.location.hostname;

    // 1. Đang load dữ liệu từ API
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

    // 2. Xác định Domain hiện tại dựa trên hằng số đã khai báo
    const isAdminDomain = hostname === ADMIN_DOMAIN;

    if (isAdminDomain) {
        // --- TRANG ADMIN ---
        // Ép kiểu boolean và kiểm tra chặt chẽ role admin
        const hasAdminAccess = (admin && admin.role === 'admin') || (user && user.role === 'admin');
        
        if (!hasAdminAccess) {
            // Nếu không phải admin, đá về trang login của admin
            return <Navigate to="/login" state={{ from: location }} replace />;
        }
    } else {
        // --- TRANG USER ---
        // Domain khách: Cả khách hàng (user) và quản trị viên (admin) đều được vào
        const hasAccess = user || admin;
        
        if (!hasAccess) {
            // Nếu chưa đăng nhập bất cứ tài khoản nào, đá về trang login của khách
            return <Navigate to="/login" state={{ from: location }} replace />;
        }
    }

    // 3. Mọi thứ OK -> Cho phép truy cập nội dung bên trong
    return children;
};

export default ProtectedRoute;