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
        // Kiểm tra xem có phải sub-domain admin không
        const isAdminDomain = hostname.startsWith('admin.');

        try {
            const res = await axios.get(`${BASE_URL}/api/auth/me`, {
                withCredentials: true
            });

            const userData = res.data?.user;

            if (isAdminDomain) {
                // ĐANG Ở TRANG ADMIN
                if (userData?.role === 'admin') {
                    setAdmin(userData);
                    setUser(userData); // Admin cũng là một user
                } else {
                    setAdmin(null);
                    setUser(null);
                }
            } else {
                // ĐANG Ở TRANG USER (KHÁCH HÀNG)
                setUser(userData || null);
                setAdmin(null); // Không cấp quyền admin ở domain khách
            }

        } catch (err) {
            console.log("Auth error:", err.response?.data?.message || err.message);
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

        // Lắng nghe sự kiện tùy biến để cập nhật UI ngay lập tức
        const handleAuthChange = () => checkAuth();
        window.addEventListener('authChange', handleAuthChange);
        
        // Sự kiện storage giúp đồng bộ giữa các tab (nếu dùng chung domain)
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