// src/context/AdminAuthContext.jsx
// ============================================================
// ADMIN AUTH CONTEXT — RIÊNG CHO ADMIN
// Pattern giống hệt AuthContext của user
// ============================================================

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
import socketService from '../api/socket';

const AdminAuthContext = createContext(null);

export const useAdminAuth = () => {
    const context = useContext(AdminAuthContext);
    if (!context) {
        throw new Error('useAdminAuth must be used within AdminAuthProvider');
    }
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

    // ========================================================
    // PUBLIC ROUTES CHO ADMIN
    // ========================================================
    const isPublicRoute = useCallback(() => {
        const pathname = location.pathname;

        const publicPaths = [
            '/login',
        ];

        return publicPaths.some(
            (path) => pathname === path || pathname.startsWith(path + '/')
        );
    }, [location.pathname]);

    useEffect(() => {
        adminRef.current = admin;
    }, [admin]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // ========================================================
    // CLEAR AUTH STATE
    // ========================================================
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

    // ========================================================
    // FETCH ADMIN
    // ========================================================
    const fetchAdmin = useCallback(
        async (force = false) => {
            if (isPublicRoute()) {
                console.log('⏭️ [ADMIN AUTH] Public route, skip fetching admin');
                setIsLoading(false);
                return null;
            }

            if (fetchedRef.current && !force) {
                console.log('⏭️ [ADMIN AUTH] Already fetched, skip');
                return adminRef.current;
            }

            if (isFetchingRef.current) {
                console.log('⏭️ [ADMIN AUTH] Already fetching, skip');
                return adminRef.current;
            }

            isFetchingRef.current = true;

            if (mountedRef.current) {
                setIsLoading(true);
            }

            try {
                console.log(force ? '🔄 [ADMIN AUTH] Force fetching admin...' : '🔄 [ADMIN AUTH] Fetching admin...');

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

                    if (adminData.user_id && !isPublicRoute()) {
                        socketService.connect(adminData.user_id);
                    }

                    return adminData;
                }

                console.log('🔵 [ADMIN AUTH] No active admin');
                clearAuthState();
                socketService.disconnect();

                return null;

            } catch (error) {
                console.warn(
                    '🔵 [ADMIN AUTH] No active admin session:',
                    error?.response?.status || error?.message
                );

                if (error?.response?.status === 401 && !isPublicRoute()) {
                    window.dispatchEvent(
                        new CustomEvent('sessionExpired', {
                            detail: {
                                code: error?.response?.data?.code || 'TOKEN_EXPIRED',
                                message: error?.response?.data?.message || 'Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.',
                                source: 'admin_auth_context',
                                timestamp: new Date().toISOString()
                            }
                        })
                    );
                }

                clearAuthState();
                socketService.disconnect();
                throw error;

            } finally {
                isFetchingRef.current = false;
                if (mountedRef.current) {
                    setIsLoading(false);
                }
            }
        },
        [clearAuthState, isPublicRoute]
    );

    // ========================================================
    // AUTO FETCH KHI MOUNT
    // ========================================================
    useEffect(() => {
        if (!isPublicRoute()) {
            fetchAdmin().catch(() => {});
        } else {
            setIsLoading(false);
        }
    }, [fetchAdmin, isPublicRoute]);

    // ========================================================
    // LOGOUT
    // ========================================================
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

            socketService.disconnect();

            window.dispatchEvent(
                new CustomEvent('authCleanedUp', {
                    detail: {
                        reason: 'manual_logout',
                        isAdmin: true,
                        timestamp: new Date().toISOString(),
                    },
                })
            );

            console.log('✅ [ADMIN AUTH] Logout completed');
        }
    }, [clearAuthState]);

    // ========================================================
    // LISTEN AUTH CLEANED UP
    // ========================================================
    useEffect(() => {
        const handleAuthCleanedUp = () => {
            console.log('🧹 [ADMIN AUTH] authCleanedUp received');
            clearAuthState();
            socketService.disconnect();
        };

        window.addEventListener('authCleanedUp', handleAuthCleanedUp);

        return () => {
            window.removeEventListener('authCleanedUp', handleAuthCleanedUp);
        };
    }, [clearAuthState]);

    // ========================================================
    // LISTEN SESSION EXPIRED
    // ========================================================
    useEffect(() => {
        const handleSessionExpired = (event) => {
            console.warn('🔴 [ADMIN AUTH] Session expired:', event?.detail);
            clearAuthState();
            socketService.disconnect();
        };

        window.addEventListener('sessionExpired', handleSessionExpired);

        return () => {
            window.removeEventListener('sessionExpired', handleSessionExpired);
        };
    }, [clearAuthState]);

    // ========================================================
    // LISTEN ADMIN LOGGED IN
    // ========================================================
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

        return () => {
            window.removeEventListener('adminLoggedIn', handleAdminLoggedIn);
        };
    }, [fetchAdmin]);

    // ========================================================
    // HELPERS
    // ========================================================
    const refetch = useCallback(() => {
        return fetchAdmin(true);
    }, [fetchAdmin]);

    const updateAdmin = useCallback((newAdmin) => {
        adminRef.current = newAdmin;
        setAdmin(newAdmin);
        setIsAuthenticated(Boolean(newAdmin));
    }, []);

    const value = {
        admin,
        user: admin, // alias để giống AuthContext user
        isLoading,
        isAuthenticated,
        fetchAdmin,
        refetch,
        logout,
        setAdmin: updateAdmin,
        clearAuthState,
    };

    return (
        <AdminAuthContext.Provider value={value}>
            {children}
        </AdminAuthContext.Provider>
    );
};

export default AdminAuthContext;