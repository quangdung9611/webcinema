// src/context/AuthContext.jsx

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef,
    useCallback,
} from 'react';

import api from '../api/api';
import socketService from '../api/socket';

// ============================================================
// CONTEXT
// ============================================================

const AuthContext = createContext(null);

// ============================================================
// HOOK
// ============================================================

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return context;
};

// ============================================================
// AUTH PROVIDER
// ============================================================

export const AuthProvider = ({ children }) => {

    // ========================================================
    // STATE
    // ========================================================

    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // ========================================================
    // REFS
    // ========================================================

    const userRef = useRef(null);
    const isFetchingRef = useRef(false);
    const fetchedRef = useRef(false);
    const mountedRef = useRef(true);

    // ========================================================
    // SYNC USER REF
    // ========================================================

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    // ========================================================
    // MOUNT STATUS
    // ========================================================

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
        console.log('🧹 [AUTH] Clearing auth state');

        userRef.current = null;
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        fetchedRef.current = false;
        isFetchingRef.current = false;

        api.resetUserCache();
    }, []);

    // ========================================================
    // FETCH USER
    // ========================================================

    const fetchUser = useCallback(
        async (force = false) => {

            // Đã fetch rồi
            if (fetchedRef.current && !force) {
                console.log('⏭️ [AUTH] Already fetched, skip');
                return userRef.current;
            }

            // Đang fetch
            if (isFetchingRef.current) {
                console.log('⏭️ [AUTH] Already fetching, skip');
                return userRef.current;
            }

            isFetchingRef.current = true;

            if (mountedRef.current) {
                setIsLoading(true);
            }

            try {
                console.log(force ? '🔄 [AUTH] Force fetching user...' : '🔄 [AUTH] Fetching user...');

                const response = await api.get('/api/auth/me', { force });

                const raw = response?.data;
                const userData = raw?.user || raw?.data?.user || null;

                // CÓ USER
                if (userData) {
                    console.log('✅ [AUTH] User loaded:', userData.user_id);

                    userRef.current = userData;
                    fetchedRef.current = true;

                    if (mountedRef.current) {
                        setUser(userData);
                        setIsAuthenticated(true);
                    }

                    // CONNECT SOCKET
                    if (userData.user_id) {
                        socketService.connect(userData.user_id);
                    }

                    return userData;
                }

                // KHÔNG CÓ USER
                console.log('🔵 [AUTH] No active user');
                clearAuthState();
                socketService.disconnect();

                return null;

            } catch (error) {
                console.warn('🔵 [AUTH] No active user session:', error?.response?.status || error?.message);
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
        [clearAuthState]
    );

    // ========================================================
    // INITIAL FETCH
    // ========================================================

    useEffect(() => {
        fetchUser().catch(() => {
            // 401 sẽ được interceptor xử lý, SessionGuard xử lý modal
        });
    }, [fetchUser]);

    // ========================================================
    // LOGOUT (Chủ động)
    // ========================================================

    const logout = useCallback(async () => {
        console.log('🚪 [AUTH] Logging out...');

        try {
            await api.post('/api/auth/logout');
        } catch (error) {
            console.warn('🟡 [AUTH] Logout API error:', error?.message);
        } finally {
            clearAuthState();

            if (typeof api.resetSessionExpiredLock === 'function') {
                api.resetSessionExpiredLock();
            }

            socketService.disconnect();

            window.dispatchEvent(
                new CustomEvent('authCleanedUp', {
                    detail: {
                        reason: 'manual_logout',
                        timestamp: new Date().toISOString(),
                    },
                })
            );

            console.log('✅ [AUTH] Logout completed');
        }
    }, [clearAuthState]);

    // ========================================================
    // AUTH CLEANED UP
    // ========================================================

    useEffect(() => {
        const handleAuthCleanedUp = () => {
            console.log('🧹 [AUTH] authCleanedUp received');
            clearAuthState();
            socketService.disconnect();
        };

        window.addEventListener('authCleanedUp', handleAuthCleanedUp);

        return () => {
            window.removeEventListener('authCleanedUp', handleAuthCleanedUp);
        };
    }, [clearAuthState]);

    // ========================================================
    // SESSION EXPIRED
    // ========================================================

    useEffect(() => {
        const handleSessionExpired = (event) => {
            console.warn('🔴 [AUTH] Session expired:', event?.detail);
            clearAuthState();
            socketService.disconnect();
        };

        window.addEventListener('sessionExpired', handleSessionExpired);

        return () => {
            window.removeEventListener('sessionExpired', handleSessionExpired);
        };
    }, [clearAuthState]);

    // ========================================================
    // USER LOGGED IN
    // ========================================================

    useEffect(() => {
        const handleUserLoggedIn = () => {
            console.log('🟢 [AUTH] User logged in');

            fetchedRef.current = false;
            isFetchingRef.current = false;
            api.resetUserCache();

            if (typeof api.resetSessionExpiredLock === 'function') {
                api.resetSessionExpiredLock();
            }

            fetchUser(true).catch((error) => {
                console.warn('🟡 [AUTH] Cannot fetch user after login:', error?.message);
            });
        };

        window.addEventListener('userLoggedIn', handleUserLoggedIn);

        return () => {
            window.removeEventListener('userLoggedIn', handleUserLoggedIn);
        };
    }, [fetchUser]);

    // ========================================================
    // REFETCH
    // ========================================================

    const refetch = useCallback(() => {
        return fetchUser(true);
    }, [fetchUser]);

    // ========================================================
    // SET USER WRAPPER
    // ========================================================

    const updateUser = useCallback((newUser) => {
        userRef.current = newUser;
        setUser(newUser);
        setIsAuthenticated(Boolean(newUser));
    }, []);

    // ========================================================
    // CONTEXT VALUE
    // ========================================================

    const value = {
        user,
        isLoading,
        isAuthenticated,
        fetchUser,
        refetch,
        logout,
        setUser: updateUser,
    };

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;