import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BASE_URL = 'https://webcinema-zb8z.onrender.com'; 

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);       
    const [admin, setAdmin] = useState(null);     
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        setLoading(true); 
        try {
            // --- 1. KIỂM TRA USER THƯỜNG ---
            try {
                const userRes = await axios.get(`${BASE_URL}/api/auth/me`, { withCredentials: true });
                // Check role: Nếu lỡ lấy nhầm token admin mà role là admin thì cũng cho login user luôn
                if (userRes.data && userRes.data.user) {
                    setUser(userRes.data.user);
                }
            } catch (e) {
                setUser(null); // Lỗi hoặc chưa login thì xóa trắng user
            }

            // --- 2. KIỂM TRA ADMIN (NGHIÊM NGẶT) ---
            if (window.location.pathname.includes('/admin')) {
                try {
                    const adminRes = await axios.get(`${BASE_URL}/admin/api/auth/me`, { withCredentials: true });
                    
                    // KIỂM TRA ROLE TRỰC TIẾP TẠI ĐÂY
                    if (adminRes.data && adminRes.data.user && adminRes.data.user.role === 'admin') {
                        setAdmin(adminRes.data.user);
                    } else {
                        // Nếu có user nhưng role KHÔNG PHẢI admin -> Đuổi thẳng cổ
                        setAdmin(null);
                        console.error("Cảnh báo: Phát hiện truy cập trái phép vào vùng Admin!");
                    }
                } catch (e) {
                    setAdmin(null);
                }
            }
        } catch (err) {
            console.log("Hệ thống xác thực có vấn đề");
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
        <AuthContext.Provider value={{ user, admin, setUser, setAdmin, loading, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);