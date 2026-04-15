import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BASE_URL = 'https://api.quangdungcinema.id.vn';

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
        
        // Hỗ trợ cả domain thật và localhost khi dev
        const isAdminDomain = hostname.startsWith('admin.') || hostname.includes('admin');

        // Chọn đúng endpoint như đã thống nhất ở Backend
        const endpoint = isAdminDomain 
            ? '/api/admin/auth/me'  // Đường riêng cho Admin
            : '/api/auth/me';        // Đường riêng cho User

        try {
            const res = await api.get(endpoint);
            const userData = res.data?.user;

            if (isAdminDomain) {
                // Đang ở tab Admin: Chỉ quan tâm nếu là admin thực thụ
                if (userData && userData.role === 'admin') {
                    setAdmin(userData);
                } else {
                    setAdmin(null);
                }
            } else {
                // Đang ở tab User: Lưu vào state user
                setUser(userData || null);
            }
        } catch (err) {
            // Chỉ xóa state của domain hiện tại để không ảnh hưởng tab kia
            if (isAdminDomain) {
                setAdmin(null);
            } else {
                setUser(null);
            }
            console.warn("Chưa đăng nhập tại domain này.");
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
        
        // Lắng nghe sự kiện thay đổi auth (nếu có)
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