import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BASE_URL = 'https://api.quangdungcinema.id.vn';

// 1. Khởi tạo Axios instance
const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true 
});

/**
 * 🔥 LOGIC INCLUDE ORIGIN:
 * Đảm bảo mỗi request gửi đi đều mang theo Origin chính xác
 * giúp Backend thực hiện "bẻ lái" domain cookie chuẩn 100%
 */
api.interceptors.request.use((config) => {
    const origin = window.location.origin;
    config.headers['Origin'] = origin; 
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);    
    const [admin, setAdmin] = useState(null);  
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        setLoading(true);
        const hostname = window.location.hostname;
        
        // Nhận diện domain để chọn "cửa" API
        const isAdminDomain = hostname.startsWith('admin.');

        const endpoint = isAdminDomain 
            ? '/admin/api/auth/me'  
            : '/api/auth/me';        

        try {
            const res = await api.get(endpoint);
            const userData = res.data?.user;

            if (isAdminDomain) {
                if (userData && userData.role === 'admin') {
                    setAdmin(userData);
                    setUser(null); 
                }
            } else {
                setUser(userData || null);
                setAdmin(null);
            }
        } catch (err) {
            if (isAdminDomain) setAdmin(null);
            else setUser(null);
            console.log("Hệ thống: Phiên làm việc không tồn tại tại domain này.");
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