import axios from 'axios';

const API_BASE = 'https://api.quangdungcinema.id.vn';

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ============================================================
// 🟢 INTERCEPTOR XỬ LÝ LỖI - ĐÃ SỬA HOÀN CHỈNH
// ============================================================

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Chỉ xử lý lỗi 401 (Unauthorized)
        if (error.response?.status === 401) {
            const errorCode = error.response?.data?.code;
            const errorMessage = error.response?.data?.message || 'Phiên đăng nhập đã hết hạn';

            console.warn('🔴 [API] Lỗi 401:', errorCode, errorMessage);

            // ========== XỬ LÝ SESSION_EXPIRED ==========
            if (errorCode === 'SESSION_EXPIRED') {
                console.warn('🔴 [SESSION_EXPIRED] Tài khoản đã đăng nhập trên thiết bị khác!');

                // Xóa localStorage
                localStorage.removeItem('user_info');
                localStorage.removeItem('admin_info');

                // Dispatch event để các component bắt
                window.dispatchEvent(new CustomEvent('sessionExpired', {
                    detail: {
                        code: 'SESSION_EXPIRED',
                        message: errorMessage,
                        timestamp: new Date().toISOString(),
                        fromAPI: true
                    }
                }));
            }

            // ========== XỬ LÝ TOKEN_INVALID ==========
            else if (errorCode === 'TOKEN_INVALID') {
                console.warn('🔴 [TOKEN_INVALID] Token không hợp lệ');

                localStorage.removeItem('user_info');
                localStorage.removeItem('admin_info');

                window.dispatchEvent(new CustomEvent('tokenInvalid', {
                    detail: {
                        code: 'TOKEN_INVALID',
                        message: errorMessage
                    }
                }));
            }

            // ========== XỬ LÝ UNAUTHORIZED ==========
            else if (errorCode === 'UNAUTHORIZED') {
                console.warn('🔴 [UNAUTHORIZED] Vui lòng đăng nhập');

                window.dispatchEvent(new CustomEvent('unauthorized', {
                    detail: {
                        code: 'UNAUTHORIZED',
                        message: errorMessage
                    }
                }));
            }

            // ========== Các lỗi 401 khác ==========
            else {
                console.warn('🔴 [401] Lỗi xác thực không xác định:', errorMessage);

                window.dispatchEvent(new CustomEvent('authError', {
                    detail: {
                        code: errorCode || 'AUTH_ERROR',
                        message: errorMessage,
                        status: error.response?.status
                    }
                }));
            }
        }

        // ========== XỬ LÝ LỖI 403 - FORBIDDEN ==========
        if (error.response?.status === 403) {
            console.warn('🔴 [403] Không có quyền truy cập:', error.response?.data?.message);

            window.dispatchEvent(new CustomEvent('forbidden', {
                detail: {
                    message: error.response?.data?.message || 'Bạn không có quyền truy cập',
                }
            }));
        }

        // ========== XỬ LÝ LỖI 429 - RATE LIMIT ==========
        if (error.response?.status === 429) {
            console.warn('🔴 [429] Quá nhiều yêu cầu:', error.response?.data?.message);

            window.dispatchEvent(new CustomEvent('rateLimited', {
                detail: {
                    message: error.response?.data?.message || 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
                    retryAfter: error.response?.headers?.['retry-after'] || 60
                }
            }));
        }

        // ========== XỬ LÝ LỖI 500 - SERVER ERROR ==========
        if (error.response?.status >= 500) {
            console.error('🔴 [500] Lỗi máy chủ:', error.response?.data?.message || error.message);

            window.dispatchEvent(new CustomEvent('serverError', {
                detail: {
                    message: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
                    status: error.response?.status
                }
            }));
        }

        // ========== XỬ LÝ LỖI MẠNG ==========
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
            console.error('🔴 [NETWORK] Mất kết nối mạng');

            window.dispatchEvent(new CustomEvent('networkError', {
                detail: {
                    message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
                }
            }));
        }

        return Promise.reject(error);
    }
);

// ============================================================
// 🟢 THÊM MỚI: HÀM TIỆN ÍCH
// ============================================================

/**
 * Kiểm tra user đã đăng nhập chưa
 */
export const isAuthenticated = async () => {
    try {
        const response = await api.get('/api/auth/me');
        return response.data.success;
    } catch (error) {
        return false;
    }
};

/**
 * Lấy danh sách thiết bị đang đăng nhập
 */
export const getDevices = async () => {
    const response = await api.get('/api/auth/devices');
    return response.data;
};

/**
 * Đăng xuất 1 thiết bị cụ thể
 */
export const revokeDevice = async (deviceId) => {
    const response = await api.delete(`/api/auth/devices/${deviceId}`);
    return response.data;
};

/**
 * Đăng xuất tất cả thiết bị
 */
export const logoutAllDevices = async () => {
    const response = await api.post('/api/auth/logout-all');
    return response.data;
};

/**
 * Lấy thông tin user hiện tại
 */
export const getCurrentUser = async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
};

// ============================================================
// 🟢 CLEANUP
// ============================================================

export const removeAllListeners = () => {
    console.log('🧹 [API] Cleanup listeners');
};

export default api;