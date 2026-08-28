import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef,
    useCallback,
} from 'react';

import { useLocation } from 'react-router-dom';
import api from '../api/api';
import socketService from '../api/socket';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {

    const location = useLocation();

    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const userRef = useRef(null);
    const isFetchingRef = useRef(false);
    const fetchedRef = useRef(false);
    const mountedRef = useRef(true);
    const isAuthCheckDoneRef = useRef(false); // 🆕 Chỉ check 1 lần

    // ✅ SỬA: Kiểm tra trang public chính xác hơn
    const isPublicRoute = useCallback(() => {
        const pathname = location.pathname;
        
        // Danh sách path public
        const publicPaths = [
            '/login',
            '/register',
            '/register-pin',
            '/verify-email',
            '/forgot-password',
            '/verify-otp',
            '/reset-password',
            '/forgot-pin',
        ];
        
        // Kiểm tra chính xác path
        return publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'));
    }, [location.pathname]);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

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

    const fetchUser = useCallback(
        async (force = false) => {
            // ✅ Nếu là trang public → KHÔNG fetch user
            if (isPublicRoute()) {
                console.log('⏭️ [AUTH] Public route, skip fetching user');
                setIsLoading(false);
                return null;
            }

            if (fetchedRef.current && !force) {
                console.log('⏭️ [AUTH] Already fetched, skip');
                return userRef.current;
            }

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

                if (userData) {
                    console.log('✅ [AUTH] User loaded:', userData.user_id);

                    userRef.current = userData;
                    fetchedRef.current = true;
                    isAuthCheckDoneRef.current = true;

                    if (mountedRef.current) {
                        setUser(userData);
                        setIsAuthenticated(true);
                    }

                    // ✅ CHỈ kết nối socket nếu KHÔNG phải trang public
                    if (userData.user_id && !isPublicRoute()) {
                        socketService.connect(userData.user_id);
                    }

                    return userData;
                }

                console.log('🔵 [AUTH] No active user');
                clearAuthState();
                socketService.disconnect();

                return null;

            } catch (error) {
                console.warn('🔵 [AUTH] No active user session:', error?.response?.status || error?.message);

                // ✅ Chỉ dispatch sessionExpired nếu không phải public route
                if (error?.response?.status === 401 && !isPublicRoute()) {
                    window.dispatchEvent(
                        new CustomEvent('sessionExpired', {
                            detail: {
                                code: error?.response?.data?.code || 'TOKEN_EXPIRED',
                                message: error?.response?.data?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                                source: 'auth_context',
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

    // ✅ Chỉ fetch user khi không ở trang public và chưa check
    useEffect(() => {
        if (!isPublicRoute()) {
            fetchUser().catch(() => {});
        } else {
            setIsLoading(false);
        }
    }, [fetchUser, isPublicRoute]);

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

    const refetch = useCallback(() => {
        return fetchUser(true);
    }, [fetchUser]);

    const updateUser = useCallback((newUser) => {
        userRef.current = newUser;
        setUser(newUser);
        setIsAuthenticated(Boolean(newUser));
    }, []);

    const value = {
        user,
        isLoading,
        isAuthenticated,
        fetchUser,
        refetch,
        logout,
        setUser: updateUser,
        clearAuthState,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;