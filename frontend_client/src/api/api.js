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

    const payload = {
        code: detail.code || 'TOKEN_EXPIRED',
        message: detail.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
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
            const errorCode = responseData.code || 'TOKEN_EXPIRED';
            const errorMessage = responseData.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';

            console.warn('🔴 [API] 401 Unauthorized:', {
                url: normalizedUrl,
                code: errorCode,
                message: errorMessage,
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
                    source: 'api',
                });
            }
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
});

window.addEventListener('sessionExpired', () => {
    api.resetUserCache();
});

window.addEventListener('authCleanedUp', () => {
    api.resetUserCache();
});

export default api;