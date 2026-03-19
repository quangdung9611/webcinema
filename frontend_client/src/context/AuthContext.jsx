import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            // 1. NHẬN DIỆN LÀN ĐƯỜNG
            const isAdminPage = window.location.pathname.startsWith('/admin');
            
            // Link chuẩn khớp với index.js (server) đã sửa
            const authEndpoint = isAdminPage 
                ? 'https://webcinema-zb8z.onrender.com/api/admin/auth/me' 
                : 'https://webcinema-zb8z.onrender.com/api/auth/me';

            console.log(`[AuthCheck] Đang kiểm tra tại: ${isAdminPage ? 'ADMIN' : 'USER'}`);

            const res = await axios.get(authEndpoint, { 
                withCredentials: true 
            });
            
            // 2. CẬP NHẬT USER (Bốc đúng dữ liệu từ Backend)
            // Ưu tiên res.data.user trước, nếu không có thì lấy cả res.data
            const userData = res.data.user || res.data;

            if (userData && (userData.id || userData.role || userData.full_name)) {
                setUser(userData);
                console.log("✅ Đã xác thực:", userData.full_name || userData.email);
            } else {
                setUser(null);
            }
        } catch (err) {
            console.warn("⚠️ Auth check failed:", err.response?.data?.message || err.message);
            setUser(null);
        } finally {
            setLoading(false); 
        }
    }, []);

    useEffect(() => {
        // Chạy lần đầu khi load trang
        checkAuth();

        const handleAuthChange = () => {
            console.log("🔔 Nhận sự kiện authChange - Đang tải lại dữ liệu...");
            checkAuth();
        };

        // Lắng nghe sự kiện từ trang Login
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