import axios from 'axios';

const API_BASE = 'https://api.quangdungcinema.id.vn';

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true, // Tự động gửi cookie (user_token, admin_token)
    headers: {
        'Content-Type': 'application/json',
    },
});

// ============================================================
// 🟢 INTERCEPTOR XỬ LÝ LỖI - ĐÃ SỬA
// ============================================================
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Chỉ xử lý lỗi 401 (Unauthorized)
        if (error.response?.status === 401) {
            const errorCode = error.response?.data?.code;
            const errorMessage = error.response?.data?.message || 'Phiên đăng nhập đã hết hạn';

            console.warn('🔴 [API] Lỗi 401:', errorCode, errorMessage);

            // ========== 🔥 XỬ LÝ CÁC TRƯỜNG HỢP CỤ THỂ ==========

            // 1. SESSION_EXPIRED - Tài khoản đã đăng nhập trên thiết bị khác
            if (errorCode === 'SESSION_EXPIRED') {
                console.warn('🔴 [SESSION_EXPIRED] Tài khoản đã đăng nhập trên thiết bị khác!');

                // Xóa token trong localStorage (nếu có lưu)
                localStorage.removeItem('user_info');
                localStorage.removeItem('admin_info');

                // Dispatch event để các component bắt và hiển thị modal
                window.dispatchEvent(new CustomEvent('sessionExpired', {
                    detail: {
                        code: 'SESSION_EXPIRED',
                        message: errorMessage,
                        timestamp: new Date().toISOString()
                    }
                }));

                // KHÔNG redirect ở đây! Để component xử lý UI
            }

            // 2. TOKEN_INVALID - Token không hợp lệ
            else if (errorCode === 'TOKEN_INVALID') {
                console.warn('🔴 [TOKEN_INVALID] Token không hợp lệ, xóa cookie...');

                localStorage.removeItem('user_info');
                localStorage.removeItem('admin_info');

                window.dispatchEvent(new CustomEvent('tokenInvalid', {
                    detail: {
                        code: 'TOKEN_INVALID',
                        message: errorMessage
                    }
                }));
            }

            // 3. UNAUTHORIZED - Chưa đăng nhập
            else if (errorCode === 'UNAUTHORIZED') {
                console.warn('🔴 [UNAUTHORIZED] Vui lòng đăng nhập');

                window.dispatchEvent(new CustomEvent('unauthorized', {
                    detail: {
                        code: 'UNAUTHORIZED',
                        message: errorMessage
                    }
                }));
            }

            // 4. Các lỗi 401 khác (mặc định)
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

        // ========== XỬ LÝ CÁC LỖI KHÁC ==========

        // Lỗi 403 - Forbidden (Không có quyền)
        if (error.response?.status === 403) {
            console.warn('🔴 [403] Không có quyền truy cập:', error.response?.data?.message);

            window.dispatchEvent(new CustomEvent('forbidden', {
                detail: {
                    message: error.response?.data?.message || 'Bạn không có quyền truy cập',
                }
            }));
        }

        // Lỗi 429 - Too Many Requests (Rate Limit)
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

        // Trả về lỗi để component xử lý tiếp nếu cần
        return Promise.reject(error);
    }
);

// ============================================================
// 🟢 THÊM MỚI: HÀM TIỆN ÍCH KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP
// ============================================================

/**
 * Kiểm tra xem user đã đăng nhập chưa (dựa vào cookie)
 * Cookie được tự động gửi qua withCredentials
 */
export const isAuthenticated = async () => {
    try {
        const response = await api.get('/auth/me');
        return response.data.success;
    } catch (error) {
        return false;
    }
};

/**
 * Lấy danh sách thiết bị đang đăng nhập
 */
export const getDevices = async () => {
    const response = await api.get('/auth/devices');
    return response.data;
};

/**
 * Đăng xuất 1 thiết bị cụ thể
 */
export const revokeDevice = async (deviceId) => {
    const response = await api.delete(`/auth/devices/${deviceId}`);
    return response.data;
};

// ============================================================
// 🟢 CLEANUP: Dọn dẹp event listeners khi cần
// ============================================================

export const removeAllListeners = () => {
    // Có thể mở rộng nếu cần cleanup
    console.log('🧹 [API] Cleanup listeners');
};

export default api;