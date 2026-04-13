import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const { user, admin, loading } = useAuth();
    const hostname = window.location.hostname;

    // 1. Đang load dữ liệu từ API /getMe hoặc /checkAuth
    if (loading) {
        return (
            <div style={{ 
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#0a0a0a',
                color: '#ff4d4d'
            }}>
                <div>🔐 Đang xác thực quyền truy cập...</div>
            </div>
        );
    }

    // 2. Kiểm tra xem đang ở domain nào
    const isAdminDomain = hostname === 'admin.quangdungcinema.id.vn';

    if (isAdminDomain) {
        // Nếu ở trang ADMIN: Bắt buộc phải có state 'admin' hoặc user.role là admin
        const hasAdminAccess = admin || (user && user.role === 'admin');
        if (!hasAdminAccess) {
            return <Navigate to="/login" state={{ from: location }} replace />;
        }
    } else {
        // Nếu ở trang USER: Chỉ cần có state 'user' là được
        if (!user) {
            return <Navigate to="/login" state={{ from: location }} replace />;
        }
    }

    // 3. Mọi thứ OK
    return children;
};

export default ProtectedRoute;