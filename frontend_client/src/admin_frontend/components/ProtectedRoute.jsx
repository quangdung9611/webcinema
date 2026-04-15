import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const { user, admin, loading } = useAuth();
    const hostname = window.location.hostname;

    // 1. Giao diện Loading (Dũng giữ nguyên cái này là đẹp rồi)
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

    // 2. Xác định môi trường (Hỗ trợ cả production và localhost)
    const isAdminDomain = hostname.startsWith('admin.') || hostname.includes('admin');

    if (isAdminDomain) {
        // --- TRANG ADMIN ---
        // Chỉ cho phép nếu state 'admin' tồn tại và có role đúng là admin
        if (!admin || admin.role !== 'admin') {
            // Lưu lại vị trí đang truy cập để sau khi login xong quay lại đúng chỗ đó
            return <Navigate to="/login" state={{ from: location }} replace />;
        }
    } else {
        // --- TRANG USER (KHÁCH) ---
        // Ở trang khách, ưu tiên 'user'. Nếu là admin đi lướt web thì vẫn cho xem.
        const hasAccess = user || (admin && admin.role === 'admin');
        
        if (!hasAccess) {
            return <Navigate to="/login" state={{ from: location }} replace />;
        }
    }

    // 3. Mọi thứ OK -> Cho phép truy cập
    return children;
};

export default ProtectedRoute;