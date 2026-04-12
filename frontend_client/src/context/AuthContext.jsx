import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BASE_URL = 'https://webcinema-zb8z.onrender.com'; 

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        setLoading(true); 
        try {
            // --- SỬA LẠI ĐÚNG ĐƯỜNG DẪN MỚI TẠI ĐÂY ---
            const isAdminPath = window.location.pathname.includes('/admin');
            
            // Nếu là admin thì gọi vào admin/api để trình duyệt tự gửi admintoken (vì cùng path /admin)
            const endpoint = isAdminPath 
                ? `${BASE_URL}/admin/api/auth/me` 
                : `${BASE_URL}/api/auth/me`;

            const res = await axios.get(endpoint, { withCredentials: true });
            
            if (res.data && res.data.user) {
                setUser(res.data.user);
            } else {
                setUser(null);
            }
        } catch (err) {
            // Token sai hoặc hết hạn hoặc không có token
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();

        const handleAuthChange = () => checkAuth();
        window.addEventListener('authChange', handleAuthChange);
        
        return () => window.removeEventListener('authChange', handleAuthChange);
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{ user, setUser, loading, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);