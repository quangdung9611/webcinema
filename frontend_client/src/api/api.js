import axios from "axios";

const API_BASE =
    "https://api.quangdungcinema.id.vn";

const CACHE_DURATION = 5000;

// ============================================================
// AXIOS INSTANCE
// ============================================================

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,

    headers: {
        "Content-Type": "application/json",
    },

    // Không đặt timeout ở đây để tránh làm thay đổi hành vi
    // của các API hiện tại.
});

// ============================================================
// CACHE USER
// ============================================================

let cachedUser = null;
let cachedTime = 0;

// ============================================================
// SESSION EXPIRED LOCK
// ============================================================

let isSessionExpiredEmitted = false;

// ============================================================
// NETWORK ERROR LOCK
// ============================================================
//
// Tránh một request network fail spam event liên tục.
//
// Lock chỉ dùng trong một khoảng thời gian ngắn.
// Không ảnh hưởng tới sessionExpired.
// ============================================================

let lastNetworkErrorTime = 0;

const NETWORK_ERROR_DEBOUNCE = 1000;

// ============================================================
// EMIT SESSION EXPIRED
// ============================================================

const emitSessionExpired = (
    detail = {}
) => {
    if (isSessionExpiredEmitted) {
        console.log(
            "⚠️ [API] sessionExpired already emitted"
        );

        return;
    }

    isSessionExpiredEmitted = true;

    const payload = {
        code:
            detail.code ||
            "TOKEN_EXPIRED",

        message:
            detail.message ||
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",

        newDevice:
            detail.newDevice ||
            null,

        source:
            detail.source ||
            "api",

        fromSocket: false,

        timestamp:
            detail.timestamp ||
            new Date().toISOString(),
    };

    console.warn(
        "🔴 [API] EMIT SESSION EXPIRED:",
        payload
    );

    window.dispatchEvent(
        new CustomEvent(
            "sessionExpired",
            {
                detail: payload,
            }
        )
    );
};

// ============================================================
// EMIT NETWORK ERROR
// ============================================================
//
// Chỉ chạy khi Axios KHÔNG nhận được HTTP response.
//
// Ví dụ:
// - mất Wi-Fi
// - DNS fail
// - connection refused
// - timeout
// - ERR_NETWORK
//
// KHÔNG chạy cho:
// - 401
// - 403
// - 404
// - 422
// - 500
//
// Vì các trường hợp trên vẫn nhận được response từ server.
// ============================================================

const emitNetworkError = (
    error
) => {
    // --------------------------------------------------------
    // Có response => server đã phản hồi
    // => không phải network error
    // --------------------------------------------------------

    if (error?.response) {
        return;
    }

    // --------------------------------------------------------
    // Request chưa có config => không xử lý
    // --------------------------------------------------------

    if (!error?.config) {
        return;
    }

    const now = Date.now();

    // --------------------------------------------------------
    // Debounce event
    // --------------------------------------------------------

    if (
        now - lastNetworkErrorTime <
        NETWORK_ERROR_DEBOUNCE
    ) {
        return;
    }

    lastNetworkErrorTime = now;

    const requestUrl =
        error?.config?.url ||
        "";

    // --------------------------------------------------------
    // Axios error classification
    // --------------------------------------------------------

    const errorCode =
        error?.code ||
        "";

    const errorName =
        error?.name ||
        "";

    // --------------------------------------------------------
    // TIMEOUT
    // --------------------------------------------------------

    const isTimeout =
        errorCode ===
        "ECONNABORTED" ||
        errorCode ===
        "ETIMEDOUT" ||
        errorName ===
        "AxiosError" &&
        error?.message
            ?.toLowerCase()
            ?.includes("timeout");

    // --------------------------------------------------------
    // NETWORK
    // --------------------------------------------------------

    const isNetworkError =
        errorCode ===
            "ERR_NETWORK" ||
        !error?.response;

    if (!isNetworkError) {
        return;
    }

    // --------------------------------------------------------
    // MODE + CODE
    // --------------------------------------------------------

    let mode = "network";

    let displayCode =
        "ERR_NETWORK";

    if (isTimeout) {
        mode = "timeout";

        displayCode =
            "ERR_CONNECTION_TIMED_OUT";
    }

    // --------------------------------------------------------
    // Nếu browser đã xác nhận offline
    // --------------------------------------------------------

    if (
        typeof navigator !==
            "undefined" &&
        !navigator.onLine
    ) {
        mode = "offline";

        displayCode =
            "ERR_INTERNET_DISCONNECTED";
    }

    // --------------------------------------------------------
    // PAYLOAD
    // --------------------------------------------------------

    const payload = {
        mode,

        code: displayCode,

        url:
            typeof window !==
                "undefined"
                ? window.location.hostname
                : "",

        message:
            isTimeout
                ? "The server took too long to respond."
                : "A network error occurred while trying to connect to the server.",

        source: "api",

        requestUrl,

        timestamp:
            new Date().toISOString(),
    };

    console.warn(
        "🔴 [API] NETWORK ERROR:",
        payload
    );

    // --------------------------------------------------------
    // SEND TO APP
    // --------------------------------------------------------

    if (
        typeof window !==
        "undefined"
    ) {
        window.dispatchEvent(
            new CustomEvent(
                "networkError",
                {
                    detail: payload,
                }
            )
        );
    }
};

// ============================================================
// OVERRIDE GET
// ============================================================

const originalGet = api.get;

api.get = function (
    url,
    config = {}
) {
    const normalizedUrl =
        typeof url === "string"
            ? url.split("?")[0]
            : url;

    const isMeEndpoint =
        normalizedUrl ===
        "/api/auth/me";

    // --------------------------------------------------------
    // CACHE /auth/me
    // --------------------------------------------------------

    if (
        isMeEndpoint &&
        !config.force
    ) {
        const now = Date.now();

        if (
            cachedUser &&
            now - cachedTime <
                CACHE_DURATION
        ) {
            console.log(
                "💾 [API] Return cached /api/auth/me"
            );

            return Promise.resolve({
                data: cachedUser,

                status: 200,

                statusText: "OK",

                headers: {},

                config,

                request: {},
            });
        }
    }

    // --------------------------------------------------------
    // Remove custom force property
    // --------------------------------------------------------

    const requestConfig = {
        ...config,
    };

    if (
        "force" in
        requestConfig
    ) {
        delete requestConfig.force;
    }

    return originalGet.call(
        this,
        url,
        requestConfig
    );
};

// ============================================================
// INVALIDATE OTP
// ============================================================

api.invalidateOTP = async (
    email,
    purpose
) => {
    if (
        !email ||
        !purpose
    ) {
        console.warn(
            "⚠️ [API] invalidateOTP: Thiếu email hoặc purpose"
        );

        return null;
    }

    try {
        const response =
            await api.post(
                "/api/auth/invalidate-otp",
                {
                    email,
                    purpose,
                }
            );

        console.log(
            "✅ [API] OTP invalidated:",
            {
                email,
                purpose,
            }
        );

        return response.data;
    } catch (error) {
        console.warn(
            "⚠️ [API] Failed to invalidate OTP:",
            error.message
        );

        return null;
    }
};

// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

api.interceptors.response.use(

    // ========================================================
    // SUCCESS
    // ========================================================

    (response) => {
        const requestUrl =
            response.config?.url ||
            "";

        const normalizedUrl =
            requestUrl.split("?")[0];

        // ----------------------------------------------------
        // CACHE /auth/me
        // ----------------------------------------------------

        if (
            normalizedUrl ===
            "/api/auth/me"
        ) {
            cachedUser =
                response.data;

            cachedTime =
                Date.now();

            console.log(
                "💾 [API] Cached /api/auth/me response"
            );
        }

        // ----------------------------------------------------
        // RESET SESSION LOCK ON LOGIN
        // ----------------------------------------------------

        if (
            normalizedUrl ===
            "/api/auth/login"
        ) {
            api.resetSessionExpiredLock();

            console.log(
                "🔓 [API] Reset session expired lock on login"
            );
        }

        return response;
    },

    // ========================================================
    // ERROR
    // ========================================================

    (error) => {
        const status =
            error?.response?.status;

        const requestUrl =
            error?.config?.url ||
            "";

        const normalizedUrl =
            requestUrl.split("?")[0];

        // ====================================================
        // NETWORK ERROR
        // ====================================================
        //
        // Xử lý trước 401 nhưng chỉ khi KHÔNG có response.
        //
        // ====================================================

        if (
            !error?.response &&
            error?.config
        ) {
            emitNetworkError(
                error
            );
        }

        // ====================================================
        // 401 UNAUTHORIZED
        // ====================================================

        if (
            status === 401
        ) {
            cachedUser = null;

            cachedTime = 0;

            const responseData =
                error?.response
                    ?.data || {};

            const errorCode =
                responseData.code ||
                "TOKEN_EXPIRED";

            const errorMessage =
                responseData.message ||
                "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";

            console.warn(
                "🔴 [API] 401 Unauthorized:",
                {
                    url:
                        normalizedUrl,

                    code:
                        errorCode,

                    message:
                        errorMessage,
                }
            );

            // ------------------------------------------------
            // EXCLUDED ENDPOINTS
            // ------------------------------------------------

            const excludedEndpoints = [
                "/api/auth/login",
                "/api/auth/register",
                "/api/auth/register-step1",
                "/api/auth/complete-registration",
                "/api/auth/forgot-password",
                "/api/auth/reset-password",
                "/api/auth/submit-new-password",
                "/api/auth/verify-otp-and-reset",
                "/api/auth/verify-otp",
                "/api/auth/verify-email",
                "/api/auth/check-lock",
                "/api/auth/forgot-pin",
                "/api/auth/verify-otp-and-change-pin",
                "/api/auth/send-verification",
                "/api/auth/resend-verification",
                "/api/auth/invalidate-otp",
                "/api/users/verify-pin",
                "/api/payment/process",
                "/api/coupons/check",
                "/api/bank/verify-otp",
                "/api/momo/verify-otp",
            ];

            const shouldHandleSession =
                !excludedEndpoints.some(
                    (
                        endpoint
                    ) =>
                        normalizedUrl.includes(
                            endpoint
                        )
                );

            if (
                shouldHandleSession
            ) {
                emitSessionExpired({
                    code:
                        errorCode,

                    message:
                        errorMessage,

                    source:
                        "api",
                });
            }
        }

        // ====================================================
        // RETURN ORIGINAL ERROR
        // ====================================================

        return Promise.reject(
            error
        );
    }
);

// ============================================================
// RESET USER CACHE
// ============================================================

api.resetUserCache =
    function () {
        cachedUser = null;

        cachedTime = 0;

        console.log(
            "🔄 [API] Reset user cache"
        );
    };

// ============================================================
// RESET SESSION EXPIRED LOCK
// ============================================================

api.resetSessionExpiredLock =
    function () {
        isSessionExpiredEmitted =
            false;

        console.log(
            "🔓 [API] Reset session expired lock"
        );
    };

// ============================================================
// GLOBAL EVENTS
// ============================================================

window.addEventListener(
    "userLoggedIn",
    () => {
        api.resetUserCache();

        api.resetSessionExpiredLock();
    }
);

window.addEventListener(
    "sessionExpired",
    () => {
        api.resetUserCache();
    }
);

window.addEventListener(
    "authCleanedUp",
    () => {
        api.resetUserCache();
    }
);

// ============================================================
// EXPORT
// ============================================================

export default api;