import axios from 'axios';

const API_BASE = 'https://api.quangdungcinema.id.vn';
const CACHE_DURATION = 5000;

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

let cachedUser = null;
let cachedTime = 0;
let isSessionExpiredEmitted = false;

const emitSessionExpired = (detail = {}) => {
    if (isSessionExpiredEmitted) {
        console.log('⚠️ [API] sessionExpired already emitted');
        return;
    }

    isSessionExpiredEmitted = true;

    const isDeviceLogin = detail.type === 'device' || detail.code === 'SESSION_EXPIRED';

    const payload = {
        code: detail.code || (isDeviceLogin ? 'SESSION_EXPIRED' : 'UNAUTHORIZED'),
        message: detail.message || (isDeviceLogin
            ? 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.'
            : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'),
        type: isDeviceLogin ? 'device' : 'token',
        newDevice: detail.newDevice || null,
        source: detail.source || 'api',
        fromSocket: false,
        timestamp: detail.timestamp || new Date().toISOString(),
    };

    console.warn('🔴 [API] EMIT SESSION EXPIRED:', payload);

    window.dispatchEvent(
        new CustomEvent('sessionExpired', {
            detail: payload,
        })
    );
};

const originalGet = api.get;

api.get = function (url, config = {}) {
    const normalizedUrl = typeof url === 'string' ? url.split('?')[0] : url;
    const isMeEndpoint = normalizedUrl === '/api/auth/me';

    if (isMeEndpoint && !config.force) {
        const now = Date.now();
        if (cachedUser && now - cachedTime < CACHE_DURATION) {
            console.log('💾 [API] Return cached /api/auth/me');
            return Promise.resolve({
                data: cachedUser,
                status: 200,
                statusText: 'OK',
                headers: {},
                config,
                request: {},
            });
        }
    }

    const requestConfig = { ...config };
    if ('force' in requestConfig) {
        delete requestConfig.force;
    }

    return originalGet.call(this, url, requestConfig);
};

api.interceptors.response.use(
    (response) => {
        const requestUrl = response.config?.url || '';
        const normalizedUrl = requestUrl.split('?')[0];

        if (normalizedUrl === '/api/auth/me') {
            cachedUser = response.data;
            cachedTime = Date.now();
            console.log('💾 [API] Cached /api/auth/me response');
        }

        return response;
    },
    (error) => {
        const status = error?.response?.status;
        const requestUrl = error?.config?.url || '';
        const normalizedUrl = requestUrl.split('?')[0];

        if (status === 401) {
            cachedUser = null;
            cachedTime = 0;

            const responseData = error?.response?.data || {};
            const errorCode = responseData.code || 'UNAUTHORIZED';
            const errorMessage = responseData.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
            const newDevice = responseData.newDevice || null;
            const type = errorCode === 'SESSION_EXPIRED' ? 'device' : 'token';

            console.warn('🔴 [API] 401 Unauthorized:', {
                url: normalizedUrl,
                code: errorCode,
                message: errorMessage,
                type,
                newDevice,
            });

            const excludedEndpoints = [
                '/api/auth/login',
                '/api/auth/register',
                '/api/auth/forgot',
                '/api/auth/reset',
                '/api/auth/send-otp',
                '/api/auth/verify-otp',
                '/api/auth/verify-email',
            ];

            const shouldHandleSession = !excludedEndpoints.some((endpoint) =>
                normalizedUrl.includes(endpoint)
            );

            if (shouldHandleSession) {
                emitSessionExpired({
                    code: errorCode,
                    message: errorMessage,
                    type,
                    newDevice,
                    source: 'api',
                });
            }
        }

        if (status === 403) {
            window.dispatchEvent(
                new CustomEvent('forbidden', {
                    detail: {
                        message: error?.response?.data?.message || 'Bạn không có quyền truy cập.',
                        url: normalizedUrl,
                        timestamp: new Date().toISOString(),
                    },
                })
            );
        }

        if (status === 429) {
            window.dispatchEvent(
                new CustomEvent('rateLimited', {
                    detail: {
                        message: error?.response?.data?.message || 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
                        timestamp: new Date().toISOString(),
                    },
                })
            );
        }

        if (status && status >= 500) {
            window.dispatchEvent(
                new CustomEvent('serverError', {
                    detail: {
                        status,
                        message: error?.response?.data?.message || 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
                        timestamp: new Date().toISOString(),
                    },
                })
            );
        }

        if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
            window.dispatchEvent(
                new CustomEvent('networkError', {
                    detail: {
                        message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
                        timestamp: new Date().toISOString(),
                    },
                })
            );
        }

        if (error?.code === 'ECONNABORTED') {
            console.warn('🟡 [API] Request Timeout');
        }

        return Promise.reject(error);
    }
);

api.resetUserCache = function () {
    cachedUser = null;
    cachedTime = 0;
    console.log('🔄 [API] Reset user cache');
};

api.resetSessionExpiredLock = function () {
    isSessionExpiredEmitted = false;
    console.log('🔓 [API] Reset session expired lock');
};

window.addEventListener('userLoggedIn', () => {
    api.resetUserCache();
    api.resetSessionExpiredLock();
    console.log('🟢 [API] User logged in → reset auth state');
});

window.addEventListener('sessionExpired', () => {
    api.resetUserCache();
});

window.addEventListener('authCleanedUp', () => {
    api.resetUserCache();
});

export default api;