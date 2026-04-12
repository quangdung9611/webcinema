import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; 

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const { user, loading } = useAuth(); 

    // 1. Màn hình chờ xác thực (Giữ nguyên của ông vì UI này khá ổn)
    if (loading) {
        return (
            <div style={{ 
                display: 'flex', flexDirection: 'column', // Thêm cái này để icon và chữ nằm dọc
                justifyContent: 'center', alignItems: 'center', 
                height: '100vh', background: '#0a0a0a', color: '#ff4d4d',
                fontFamily: 'sans-serif'
            }}>
                <div style={{ fontSize: '60px', marginBottom: '20px', animation: 'pulse 1.5s infinite' }}>🛡️</div>
                <div style={{ letterSpacing: '2px', fontWeight: 'bold', fontSize: '14px' }}>HỆ THỐNG ĐANG XÁC THỰC QUYỀN ADMIN...</div>
            </div>
        );
    }

    // 2. Kiểm tra quyền hạn
    // Nếu không có user hoặc role không phải admin -> Đuổi về trang login admin
    if (!user || user.role !== 'admin') {
        // Lưu lại trang định vào để sau khi login xong quay lại đúng chỗ đó
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    // 3. Đúng là Admin -> Cho phép truy cập
    return children;
};

export default ProtectedRoute;