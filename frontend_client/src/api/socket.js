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
        this.eventListeners = new Map(); // Lưu listeners để cleanup
    }


    // ============================================================
    // CONNECT SOCKET
    // ============================================================

    connect(userId) {
        // Nếu đã kết nối với đúng user
        if (
            this.socket &&
            this.socket.connected &&
            String(this.userId) === String(userId)
        ) {
            console.log('🟢 [SOCKET] Đã kết nối sẵn với user:', userId);
            return this.socket;
        }

        // Nếu đang có socket cũ thì ngắt
        if (this.socket) {
            console.log('🟡 [SOCKET] Phát hiện socket cũ, tiến hành ngắt...');
            this.disconnect();
        }

        // Lưu user hiện tại
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

            window.dispatchEvent(
                new CustomEvent('socketConnected', {
                    detail: {
                        userId: this.userId,
                        socketId: this.socket.id
                    }
                })
            );
        });

        // ========================================================
        // DISCONNECT
        // ========================================================

        this.socket.on('disconnect', (reason) => {
            console.warn('🔴 [SOCKET] Đã ngắt kết nối');
            console.warn('📌 [SOCKET] Lý do:', reason);

            this.isConnected = false;

            window.dispatchEvent(
                new CustomEvent('socketDisconnected', {
                    detail: {
                        userId: this.userId,
                        reason
                    }
                })
            );
        });

        // ========================================================
        // CONNECT ERROR
        // ========================================================

        this.socket.on('connect_error', (error) => {
            console.error('🔴 [SOCKET] Lỗi kết nối:', error.message);

            this.isConnected = false;
            this.reconnectAttempts++;

            // AUTH ERROR - Session expired
            if (
                error.message === 'Authentication required' ||
                error.message === 'Unauthorized' ||
                error.message === 'Invalid token' ||
                error.message === 'Session expired - logged in on another device'
            ) {
                console.warn('🔐 [SOCKET] Lỗi xác thực Socket - Session expired');

                // Dispatch event sessionExpired
                window.dispatchEvent(
                    new CustomEvent('sessionExpired', {
                        detail: {
                            code: 'SESSION_EXPIRED',
                            message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                            timestamp: new Date().toISOString(),
                            fromSocket: true
                        }
                    })
                );

                this.disconnect();
            }

            // TOO MANY RECONNECT ATTEMPTS
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
        });

        this.socket.io.on('reconnect_failed', () => {
            console.error('🔴 [SOCKET] Reconnect thất bại hoàn toàn');
            this.isConnected = false;
        });

        // ========================================================
        // SESSION EXPIRED - User login on another device
        // ========================================================

        this.socket.on('session_expired', (data = {}) => {
            console.warn('🔴 [SOCKET] SESSION EXPIRED - Bị đá khỏi thiết bị cũ!');
            console.log('📨 [SOCKET] Data:', data);

            // ACK SERVER
            if (this.socket && this.socket.connected) {
                this.socket.emit('session_expired_ack', {
                    received: true,
                    userId: this.userId,
                    timestamp: new Date().toISOString()
                });
            }

            // Dispatch event cho React
            window.dispatchEvent(
                new CustomEvent('sessionExpired', {
                    detail: {
                        code: 'SESSION_EXPIRED',
                        message: data.message || 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.',
                        newDevice: data.newDevice || null,
                        timestamp: data.timestamp || new Date().toISOString(),
                        fromSocket: true
                    }
                })
            );

            // Ngắt kết nối socket
            this.disconnect();
        });

        // ========================================================
        // FORCE LOGOUT - Admin logout from server
        // ========================================================

        this.socket.on('force_logout', (data = {}) => {
            console.warn('🔴 [SOCKET] FORCE LOGOUT - Bị admin đăng xuất từ xa');

            window.dispatchEvent(
                new CustomEvent('sessionExpired', {
                    detail: {
                        code: 'FORCE_LOGOUT',
                        message: data.message || 'Tài khoản của bạn đã bị đăng xuất từ xa.',
                        timestamp: new Date().toISOString(),
                        fromSocket: true
                    }
                })
            );

            this.disconnect();
        });

        // ========================================================
        // KICK - Bị đá từ thiết bị khác (alias)
        // ========================================================

        this.socket.on('kicked', (data = {}) => {
            console.warn('🔴 [SOCKET] KICKED - Bị đá từ thiết bị khác');

            window.dispatchEvent(
                new CustomEvent('sessionExpired', {
                    detail: {
                        code: 'SESSION_EXPIRED',
                        message: data.message || 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.',
                        timestamp: new Date().toISOString(),
                        fromSocket: true
                    }
                })
            );

            this.disconnect();
        });

        // ========================================================
        // RETURN SOCKET
        // ========================================================

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

        // Remove all listeners
        this.socket.removeAllListeners();

        // Disconnect
        this.socket.disconnect();

        // Reset
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
        return Boolean(
            this.socket &&
            this.socket.connected &&
            this.isConnected
        );
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
    // ON EVENT (wrapper)
    // ============================================================

    on(event, callback) {
        if (!this.socket) {
            console.warn(`⚠️ [SOCKET] Không thể đăng ký event "${event}" vì chưa kết nối`);
            return;
        }
        this.socket.on(event, callback);
    }


    // ============================================================
    // OFF EVENT (wrapper)
    // ============================================================

    off(event, callback) {
        if (!this.socket) {
            return;
        }
        if (callback) {
            this.socket.off(event, callback);
        } else {
            this.socket.off(event);
        }
    }

}


// ============================================================
// SINGLETON
// ============================================================

const socketService = new SocketService();
export default socketService;