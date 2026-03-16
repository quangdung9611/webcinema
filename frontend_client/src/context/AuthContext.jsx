import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Dùng useCallback để hàm không bị khởi tạo lại vô ích
    const checkAuth = useCallback(async () => {
        try {
            // Đảm bảo luôn có withCredentials
            const res = await axios.get('http://localhost:5000/api/auth/me', { 
                withCredentials: true 
            });
            
            // Cập nhật user từ response
            if (res.data && (res.data.user || res.data.full_name)) {
                setUser(res.data.user || res.data);
            } else {
                setUser(null);
            }
        } catch (err) {
            console.error("Auth check failed:", err.message);
            setUser(null);
        } finally {
            // QUAN TRỌNG: Luôn tắt loading bất kể thành công hay thất bại
            setLoading(false); 
        }
    }, []);

    useEffect(() => {
        // Chạy kiểm tra lần đầu khi load app
        checkAuth();

        // Lắng nghe sự kiện authChange từ UserLogin/Header để cập nhật ngay lập tức
        const handleAuthChange = () => {
            checkAuth();
        };

        window.addEventListener('authChange', handleAuthChange);
        
        // Dọn dẹp event khi unmount
        return () => {
            window.removeEventListener('authChange', handleAuthChange);
        };
    }, [checkAuth]);

    return (
        <AuthContext.Provider value={{ user, setUser, loading, setLoading, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};