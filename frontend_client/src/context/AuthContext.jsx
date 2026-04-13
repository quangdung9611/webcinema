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
            if (isAdminDomain) {
                // 🔥 ADMIN
                try {
                    const res = await axios.get(`${BASE_URL}/api/auth/me`, {
                        withCredentials: true
                    });

                    if (res.data?.user?.role === 'admin') {
                        setAdmin(res.data.user);
                    } else {
                        setAdmin(null);
                    }

                } catch {
                    setAdmin(null);
                }

                setUser(null);

            } else {
                // 🔥 USER
                try {
                    const res = await axios.get(`${BASE_URL}/api/auth/me`, {
                        withCredentials: true
                    });

                    if (res.data?.user) {
                        setUser(res.data.user);
                    } else {
                        setUser(null);
                    }

                } catch {
                    setUser(null);
                }

                setAdmin(null);
            }

        } catch (err) {
            console.log("Auth error:", err);
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