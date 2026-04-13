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
        const hostname = window.location.hostname;
        const isAdminDomain = hostname === 'admin.quangdungcinema.id.vn';

        try {
            const res = await axios.get(`${BASE_URL}/api/auth/me`, {
                withCredentials: true
            });

            const userData = res.data?.user;

            if (isAdminDomain) {
                // Nếu ở domain Admin, chỉ chấp nhận role admin
                if (userData?.role === 'admin') {
                    setAdmin(userData);
                } else {
                    setAdmin(null);
                }
                setUser(null); // Luôn dọn sạch user ở domain admin
            } else {
                // Nếu ở domain User
                setUser(userData || null);
                setAdmin(null); // Luôn dọn sạch admin ở domain user
            }

        } catch (err) {
            console.log("Auth error:", err.message);
            setAdmin(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Thêm hàm clearAuth để dùng cho Logout
    const clearAuth = useCallback(() => {
        setUser(null);
        setAdmin(null);
    }, []);

    useEffect(() => {
        checkAuth();

        const handleAuthChange = () => checkAuth();
        window.addEventListener('authChange', handleAuthChange);
        window.addEventListener('storage', handleAuthChange); // Thêm cái này để đồng bộ tab tốt hơn

        return () => {
            window.removeEventListener('authChange', handleAuthChange);
            window.removeEventListener('storage', handleAuthChange);
        };
    }, [checkAuth]);

    return (
        // Export đầy đủ các hàm cần thiết
        <AuthContext.Provider value={{ user, admin, setUser, setAdmin, loading, checkAuth, clearAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);