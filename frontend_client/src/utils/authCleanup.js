// src/utils/authCleanup.js

import api from '../api/api';
import socketService from '../api/socket';

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
// CLEAR FRONTEND STATE (KHÔNG XÓA COOKIE - VÌ COOKIE LÀ HTTPONLY)
// ============================================================

const clearFrontendAuth = () => {
    console.log('🧹 [AUTH CLEANUP] Clearing frontend auth state');

    // Xóa header nếu có
    delete api.defaults.headers.common.Authorization;

    // Ngắt socket
    try {
        socketService.disconnect();
        console.log('🔌 [AUTH CLEANUP] Socket disconnected');
    } catch (error) {
        console.warn('⚠️ [AUTH CLEANUP] Socket disconnect failed:', error);
    }

    console.log('✅ [AUTH CLEANUP] Frontend auth state cleared');
};

// ============================================================
// CLEANUP AUTH - GỌI API LOGOUT + DỌN STATE
// ============================================================

export const cleanupAuth = async (options = {}) => {
    const {
        callApi = false,
        reason = 'expired',
        message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    } = options;

    console.log('🔴 [AUTH CLEANUP] Starting cleanup:', { reason, callApi });

    // 1. LOGOUT API - Chỉ gọi khi user chủ động logout (Server sẽ xóa cookie)
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
// FORCE LOGOUT (KHÔNG GỌI API - DÙNG KHI BỊ ĐÁ RA)
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
// DEFAULT EXPORT
// ============================================================

export default {
    cleanupAuth,
    logout,
    forceLogout,
    notifyLogin,
    sessionExpired,
    deviceLoggedOut,
    tokenInvalid
};