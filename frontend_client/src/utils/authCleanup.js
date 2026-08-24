import api from '../api/api';
import socketService from '../api/socket';

// ============================================================
// XÓA AUTH STATE Ở FRONTEND
// ============================================================

const clearFrontendAuth = () => {
    console.log(
        '🧹 [AUTH CLEANUP] Clearing frontend auth state'
    );

    // ========================================================
    // LOCAL STORAGE
    // ========================================================

    localStorage.removeItem('user_info');
    localStorage.removeItem('admin_info');
    localStorage.removeItem('user_id');

    // ========================================================
    // SESSION STORAGE
    //
    // Nếu bạn có auth/session data trong sessionStorage
    // thì có thể thêm ở đây.
    // ========================================================

    // ========================================================
    // AXIOS HEADER
    // ========================================================

    delete api.defaults.headers.common['Authorization'];

    // ========================================================
    // SOCKET
    // ========================================================

    try {
        socketService.disconnect();

        console.log(
            '🔌 [AUTH CLEANUP] Socket disconnected'
        );
    } catch (error) {
        console.warn(
            '⚠️ [AUTH CLEANUP] Socket disconnect failed:',
            error
        );
    }
};

// ============================================================
// CLEANUP AUTH
//
// callApi = true
// -> logout chủ động
//
// callApi = false
// -> token mất / hết hạn / đăng nhập thiết bị khác
// ============================================================

export const cleanupAuth = async (options = {}) => {
    const {
        callApi = false,
        reason = 'expired',
        message =
            'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    } = options;

    console.log(
        '🔴 [AUTH CLEANUP] Starting cleanup:',
        {
            reason,
            callApi
        }
    );

    // ========================================================
    // 1. GỌI LOGOUT API
    //
    // Chỉ khi user CHỦ ĐỘNG logout.
    // ========================================================

    if (callApi) {
        try {
            await api.post('/api/auth/logout');

            console.log(
                '✅ [AUTH CLEANUP] Logout API success'
            );
        } catch (error) {
            console.warn(
                '⚠️ [AUTH CLEANUP] Logout API failed:',
                error?.message
            );

            // Dù API logout lỗi vẫn cleanup frontend
        }
    }

    // ========================================================
    // 2. XÓA FRONTEND AUTH
    // ========================================================

    clearFrontendAuth();

    // ========================================================
    // 3. THÔNG BÁO CHO HEADER / AUTH CONTEXT
    //
    // Header chỉ reset UI.
    // KHÔNG xử lý modal.
    // ========================================================

    window.dispatchEvent(
        new CustomEvent('authCleanedUp', {
            detail: {
                reason,
                message,
                timestamp: new Date().toISOString()
            }
        })
    );

    console.log(
        '✅ [AUTH CLEANUP] Cleanup completed'
    );
};

// ============================================================
// LOGOUT CHỦ ĐỘNG
// ============================================================

export const logout = async () => {
    await cleanupAuth({
        callApi: true,
        reason: 'logout',
        message: 'Bạn đã đăng xuất thành công.'
    });
};

// ============================================================
// FORCE LOGOUT
//
// Token mất
// Token hết hạn
// Token invalid
// Đăng nhập thiết bị khác
// ============================================================

export const forceLogout = async (
    reason = 'expired',
    message =
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
) => {
    await cleanupAuth({
        callApi: false,
        reason,
        message
    });
};

export default {
    cleanupAuth,
    logout,
    forceLogout
};