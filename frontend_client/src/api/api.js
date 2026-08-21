import axios from 'axios';
import socketService from './socket';

const API_BASE = 'https://api.quangdungcinema.id.vn';

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ============================================================
// INTERCEPTOR XỬ LÝ LỖI
// ============================================================
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Chỉ xử lý lỗi 401 (Unauthorized)
        if (error.response?.status === 401) {
            const errorCode = error.response?.data?.code;
            const errorMessage = error.response?.data?.message || 'Phiên đăng nhập đã hết hạn';

            console.warn('🔴 [API] Lỗi 401:', errorCode, errorMessage);

            // ========== XỬ LÝ CÁC TRƯỜNG HỢP CỤ THỂ ==========

            // 1. SESSION_EXPIRED - Tài khoản đã đăng nhập trên thiết bị khác
            if (errorCode === 'SESSION_EXPIRED') {
                console.warn('🔴 [SESSION_EXPIRED] Tài khoản đã đăng nhập trên thiết bị khác!');

                // Ngắt kết nối WebSocket
                socketService.disconnect();

                // Xóa token trong localStorage
                localStorage.removeItem('user_info');
                localStorage.removeItem('admin_info');
                localStorage.removeItem('access_token');

                // Dispatch event để các component bắt và hiển thị modal
                window.dispatchEvent(new CustomEvent('sessionExpired', {
                    detail: {
                        code: 'SESSION_EXPIRED',
                        message: errorMessage,
                        timestamp: new Date().toISOString(),
                        fromAPI: true
                    }
                }));
            }

            // 2. TOKEN_INVALID - Token không hợp lệ
            else if (errorCode === 'TOKEN_INVALID') {
                console.warn('🔴 [TOKEN_INVALID] Token không hợp lệ, xóa cookie...');

                socketService.disconnect();
                localStorage.removeItem('user_info');
                localStorage.removeItem('admin_info');
                localStorage.removeItem('access_token');

                window.dispatchEvent(new CustomEvent('sessionExpired', {
                    detail: {
                        code: 'TOKEN_INVALID',
                        message: errorMessage || 'Token không hợp lệ. Vui lòng đăng nhập lại.',
                        timestamp: new Date().toISOString(),
                        fromAPI: true
                    }
                }));
            }

            // 3. UNAUTHORIZED - Chưa đăng nhập
            else if (errorCode === 'UNAUTHORIZED') {
                console.warn('🔴 [UNAUTHORIZED] Vui lòng đăng nhập');

                socketService.disconnect();

                window.dispatchEvent(new CustomEvent('sessionExpired', {
                    detail: {
                        code: 'UNAUTHORIZED',
                        message: errorMessage || 'Vui lòng đăng nhập để tiếp tục.',
                        timestamp: new Date().toISOString(),
                        fromAPI: true
                    }
                }));
            }

            // 4. Các lỗi 401 khác (mặc định)
            else {
                console.warn('🔴 [401] Lỗi xác thực không xác định:', errorMessage);

                socketService.disconnect();

                window.dispatchEvent(new CustomEvent('sessionExpired', {
                    detail: {
                        code: errorCode || 'AUTH_ERROR',
                        message: errorMessage || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                        timestamp: new Date().toISOString(),
                        fromAPI: true
                    }
                }));
            }
        }

        // ========== XỬ LÝ CÁC LỖI KHÁC ==========

        // Lỗi 403 - Forbidden
        if (error.response?.status === 403) {
            console.warn('🔴 [403] Không có quyền truy cập:', error.response?.data?.message);

            window.dispatchEvent(new CustomEvent('forbidden', {
                detail: {
                    message: error.response?.data?.message || 'Bạn không có quyền truy cập',
                }
            }));
        }

        // Lỗi 429 - Too Many Requests
        if (error.response?.status === 429) {
            console.warn('🔴 [429] Quá nhiều yêu cầu:', error.response?.data?.message);

            window.dispatchEvent(new CustomEvent('rateLimited', {
                detail: {
                    message: error.response?.data?.message || 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
                    retryAfter: error.response?.headers?.['retry-after'] || 60
                }
            }));
        }

        // Lỗi 500 - Server Error
        if (error.response?.status >= 500) {
            console.error('🔴 [500] Lỗi máy chủ:', error.response?.data?.message || error.message);

            window.dispatchEvent(new CustomEvent('serverError', {
                detail: {
                    message: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
                    status: error.response?.status
                }
            }));
        }

        // Mất kết nối mạng
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
// HÀM TIỆN ÍCH
// ============================================================

export const isAuthenticated = async () => {
    try {
        const response = await api.get('/auth/me');
        return response.data.success;
    } catch (error) {
        return false;
    }
};

export const getDevices = async () => {
    const response = await api.get('/auth/devices');
    return response.data;
};

export const revokeDevice = async (deviceId) => {
    const response = await api.delete(`/auth/devices/${deviceId}`);
    return response.data;
};

export const removeAllListeners = () => {
    console.log('🧹 [API] Cleanup listeners');
};

export default api;