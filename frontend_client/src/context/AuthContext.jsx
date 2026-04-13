import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Dùng URL Render của Dũng
const BASE_URL = 'https://webcinema-zb8z.onrender.com';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);    // Thông tin người dùng nói chung
    const [admin, setAdmin] = useState(null);  // Thông tin quản trị viên
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        setLoading(true);
        const hostname = window.location.hostname;
        
        // 1. Xác định xem đang đứng ở subdomain admin hay không
        const isAdminDomain = hostname.startsWith('admin.');

        // 2. CHỌN ĐÚNG PATH: Nhà nào thức nấy
        // Nếu ở admin.quangdungcinema.id.vn -> Gọi /admin/api/auth/me
        // Nếu ở quangdungcinema.id.vn -> Gọi /api/auth/me
        const apiPath = isAdminDomain 
            ? `${BASE_URL}/admin/api/auth/me` 
            : `${BASE_URL}/api/auth/me`;

        try {
            const res = await axios.get(apiPath, {
                withCredentials: true
            });

            const userData = res.data?.user;

            if (isAdminDomain) {
                // ĐANG Ở TRANG ADMIN
                if (userData?.role === 'admin') {
                    setAdmin(userData);
                    setUser(userData); 
                } else {
                    setAdmin(null);
                    setUser(null);
                }
            } else {
                // ĐANG Ở TRANG USER (KHÁCH HÀNG)
                setUser(userData || null);
                setAdmin(null); 
            }

        } catch (err) {
            // Khi bị 401 (hết hạn hoặc chưa login), xóa sạch state
            console.log(`Auth check failed at ${apiPath}:`, err.response?.data?.message || err.message);
            setAdmin(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const clearAuth = useCallback(() => {
        setUser(null);
        setAdmin(null);
    }, []);

    useEffect(() => {
        checkAuth();

        const handleAuthChange = () => checkAuth();
        window.addEventListener('authChange', handleAuthChange);
        window.addEventListener('storage', handleAuthChange); 

        return () => {
            window.removeEventListener('authChange', handleAuthChange);
            window.removeEventListener('storage', handleAuthChange);
        };
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{ 
            user, 
            admin, 
            setUser, 
            setAdmin, 
            loading, 
            checkAuth, 
            clearAuth 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);