import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const { user, admin, loading } = useAuth();
    const hostname = window.location.hostname;

    // 1. Đang load dữ liệu từ API (Giữ nguyên giao diện loading của Dũng)
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

    // 2. Xác định môi trường đang đứng
    // Dùng startsWith('admin.') sẽ an toàn hơn so khớp tuyệt đối vì nó chạy được cả trên localhost
    const isAdminDomain = hostname.startsWith('admin.');

    if (isAdminDomain) {
        // --- TRANG ADMIN ---
        // Kiểm tra role admin từ state admin hoặc user trong AuthContext
        const hasAdminAccess = (admin && admin.role === 'admin') || (user && user.role === 'admin');
        
        if (!hasAdminAccess) {
            // Nếu không phải admin, đẩy về trang login của admin
            // replace: true để không cho user bấm back lại trang bảo mật
            return <Navigate to="/login" state={{ from: location }} replace />;
        }
    } else {
        // --- TRANG USER (KHÁCH) ---
        // Ở trang khách, chỉ cần có bất kỳ ai đăng nhập (user hoặc admin) là cho xem
        const hasAccess = user || admin;
        
        if (!hasAccess) {
            // Nếu chưa đăng nhập, đẩy về login của trang khách
            return <Navigate to="/login" state={{ from: location }} replace />;
        }
    }

    // 3. Vượt qua kiểm tra -> Trả về nội dung trang
    return children;
};

export default ProtectedRoute;