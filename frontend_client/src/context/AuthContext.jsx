import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        const path = window.location.pathname;

        // 🟢 BƯỚC VÁ LỖI: Nếu đang ở trang Login thì không cần checkAuth 
        // Điều này giúp tab Network sạch sẽ, không bị hiện lỗi 401 khi chưa đăng nhập.
        if (path.includes('/login')) {
            setLoading(false);
            setUser(null);
            return;
        }

        try {
            // 1. NHẬN DIỆN LÀN ĐƯỜNG (Dựa trên URL)
            const isAdminPage = path.startsWith('/admin');
            
            const authEndpoint = isAdminPage 
                ? 'https://webcinema-zb8z.onrender.com/api/admin/auth/me' 
                : 'https://webcinema-zb8z.onrender.com/api/auth/me';

            console.log(`[AuthCheck] Đang kiểm tra tại: ${isAdminPage ? 'ADMIN' : 'USER'}`);

            const res = await axios.get(authEndpoint, { 
                withCredentials: true 
            });
            
            // 2. CẬP NHẬT USER
            const userData = res.data.user || res.data;

            if (userData && (userData.id || userData.role || userData.full_name)) {
                setUser(userData);
                console.log("✅ Xác thực thành công:", userData.full_name);
            } else {
                setUser(null);
            }
        } catch (err) {
            // Khi lỗi, chỉ warn nhẹ, không in đỏ cho rối mắt
            console.warn("⚠️ Chưa đăng nhập hoặc phiên làm việc hết hạn.");
            setUser(null);
        } finally {
            setLoading(false); 
        }
    }, []);

    useEffect(() => {
        checkAuth();

        const handleAuthChange = () => {
            console.log("🔔 Nhận tín hiệu authChange - Cập nhật dữ liệu mới...");
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