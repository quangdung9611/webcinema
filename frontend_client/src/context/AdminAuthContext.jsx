// src/context/AdminAuthContext.jsx

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef,
    useCallback,
} from 'react';

import { useLocation } from 'react-router-dom';
import adminapi from '../api/adminapi';
import adminSocketService from '../api/adminsocket';

const AdminAuthContext = createContext(null);

export const useAdminAuth = () => {
    const context = useContext(AdminAuthContext);
    if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
    return context;
};

export const AdminAuthProvider = ({ children }) => {
    const location = useLocation();

    const [admin, setAdmin] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const adminRef = useRef(null);
    const isFetchingRef = useRef(false);
    const fetchedRef = useRef(false);
    const mountedRef = useRef(true);
    const isAuthCheckDoneRef = useRef(false);
    const socketConnectTimeoutRef = useRef(null);

    const isPublicRoute = useCallback(() => {
        const pathname = location.pathname;
        const publicPaths = ['/login'];
        return publicPaths.some((path) => pathname === path || pathname.startsWith(path + '/'));
    }, [location.pathname]);

    useEffect(() => {
        adminRef.current = admin;
    }, [admin]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (socketConnectTimeoutRef.current) {
                clearTimeout(socketConnectTimeoutRef.current);
            }
        };
    }, []);

    const clearAuthState = useCallback(() => {
        console.log('🧹 [ADMIN AUTH] Clearing auth state');
        adminRef.current = null;
        setAdmin(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        fetchedRef.current = false;
        isFetchingRef.current = false;
        adminapi.resetAdminCache();
    }, []);

    const fetchAdmin = useCallback(
        async (force = false) => {
            if (isPublicRoute()) {
                console.log('⏭️ [ADMIN AUTH] Public route, skip');
                setIsLoading(false);
                return null;
            }

            if (fetchedRef.current && !force) return adminRef.current;
            if (isFetchingRef.current) return adminRef.current;

            isFetchingRef.current = true;
            if (mountedRef.current) setIsLoading(true);

            try {
                console.log(force ? '🔄 [ADMIN AUTH] Force fetching...' : '🔄 [ADMIN AUTH] Fetching...');
                const response = await adminapi.get('/admin/api/auth/me', { force });
                const raw = response?.data;
                const adminData = raw?.user || raw?.data?.user || null;

                if (adminData) {
                    console.log('✅ [ADMIN AUTH] Admin loaded:', adminData.user_id);
                    adminRef.current = adminData;
                    fetchedRef.current = true;
                    isAuthCheckDoneRef.current = true;

                    if (mountedRef.current) {
                        setAdmin(adminData);
                        setIsAuthenticated(true);
                    }

                    // ✅ DELAY 1s TRƯỚC KHI CONNECT SOCKET
                    if (adminData.user_id && !isPublicRoute()) {
                        if (socketConnectTimeoutRef.current) {
                            clearTimeout(socketConnectTimeoutRef.current);
                        }
                        socketConnectTimeoutRef.current = setTimeout(() => {
                            console.log('🔌 [ADMIN AUTH] Connecting socket after 1s delay...');
                            adminSocketService.connect(adminData.user_id);
                        }, 1000);
                    }

                    return adminData;
                }

                console.log('🔵 [ADMIN AUTH] No active admin');
                clearAuthState();
                adminSocketService.disconnect();
                return null;

            } catch (error) {
                console.warn('🔵 [ADMIN AUTH] No active session:', error?.response?.status);

                if (error?.response?.status === 401 && !isPublicRoute()) {
                    window.dispatchEvent(new CustomEvent('sessionExpired', {
                        detail: {
                            code: error?.response?.data?.code || 'TOKEN_EXPIRED',
                            message: error?.response?.data?.message || 'Phiên đăng nhập admin đã hết hạn.',
                            source: 'admin_auth_context',
                            timestamp: new Date().toISOString()
                        }
                    }));
                }

                clearAuthState();
                adminSocketService.disconnect();
                throw error;

            } finally {
                isFetchingRef.current = false;
                if (mountedRef.current) setIsLoading(false);
            }
        },
        [clearAuthState, isPublicRoute]
    );

    useEffect(() => {
        if (!isPublicRoute()) {
            fetchAdmin().catch(() => {});
        } else {
            setIsLoading(false);
        }
    }, [fetchAdmin, isPublicRoute]);

    const logout = useCallback(async () => {
        console.log('🚪 [ADMIN AUTH] Logging out...');
        try {
            await adminapi.post('/admin/api/auth/logout');
        } catch (error) {
            console.warn('🟡 [ADMIN AUTH] Logout API error:', error?.message);
        } finally {
            clearAuthState();
            if (typeof adminapi.resetSessionExpiredLock === 'function') {
                adminapi.resetSessionExpiredLock();
            }
            adminSocketService.disconnect();
            window.dispatchEvent(new CustomEvent('authCleanedUp', {
                detail: { reason: 'manual_logout', isAdmin: true, timestamp: new Date().toISOString() }
            }));
            console.log('✅ [ADMIN AUTH] Logout completed');
        }
    }, [clearAuthState]);

    useEffect(() => {
        const handleAuthCleanedUp = () => {
            console.log('🧹 [ADMIN AUTH] authCleanedUp received');
            clearAuthState();
            adminSocketService.disconnect();
        };
        window.addEventListener('authCleanedUp', handleAuthCleanedUp);
        return () => window.removeEventListener('authCleanedUp', handleAuthCleanedUp);
    }, [clearAuthState]);

    useEffect(() => {
        const handleSessionExpired = (event) => {
            console.warn('🔴 [ADMIN AUTH] Session expired:', event?.detail);
            clearAuthState();
            adminSocketService.disconnect();
        };
        window.addEventListener('sessionExpired', handleSessionExpired);
        return () => window.removeEventListener('sessionExpired', handleSessionExpired);
    }, [clearAuthState]);

    useEffect(() => {
        const handleAdminLoggedIn = () => {
            console.log('🟢 [ADMIN AUTH] Admin logged in');
            fetchedRef.current = false;
            isFetchingRef.current = false;
            adminapi.resetAdminCache();

            if (typeof adminapi.resetSessionExpiredLock === 'function') {
                adminapi.resetSessionExpiredLock();
            }

            fetchAdmin(true).catch((error) => {
                console.warn('🟡 [ADMIN AUTH] Cannot fetch admin after login:', error?.message);
            });
        };
        window.addEventListener('adminLoggedIn', handleAdminLoggedIn);
        return () => window.removeEventListener('adminLoggedIn', handleAdminLoggedIn);
    }, [fetchAdmin]);

    const refetch = useCallback(() => fetchAdmin(true), [fetchAdmin]);

    const updateAdmin = useCallback((newAdmin) => {
        adminRef.current = newAdmin;
        setAdmin(newAdmin);
        setIsAuthenticated(Boolean(newAdmin));
    }, []);

    const value = {
        admin,
        user: admin,
        isLoading,
        isAuthenticated,
        fetchAdmin,
        refetch,
        logout,
        setAdmin: updateAdmin,
        clearAuthState,
    };

    return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export default AdminAuthContext;