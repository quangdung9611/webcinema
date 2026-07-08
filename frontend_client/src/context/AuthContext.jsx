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

        try {
            const res = await api.get('/api/auth/me');
            const userData = res.data?.user;

            if (isAdminDomain) {
                // ✅ Domain admin: CHỈ chấp nhận role admin
                if (userData && userData.role === 'admin') {
                    setAdmin(userData);
                    setUser(null); 
                } else {
                    // ❌ Nếu không phải admin thì clear hết
                    setAdmin(null);
                    setUser(null);
                }
            } else {
                // ✅ Domain user: CHỈ chấp nhận role customer
                if (userData && userData.role === 'customer') {
                    setUser(userData);
                    setAdmin(null);
                } else {
                    // ❌ Nếu không phải customer thì clear hết
                    setUser(null);
                    setAdmin(null);
                }
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
            logout,
            BASE_URL, 
            api 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);