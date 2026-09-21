import api from '../api/api';
import socketService from '../api/socket';

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
                timestamp: new Date().toISOString()
            }
        })
    );
};

// ============================================================
// ✅ RELEASE SEAT LOCKS TRƯỚC KHI DISCONNECT
// ============================================================

const releaseSeatLocksBeforeDisconnect = async () => {
    try {
        const socket = socketService.getSocket();

        if (!socket || !socket.connected) {
            console.log('⚠️ [AUTH CLEANUP] Socket not connected — skip release');
            return;
        }

        console.log('🔓 [AUTH CLEANUP] Emitting user-logout to release seat locks...');

        // ✅ Emit event để server release tất cả ghế của user
        socket.emit('user-logout');

        // ✅ Chờ 500ms cho event bay đi trước khi disconnect
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('✅ [AUTH CLEANUP] Seat locks release requested');
    } catch (error) {
        console.warn('⚠️ [AUTH CLEANUP] Release seat locks failed:', error);
    }
};

// ============================================================
// CLEAR FRONTEND AUTH
// ============================================================

const clearFrontendAuth = async () => {
    console.log('🧹 [AUTH CLEANUP] Clearing frontend auth state');

    delete api.defaults.headers.common.Authorization;

    try {
        // ✅ Release ghế TRƯỚC khi disconnect
        await releaseSeatLocksBeforeDisconnect();

        // ✅ Sau đó mới disconnect
        socketService.disconnect();
        console.log('🔌 [AUTH CLEANUP] Socket disconnected');
    } catch (error) {
        console.warn('⚠️ [AUTH CLEANUP] Socket disconnect failed:', error);
    }

    console.log('✅ [AUTH CLEANUP] Frontend auth state cleared');
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

    if (callApi) {
        try {
            await api.post('/api/auth/logout');
            console.log('✅ [AUTH CLEANUP] Logout API success');
        } catch (error) {
            console.warn('⚠️ [AUTH CLEANUP] Logout API failed:', error?.message);
        }
    }

    await clearFrontendAuth();
    dispatchAuthCleanedUp({ reason, message });

    console.log('✅ [AUTH CLEANUP] Cleanup completed');

    return {
        success: true,
        reason,
        message
    };
};

// ============================================================
// NOTIFY LOGIN
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
// LOGOUT
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
    return forceLogout('TOKEN_EXPIRED', message);
};

// ============================================================
// DEVICE LOGGED OUT
// ============================================================

export const deviceLoggedOut = async (
    message = 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.'
) => {
    return forceLogout('SESSION_REPLACED', message);
};

// ============================================================
// TOKEN INVALID
// ============================================================

export const tokenInvalid = async (
    message = 'Thông tin đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.'
) => {
    return forceLogout('TOKEN_INVALID', message);
};

export default {
    cleanupAuth,
    logout,
    forceLogout,
    notifyLogin,
    sessionExpired,
    deviceLoggedOut,
    tokenInvalid
};