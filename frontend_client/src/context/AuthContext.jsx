import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BASE_URL = 'https://api.quangdungcinema.id.vn';

// 1. Khởi tạo Axios instance
const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true // 🔥 BẮT BUỘC: Để gửi kèm admintoken/usertoken tự động
});

// Loại bỏ Interceptor ép Origin vì trình duyệt sẽ tự gửi Origin chuẩn của nó
// Điều này giúp tránh lỗi "CORS preflight" phức tạp.

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);    
    const [admin, setAdmin] = useState(null);  
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        setLoading(true);
        const hostname = window.location.hostname;
        const isAdminDomain = hostname.startsWith('admin.');

        // Chọn đúng "cửa" để xác thực dựa trên trang đang đứng
        const endpoint = isAdminDomain 
            ? '/admin/api/auth/me'  
            : '/api/auth/me';        

        try {
            const res = await api.get(endpoint);
            const userData = res.data?.user;

            if (isAdminDomain) {
                // Ở trang admin thì chỉ tin tưởng dữ liệu có role admin
                if (userData && userData.role === 'admin') {
                    setAdmin(userData);
                    setUser(null); 
                } else {
                    setAdmin(null);
                    setUser(null);
                }
            } else {
                // Ở trang chủ thì nhận diện user bình thường
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

    useEffect(() => {
        checkAuth();
        
        const handleAuthChange = () => checkAuth();
        window.addEventListener('authChange', handleAuthChange);
        
        return () => window.removeEventListener('authChange', handleAuthChange);
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{ 
            user, admin, setUser, setAdmin, loading, checkAuth, clearAuth, BASE_URL, api 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);