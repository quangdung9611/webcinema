import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            // 1. TỰ ĐỘNG NHẬN DIỆN LÀN ĐƯỜNG (Admin hay User)
            // Nếu URL bắt đầu bằng /admin, mình sẽ gọi đầu API dành riêng cho Admin
            const isAdminPage = window.location.pathname.startsWith('/admin');
            
            const authEndpoint = isAdminPage 
                ? 'https://webcinema-zb8z.onrender.com/api/admin/auth/me' 
                : 'https://webcinema-zb8z.onrender.com/api/auth/me';

            console.log(`[AuthCheck] Đang gọi: ${authEndpoint}`);

            const res = await axios.get(authEndpoint, { 
                withCredentials: true 
            });
            
            // 2. CẬP NHẬT USER
            // Kiểm tra cấu trúc data trả về (thường là res.data.user)
            if (res.data && res.data.user) {
                setUser(res.data.user);
            } else if (res.data && res.data.full_name) {
                setUser(res.data);
            } else {
                setUser(null);
            }
        } catch (err) {
            // Nếu lỗi 401/403 (chưa đăng nhập hoặc sai token) thì set user về null
            console.warn("Auth check failed:", err.response?.data?.message || err.message);
            setUser(null);
        } finally {
            setLoading(false); 
        }
    }, []);

    useEffect(() => {
        checkAuth();

        const handleAuthChange = () => {
            console.log("🔔 Nhận sự kiện authChange - Đang cập nhật lại user...");
            checkAuth();
        };

        window.addEventListener('authChange', handleAuthChange);
        
        return () => {
            window.removeEventListener('authChange', handleAuthChange);
        };
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{ user, setUser, loading, setLoading, checkAuth }}>
            {children}
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