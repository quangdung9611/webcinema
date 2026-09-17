// utils/adminAuthCleanup.js
// ============================================================
// ADMIN AUTH CLEANUP — RIÊNG CHO ADMIN
// ✅ Dùng adminSocketService
// ============================================================

import adminapi from '../api/adminapi';
import adminSocketService from '../api/adminsocket';   // ✅ ĐỔI

// ============================================================
// DISPATCH EVENT
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
                isAdmin: true,
                timestamp: new Date().toISOString()
            }
        })
    );
};

// ============================================================
// CLEAR ADMIN AUTH
// ============================================================
const clearAdminAuth = () => {
    console.log('🧹 [ADMIN AUTH CLEANUP] Clearing admin auth state');

    // ✅ Xóa Authorization header của ADMIN API
    delete adminapi.defaults.headers.common.Authorization;

    // ✅ Xóa localStorage/sessionStorage của admin
    const adminKeys = [
        'admin_info',
        'adminLockedEmail',
        'admin_login_lock',
        'admin_remember_me',
    ];

    adminKeys.forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });

    // ✅ Reset admin API cache
    try {
        if (typeof adminapi.resetAdminCache === 'function') {
            adminapi.resetAdminCache();
        }
        if (typeof adminapi.resetSessionExpiredLock === 'function') {
            adminapi.resetSessionExpiredLock();
        }
    } catch (error) {
        console.warn('⚠️ [ADMIN AUTH CLEANUP] Reset cache failed:', error);
    }

    // ✅ Disconnect socket — DÙNG adminSocketService
    try {
        adminSocketService.disconnect();   // ✅ ĐỔI
        console.log('🔌 [ADMIN AUTH CLEANUP] Socket disconnected');
    } catch (error) {
        console.warn('⚠️ [ADMIN AUTH CLEANUP] Socket disconnect failed:', error);
    }

    console.log('✅ [ADMIN AUTH CLEANUP] Admin auth state cleared');
};

// ============================================================
// ADMIN CLEANUP AUTH
// ============================================================
export const cleanupAdminAuth = async (options = {}) => {
    const {
        callApi = false,
        reason = 'expired',
        message = 'Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.'
    } = options;

    console.log('🔴 [ADMIN AUTH CLEANUP] Starting:', { reason, callApi });

    // ✅ GỌI ADMIN LOGOUT API
    if (callApi) {
        try {
            await adminapi.post('/admin/api/auth/logout');
            console.log('✅ [ADMIN AUTH CLEANUP] Logout API success');
        } catch (error) {
            console.warn(
                '⚠️ [ADMIN AUTH CLEANUP] Logout API failed (ignored):',
                error?.message
            );
        }
    }

    clearAdminAuth();
    dispatchAuthCleanedUp({ reason, message });

    console.log('✅ [ADMIN AUTH CLEANUP] Completed');

    return {
        success: true,
        reason,
        message
    };
};

// ============================================================
// NOTIFY ADMIN LOGIN
// ============================================================
export const notifyAdminLogin = (admin = null) => {
    console.log('🟢 [ADMIN AUTH] Admin login detected');

    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(
        new CustomEvent('adminLoggedIn', {
            detail: {
                admin,
                timestamp: new Date().toISOString()
            }
        })
    );
};

// ============================================================
// ADMIN LOGOUT — GỌI API
// ============================================================
export const adminLogout = async () => {
    return cleanupAdminAuth({
        callApi: true,
        reason: 'logout',
        message: 'Admin đã đăng xuất thành công.'
    });
};

// ============================================================
// ADMIN FORCE LOGOUT — KHÔNG GỌI API
// ============================================================
export const forceAdminLogout = async (
    reason = 'expired',
    message = 'Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.'
) => {
    return cleanupAdminAuth({
        callApi: false,
        reason,
        message
    });
};

// ============================================================
// ADMIN SESSION EXPIRED
// ============================================================
export const adminSessionExpired = async (
    message = 'Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.'
) => {
    return forceAdminLogout('TOKEN_EXPIRED', message);
};

// ============================================================
// ADMIN DEVICE LOGGED OUT
// ============================================================
export const adminDeviceLoggedOut = async (
    message = 'Tài khoản admin của bạn đã được đăng nhập trên thiết bị khác.'
) => {
    return forceAdminLogout('SESSION_REPLACED', message);
};

// ============================================================
// ADMIN TOKEN INVALID
// ============================================================
export const adminTokenInvalid = async (
    message = 'Thông tin đăng nhập admin không còn hợp lệ. Vui lòng đăng nhập lại.'
) => {
    return forceAdminLogout('TOKEN_INVALID', message);
};

// ============================================================
// EXPORT DEFAULT
// ============================================================
export default {
    cleanupAdminAuth,
    adminLogout,
    forceAdminLogout,
    notifyAdminLogin,
    adminSessionExpired,
    adminDeviceLoggedOut,
    adminTokenInvalid,
};