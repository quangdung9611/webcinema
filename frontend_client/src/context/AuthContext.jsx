import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// 🔥 THAY ĐỔI LỚN: Sử dụng domain API mới thay cho link Render cũ
const BASE_URL = 'https://api.quangdungcinema.id.vn';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);    
    const [admin, setAdmin] = useState(null);  
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        setLoading(true);
        const hostname = window.location.hostname;
        
        // 1. Xác định môi trường đang đứng (trang chủ hay trang admin)
        const isAdminDomain = hostname.startsWith('admin.');

        // 2. CHỌN ĐÚNG PATH (Dùng link api. chuyên nghiệp)
        // Link mới: https://api.quangdungcinema.id.vn/api/auth/me
        const apiPath = isAdminDomain 
            ? `${BASE_URL}/admin/api/auth/me` 
            : `${BASE_URL}/api/auth/me`;

        try {
            const res = await axios.get(apiPath, {
                withCredentials: true // 🔥 BẮT BUỘC: Để trình duyệt tự gửi Cookie usertoken/admintoken
            });

            const userData = res.data?.user;

            if (isAdminDomain) {
                // --- LUỒNG TRANG ADMIN ---
                if (userData && userData.role === 'admin') {
                    setAdmin(userData);
                    setUser(userData); 
                } else {
                    setAdmin(null);
                    setUser(null);
                }
            } else {
                // --- LUỒNG TRANG KHÁCH ---
                setUser(userData || null);
                setAdmin(null); 
            }

        } catch (err) {
            console.warn(`Auth check: Phiên làm việc không tồn tại hoặc đã hết hạn.`);
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
            clearAuth,
            BASE_URL // Để các component khác dùng axios gọi API cho đúng link api.
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);