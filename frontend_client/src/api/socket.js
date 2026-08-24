// src/api/socket.js

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
        this.onTokenExpired = null;  // 🔥 THÊM CALLBACK CHO TOKEN EXPIRED
    }

    // 🔥 ĐĂNG KÝ CALLBACK
    setOnSessionExpired(callback) {
        this.onSessionExpired = callback;
    }

    // 🔥 THÊM: ĐĂNG KÝ CALLBACK CHO TOKEN EXPIRED
    setOnTokenExpired(callback) {
        this.onTokenExpired = callback;
    }

    connect(userId) {
        if (this.socket && this.socket.connected && String(this.userId) === String(userId)) {
            console.log('🟢 [SOCKET] Đã kết nối sẵn với user:', userId);
            return this.socket;
        }

        if (this.socket) {
            console.log('🟡 [SOCKET] Phát hiện socket cũ, tiến hành ngắt...');
            this.disconnect();
        }

        this.userId = userId;
        console.log('🔄 [SOCKET] Đang kết nối với user:', userId);

        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000
        });

        // ============================================================
        // CONNECT SUCCESS
        // ============================================================
        this.socket.on('connect', () => {
            console.log('🟢 [SOCKET] Kết nối thành công!');
            console.log('👤 [SOCKET] User:', this.userId);
            console.log('🔌 [SOCKET] Socket ID:', this.socket.id);

            this.isConnected = true;
            this.reconnectAttempts = 0;

            if (this.userId) {
                this.socket.emit('register_socket', { userId: this.userId });
                console.log('📤 [SOCKET] Đã gửi register_socket cho user:', this.userId);
            }

            window.dispatchEvent(new CustomEvent('socketConnected', {
                detail: { userId: this.userId, socketId: this.socket.id }
            }));
        });

        // ============================================================
        // 🔥 SESSION EXPIRED - DISPATCH EVENT NGAY LẬP TỨC
        // ============================================================
        this.socket.on('session_expired', (data = {}) => {
            console.warn('🔴 [SOCKET] SESSION EXPIRED - Bị đá khỏi thiết bị!');
            console.log('📨 [SOCKET] Data:', data);

            // 🔥 GỬI ACK
            if (this.socket && this.socket.connected) {
                this.socket.emit('session_expired_ack', {
                    received: true,
                    userId: this.userId,
                    timestamp: new Date().toISOString()
                });
            }

            // 🔥 GỌI CALLBACK NẾU CÓ
            if (typeof this.onSessionExpired === 'function') {
                this.onSessionExpired({
                    code: 'SESSION_EXPIRED',
                    message: data.message || 'Tài khoản đã được đăng nhập trên thiết bị khác.',
                    newDevice: data.newDevice || null,
                    timestamp: data.timestamp || new Date().toISOString(),
                    fromSocket: true
                });
            }

            // 🔥 DISPATCH EVENT NGAY LẬP TỨC CHO TOÀN BỘ APP
            window.dispatchEvent(new CustomEvent('sessionExpired', {
                detail: {
                    code: 'SESSION_EXPIRED',
                    message: data.message || 'Tài khoản đã được đăng nhập trên thiết bị khác.',
                    newDevice: data.newDevice || null,
                    timestamp: data.timestamp || new Date().toISOString(),
                    fromSocket: true
                }
            }));

            // 🔥 DISPATCH THÊM EVENT CHI TIẾT CHO UI
            window.dispatchEvent(new CustomEvent('deviceLoggedOut', {
                detail: {
                    message: data.message || 'Tài khoản đã được đăng nhập trên thiết bị khác.',
                    newDevice: data.newDevice || null,
                    timestamp: data.timestamp || new Date().toISOString()
                }
            }));

            // Ngắt kết nối socket
            this.disconnect();
        });

        // ============================================================
        // DISCONNECT
        // ============================================================
        this.socket.on('disconnect', (reason) => {
            console.warn('🔴 [SOCKET] Đã ngắt kết nối');
            console.warn('📌 [SOCKET] Lý do:', reason);
            this.isConnected = false;

            window.dispatchEvent(new CustomEvent('socketDisconnected', {
                detail: { userId: this.userId, reason }
            }));
        });

        // ============================================================
        // 🔥 CONNECT ERROR - DISPATCH EVENT NGAY LẬP TỨC
        // ============================================================
        this.socket.on('connect_error', (error) => {
            console.error('🔴 [SOCKET] Lỗi kết nối:', error.message);
            this.isConnected = false;
            this.reconnectAttempts++;

            if (error.message === 'SESSION_EXPIRED') {
                console.warn('🔴 [SOCKET] Session expired - bị đá khỏi thiết bị');

                // 🔥 GỌI CALLBACK
                if (typeof this.onSessionExpired === 'function') {
                    this.onSessionExpired({
                        code: 'SESSION_EXPIRED',
                        message: 'Tài khoản đã đăng nhập trên thiết bị khác',
                        fromSocket: true
                    });
                }

                // 🔥 DISPATCH EVENT NGAY LẬP TỨC
                window.dispatchEvent(new CustomEvent('sessionExpired', {
                    detail: {
                        code: 'SESSION_EXPIRED',
                        message: 'Tài khoản đã đăng nhập trên thiết bị khác',
                        fromSocket: true
                    }
                }));

                window.dispatchEvent(new CustomEvent('deviceLoggedOut', {
                    detail: {
                        message: 'Tài khoản đã đăng nhập trên thiết bị khác',
                        timestamp: new Date().toISOString()
                    }
                }));

                this.disconnect();

            } else if (error.message === 'TOKEN_EXPIRED' || error.message === 'UNAUTHORIZED') {
                console.warn('🔴 [SOCKET] Token hết hạn, cần đăng nhập lại');

                // 🔥 GỌI CALLBACK
                if (typeof this.onTokenExpired === 'function') {
                    this.onTokenExpired({
                        code: 'TOKEN_EXPIRED',
                        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                        fromSocket: true
                    });
                }

                // 🔥 DISPATCH EVENT NGAY LẬP TỨC
                window.dispatchEvent(new CustomEvent('sessionExpired', {
                    detail: {
                        code: 'TOKEN_EXPIRED',
                        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                        fromSocket: true
                    }
                }));

                window.dispatchEvent(new CustomEvent('tokenExpired', {
                    detail: {
                        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                        timestamp: new Date().toISOString()
                    }
                }));

                this.disconnect();
            }

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('🔴 [SOCKET] Đã quá số lần thử kết nối');
                this.disconnect();
            }
        });

        // ============================================================
        // RECONNECT
        // ============================================================
        this.socket.io.on('reconnect', (attemptNumber) => {
            console.log(`🟢 [SOCKET] Reconnect thành công lần ${attemptNumber}`);
            this.isConnected = true;
            this.reconnectAttempts = 0;

            if (this.userId) {
                this.socket.emit('register_socket', { userId: this.userId });
            }
        });

        return this.socket;
    }

    disconnect() {
        if (!this.socket) return;

        console.log('🔴 [SOCKET] Đang ngắt kết nối...');
        this.socket.removeAllListeners();
        this.socket.io.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
        this.isConnected = false;
        this.userId = null;
        this.reconnectAttempts = 0;
        console.log('🔴 [SOCKET] Đã ngắt kết nối');
    }

    isConnectedStatus() {
        return Boolean(this.socket && this.socket.connected && this.isConnected);
    }

    getSocket() {
        return this.socket;
    }

    emit(event, data = {}) {
        if (!this.socket || !this.socket.connected) {
            console.warn(`⚠️ [SOCKET] Không thể emit "${event}" vì chưa kết nối`);
            return false;
        }
        this.socket.emit(event, data);
        return true;
    }

    getSocketId() {
        return this.socket?.id || null;
    }
}

const socketService = new SocketService();
export default socketService;