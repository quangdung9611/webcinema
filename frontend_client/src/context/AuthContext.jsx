import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            // 1. NHẬN DIỆN LÀN ĐƯỜNG (Khớp với Path Cookie)
            const isAdminPage = window.location.pathname.startsWith('/admin');
            
            // Endpoint chuẩn khớp với cấu trúc Router ở Backend
            const authEndpoint = isAdminPage 
                ? 'https://webcinema-zb8z.onrender.com/api/admin/auth/me' 
                : 'https://webcinema-zb8z.onrender.com/api/auth/me';

            console.log(`[AuthCheck] Đang kiểm tra tại: ${isAdminPage ? 'ADMIN' : 'USER'}`);

            const res = await axios.get(authEndpoint, { 
                withCredentials: true 
            });
            
            // 2. XỬ LÝ DỮ LIỆU
            // Backend trả về { user: { ... } } nên ta bốc res.data.user
            const userData = res.data.user;

            if (userData) {
                setUser(userData);
                console.log("✅ Xác thực thành công:", userData.full_name || userData.username);
            } else {
                setUser(null);
            }
        } catch (err) {
            // Nếu lỗi 401 (Hết hạn/Không có token) thì set user về null
            if (err.response && err.response.status === 401) {
                console.warn("⚠️ Phiên đăng nhập hết hạn hoặc chưa đăng nhập.");
            } else {
                console.error("❌ Lỗi kiểm tra Auth:", err.message);
            }
            setUser(null);
        } finally {
            setLoading(false); 
        }
    }, []);

    useEffect(() => {
        // Chạy kiểm tra ngay khi load app
        checkAuth();

        // Lắng nghe sự kiện tùy chỉnh 'authChange' (Dùng khi Login/Logout xong phát tín hiệu)
        const handleAuthChange = () => {
            console.log("🔔 Nhận tín hiệu thay đổi Auth - Đang refresh...");
            checkAuth();
        };

        window.addEventListener('authChange', handleAuthChange);
        
        return () => {
            window.removeEventListener('authChange', handleAuthChange);
        };
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{ user, setUser, loading, setLoading, checkAuth }}>
            {!loading && children} 
            {/* Mẹo: !loading && children để đảm bảo App chỉ render 
               khi đã biết chắc chắn trạng thái user (tránh bị nhảy trang)
            */}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};