import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const ProtectedRoute = ({ children }) => {
    const [isAuthorized, setIsAuthorized] = useState(null);
    const location = useLocation(); // Theo dõi vị trí trang để tránh check loop

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async () => {
            try {
                // Link chuẩn khớp với server.js của ông
                const apiUrl = 'https://webcinema-zb8z.onrender.com/admin/api/auth/admin/me';
                
                const response = await axios.get(apiUrl, {
                    withCredentials: true 
                });
                
                if (isMounted) {
                    const user = response.data.user;
                    if (user && user.role === 'admin') {
                        setIsAuthorized(true);
                    } else {
                        setIsAuthorized(false);
                    }
                }
            } catch (error) {
                // MẸO: Nếu vừa đăng nhập xong mà lỗi 401, có thể cookie chưa kịp nạp
                // Thử lại 1 lần duy nhất sau 500ms
                if (error.response?.status === 401) {
                    console.warn("⚠️ Đang thử xác thực lại...");
                    setTimeout(async () => {
                        try {
                            const retryRes = await axios.get('https://webcinema-zb8z.onrender.com/admin/api/auth/admin/me', { withCredentials: true });
                            if (isMounted && retryRes.data.user?.role === 'admin') {
                                setIsAuthorized(true);
                                return;
                            }
                        } catch (e) {
                            if (isMounted) setIsAuthorized(false);
                        }
                    }, 500);
                } else {
                    if (isMounted) setIsAuthorized(false);
                }
            }
        };

        checkAuth();
        return () => { isMounted = false; };
    }, [location.pathname]); // Re-check mỗi khi đổi trang cho chắc

    // --- RENDER LOGIC ---
    if (isAuthorized === null) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a', color: '#ff4d4d' }}>
                <div style={{ fontSize: '3rem' }}>🛡️</div>
                <div>ĐANG XÁC THỰC QUYỀN ADMIN...</div>
            </div>
        );
    }

    if (!isAuthorized) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;