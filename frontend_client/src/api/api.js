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
// 🔥 INTERCEPTOR XỬ LÝ LỖI - HOÀN CHỈNH
// ============================================================

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // ============================================================
        // 🔥 XỬ LÝ 401 - SESSION EXPIRED / TOKEN EXPIRED
        // ============================================================
        if (error.response?.status === 401) {
            const errorCode = error.response?.data?.code;
            const errorMessage = error.response?.data?.message || 'Phiên đăng nhập đã hết hạn';

            console.warn('🔴 [API] Lỗi 401:', errorCode, errorMessage);

            // ========== SESSION_EXPIRED - BỊ ĐÁ KHỎI THIẾT BỊ ==========
            if (errorCode === 'SESSION_EXPIRED') {
                console.warn('🔴 [SESSION_EXPIRED] Tài khoản đã đăng nhập trên thiết bị khác!');

                localStorage.removeItem('user_info');
                localStorage.removeItem('admin_info');

                window.dispatchEvent(new CustomEvent('sessionExpired', {
                    detail: {
                        code: 'SESSION_EXPIRED',
                        message: errorMessage,
                        timestamp: new Date().toISOString(),
                        fromAPI: true
                    }
                }));
            }

            // ========== TOKEN_EXPIRED - TOKEN HẾT HẠN ==========
            else if (errorCode === 'TOKEN_EXPIRED') {
                console.warn('🔴 [TOKEN_EXPIRED] Token đã hết hạn!');

                localStorage.removeItem('user_info');
                localStorage.removeItem('admin_info');

                window.dispatchEvent(new CustomEvent('cookieExpired', {
                    detail: {
                        code: 'TOKEN_EXPIRED',
                        message: errorMessage || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                        timestamp: new Date().toISOString(),
                        fromAPI: true
                    }
                }));
            }

            // ========== COOKIE_EXPIRED - Cookie hết hạn (không có code) ==========
            else if (!errorCode || errorCode === 'UNAUTHORIZED') {
                console.warn('🔴 [COOKIE_EXPIRED] Cookie hết hạn hoặc không hợp lệ');

                localStorage.removeItem('user_info');
                localStorage.removeItem('admin_info');

                window.dispatchEvent(new CustomEvent('cookieExpired', {
                    detail: {
                        code: 'COOKIE_EXPIRED',
                        message: errorMessage || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                        timestamp: new Date().toISOString(),
                        fromAPI: true
                    }
                }));
            }

            // ========== TOKEN_INVALID - Token không hợp lệ ==========
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

        // ========== LỖI 403 - FORBIDDEN ==========
        if (error.response?.status === 403) {
            console.warn('🔴 [403] Không có quyền truy cập');
            window.dispatchEvent(new CustomEvent('forbidden', {
                detail: {
                    message: error.response?.data?.message || 'Bạn không có quyền truy cập',
                }
            }));
        }

        // ========== LỖI 429 - RATE LIMIT ==========
        if (error.response?.status === 429) {
            console.warn('🔴 [429] Quá nhiều yêu cầu');
            window.dispatchEvent(new CustomEvent('rateLimited', {
                detail: {
                    message: error.response?.data?.message || 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
                }
            }));
        }

        // ========== LỖI 500 - SERVER ERROR ==========
        if (error.response?.status >= 500) {
            console.error('🔴 [500] Lỗi máy chủ');
            window.dispatchEvent(new CustomEvent('serverError', {
                detail: {
                    message: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
                }
            }));
        }

        // ========== LỖI MẠNG ==========
        if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
            console.error('🔴 [NETWORK] Mất kết nối mạng');
            window.dispatchEvent(new CustomEvent('networkError', {
                detail: {
                    message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.',
                }
            }));
        }

        return Promise.reject(error);
    }
);

export default api;