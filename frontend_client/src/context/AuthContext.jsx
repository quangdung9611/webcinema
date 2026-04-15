import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BASE_URL = 'https://api.quangdungcinema.id.vn';

// Cấu hình axios dùng chung
const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true 
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);    
    const [admin, setAdmin] = useState(null);  
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        setLoading(true);
        const hostname = window.location.hostname;
        
        // Nhận diện domain
        const isAdminDomain = hostname.startsWith('admin.');

        /**
         * 🔥 CHỈNH ENDPOINT CHO KHỚP BACKEND:
         * Admin: /admin/api/auth/me (Lấy admintoken)
         * User: /api/auth/me (Lấy usertoken)
         */
        const endpoint = isAdminDomain 
            ? '/admin/api/auth/me'  
            : '/api/auth/me';        

        try {
            const res = await api.get(endpoint);
            const userData = res.data?.user;

            if (isAdminDomain) {
                // Nếu ở trang Admin, chỉ lưu vào state admin
                if (userData && userData.role === 'admin') {
                    setAdmin(userData);
                    setUser(null); // Đảm bảo không bị lẫn lộn
                }
            } else {
                // Nếu ở trang User
                setUser(userData || null);
                setAdmin(null);
            }
        } catch (err) {
            // Nếu lỗi (401), xóa sạch state tương ứng
            if (isAdminDomain) {
                setAdmin(null);
            } else {
                setUser(null);
            }
            console.log("Hệ thống: Chưa có phiên làm việc tại domain này.");
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
        
        // Lắng nghe sự kiện để cập nhật auth tức thì khi login/logout
        const handleAuthChange = () => checkAuth();
        window.addEventListener('authChange', handleAuthChange);
        
        return () => {
            window.removeEventListener('authChange', handleAuthChange);
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
            clearAuth,
            BASE_URL,
            api 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);