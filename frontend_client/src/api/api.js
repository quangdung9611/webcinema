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
// 🔥 CHECK SESSION - DÙNG /me (VÌ NÓ ĐÃ CHECK TOKEN SẴN)
// ============================================================

let cachedSessionResult = null;
let cachedSessionTime = 0;
const CACHE_DURATION = 5000;

api.checkSession = async function(force = false) {
    if (!force && cachedSessionResult && (Date.now() - cachedSessionTime) < CACHE_DURATION) {
        console.log('💾 [API] Return cached session result');
        return cachedSessionResult;
    }

    try {
        console.log('🔄 [API] Checking session via /me...');
        const response = await this.get('/api/auth/me', {
            timeout: 3000
        });
        
        const raw = response?.data;
        const user = raw?.user || raw?.data?.user || null;
        
        const result = {
            success: true,
            valid: !!user,
            user: user
        };
        
        cachedSessionResult = result;
        cachedSessionTime = Date.now();
        
        return result;
    } catch (error) {
        console.log('🔵 [API] Check session failed:', error?.response?.status || error?.message);
        cachedSessionResult = null;
        cachedSessionTime = Date.now() - CACHE_DURATION + 1000;
        return null;
    }
};

api.resetSessionCache = function() {
    console.log('🔄 [API] Reset session cache');
    cachedSessionResult = null;
    cachedSessionTime = 0;
};

window.addEventListener('authCleanedUp', () => api.resetSessionCache());
window.addEventListener('userLoggedIn', () => api.resetSessionCache());

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

api.interceptors.response.use(
    (response) => response,

    (error) => {
        const status = error?.response?.status;

        if (status === 401) {
            const errorCode = error?.response?.data?.code || 'UNAUTHORIZED';
            const errorMessage = error?.response?.data?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
            const newDevice = error?.response?.data?.newDevice || null;
            const type = errorCode === 'SESSION_EXPIRED' ? 'device' : 'token';

            console.warn('🔴 [API] 401 Unauthorized:', { code: errorCode, message: errorMessage, type, newDevice });

            api.resetSessionCache();

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

        if (status === 403) {
            console.warn('🟠 [API] 403 Forbidden');
            window.dispatchEvent(
                new CustomEvent('forbidden', {
                    detail: {
                        message: error?.response?.data?.message || 'Bạn không có quyền truy cập.'
                    }
                })
            );
        }

        if (status === 429) {
            console.warn('🟡 [API] 429 Rate Limited');
            window.dispatchEvent(
                new CustomEvent('rateLimited', {
                    detail: {
                        message: error?.response?.data?.message || 'Quá nhiều yêu cầu. Vui lòng thử lại sau.'
                    }
                })
            );
        }

        if (status >= 500) {
            console.error('🔴 [API] Server Error:', status);
            window.dispatchEvent(
                new CustomEvent('serverError', {
                    detail: {
                        message: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'
                    }
                })
            );
        }

        if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
            console.error('🔴 [API] Network Error');
            window.dispatchEvent(
                new CustomEvent('networkError', {
                    detail: {
                        message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.'
                    }
                })
            );
        }

        return Promise.reject(error);
    }
);

export default api;