import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Dùng URL từ env hoặc mặc định (nhớ bỏ dấu / ở cuối)
const BASE_URL = 'https://webcinema-zb8z.onrender.com'; 

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        setLoading(true); 
        try {
            // Logic quan trọng: Tự nhận diện để gọi đúng cổng soát vé
            const isAdminPath = window.location.pathname.includes('/admin');
            const endpoint = isAdminPath 
                ? `${BASE_URL}/api/admin/auth/me` 
                : `${BASE_URL}/api/auth/me`;

            const res = await axios.get(endpoint, { withCredentials: true });
            
            if (res.data && res.data.user) {
                setUser(res.data.user);
            } else {
                setUser(null);
            }
        } catch (err) {
            // Im lặng khi chưa login, chỉ set null
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []); // Chạy 1 lần duy nhất khi load App hoặc gọi thủ công

    useEffect(() => {
        checkAuth();

        // Lắng nghe sự kiện login thành công từ các component khác
        const handleAuthChange = () => checkAuth();
        window.addEventListener('authChange', handleAuthChange);
        
        return () => window.removeEventListener('authChange', handleAuthChange);
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{ user, setUser, loading, checkAuth }}>
            {/* Đảm bảo App luôn hiển thị sau khi đã check xong */}
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);