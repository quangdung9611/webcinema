// src/utils/cookieMonitor.js

const CHECK_INTERVAL = 100;
const COOKIE_MONITOR_KEY = 'cookie_monitor_trigger';

class CookieMonitor {
    constructor() {
        this.isActive = false;
        this.intervalId = null;
        this.listeners = [];
        this.lastCookieState = {};
        this.checkCount = 0;
        this.storageListenerRegistered = false;
        
        // ====================================================
        // THÊM: Flag để bỏ qua khi đang đăng nhập
        // ====================================================
        this.isLoggingIn = false;
        this.isLoggingOut = false;
        this.ignoreNextCheck = false;
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }

    getAllCookies() {
        const cookies = {};
        document.cookie.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name) {
                cookies[name] = value || '';
            }
        });
        return cookies;
    }

    hasToken(tokenName = 'user_token') {
        return this.getCookie(tokenName) !== null;
    }

    // ====================================================
    // THÊM: Set logging in state
    // ====================================================
    setLoggingIn(value) {
        this.isLoggingIn = value;
        if (value) {
            this.ignoreNextCheck = true;
            console.log('🍪 [CookieMonitor] Logging in... ignoring token changes');
        } else {
            // Sau khi login xong, update state mới
            setTimeout(() => {
                this.lastCookieState = {
                    user_token: this.getCookie('user_token'),
                    admin_token: this.getCookie('admin_token'),
                };
                this.ignoreNextCheck = false;
                console.log('🍪 [CookieMonitor] Login completed, state updated');
            }, 500);
        }
    }

    setLoggingOut(value) {
        this.isLoggingOut = value;
        if (value) {
            this.ignoreNextCheck = true;
            console.log('🍪 [CookieMonitor] Logging out... ignoring token changes');
        } else {
            setTimeout(() => {
                this.ignoreNextCheck = false;
            }, 500);
        }
    }

    start() {
        if (this.isActive) {
            console.log('🍪 [CookieMonitor] Already active');
            return;
        }

        console.log('🍪 [CookieMonitor] Starting...');

        this.lastCookieState = {
            user_token: this.getCookie('user_token'),
            admin_token: this.getCookie('admin_token'),
        };

        this.isActive = true;
        this.checkCount = 0;
        this.ignoreNextCheck = false;

        this.checkCookies();
        this.intervalId = setInterval(() => {
            this.checkCookies();
        }, CHECK_INTERVAL);

        this.setupStorageListener();

        console.log('✅ [CookieMonitor] Started with interval', CHECK_INTERVAL, 'ms');
    }

    checkCookies() {
        if (!this.isActive) return;
        
        // ====================================================
        // BỎ QUA KHI ĐANG LOGIN/LOGOUT
        // ====================================================
        if (this.ignoreNextCheck || this.isLoggingIn || this.isLoggingOut) {
            // Vẫn update state nhưng không notify
            this.lastCookieState = {
                user_token: this.getCookie('user_token'),
                admin_token: this.getCookie('admin_token'),
            };
            return;
        }

        this.checkCount++;

        const currentState = {
            user_token: this.getCookie('user_token'),
            admin_token: this.getCookie('admin_token'),
        };

        const tokenNames = ['user_token', 'admin_token'];

        tokenNames.forEach(tokenName => {
            const previous = this.lastCookieState[tokenName];
            const current = currentState[tokenName];

            // Token bị xóa
            if (previous !== null && current === null) {
                // ================================================
                // BỎ QUA NẾU ĐANG LOGOUT
                // ================================================
                if (this.isLoggingOut) {
                    console.log('⏭️ [CookieMonitor] Skipping notification during logout');
                    return;
                }

                console.log(`🔴 [CookieMonitor] Token "${tokenName}" DELETED!`);
                this.notifyListeners({
                    cookieName: tokenName,
                    type: 'cookie_deleted',
                    previousValue: previous,
                    timestamp: new Date().toISOString(),
                });
            }

            // Token thay đổi
            if (previous !== null && current !== null && previous !== current) {
                console.log(`🔄 [CookieMonitor] Token "${tokenName}" CHANGED`);
                this.notifyListeners({
                    cookieName: tokenName,
                    type: 'cookie_changed',
                    previousValue: previous,
                    newValue: current,
                    timestamp: new Date().toISOString(),
                });
            }

            // Token mới xuất hiện - BỎ QUA VÌ ĐÂY LÀ ĐĂNG NHẬP
            if (previous === null && current !== null) {
                console.log(`🟢 [CookieMonitor] Token "${tokenName}" ADDED (ignoring)`);
                // KHÔNG notify để tránh bị đẩy ra
            }
        });

        this.lastCookieState = currentState;
        this.broadcastState();
    }

    broadcastState() {
        try {
            const currentState = {
                user_token: this.getCookie('user_token'),
                admin_token: this.getCookie('admin_token'),
                timestamp: Date.now(),
            };
            localStorage.setItem(COOKIE_MONITOR_KEY, JSON.stringify(currentState));
        } catch (error) {}
    }

    setupStorageListener() {
        if (this.storageListenerRegistered) return;

        window.addEventListener('storage', (event) => {
            if (event.key === COOKIE_MONITOR_KEY) {
                try {
                    const data = JSON.parse(event.newValue);
                    if (data) {
                        const hasToken = this.hasToken('user_token');
                        if (!data.user_token && hasToken && !this.isLoggingOut) {
                            this.forceCheck();
                        }
                    }
                } catch (error) {}
            }
        });

        this.storageListenerRegistered = true;
    }

    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
            console.log(`🍪 [CookieMonitor] Listener added (total: ${this.listeners.length})`);
        }
        return this.listeners.length;
    }

    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
            return true;
        }
        return false;
    }

    notifyListeners(data) {
        console.log(`📢 [CookieMonitor] Notifying ${this.listeners.length} listeners:`, data);
        this.listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('🔴 [CookieMonitor] Listener error:', error);
            }
        });

        try {
            window.dispatchEvent(
                new CustomEvent('cookieMonitorEvent', {
                    detail: data,
                })
            );
        } catch (error) {}
    }

    stop() {
        console.log('🍪 [CookieMonitor] Stopping...');
        this.isActive = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    reset() {
        console.log('🔄 [CookieMonitor] Resetting...');
        this.lastCookieState = {
            user_token: this.getCookie('user_token'),
            admin_token: this.getCookie('admin_token'),
        };
        this.checkCount = 0;
        this.ignoreNextCheck = false;
        this.isLoggingIn = false;
        this.isLoggingOut = false;
    }

    isActive() {
        return this.isActive;
    }

    getState() {
        return {
            isActive: this.isActive,
            checkCount: this.checkCount,
            lastCookieState: this.lastCookieState,
            listeners: this.listeners.length,
            isLoggingIn: this.isLoggingIn,
            isLoggingOut: this.isLoggingOut,
        };
    }

    forceCheck() {
        console.log('🔄 [CookieMonitor] Force check...');
        this.checkCookies();
    }
}

const cookieMonitor = new CookieMonitor();

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            cookieMonitor.start();
        });
    } else {
        cookieMonitor.start();
    }
}

export default cookieMonitor;