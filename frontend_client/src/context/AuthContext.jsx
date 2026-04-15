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
 * Đảm bảo mỗi request gửi đi đều mang theo Origin chính xác.
 * Backend sẽ dựa vào đây để set 'domain' cho cookie khớp với trang Dũng đang đứng.
 */
api.interceptors.request.use((config) => {
    config.headers['Origin'] = window.location.origin; 
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
        const isAdminDomain = hostname.startsWith('admin.');

        // Chọn đúng "cửa" để hỏi thông tin
        const endpoint = isAdminDomain 
            ? '/admin/api/auth/me'  
            : '/api/auth/me';        

        try {
            const res = await api.get(endpoint);
            const userData = res.data?.user;

            if (isAdminDomain) {
                // Nếu ở trang admin, chỉ chấp nhận role admin
                if (userData && userData.role === 'admin') {
                    setAdmin(userData);
                    setUser(null); 
                } else {
                    // Nếu lỡ có token user thường ở đây, coi như không hợp lệ
                    setAdmin(null);
                    setUser(null);
                }
            } else {
                // Nếu ở trang user, chỉ quan tâm user thường (hoặc admin xem với tư cách khách)
                setUser(userData || null);
                setAdmin(null);
            }
        } catch (err) {
            setAdmin(null);
            setUser(null);
            // console.log("Hệ thống: Phiên làm việc không tồn tại hoặc hết hạn.");
        } finally {
            setLoading(false);
        }
    }, []);

    // Hàm xóa sạch bách khi Logout
    const clearAuth = useCallback(() => {
        setUser(null);
        setAdmin(null);
    }, []);

    useEffect(() => {
        checkAuth();
        
        // Lắng nghe sự kiện để đồng bộ giữa các tab
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
            BASE_URL, 
            api 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);