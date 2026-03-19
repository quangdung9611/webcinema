import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const ProtectedRoute = ({ children }) => {
    const [isAuthorized, setIsAuthorized] = useState(null);
    const location = useLocation();

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async () => {
            try {
                // ✅ SỬA LẠI ĐÚNG LINK MÀ DŨNG VỪA TEST THÀNH CÔNG
                const apiUrl = 'https://webcinema-zb8z.onrender.com/api/admin/auth/me';
                
                const response = await axios.get(apiUrl, {
                    withCredentials: true 
                });
                
                if (isMounted) {
                    // Kiểm tra xem backend trả về user và role có đúng là admin không
                    const userData = response.data.user || response.data;
                    if (userData && userData.role === 'admin') {
                        setIsAuthorized(true);
                    } else {
                        setIsAuthorized(false);
                    }
                }
            } catch (error) {
                console.error("❌ Lỗi bảo mật Admin:", error.response?.data?.message || error.message);
                if (isMounted) setIsAuthorized(false);
            }
        };

        checkAuth();
        return () => { isMounted = false; };
    }, [location.pathname]);

    // Đang chờ kiểm tra
    if (isAuthorized === null) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a', color: '#ff4d4d' }}>
                <div className="spinner">🛡️</div>
                <div style={{ marginTop: '10px' }}>ĐANG XÁC THỰC QUYỀN ADMIN...</div>
            </div>
        );
    }

    // Nếu không phải admin hoặc chưa đăng nhập -> Đá về trang login
    if (!isAuthorized) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    // Nếu là Admin -> Cho phép xem trang (children)
    return children;
};

export default ProtectedRoute;