import { io } from 'socket.io-client';

// ============================================================
// CONFIG
// ============================================================

const SOCKET_URL =
    'https://api.quangdungcinema.id.vn';

// ============================================================
// SOCKET SERVICE
// ============================================================

class SocketService {
    constructor() {
        this.socket = null;

        this.isConnected = false;

        this.userId = null;

        this.reconnectAttempts = 0;

        this.maxReconnectAttempts = 5;

        // ====================================================
        // SESSION CALLBACK
        // ====================================================

        this.onSessionExpired = null;

        this.onTokenExpired = null;

        // ====================================================
        // SESSION LOCK
        // ====================================================

        this.isSessionExpired = false;
    }

    // ========================================================
    // CALLBACK
    // ========================================================

    setOnSessionExpired(callback) {
        this.onSessionExpired =
            typeof callback === 'function'
                ? callback
                : null;
    }

    setOnTokenExpired(callback) {
        this.onTokenExpired =
            typeof callback === 'function'
                ? callback
                : null;
    }

    // ========================================================
    // EMIT SESSION EXPIRED
    // ========================================================

    emitSessionExpired(detail = {}) {
        if (this.isSessionExpired) {
            console.log('⚠️ [SOCKET] Session expired already emitted');
            return;
        }

        this.isSessionExpired = true;

        const isDeviceLogin =
            detail.type === 'device' ||
            detail.code === 'SESSION_EXPIRED';

        const payload = {
            code: detail.code || (isDeviceLogin ? 'SESSION_EXPIRED' : 'TOKEN_EXPIRED'),
            message: detail.message || (isDeviceLogin 
                ? 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.'
                : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'),
            type: isDeviceLogin ? 'device' : 'token',
            newDevice: detail.newDevice || null,
            source: 'socket',
            fromSocket: true,
            timestamp: detail.timestamp || new Date().toISOString(),
        };

        console.warn('🔴 [SOCKET] SESSION EXPIRED:', payload);

        // Gọi callback chính
        if (typeof this.onSessionExpired === 'function') {
            this.onSessionExpired(payload);
        }

        // Gọi callback token nếu có
        if (payload.type === 'token' && typeof this.onTokenExpired === 'function') {
            this.onTokenExpired(payload);
        }
    }

    // ========================================================
    // CONNECT
    // ========================================================

    connect(userId) {
        if (!userId) {
            console.warn('⚠️ [SOCKET] Không có userId, không thể kết nối');
            return null;
        }

        // Đã có socket cùng user
        if (this.socket && this.socket.connected && String(this.userId) === String(userId)) {
            console.log('🟢 [SOCKET] Đã kết nối sẵn:', userId);
            return this.socket;
        }

        // Socket cũ
        if (this.socket) {
            console.log('🟡 [SOCKET] Có socket cũ → disconnect');
            this.disconnect({ preserveSessionState: false });
        }

        // Reset cho login mới
        this.isSessionExpired = false;
        this.userId = userId;
        this.reconnectAttempts = 0;

        console.log('🔄 [SOCKET] Connecting user:', userId);

        // CREATE SOCKET
        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000,
        });

        // ====================================================
        // CONNECT
        // ====================================================

        this.socket.on('connect', () => {
            if (!this.socket) return;
            if (this.isSessionExpired) {
                console.warn('⚠️ [SOCKET] Session expired, bỏ qua connect');
                return;
            }

            console.log('🟢 [SOCKET] Kết nối thành công!');
            console.log('👤 [SOCKET] User:', this.userId);
            console.log('🔌 [SOCKET] Socket ID:', this.socket.id);

            this.isConnected = true;
            this.reconnectAttempts = 0;

            // Register socket
            if (this.userId) {
                this.socket.emit('register_socket', { userId: this.userId });
                console.log('📤 [SOCKET] register_socket:', this.userId);
            }

            // Notify app
            window.dispatchEvent(new CustomEvent('socketConnected', {
                detail: {
                    userId: this.userId,
                    socketId: this.socket.id,
                }
            }));
        });

        // ====================================================
        // 🔥 REALTIME SESSION EXPIRED - QUAN TRỌNG NHẤT
        // ====================================================

        this.socket.on('session_expired', (data = {}) => {
            console.warn('🔴 [SOCKET] Session expired received from server!');
            console.log('📨 [SOCKET] Data:', data);

            if (this.isSessionExpired) {
                console.log('⚠️ [SOCKET] Already processing');
                return;
            }

            // LOCK NGAY
            this.isSessionExpired = true;

            // ACK server
            if (this.socket && this.socket.connected) {
                this.socket.emit('session_expired_ack', {
                    received: true,
                    userId: this.userId,
                    timestamp: new Date().toISOString()
                });
            }

            // 🔥 GỌI CALLBACK NGAY LẬP TỨC
            const payload = {
                code: data.code || 'SESSION_EXPIRED',
                type: 'device',
                message: data.message || 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.',
                newDevice: data.newDevice || null,
                timestamp: data.timestamp || new Date().toISOString(),
            };

            if (typeof this.onSessionExpired === 'function') {
                this.onSessionExpired({
                    ...payload,
                    source: 'socket',
                    fromSocket: true,
                });
            }

            // Disconnect sau khi xử lý
            setTimeout(() => {
                this.disconnect({ preserveSessionState: true });
            }, 150);
        });

        // ====================================================
        // DISCONNECT
        // ====================================================

        this.socket.on('disconnect', (reason) => {
            console.warn('🔴 [SOCKET] Đã ngắt kết nối');
            console.warn('📌 [SOCKET] Lý do:', reason);
            this.isConnected = false;

            window.dispatchEvent(new CustomEvent('socketDisconnected', {
                detail: {
                    userId: this.userId,
                    reason,
                }
            }));
        });

        // ====================================================
        // CONNECT ERROR
        // ====================================================

        this.socket.on('connect_error', (error) => {
            console.error('🔴 [SOCKET] Lỗi kết nối:', error?.message);
            this.isConnected = false;
            this.reconnectAttempts++;

            const errorCode = error?.data?.code || error?.code || '';

            // SESSION EXPIRED
            if (errorCode === 'SESSION_EXPIRED') {
                this.emitSessionExpired({
                    code: 'SESSION_EXPIRED',
                    type: 'device',
                    message: error?.data?.message || 'Tài khoản đã được đăng nhập trên thiết bị khác.',
                });
                this.disconnect({ preserveSessionState: true });
                return;
            }

            // TOKEN EXPIRED
            if (errorCode === 'TOKEN_EXPIRED' || errorCode === 'UNAUTHORIZED') {
                this.emitSessionExpired({
                    code: errorCode,
                    type: 'token',
                    message: error?.data?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                });
                this.disconnect({ preserveSessionState: true });
                return;
            }

            // MAX RECONNECT
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('🔴 [SOCKET] Đã quá số lần reconnect');
                this.disconnect();
            }
        });

        // ====================================================
        // RECONNECT SUCCESS
        // ====================================================

        this.socket.io.on('reconnect', (attemptNumber) => {
            if (!this.socket || this.isSessionExpired) return;

            console.log(`🟢 [SOCKET] Reconnect thành công lần ${attemptNumber}`);
            this.isConnected = true;
            this.reconnectAttempts = 0;

            if (this.userId) {
                this.socket.emit('register_socket', { userId: this.userId });
            }
        });

        // ====================================================
        // RECONNECT ATTEMPT
        // ====================================================

        this.socket.io.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 [SOCKET] Đang reconnect lần ${attemptNumber}`);
        });

        // ====================================================
        // RECONNECT FAILED
        // ====================================================

        this.socket.io.on('reconnect_failed', () => {
            console.error('🔴 [SOCKET] Reconnect thất bại hoàn toàn');
            this.isConnected = false;
        });

        return this.socket;
    }

    // ========================================================
    // DISCONNECT
    // ========================================================

    disconnect(options = {}) {
        const { preserveSessionState = false } = options;

        if (!this.socket) {
            this.isConnected = false;
            if (!preserveSessionState) {
                this.userId = null;
                this.reconnectAttempts = 0;
            }
            return;
        }

        console.log('🔴 [SOCKET] Đang ngắt kết nối...');

        const socket = this.socket;
        this.socket = null;
        this.isConnected = false;

        try {
            socket.removeAllListeners();
            socket.io.removeAllListeners();
            socket.disconnect();
        } catch (error) {
            console.warn('⚠️ [SOCKET] Disconnect cleanup error:', error);
        }

        if (!preserveSessionState) {
            this.userId = null;
            this.reconnectAttempts = 0;
            this.isSessionExpired = false;
        }

        console.log('🔴 [SOCKET] Đã ngắt kết nối');
    }

    // ========================================================
    // HELPERS
    // ========================================================

    isConnectedStatus() {
        return Boolean(this.socket && this.socket.connected && this.isConnected);
    }

    getSocket() {
        return this.socket;
    }

    getSocketId() {
        return this.socket?.id || null;
    }

    // ========================================================
    // EMIT EVENT
    // ========================================================

    emit(event, data = {}) {
        if (!this.socket || !this.socket.connected) {
            console.warn(`⚠️ [SOCKET] Không thể emit "${event}" vì chưa kết nối`);
            return false;
        }

        this.socket.emit(event, data);
        return true;
    }
}

// ============================================================
// EXPORT SINGLETON
// ============================================================

const socketService = new SocketService();

export default socketService;