import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// 1. Cấu hình BASE_URL
const BASE_URL = 'https://api.quangdungcinema.id.vn';

// Tạo instance để tự động đính kèm Cookie (withCredentials)
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
        const isAdminDomain = hostname.startsWith('admin.');

        // 🔥 SỬA LẠI ĐÂY: Quyết định endpoint dựa trên subdomain
        // Admin dùng cụm /admin/api, User dùng cụm /api
        const endpoint = isAdminDomain 
            ? '/admin/api/auth/me' 
            : '/api/auth/me'; 

        try {
            const res = await api.get(endpoint);
            const userData = res.data?.user;

            if (isAdminDomain) {
                // Nếu đang ở domain admin, chỉ chấp nhận nếu role đúng là admin
                if (userData && userData.role === 'admin') {
                    setAdmin(userData);
                    setUser(userData); // Admin vẫn có quyền xem như user
                } else {
                    setAdmin(null);
                    setUser(null);
                }
            } else {
                // Trang khách (quangdungcinema.id.vn)
                setUser(userData || null);
                setAdmin(null); 
            }
        } catch (err) {
            // Khi lỗi 401 (chưa đăng nhập), console.warn thôi cho đỡ đỏ log
            console.warn("Phiên làm việc đã hết hạn hoặc chưa đăng nhập.");
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