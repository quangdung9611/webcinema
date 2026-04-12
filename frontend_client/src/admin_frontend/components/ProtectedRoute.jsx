import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; 

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const { user, loading } = useAuth(); // Lấy trực tiếp từ Context

    // 1. Nếu AuthContext đang bận gọi API (loading = true), hiện màn hình chờ
    if (loading) {
        return (
            <div style={{ 
                display: 'flex', justifyContent: 'center', alignItems: 'center', 
                height: '100vh', background: '#0a0a0a', color: '#ff4d4d' 
            }}>
                <div style={{ fontSize: '40px', marginBottom: '15px' }}>🛡️</div>
                <div style={{ letterSpacing: '2px', fontWeight: 'bold' }}>HỆ THỐNG ĐANG XÁC THỰC...</div>
            </div>
        );
    }

    // 2. Nếu đã check xong mà KHÔNG có user hoặc user KHÔNG PHẢI admin
    if (!user || user.role !== 'admin') {
        // Lặng lẽ đẩy về login, không cần console.error gây đỏ màn hình
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    // 3. Nếu mọi thứ OK -> Cho vào Dashboard
    return children;
};

export default ProtectedRoute;