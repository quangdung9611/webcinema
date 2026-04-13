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
            const isAdminPath = window.location.pathname.includes('/admin');

            if (isAdminPath) {
                // --- VÙNG ADMIN: CHỈ LÀM VIỆC VỚI ADMIN ---
                try {
                    const adminRes = await axios.get(`${BASE_URL}/admin/api/auth/me`, { withCredentials: true });
                    
                    if (adminRes.data && adminRes.data.user && adminRes.data.user.role === 'admin') {
                        setAdmin(adminRes.data.user);
                    } else {
                        setAdmin(null);
                    }
                } catch (e) {
                    setAdmin(null);
                }
                // Xóa sổ usertoken trong state khi ở vùng admin
                setUser(null); 

            } else {
                // --- VÙNG CLIENT: CHỈ LÀM VIỆC VỚI USER ---
                try {
                    const userRes = await axios.get(`${BASE_URL}/api/auth/me`, { withCredentials: true });
                    if (userRes.data && userRes.data.user) {
                        setUser(userRes.data.user);
                    } else {
                        setUser(null);
                    }
                } catch (e) {
                    setUser(null);
                }
                // Xóa sổ admintoken trong state khi ở vùng client
                setAdmin(null);
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