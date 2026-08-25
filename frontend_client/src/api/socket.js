import { io } from 'socket.io-client';

const SOCKET_URL = 'https://api.quangdungcinema.id.vn';

class SocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.userId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        this.onSessionExpired = null;
        this.isSessionExpired = false;
    }

    setOnSessionExpired(callback) {
        this.onSessionExpired = typeof callback === 'function' ? callback : null;
    }

    emitSessionExpired(detail = {}) {
        if (this.isSessionExpired) {
            console.log('⚠️ [SOCKET] Session expired already emitted');
            return;
        }

        this.isSessionExpired = true;

        const payload = {
            code: detail.code || 'TOKEN_EXPIRED',
            message: detail.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
            newDevice: detail.newDevice || null,
            source: 'socket',
            fromSocket: true,
            timestamp: detail.timestamp || new Date().toISOString(),
        };

        console.warn('🔴 [SOCKET] SESSION EXPIRED:', payload);

        if (typeof this.onSessionExpired === 'function') {
            this.onSessionExpired(payload);
        }
    }

    connect(userId) {
        if (!userId) {
            console.warn('⚠️ [SOCKET] Không có userId, không thể kết nối');
            return null;
        }

        if (this.socket && this.socket.connected && String(this.userId) === String(userId)) {
            console.log('🟢 [SOCKET] Đã kết nối sẵn:', userId);
            return this.socket;
        }

        if (this.socket) {
            console.log('🟡 [SOCKET] Có socket cũ → disconnect');
            this.disconnect({ preserveSessionState: false });
        }

        this.isSessionExpired = false;
        this.userId = userId;
        this.reconnectAttempts = 0;

        console.log('🔄 [SOCKET] Connecting user:', userId);

        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000,
        });

        this.socket.on('connect', () => {
            if (!this.socket) return;

            if (this.isSessionExpired) {
                console.warn('⚠️ [SOCKET] Session expired, bỏ qua connect');
                return;
            }

            console.log('🟢 [SOCKET] Kết nối thành công!');
            this.isConnected = true;
            this.reconnectAttempts = 0;

            if (this.userId) {
                this.socket.emit('register_socket', { userId: this.userId });
            }
        });

        // 🔥 BẮT SỰ KIỆN TỪ SERVER (2 mã lỗi)
        this.socket.on('session_expired', (data = {}) => {
            console.warn('🔴 [SOCKET] Session expired received!');
            console.log('📨 [SOCKET] Data:', data);

            if (this.isSessionExpired) {
                console.log('⚠️ [SOCKET] Already processing');
                return;
            }

            this.isSessionExpired = true;

            // Gửi ACK
            if (this.socket && this.socket.connected) {
                this.socket.emit('session_expired_ack', {
                    received: true,
                    userId: this.userId,
                    timestamp: new Date().toISOString(),
                });
            }

            // GỌI CALLBACK (Bất kể mã lỗi là gì)
            this.emitSessionExpired({
                ...data,
                source: 'socket',
                fromSocket: true,
            });

            setTimeout(() => {
                this.disconnect({ preserveSessionState: true });
            }, 300);
        });

        // 🔥 BẮT LỖI KHI TOKEN HẾT HẠN (F5/CHUYỂN TAB)
        this.socket.on('connect_error', (error) => {
            console.error('🔴 [SOCKET] Lỗi kết nối:', error?.message);

            const errorCode = error?.data?.code || error?.code || '';

            if (errorCode === 'SESSION_REPLACED' || errorCode === 'TOKEN_EXPIRED' || errorCode === 'UNAUTHORIZED' || error?.message === 'Token expired' || error?.message === 'Session expired') {
                this.emitSessionExpired({
                    code: errorCode,
                    message: errorCode === 'SESSION_REPLACED'
                        ? 'Tài khoản đã được đăng nhập trên thiết bị khác.'
                        : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                    source: 'socket',
                    fromSocket: true,
                });

                this.disconnect({ preserveSessionState: true });
                return;
            }

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('🔴 [SOCKET] Đã quá số lần reconnect');
                this.disconnect();
            }
        });

        return this.socket;
    }

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

    isConnectedStatus() {
        return Boolean(this.socket && this.socket.connected && this.isConnected);
    }

    getSocket() {
        return this.socket;
    }

    getSocketId() {
        return this.socket?.id || null;
    }

    emit(event, data = {}) {
        if (!this.socket || !this.socket.connected) {
            console.warn(`⚠️ [SOCKET] Không thể emit "${event}" vì chưa kết nối`);
            return false;
        }

        this.socket.emit(event, data);
        return true;
    }
}

const socketService = new SocketService();

export default socketService;