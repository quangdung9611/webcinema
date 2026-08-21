// ============================================================
// SOCKET SERVICE
// JWT AUTHENTICATION VIA HTTPONLY COOKIE
// ============================================================

import { io } from 'socket.io-client';

// ============================================================
// CONFIG
// ============================================================

const SOCKET_URL = 'https://api.quangdungcinema.id.vn';

// ============================================================
// SOCKET SERVICE CLASS
// ============================================================

class SocketService {

    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.userId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this._eventListeners = {}; // Lưu listeners để cleanup
    }


    // ============================================================
    // CONNECT SOCKET
    // ============================================================

    connect(userId) {
        // Nếu đã kết nối với đúng user
        if (this.socket && this.socket.connected && String(this.userId) === String(userId)) {
            console.log('🟢 [SOCKET] Đã kết nối sẵn với user:', userId);
            return this.socket;
        }

        // Nếu đang có socket cũ thì ngắt
        if (this.socket) {
            console.log('🟡 [SOCKET] Phát hiện socket cũ, tiến hành ngắt...');
            this.disconnect();
        }

        this.userId = userId;
        console.log('🔄 [SOCKET] Đang kết nối với user:', userId);

        // ========================================================
        // CREATE SOCKET
        // ========================================================

        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000
        });

        // ========================================================
        // CONNECT SUCCESS
        // ========================================================

        this.socket.on('connect', () => {
            console.log('🟢 [SOCKET] Kết nối thành công!');
            console.log('👤 [SOCKET] User:', this.userId);
            console.log('🔌 [SOCKET] Socket ID:', this.socket.id);

            this.isConnected = true;
            this.reconnectAttempts = 0;

            // ============================================================
            // 🔥 QUAN TRỌNG: ĐĂNG KÝ SOCKET VỚI SERVER
            // ============================================================
            if (this.userId) {
                this.socket.emit('register_socket', { userId: this.userId });
                console.log('📤 [SOCKET] Đã gửi register_socket cho user:', this.userId);
            }

            window.dispatchEvent(new CustomEvent('socketConnected', {
                detail: { userId: this.userId, socketId: this.socket.id }
            }));
        });

        // ========================================================
        // DISCONNECT
        // ========================================================

        this.socket.on('disconnect', (reason) => {
            console.warn('🔴 [SOCKET] Đã ngắt kết nối');
            console.warn('📌 [SOCKET] Lý do:', reason);

            this.isConnected = false;

            window.dispatchEvent(new CustomEvent('socketDisconnected', {
                detail: { userId: this.userId, reason }
            }));
        });

        // ========================================================
        // CONNECT ERROR
        // ========================================================

        this.socket.on('connect_error', (error) => {
            console.error('🔴 [SOCKET] Lỗi kết nối:', error.message);

            this.isConnected = false;
            this.reconnectAttempts++;

            // Auth Error
            if (error.message === 'Authentication required' ||
                error.message === 'Unauthorized' ||
                error.message === 'Invalid token') {
                console.warn('🔐 [SOCKET] Không thể xác thực Socket');

                window.dispatchEvent(new CustomEvent('socketAuthError', {
                    detail: { message: error.message }
                }));
            }

            // SESSION_EXPIRED - 🔥 THÊM XỬ LÝ
            if (error.message === 'SESSION_EXPIRED') {
                console.warn('🔴 [SOCKET] Session expired - bị đá khỏi thiết bị cũ');

                window.dispatchEvent(new CustomEvent('sessionExpired', {
                    detail: {
                        code: 'SESSION_EXPIRED',
                        message: 'Tài khoản đã đăng nhập trên thiết bị khác',
                        fromSocket: true
                    }
                }));

                this.disconnect();
            }

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('🔴 [SOCKET] Đã quá số lần thử kết nối');
                this.disconnect();
            }
        });

        // ========================================================
        // RECONNECT
        // ========================================================

        this.socket.io.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 [SOCKET] Đang thử kết nối lại lần ${attemptNumber}`);
        });

        this.socket.io.on('reconnect', (attemptNumber) => {
            console.log(`🟢 [SOCKET] Reconnect thành công lần ${attemptNumber}`);
            this.isConnected = true;
            this.reconnectAttempts = 0;

            // Đăng ký lại socket khi reconnect
            if (this.userId) {
                this.socket.emit('register_socket', { userId: this.userId });
                console.log('📤 [SOCKET] Đã gửi register_socket sau reconnect');
            }
        });

        this.socket.io.on('reconnect_failed', () => {
            console.error('🔴 [SOCKET] Reconnect thất bại hoàn toàn');
            this.isConnected = false;
        });

        // ========================================================
        // SESSION EXPIRED - USER LOGIN ON ANOTHER DEVICE
        // ========================================================

        this.socket.on('session_expired', (data = {}) => {
            console.warn('🔴 [SOCKET] SESSION EXPIRED');
            console.log('📨 [SOCKET] Data:', data);

            // Gửi ACK cho server
            if (this.socket && this.socket.connected) {
                this.socket.emit('session_expired_ack', {
                    received: true,
                    userId: this.userId,
                    timestamp: new Date().toISOString()
                });
            }

            // Dispatch event cho React
            window.dispatchEvent(new CustomEvent('sessionExpired', {
                detail: {
                    code: 'SESSION_EXPIRED',
                    message: data.message || 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.',
                    newDevice: data.newDevice || null,
                    timestamp: data.timestamp || new Date().toISOString(),
                    fromSocket: true
                }
            }));

            // Ngắt socket
            this.disconnect();
        });

        // ========================================================
        // FORCE LOGOUT
        // ========================================================

        this.socket.on('force_logout', (data = {}) => {
            console.warn('🔴 [SOCKET] FORCE LOGOUT');

            window.dispatchEvent(new CustomEvent('sessionExpired', {
                detail: {
                    code: 'SESSION_EXPIRED',
                    message: data.message || 'Phiên đăng nhập của bạn đã bị kết thúc.',
                    timestamp: new Date().toISOString(),
                    fromSocket: true
                }
            }));

            this.disconnect();
        });

        // ========================================================
        // SOCKET REGISTERED - Xác nhận từ server
        // ========================================================

        this.socket.on('socket_registered', (data) => {
            console.log('✅ [SOCKET] Server xác nhận đăng ký:', data);
        });

        return this.socket;
    }


    // ============================================================
    // DISCONNECT
    // ============================================================

    disconnect() {
        if (!this.socket) {
            return;
        }

        console.log('🔴 [SOCKET] Đang ngắt kết nối...');

        // Xóa tất cả listeners
        this.socket.removeAllListeners();
        this.socket.io.removeAllListeners();

        this.socket.disconnect();
        this.socket = null;
        this.isConnected = false;
        this.userId = null;
        this.reconnectAttempts = 0;

        console.log('🔴 [SOCKET] Đã ngắt kết nối');
    }


    // ============================================================
    // GET CONNECTION STATUS
    // ============================================================

    isConnectedStatus() {
        return Boolean(this.socket && this.socket.connected && this.isConnected);
    }


    // ============================================================
    // GET SOCKET
    // ============================================================

    getSocket() {
        return this.socket;
    }


    // ============================================================
    // EMIT EVENT
    // ============================================================

    emit(event, data = {}) {
        if (!this.socket || !this.socket.connected) {
            console.warn(`⚠️ [SOCKET] Không thể emit "${event}" vì chưa kết nối`);
            return false;
        }

        this.socket.emit(event, data);
        return true;
    }


    // ============================================================
    // GET SOCKET ID
    // ============================================================

    getSocketId() {
        return this.socket?.id || null;
    }


    // ============================================================
    // 🟢 THÊM MỚI: ON EVENT (Đăng ký listener)
    // ============================================================

    on(event, callback) {
        if (!this.socket) {
            console.warn(`⚠️ [SOCKET] Không thể đăng ký "${event}" vì chưa kết nối`);
            return;
        }

        // Lưu callback để cleanup
        if (!this._eventListeners[event]) {
            this._eventListeners[event] = [];
        }
        this._eventListeners[event].push(callback);

        this.socket.on(event, callback);
    }


    // ============================================================
    // 🟢 THÊM MỚI: OFF EVENT (Xóa listener)
    // ============================================================

    off(event, callback) {
        if (!this.socket) return;

        if (callback) {
            this.socket.off(event, callback);
            this._eventListeners[event] = this._eventListeners[event]?.filter(
                cb => cb !== callback
            ) || [];
        } else {
            this.socket.off(event);
            delete this._eventListeners[event];
        }
    }

}

// ============================================================
// SINGLETON
// ============================================================

const socketService = new SocketService();
export default socketService;