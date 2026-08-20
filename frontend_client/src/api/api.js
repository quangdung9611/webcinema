// api/api.js
import axios from 'axios';

const API_BASE = 'https://api.quangdungcinema.id.vn';

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ==========================================================
// RESPONSE INTERCEPTOR - BẮT LỖI SESSION_EXPIRED
// ==========================================================
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const errorCode = error.response?.data?.code;

        console.log(`🔍 [API] Status: ${status}, Code: ${errorCode}`);

        // 👉 BẮT LỖI SESSION EXPIRED
        if (status === 401 && errorCode === 'SESSION_EXPIRED') {
            console.warn('🔴 [API] SESSION EXPIRED - Tài khoản đã đăng nhập ở thiết bị khác!');

            window.dispatchEvent(new CustomEvent('sessionExpired', {
                detail: {
                    message: error.response?.data?.message || 'Tài khoản đã đăng nhập ở thiết bị khác.'
                }
            }));

            return Promise.reject(error);
        }

        // Lỗi 401 thông thường
        if (status === 401) {
            console.warn('🟡 [API] Hết phiên đăng nhập hoặc chưa đăng nhập!');
            window.dispatchEvent(new CustomEvent('unauthorized'));
        }

        return Promise.reject(error);
    }
);

export default api;