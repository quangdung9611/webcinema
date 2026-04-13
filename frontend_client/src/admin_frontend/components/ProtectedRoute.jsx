import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; 

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    
    // --- BỔ SUNG ADMIN VÀO ĐÂY ---
    const { user, admin, loading } = useAuth(); 

    // 1. Màn hình chờ xác thực
    if (loading) {
        return (
            <div style={{ 
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', 
                height: '100vh', background: '#0a0a0a', color: '#ff4d4d',
                fontFamily: 'sans-serif'
            }}>
                <style>
                    {`
                        @keyframes pulse {
                            0% { transform: scale(1); opacity: 1; }
                            50% { transform: scale(1.1); opacity: 0.7; }
                            100% { transform: scale(1); opacity: 1; }
                        }
                    `}
                </style>
                <div style={{ fontSize: '60px', marginBottom: '20px', animation: 'pulse 1.5s infinite' }}>🛡️</div>
                <div style={{ letterSpacing: '2px', fontWeight: 'bold', fontSize: '14px' }}>HỆ THỐNG ĐANG XÁC THỰC QUYỀN ADMIN...</div>
            </div>
        );
    }

    // 2. KIỂM TRA QUYỀN HẠN
    // Ưu tiên admin token, nếu không có thì check role của user token
    const hasAdminRight = admin || (user && user.role === 'admin');

    if (!hasAdminRight) {
        console.warn("Truy cập bị chặn: Không phải Admin");
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    // 3. Đúng là Admin -> Cho phép truy cập
    return children;
};

export default ProtectedRoute;