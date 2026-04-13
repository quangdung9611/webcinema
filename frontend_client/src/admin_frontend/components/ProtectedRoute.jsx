import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const { user, admin, loading } = useAuth();

    // 1. Loading
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
                <div>🔐 Đang xác thực...</div>
            </div>
        );
    }

    // 2. Check quyền admin (an toàn hơn)
    const isAdmin = admin || (user && user.role === 'admin');

    if (!isAdmin) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 3. OK
    return children;
};

export default ProtectedRoute;