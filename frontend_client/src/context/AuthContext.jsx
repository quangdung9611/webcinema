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
        throw new Error(
            'useAuth must be used within AuthProvider'
        );
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

    const [user, setUser] =
        useState(null);

    const [isLoading, setIsLoading] =
        useState(true);

    const [isAuthenticated, setIsAuthenticated] =
        useState(false);

    // ========================================================
    // REFS
    // ========================================================

    const userRef =
        useRef(null);

    const isFetchingRef =
        useRef(false);

    const fetchedRef =
        useRef(false);

    const mountedRef =
        useRef(true);

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
    //
    // Chỉ clear React state.
    //
    // Không redirect ở đây.
    // SessionGuard sẽ lo modal + redirect.
    // ========================================================

    const clearAuthState = useCallback(() => {

        console.log(
            '🧹 [AUTH] Clearing auth state'
        );

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
    //
    // force = true:
    // - bỏ cache
    // - gọi server lại
    //
    // force = false:
    // - nếu đã fetch thì dùng state hiện tại
    // ========================================================

    const fetchUser = useCallback(
        async (force = false) => {

            // ====================================================
            // ĐÃ FETCH
            // ====================================================

            if (
                fetchedRef.current &&
                !force
            ) {
                console.log(
                    '⏭️ [AUTH] Already fetched, skip'
                );

                return userRef.current;
            }

            // ====================================================
            // ĐANG FETCH
            // ====================================================

            if (
                isFetchingRef.current
            ) {
                console.log(
                    '⏭️ [AUTH] Already fetching, skip'
                );

                return userRef.current;
            }

            isFetchingRef.current = true;

            if (mountedRef.current) {
                setIsLoading(true);
            }

            try {

                console.log(
                    force
                        ? '🔄 [AUTH] Force fetching user...'
                        : '🔄 [AUTH] Fetching user...'
                );

                const response =
                    await api.get(
                        '/api/auth/me',
                        {
                            force,
                        }
                    );

                const raw =
                    response?.data;

                const userData =
                    raw?.user ||
                    raw?.data?.user ||
                    null;

                // =================================================
                // CÓ USER
                // =================================================

                if (userData) {

                    console.log(
                        '✅ [AUTH] User loaded:',
                        userData.user_id
                    );

                    userRef.current =
                        userData;

                    fetchedRef.current =
                        true;

                    if (mountedRef.current) {

                        setUser(
                            userData
                        );

                        setIsAuthenticated(
                            true
                        );
                    }

                    // =============================================
                    // CONNECT SOCKET
                    // =============================================

                    if (
                        userData.user_id
                    ) {
                        socketService.connect(
                            userData.user_id
                        );
                    }

                    return userData;
                }

                // =================================================
                // KHÔNG CÓ USER
                // =================================================

                console.log(
                    '🔵 [AUTH] No active user'
                );

                clearAuthState();

                socketService.disconnect();

                return null;

            } catch (error) {

                console.warn(
                    '🔵 [AUTH] No active user session:',
                    error?.response?.status ||
                    error?.message
                );

                clearAuthState();

                socketService.disconnect();

                throw error;

            } finally {

                isFetchingRef.current =
                    false;

                if (mountedRef.current) {
                    setIsLoading(false);
                }
            }
        },
        [
            clearAuthState,
        ]
    );

    // ========================================================
    // INITIAL FETCH
    //
    // Chỉ chạy 1 lần khi AuthProvider mount
    // ========================================================

    useEffect(() => {

        fetchUser()
            .catch(() => {
                // 401 sẽ được interceptor xử lý.
                // SessionGuard sẽ xử lý modal nếu cần.
            });

    }, [
        fetchUser,
    ]);

    // ========================================================
    // LOGOUT
    //
    // Logout chủ động của user
    // ========================================================

    const logout = useCallback(
        async () => {

            console.log(
                '🚪 [AUTH] Logging out...'
            );

            try {

                await api.post(
                    '/api/auth/logout'
                );

            } catch (error) {

                console.warn(
                    '🟡 [AUTH] Logout API error:',
                    error?.message
                );

            } finally {

                // =============================================
                // CLEAR STATE
                // =============================================

                clearAuthState();

                // =============================================
                // RESET API SESSION LOCK
                // =============================================

                if (
                    typeof api.resetSessionExpiredLock ===
                    'function'
                ) {
                    api.resetSessionExpiredLock();
                }

                // =============================================
                // DISCONNECT SOCKET
                // =============================================

                socketService.disconnect();

                // =============================================
                // GLOBAL EVENT
                // =============================================

                window.dispatchEvent(
                    new CustomEvent(
                        'authCleanedUp',
                        {
                            detail: {
                                reason:
                                    'manual_logout',

                                timestamp:
                                    new Date().toISOString(),
                            },
                        }
                    )
                );

                console.log(
                    '✅ [AUTH] Logout completed'
                );
            }
        },
        [
            clearAuthState,
        ]
    );

    // ========================================================
    // AUTH CLEANED UP
    //
    // forceLogout() hoặc cleanup utility
    // ========================================================

    useEffect(() => {

        const handleAuthCleanedUp =
            () => {

                console.log(
                    '🧹 [AUTH] authCleanedUp received'
                );

                clearAuthState();

                socketService.disconnect();
            };

        window.addEventListener(
            'authCleanedUp',
            handleAuthCleanedUp
        );

        return () => {

            window.removeEventListener(
                'authCleanedUp',
                handleAuthCleanedUp
            );
        };

    }, [
        clearAuthState,
    ]);

    // ========================================================
    // SESSION EXPIRED
    //
    // AuthContext:
    // - clear state
    // - disconnect socket
    //
    // KHÔNG:
    // - mở modal
    // - redirect
    //
    // SessionGuard xử lý UI.
    // ========================================================

    useEffect(() => {

        const handleSessionExpired =
            (event) => {

                console.warn(
                    '🔴 [AUTH] Session expired:',
                    event?.detail
                );

                clearAuthState();

                socketService.disconnect();
            };

        window.addEventListener(
            'sessionExpired',
            handleSessionExpired
        );

        return () => {

            window.removeEventListener(
                'sessionExpired',
                handleSessionExpired
            );
        };

    }, [
        clearAuthState,
    ]);

    // ========================================================
    // 🔥 USER LOGGED IN - CẬP NHẬT NGAY KHI LOGIN
    //
    // Login thành công:
    //
    // 1. Reset state fetch
    // 2. Reset API cache
    // 3. Reset session expired lock
    // 4. Fetch user mới
    // 5. Connect socket
    // ========================================================

    useEffect(() => {

        const handleUserLoggedIn =
            () => {

                console.log(
                    '🟢 [AUTH] User logged in'
                );

                fetchedRef.current =
                    false;

                isFetchingRef.current =
                    false;

                api.resetUserCache();

                if (
                    typeof api.resetSessionExpiredLock ===
                    'function'
                ) {
                    api.resetSessionExpiredLock();
                }

                fetchUser(true)
                    .catch(
                        (error) => {

                            console.warn(
                                '🟡 [AUTH] Cannot fetch user after login:',
                                error?.message
                            );
                        }
                    );
            };

        window.addEventListener(
            'userLoggedIn',
            handleUserLoggedIn
        );

        return () => {

            window.removeEventListener(
                'userLoggedIn',
                handleUserLoggedIn
            );
        };

    }, [
        fetchUser,
    ]);

    // ========================================================
    // 🔥 CHECK TOKEN COOKIE KHI FOCUS TAB
    // ========================================================

    useEffect(() => {
        let lastCheck = Date.now();

        const checkTokenCookie = () => {
            if (document.hidden) return;
            
            const now = Date.now();
            if (now - lastCheck < 2000) return;
            lastCheck = now;

            // Kiểm tra cookie user_token và admin_token
            const cookies = document.cookie.split(';');
            let hasUserToken = false;
            let hasAdminToken = false;
            
            for (let cookie of cookies) {
                const trimmed = cookie.trim();
                if (trimmed.startsWith('user_token=')) {
                    hasUserToken = true;
                }
                if (trimmed.startsWith('admin_token=')) {
                    hasAdminToken = true;
                }
            }

            const isAuth = hasUserToken || hasAdminToken;

            // Nếu đang có user nhưng không có token -> session expired
            if (user && !isAuth) {
                console.warn('🔴 [AUTH] Token cookie lost!', {
                    hasUserToken,
                    hasAdminToken,
                    currentUser: user?.user_id
                });
                
                window.dispatchEvent(
                    new CustomEvent('sessionExpired', {
                        detail: {
                            code: 'TOKEN_LOST',
                            type: 'device',
                            message: 'Thông tin đăng nhập đã bị mất. Vui lòng đăng nhập lại.',
                            source: 'auth_context',
                            timestamp: new Date().toISOString()
                        }
                    })
                );
                
                clearAuthState();
                socketService.disconnect();
            }
        };

        // Kiểm tra khi focus tab
        document.addEventListener('visibilitychange', checkTokenCookie);
        document.addEventListener('focus', checkTokenCookie);

        // Kiểm tra ngay khi mount
        setTimeout(checkTokenCookie, 1000);

        return () => {
            document.removeEventListener('visibilitychange', checkTokenCookie);
            document.removeEventListener('focus', checkTokenCookie);
        };
    }, [user, clearAuthState]);

    // ========================================================
    // REFETCH
    // ========================================================

    const refetch =
        useCallback(
            () => {

                return fetchUser(
                    true
                );
            },
            [
                fetchUser,
            ]
        );

    // ========================================================
    // SET USER WRAPPER
    //
    // Đồng bộ state + ref
    // ========================================================

    const updateUser =
        useCallback(
            (newUser) => {

                userRef.current =
                    newUser;

                setUser(
                    newUser
                );

                setIsAuthenticated(
                    Boolean(newUser)
                );
            },
            []
        );

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

        setUser:
            updateUser,
    };

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <AuthContext.Provider
            value={value}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;