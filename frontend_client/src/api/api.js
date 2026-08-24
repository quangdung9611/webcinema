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
// 🔥 THÊM: CHECK SESSION NHANH (KHÔNG LOAD FULL USER)
// ============================================================

api.checkSession = async function() {
    try {
        const response = await this.get('/api/auth/check-session', {
            timeout: 3000 // 3 giây timeout
        });
        return response.data;
    } catch (error) {
        // Nếu có lỗi (401, 403, network...), coi như session không hợp lệ
        console.log('🔵 [API] Check session failed:', error?.response?.status || error?.message);
        return null;
    }
};

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

api.interceptors.response.use(
    (response) => response,

    (error) => {
        const status = error?.response?.status;

        // ========================================================
        // 401 - SESSION / TOKEN KHÔNG CÒN HỢP LỆ
        //
        // QUAN TRỌNG:
        // Chỉ dispatch DUY NHẤT 1 event: sessionExpired
        //
        // SessionGuard là nơi DUY NHẤT:
        // - cleanup auth
        // - disconnect socket
        // - hiện modal
        // - redirect login
        // ========================================================

        if (status === 401) {
            const errorCode =
                error?.response?.data?.code ||
                'UNAUTHORIZED';

            const errorMessage =
                error?.response?.data?.message ||
                'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';

            const newDevice =
                error?.response?.data?.newDevice ||
                null;

            // SESSION_EXPIRED
            // = tài khoản đã đăng nhập phiên khác
            const type =
                errorCode === 'SESSION_EXPIRED'
                    ? 'device'
                    : 'token';

            console.warn(
                '🔴 [API] 401 Unauthorized:',
                {
                    code: errorCode,
                    message: errorMessage,
                    type,
                    newDevice
                }
            );

            // Chỉ dispatch 1 event duy nhất
            window.dispatchEvent(
                new CustomEvent('sessionExpired', {
                    detail: {
                        code: errorCode,
                        message: errorMessage,
                        type,
                        newDevice,
                        timestamp: new Date().toISOString()
                    }
                })
            );
        }

        // ========================================================
        // 403
        // ========================================================

        if (status === 403) {
            console.warn(
                '🟠 [API] 403 Forbidden'
            );

            window.dispatchEvent(
                new CustomEvent('forbidden', {
                    detail: {
                        message:
                            error?.response?.data?.message ||
                            'Bạn không có quyền truy cập.'
                    }
                })
            );
        }

        // ========================================================
        // 429
        // ========================================================

        if (status === 429) {
            console.warn(
                '🟡 [API] 429 Rate Limited'
            );

            window.dispatchEvent(
                new CustomEvent('rateLimited', {
                    detail: {
                        message:
                            error?.response?.data?.message ||
                            'Quá nhiều yêu cầu. Vui lòng thử lại sau.'
                    }
                })
            );
        }

        // ========================================================
        // 500+
        // ========================================================

        if (status >= 500) {
            console.error(
                '🔴 [API] Server Error:',
                status
            );

            window.dispatchEvent(
                new CustomEvent('serverError', {
                    detail: {
                        message:
                            'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'
                    }
                })
            );
        }

        // ========================================================
        // NETWORK ERROR
        // ========================================================

        if (
            error?.code === 'ERR_NETWORK' ||
            error?.message === 'Network Error'
        ) {
            console.error(
                '🔴 [API] Network Error'
            );

            window.dispatchEvent(
                new CustomEvent('networkError', {
                    detail: {
                        message:
                            'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.'
                    }
                })
            );
        }

        return Promise.reject(error);
    }
);

export default api;