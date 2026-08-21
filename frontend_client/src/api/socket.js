import { io } from 'socket.io-client';

const SOCKET_URL = 'https://api.quangdungcinema.id.vn';

class SocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.userId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.token = null;
    }

    /**
     * Kết nối WebSocket với token
     * @param {string} token - Access token (lấy từ cookie hoặc state)
     * @param {string|number} userId - User ID
     */
    connect(token, userId) {
        // Nếu đã kết nối và cùng user + token, không làm gì
        if (this.socket && this.isConnected && this.userId === userId && this.token === token) {
            console.log('🟢 [SOCKET] Đã kết nối sẵn với user:', userId);
            return this.socket;
        }

        // Ngắt kết nối cũ nếu có
        if (this.socket) {
            this.disconnect();
        }

        console.log('🔄 [SOCKET] Đang kết nối với user:', userId);
        this.userId = userId;
        this.token = token;

        this.socket = io(SOCKET_URL, {
            auth: { token: token },
            transports: ['websocket', 'polling'],
            withCredentials: true,
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000
        });

        // ============================================================
        // LẮNG NGHE CÁC SỰ KIỆN
        // ============================================================

        // ✅ Kết nối thành công
        this.socket.on('connect', () => {
            console.log(`🟢 [SOCKET] Kết nối thành công! User: ${this.userId}`);
            this.isConnected = true;
            this.reconnectAttempts = 0;

            // Dispatch event cho toàn app
            window.dispatchEvent(new CustomEvent('socketConnected', {
                detail: { userId: this.userId }
            }));
        });

        // ✅ Ngắt kết nối
        this.socket.on('disconnect', (reason) => {
            console.log(`🔴 [SOCKET] Ngắt kết nối: ${reason}`);
            this.isConnected = false;
        });

        // ✅ Lỗi kết nối
        this.socket.on('connect_error', (error) => {
            console.error('🔴 [SOCKET] Lỗi kết nối:', error.message);
            this.reconnectAttempts++;

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('🔴 [SOCKET] Đã quá số lần thử kết nối');
                this.disconnect();
            }
        });

        // ============================================================
        // 🟢 QUAN TRỌNG: LẮNG NGHE SESSION_EXPIRED TỪ SERVER
        // ============================================================
        this.socket.on('session_expired', (data) => {
            console.log('🔴 [SOCKET] Nhận event session_expired:', data);

            // Gửi ACK xác nhận đã nhận
            this.socket.emit('session_expired_ack', {
                received: true,
                timestamp: new Date().toISOString()
            });

            // Dispatch event để component xử lý
            window.dispatchEvent(new CustomEvent('sessionExpired', {
                detail: {
                    code: 'SESSION_EXPIRED',
                    message: data.message || 'Tài khoản đã được đăng nhập trên thiết bị khác',
                    newDevice: data.newDevice || 'Unknown Device',
                    timestamp: data.timestamp || new Date().toISOString(),
                    fromSocket: true // Đánh dấu là từ WebSocket
                }
            }));

            // Tự động ngắt kết nối
            this.disconnect();
        });

        // ✅ Reconnect thành công
        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`🔄 [SOCKET] Reconnect thành công lần ${attemptNumber}`);
            this.isConnected = true;
        });

        this.socket.on('reconnect_failed', () => {
            console.error('🔴 [SOCKET] Reconnect thất bại');
            this.disconnect();
        });

        return this.socket;
    }

    /**
     * Ngắt kết nối WebSocket
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.userId = null;
            this.token = null;
            console.log('🔴 [SOCKET] Đã ngắt kết nối');
        }
    }

    /**
     * Kiểm tra trạng thái kết nối
     */
    isConnectedStatus() {
        return this.isConnected && this.socket?.connected;
    }

    /**
     * Lấy socket instance (dùng cho các chức năng khác như ghế)
     */
    getSocket() {
        return this.socket;
    }

    /**
     * Gửi event lên server
     */
    emit(event, data) {
        if (this.socket && this.isConnected) {
            this.socket.emit(event, data);
        } else {
            console.warn('⚠️ [SOCKET] Không thể gửi event, chưa kết nối');
        }
    }
}

// Export singleton
const socketService = new SocketService();
export default socketService;