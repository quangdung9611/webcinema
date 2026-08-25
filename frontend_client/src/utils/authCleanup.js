// src/utils/authCleanup.js

import api from '../api/api';
import socketService from '../api/socket';

// ============================================================
// CLEAR FRONTEND AUTH STATE
// ============================================================

const clearFrontendAuth = () => {
    console.log(
        '🧹 [AUTH CLEANUP] Clearing frontend auth state'
    );

    // Xóa user_token
    document.cookie = 'user_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.quangdungcinema.id.vn';
    document.cookie = 'user_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    document.cookie = 'user_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost';

    // Xóa admin_token
    document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.quangdungcinema.id.vn';
    document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost';

    // Xóa các cookie liên quan khác
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const trimmed = cookie.trim();
        if (trimmed.includes('token') || 
            trimmed.includes('auth') || 
            trimmed.includes('session')) {
            const name = trimmed.split('=')[0];
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.quangdungcinema.id.vn`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
        }
    }

    delete api.defaults.headers.common.Authorization;

    try {
        socketService.disconnect();
        console.log('🔌 [AUTH CLEANUP] Socket disconnected');
    } catch (error) {
        console.warn('⚠️ [AUTH CLEANUP] Socket disconnect failed:', error);
    }

    console.log('✅ [AUTH CLEANUP] All auth cookies cleared');
};

// ============================================================
// DISPATCH AUTH CLEANED EVENT
// ============================================================

const dispatchAuthCleanedUp = ({ reason, message }) => {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(
        new CustomEvent('authCleanedUp', {
            detail: {
                reason,
                message,
                timestamp: new Date().toISOString()
            }
        })
    );
};

// ============================================================
// CLEANUP AUTH
// ============================================================

export const cleanupAuth = async (options = {}) => {
    const {
        callApi = false,
        reason = 'expired',
        message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    } = options;

    console.log('🔴 [AUTH CLEANUP] Starting cleanup:', { reason, callApi });

    // 1. LOGOUT API - Chỉ gọi khi user chủ động logout
    if (callApi) {
        try {
            await api.post('/api/auth/logout');
            console.log('✅ [AUTH CLEANUP] Logout API success');
        } catch (error) {
            console.warn('⚠️ [AUTH CLEANUP] Logout API failed:', error?.message);
        }
    }

    // 2. CLEAR FRONTEND STATE
    clearFrontendAuth();

    // 3. NOTIFY APP
    dispatchAuthCleanedUp({ reason, message });

    console.log('✅ [AUTH CLEANUP] Cleanup completed');

    return {
        success: true,
        reason,
        message
    };
};

// ============================================================
// 🔥 LOGOUT VÀ XÓA COOKIE - GỌI API + XÓA COOKIE
// ============================================================

export const logoutAndClearCookies = async (message = 'Bạn đã đăng xuất.') => {
    console.log('🚪 [AUTH] Logout and clear cookies...');

    try {
        // Gọi API logout để server xóa cookie
        await api.post('/api/auth/logout');
        console.log('✅ [AUTH] Logout API success');
    } catch (error) {
        console.warn('⚠️ [AUTH] Logout API failed:', error?.message);
    }

    // Xóa cookie frontend
    clearFrontendAuth();

    // Dispatch event
    dispatchAuthCleanedUp({
        reason: 'logout',
        message
    });

    return {
        success: true,
        message
    };
};

// ============================================================
// USER LOGIN SUCCESS
// ============================================================

export const notifyLogin = (user = null) => {
    console.log('🟢 [AUTH] User login detected');

    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(
        new CustomEvent('userLoggedIn', {
            detail: {
                user,
                timestamp: new Date().toISOString()
            }
        })
    );
};

// ============================================================
// LOGOUT CHỦ ĐỘNG
// ============================================================

export const logout = async () => {
    return cleanupAuth({
        callApi: true,
        reason: 'logout',
        message: 'Bạn đã đăng xuất thành công.'
    });
};

// ============================================================
// FORCE LOGOUT
// ============================================================

export const forceLogout = async (
    reason = 'expired',
    message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
) => {
    return cleanupAuth({
        callApi: false,
        reason,
        message
    });
};

// ============================================================
// SESSION EXPIRED
// ============================================================

export const sessionExpired = async (
    message = 'Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.'
) => {
    return forceLogout('SESSION_EXPIRED', message);
};

// ============================================================
// DEVICE LOGGED OUT
// ============================================================

export const deviceLoggedOut = async (
    message = 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.'
) => {
    return forceLogout('DEVICE_LOGGED_OUT', message);
};

// ============================================================
// TOKEN INVALID
// ============================================================

export const tokenInvalid = async (
    message = 'Thông tin đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.'
) => {
    return forceLogout('TOKEN_INVALID', message);
};

// ============================================================
// CHECK TOKEN STATUS
// ============================================================

export const checkAuthStatus = () => {
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

    return {
        hasUserToken,
        hasAdminToken,
        isAuthenticated: hasUserToken || hasAdminToken
    };
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
    cleanupAuth,
    logout,
    forceLogout,
    logoutAndClearCookies,
    notifyLogin,
    sessionExpired,
    deviceLoggedOut,
    tokenInvalid,
    checkAuthStatus
};