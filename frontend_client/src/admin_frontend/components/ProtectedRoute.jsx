import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const { user, admin, loading } = useAuth();
    const hostname = window.location.hostname;

    // 1. Đang load dữ liệu từ API (Tránh bị redirect nhầm khi mạng chậm)
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

    // 2. Xác định Domain hiện tại
    const isAdminDomain = hostname.startsWith('admin.');

    if (isAdminDomain) {
        // --- TRANG ADMIN ---
        // Chỉ cho phép nếu có thông tin admin và role đúng là admin
        // Ưu tiên check state 'admin' mà ông đã định nghĩa trong AuthContext
        const hasAdminAccess = admin || (user && user.role === 'admin');
        
        if (!hasAdminAccess) {
            // Nếu không phải admin, đá về trang login của admin
            return <Navigate to="/login" state={{ from: location }} replace />;
        }
    } else {
        // --- TRANG USER ---
        // Chỉ cần có thông tin user hoặc admin (vì admin vẫn có thể xem trang khách)
        const hasUserAccess = user || admin;
        
        if (!hasUserAccess) {
            // Nếu chưa đăng nhập bất cứ cái gì, đá về trang login của user
            return <Navigate to="/login" state={{ from: location }} replace />;
        }
    }

    // 3. Mọi thứ OK -> Cho vào
    return children;
};

export default ProtectedRoute;