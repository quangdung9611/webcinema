import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BASE_URL = 'https://api.quangdungcinema.id.vn';

// 1. Khởi tạo Axios instance
const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true // 🔥 BẮT BUỘC: Để gửi kèm cookie tự động
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);    
    const [admin, setAdmin] = useState(null);  
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        setLoading(true);
        const hostname = window.location.hostname;
        const isAdminDomain = hostname.startsWith('admin.');

        // ✅ SỬA: Dùng chung endpoint /api/auth/me cho cả admin và user
        // Phân biệt qua role trong response
        const endpoint = '/api/auth/me';

        try {
            const res = await api.get(endpoint);
            const userData = res.data?.user;

            if (isAdminDomain) {
                // Ở trang admin: chỉ cho phép nếu role === 'admin'
                if (userData && userData.role === 'admin') {
                    setAdmin(userData);
                    setUser(null); 
                } else {
                    setAdmin(null);
                    setUser(null);
                }
            } else {
                // Ở trang user: nhận diện user bình thường (không cần check email_verified ở đây)
                // ProtectedRoute sẽ kiểm tra email_verified
                setUser(userData || null);
                setAdmin(null);
            }
        } catch (err) {
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

    // ✅ THÊM: Hàm logout dùng chung
    const logout = useCallback(async () => {
        try {
            await api.post('/api/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearAuth();
            window.dispatchEvent(new Event('authChange'));
        }
    }, [clearAuth]);

    useEffect(() => {
        checkAuth();
        
        const handleAuthChange = () => checkAuth();
        window.addEventListener('authChange', handleAuthChange);
        
        return () => window.removeEventListener('authChange', handleAuthChange);
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
            logout, // ✅ THÊM logout
            BASE_URL, 
            api 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);