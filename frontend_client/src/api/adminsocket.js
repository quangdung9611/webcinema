// src/api/adminSocketService.js
// ============================================================
// ADMIN SOCKET SERVICE — RIÊNG CHO ADMIN
// Copy từ socket.js (user) nhưng tách biệt instance
// ============================================================

import { io } from 'socket.io-client';

const SOCKET_URL = 'https://api.quangdungcinema.id.vn';

class AdminSocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.userId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.onSessionExpired = null;

        // ===================================================== SESSION STATE =====================================================
        this.isSessionExpired = false;

        // ===================================================== BOOKING OWNER TOKEN =====================================================
        this.ownerToken = null;
    }

    // ========================================================= SESSION EXPIRED CALLBACK =========================================================
    setOnSessionExpired(callback) {
        this.onSessionExpired = typeof callback === 'function' ? callback : null;
    }

    // ========================================================= EMIT SESSION EXPIRED =========================================================
    emitSessionExpired(detail = {}) {
        const payload = {
            code: detail.code || 'TOKEN_EXPIRED',
            message: detail.message || 'Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.',
            newDevice: detail.newDevice || null,
            source: detail.source || 'admin_socket',
            fromSocket: detail.fromSocket ?? true,
            timestamp: detail.timestamp || new Date().toISOString()
        };

        console.warn('🔴 [ADMIN SOCKET] SESSION EXPIRED:', payload);

        if (typeof this.onSessionExpired === 'function') {
            this.onSessionExpired(payload);
        }
    }

    // ========================================================= CONNECT =========================================================
    connect(userId) {
        if (!userId) {
            console.warn('⚠️ [ADMIN SOCKET] Không có userId, không thể kết nối');
            return null;
        }

        // ===================================================== ĐÃ CÓ SOCKET CÙNG USER =====================================================
        if (this.socket && this.socket.connected && String(this.userId) === String(userId)) {
            console.log('🟢 [ADMIN SOCKET] Đã kết nối sẵn:', userId);
            return this.socket;
        }

        // ===================================================== SOCKET CŨ =====================================================
        if (this.socket) {
            console.log('🟡 [ADMIN SOCKET] Có socket cũ → disconnect');
            this.disconnect({ preserveSessionState: false });
        }

        // ===================================================== RESET STATE =====================================================
        this.isSessionExpired = false;
        this.userId = userId;
        this.reconnectAttempts = 0;
        this.ownerToken = null;

        console.log('🔄 [ADMIN SOCKET] Connecting user:', userId);

        // ===================================================== CREATE SOCKET =====================================================
        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000
        });

        // ===================================================== CONNECTED =====================================================
        this.socket.on('connect', () => {
            if (!this.socket) return;

            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.ownerToken = this.socket.id || null;

            console.log('🟢 [ADMIN SOCKET] Kết nối thành công!');
            console.log('🆔 [ADMIN SOCKET] Socket ID:', this.socket.id);
            console.log('🔐 [ADMIN SOCKET] Owner Token:', this.ownerToken);

            // ================================================ REGISTER USER SOCKET ================================================
            if (this.userId) {
                this.socket.emit('register_socket', { userId: this.userId });
            }
        });

        // ===================================================== SOCKET RECONNECT =====================================================
        this.socket.on('reconnect', (attempt) => {
            console.log(`🔄 [ADMIN SOCKET] Reconnected sau ${attempt} lần`);
            this.reconnectAttempts = 0;

            if (this.socket) {
                this.ownerToken = this.socket.id || null;
                console.log('🆔 [ADMIN SOCKET] Socket ID mới:', this.socket.id);
                console.log('🔐 [ADMIN SOCKET] Owner Token mới:', this.ownerToken);
            }
        });

        // ===================================================== SESSION EXPIRED =====================================================
        this.socket.on('session_expired', (data = {}) => {
            console.warn('🔴 [ADMIN SOCKET] Session expired received!');
            console.log('📨 [ADMIN SOCKET] Data:', data);

            this.emitSessionExpired({
                ...data,
                source: 'admin_socket',
                fromSocket: true
            });
        });

        // ===================================================== CONNECT ERROR =====================================================
        this.socket.on('connect_error', (error) => {
            console.error('🔴 [ADMIN SOCKET] Lỗi kết nối:', error?.message);

            const errorCode = error?.data?.code || error?.code || '';

            if (
                errorCode === 'SESSION_REPLACED' ||
                errorCode === 'TOKEN_EXPIRED' ||
                errorCode === 'UNAUTHORIZED' ||
                error?.message === 'Token expired' ||
                error?.message === 'Session expired'
            ) {
                this.emitSessionExpired({
                    code: errorCode || 'TOKEN_EXPIRED',
                    message: errorCode === 'SESSION_REPLACED'
                        ? 'Tài khoản admin đã được đăng nhập trên thiết bị khác.'
                        : 'Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.',
                    source: 'admin_socket',
                    fromSocket: true
                });
            }

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('🔴 [ADMIN SOCKET] Đã quá số lần reconnect');
                this.disconnect();
            }
        });

        // ===================================================== RECONNECT ATTEMPT =====================================================
        this.socket.io.on('reconnect_attempt', (attempt) => {
            this.reconnectAttempts = attempt;
            console.log(`🔄 [ADMIN SOCKET] Reconnect attempt #${attempt}`);
        });

        // ===================================================== DISCONNECT EVENT =====================================================
        this.socket.on('disconnect', (reason) => {
            console.warn('🟡 [ADMIN SOCKET] Disconnected:', reason);
            this.isConnected = false;
        });

        return this.socket;
    }

    // ========================================================= DISCONNECT =========================================================
    disconnect(options = {}) {
        const { preserveSessionState = false } = options;

        if (!this.socket) {
            this.isConnected = false;

            if (!preserveSessionState) {
                this.userId = null;
                this.ownerToken = null;
                this.reconnectAttempts = 0;
            }

            return;
        }

        console.log('🔴 [ADMIN SOCKET] Đang ngắt kết nối...');

        const socket = this.socket;

        this.socket = null;
        this.isConnected = false;

        try {
            socket.removeAllListeners();

            if (socket.io) {
                socket.io.removeAllListeners();
            }

            socket.disconnect();
        } catch (error) {
            console.warn('⚠️ [ADMIN SOCKET] Disconnect cleanup error:', error);
        }

        if (!preserveSessionState) {
            this.userId = null;
            this.ownerToken = null;
            this.reconnectAttempts = 0;
        }

        console.log('🔴 [ADMIN SOCKET] Đã ngắt kết nối');
    }

    // ========================================================= CONNECTION STATUS =========================================================
    isConnectedStatus() {
        return Boolean(this.socket && this.socket.connected && this.isConnected);
    }

    // ========================================================= GET SOCKET =========================================================
    getSocket() {
        return this.socket;
    }

    // ========================================================= GET SOCKET ID =========================================================
    getSocketId() {
        return this.socket?.id || null;
    }

    // ========================================================= GET OWNER TOKEN =========================================================
    getOwnerToken() {
        if (this.socket && this.socket.connected) {
            return this.socket.id || null;
        }
        return this.ownerToken || null;
    }

    // ========================================================= GET USER ID =========================================================
    getUserId() {
        return this.userId;
    }

    // ========================================================= EMIT =========================================================
    emit(event, data = {}) {
        if (!this.socket || !this.socket.connected) {
            console.warn(`⚠️ [ADMIN SOCKET] Không thể emit "${event}" vì chưa kết nối`);
            return false;
        }

        this.socket.emit(event, data);
        return true;
    }
}

// ============================================================= SINGLETON =============================================================
const adminSocketService = new AdminSocketService();
export default adminSocketService;