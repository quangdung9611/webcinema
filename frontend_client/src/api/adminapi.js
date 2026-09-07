import axios from 'axios';

const API_BASE = 'https://api.quangdungcinema.id.vn';
const CACHE_DURATION = 5000;

const adminApi = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

let cachedAdmin = null;
let cachedTime = 0;
let isSessionExpiredEmitted = false;

const emitSessionExpired = (detail = {}) => {
    if (isSessionExpiredEmitted) {
        console.log('⚠️ [ADMIN API] sessionExpired already emitted');
        return;
    }

    isSessionExpiredEmitted = true;

    const payload = {
        code: detail.code || 'TOKEN_EXPIRED',
        message: detail.message || 'Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.',
        newDevice: detail.newDevice || null,
        source: detail.source || 'admin_api',
        fromSocket: false,
        timestamp: detail.timestamp || new Date().toISOString(),
    };

    console.warn('🔴 [ADMIN API] EMIT SESSION EXPIRED:', payload);

    window.dispatchEvent(
        new CustomEvent('sessionExpired', {
            detail: payload,
        })
    );
};

const originalGet = adminApi.get;

adminApi.get = function (url, config = {}) {
    const normalizedUrl = typeof url === 'string' ? url.split('?')[0] : url;
    const isMeEndpoint = normalizedUrl === '/admin/api/auth/me';

    if (isMeEndpoint && !config.force) {
        const now = Date.now();
        if (cachedAdmin && now - cachedTime < CACHE_DURATION) {
            console.log('💾 [ADMIN API] Return cached /admin/api/auth/me');
            return Promise.resolve({
                data: cachedAdmin,
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

adminApi.interceptors.response.use(
    (response) => {
        const requestUrl = response.config?.url || '';
        const normalizedUrl = requestUrl.split('?')[0];

        if (normalizedUrl === '/admin/api/auth/me') {
            cachedAdmin = response.data;
            cachedTime = Date.now();
            console.log('💾 [ADMIN API] Cached /admin/api/auth/me response');
        }

        if (normalizedUrl === '/admin/api/auth/login') {
            adminApi.resetSessionExpiredLock();
            console.log('🔓 [ADMIN API] Reset session expired lock on login');
        }

        return response;
    },
    (error) => {
        const status = error?.response?.status;
        const requestUrl = error?.config?.url || '';
        const normalizedUrl = requestUrl.split('?')[0];

        if (status === 401) {
            cachedAdmin = null;
            cachedTime = 0;

            const responseData = error?.response?.data || {};
            const errorCode = responseData.code || 'TOKEN_EXPIRED';
            const errorMessage = responseData.message || 'Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.';

            console.warn('🔴 [ADMIN API] 401 Unauthorized:', {
                url: normalizedUrl,
                code: errorCode,
                message: errorMessage,
            });

            const excludedEndpoints = [
                '/admin/api/auth/login',
                '/admin/api/auth/refresh',
            ];

            const shouldHandleSession = !excludedEndpoints.some((endpoint) =>
                normalizedUrl.includes(endpoint)
            );

            if (shouldHandleSession) {
                emitSessionExpired({
                    code: errorCode,
                    message: errorMessage,
                    source: 'admin_api',
                });
            }
        }

        return Promise.reject(error);
    }
);

adminApi.resetAdminCache = function () {
    cachedAdmin = null;
    cachedTime = 0;
    console.log('🔄 [ADMIN API] Reset admin cache');
};

adminApi.resetSessionExpiredLock = function () {
    isSessionExpiredEmitted = false;
    console.log('🔓 [ADMIN API] Reset session expired lock');
};

window.addEventListener('adminLoggedIn', () => {
    adminApi.resetAdminCache();
    adminApi.resetSessionExpiredLock();
});

window.addEventListener('sessionExpired', () => {
    adminApi.resetAdminCache();
});

window.addEventListener('authCleanedUp', () => {
    adminApi.resetAdminCache();
});

export default adminApi;