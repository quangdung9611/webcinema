import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            const isAdminPage = window.location.pathname.startsWith('/admin');
            
            // --- ĐÃ ĐỔI SANG DOMAIN THẬT ĐỂ NHẬN COOKIE ---
            const BASE_URL = 'https://webcinema-zb8z.onrender.com'; 
            
            const authEndpoint = isAdminPage 
                ? `${BASE_URL}/api/admin/auth/me` 
                : `${BASE_URL}/api/auth/me`;

            const res = await axios.get(authEndpoint, { withCredentials: true });
            
            // Backend trả về { user: { ... } }
            const userData = res.data.user;

            if (userData) {
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
                console.log("✅ Username hiện tại:", userData.username);
            } else {
                setUser(null);
                localStorage.removeItem('user');
            }
        } catch (err) {
            setUser(null);
            localStorage.removeItem('user');
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
        <AuthContext.Provider value={{ user, setUser, loading, setLoading, checkAuth }}>
            {!loading && children} 
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);