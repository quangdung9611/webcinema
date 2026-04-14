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

        // 🔥 CHỈNH LẠI ENDPOINT: 
        // Nếu Backend của ông chỉ có 1 route /api/auth/me dùng chung cho cả 2 token
        // thì ông chỉ cần gọi đúng route đó. 
        const endpoint = '/api/auth/me'; 

        try {
            // Sử dụng instance 'api' đã có withCredentials: true
            const res = await api.get(endpoint);
            const userData = res.data?.user;

            if (isAdminDomain) {
                // Kiểm tra nếu là admin thì mới setAdmin
                if (userData && userData.role === 'admin') {
                    setAdmin(userData);
                    setUser(userData);
                } else {
                    setAdmin(null);
                    setUser(null);
                }
            } else {
                // Trang khách www.
                setUser(userData || null);
                setAdmin(null); 
            }
        } catch (err) {
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
        // Gọi checkAuth ngay khi app load
        checkAuth();

        const handleAuthChange = () => checkAuth();
        window.addEventListener('authChange', handleAuthChange);
        
        // 🔥 QUAN TRỌNG: Thêm cái này để khi login xong nó load lại data ngay
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