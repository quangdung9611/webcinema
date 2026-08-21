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

        // Socket instance
        this.socket = null;

        // Connection state
        this.isConnected = false;

        // Current user
        this.userId = null;

        // Reconnect config
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

    }


    // ============================================================
    // CONNECT SOCKET
    // ============================================================

    /**
     * Kết nối Socket.IO
     *
     * Authentication được xử lý bằng HttpOnly Cookie.
     * Không cần truyền JWT từ frontend.
     *
     * @param {string|number} userId
     */

    connect(userId) {

        // --------------------------------------------------------
        // Nếu đã kết nối với đúng user
        // --------------------------------------------------------

        if (
            this.socket &&
            this.socket.connected &&
            String(this.userId) === String(userId)
        ) {

            console.log(
                '🟢 [SOCKET] Đã kết nối sẵn với user:',
                userId
            );

            return this.socket;
        }


        // --------------------------------------------------------
        // Nếu đang có socket cũ thì ngắt
        // --------------------------------------------------------

        if (this.socket) {

            console.log(
                '🟡 [SOCKET] Phát hiện socket cũ, tiến hành ngắt...'
            );

            this.disconnect();
        }


        // --------------------------------------------------------
        // Lưu user hiện tại
        // --------------------------------------------------------

        this.userId = userId;

        console.log(
            '🔄 [SOCKET] Đang kết nối với user:',
            userId
        );


        // ========================================================
        // CREATE SOCKET
        // ========================================================

        this.socket = io(SOCKET_URL, {

            /**
             * QUAN TRỌNG
             *
             * Cho phép browser gửi HttpOnly Cookie
             * sang Socket.IO server.
             */
            withCredentials: true,


            /**
             * Ưu tiên WebSocket.
             *
             * Nếu WebSocket không được thì fallback polling.
             */
            transports: [
                'websocket',
                'polling'
            ],


            /**
             * Auto reconnect
             */
            reconnection: true,


            /**
             * Số lần reconnect tối đa
             */
            reconnectionAttempts:
                this.maxReconnectAttempts,


            /**
             * Delay reconnect lần đầu
             */
            reconnectionDelay: 1000,


            /**
             * Delay reconnect tối đa
             */
            reconnectionDelayMax: 5000,


            /**
             * Connection timeout
             */
            timeout: 10000

        });


        // ========================================================
        // CONNECT SUCCESS
        // ========================================================

        this.socket.on('connect', () => {

            console.log(
                '🟢 [SOCKET] Kết nối thành công!'
            );

            console.log(
                '👤 [SOCKET] User:',
                this.userId
            );

            console.log(
                '🔌 [SOCKET] Socket ID:',
                this.socket.id
            );


            this.isConnected = true;

            this.reconnectAttempts = 0;


            // Dispatch event cho React
            window.dispatchEvent(
                new CustomEvent(
                    'socketConnected',
                    {
                        detail: {
                            userId: this.userId,
                            socketId: this.socket.id
                        }
                    }
                )
            );

        });


        // ========================================================
        // DISCONNECT
        // ========================================================

        this.socket.on('disconnect', (reason) => {

            console.warn(
                '🔴 [SOCKET] Đã ngắt kết nối'
            );

            console.warn(
                '📌 [SOCKET] Lý do:',
                reason
            );


            this.isConnected = false;


            window.dispatchEvent(
                new CustomEvent(
                    'socketDisconnected',
                    {
                        detail: {
                            userId: this.userId,
                            reason
                        }
                    }
                )
            );

        });


        // ========================================================
        // CONNECT ERROR
        // ========================================================

        this.socket.on('connect_error', (error) => {

            console.error(
                '🔴 [SOCKET] Lỗi kết nối:',
                error.message
            );


            this.isConnected = false;

            this.reconnectAttempts++;


            // ----------------------------------------------------
            // AUTH ERROR
            // ----------------------------------------------------

            if (
                error.message === 'Authentication required' ||
                error.message === 'Unauthorized' ||
                error.message === 'Invalid token'
            ) {

                console.warn(
                    '🔐 [SOCKET] Không thể xác thực Socket'
                );


                window.dispatchEvent(
                    new CustomEvent(
                        'socketAuthError',
                        {
                            detail: {
                                message: error.message
                            }
                        }
                    )
                );

            }


            // ----------------------------------------------------
            // TOO MANY RECONNECT ATTEMPTS
            // ----------------------------------------------------

            if (
                this.reconnectAttempts >=
                this.maxReconnectAttempts
            ) {

                console.error(
                    '🔴 [SOCKET] Đã quá số lần thử kết nối'
                );

                this.disconnect();

            }

        });


        // ========================================================
        // RECONNECT ATTEMPT
        // ========================================================

        this.socket.io.on(
            'reconnect_attempt',
            (attemptNumber) => {

                console.log(
                    `🔄 [SOCKET] Đang thử kết nối lại lần ${attemptNumber}`
                );

            }
        );


        // ========================================================
        // RECONNECT SUCCESS
        // ========================================================

        this.socket.io.on(
            'reconnect',
            (attemptNumber) => {

                console.log(
                    `🟢 [SOCKET] Reconnect thành công lần ${attemptNumber}`
                );


                this.isConnected = true;

                this.reconnectAttempts = 0;

            }
        );


        // ========================================================
        // RECONNECT FAILED
        // ========================================================

        this.socket.io.on(
            'reconnect_failed',
            () => {

                console.error(
                    '🔴 [SOCKET] Reconnect thất bại hoàn toàn'
                );


                this.isConnected = false;

            }
        );


        // ========================================================
        // SESSION EXPIRED
        // USER LOGIN ON ANOTHER DEVICE
        // ========================================================

        this.socket.on(
            'session_expired',
            (data = {}) => {

                console.warn(
                    '🔴 [SOCKET] SESSION EXPIRED'
                );

                console.log(
                    '📨 [SOCKET] Data:',
                    data
                );


                // ------------------------------------------------
                // ACK SERVER
                // ------------------------------------------------

                if (
                    this.socket &&
                    this.socket.connected
                ) {

                    this.socket.emit(
                        'session_expired_ack',
                        {
                            received: true,

                            userId:
                                this.userId,

                            timestamp:
                                new Date().toISOString()
                        }
                    );

                }


                // ------------------------------------------------
                // THÔNG BÁO CHO REACT
                // ------------------------------------------------

                window.dispatchEvent(
                    new CustomEvent(
                        'sessionExpired',
                        {
                            detail: {

                                code:
                                    'SESSION_EXPIRED',

                                message:
                                    data.message ||
                                    'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.',

                                newDevice:
                                    data.newDevice ||
                                    null,

                                timestamp:
                                    data.timestamp ||
                                    new Date().toISOString(),

                                fromSocket:
                                    true

                            }
                        }
                    )
                );


                // ------------------------------------------------
                // DISCONNECT SOCKET
                // ------------------------------------------------

                this.disconnect();

            }
        );


        // ========================================================
        // FORCE LOGOUT
        // Hỗ trợ thêm nếu backend emit event này
        // ========================================================

        this.socket.on(
            'force_logout',
            (data = {}) => {

                console.warn(
                    '🔴 [SOCKET] FORCE LOGOUT'
                );


                window.dispatchEvent(
                    new CustomEvent(
                        'sessionExpired',
                        {
                            detail: {

                                code:
                                    'SESSION_EXPIRED',

                                message:
                                    data.message ||
                                    'Phiên đăng nhập của bạn đã bị kết thúc.',

                                timestamp:
                                    new Date().toISOString(),

                                fromSocket:
                                    true

                            }
                        }
                    )
                );


                this.disconnect();

            }
        );


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


        console.log(
            '🔴 [SOCKET] Đang ngắt kết nối...'
        );


        // Remove listeners
        this.socket.removeAllListeners();


        // Disconnect
        this.socket.disconnect();


        // Reset
        this.socket = null;

        this.isConnected = false;

        this.userId = null;

        this.reconnectAttempts = 0;


        console.log(
            '🔴 [SOCKET] Đã ngắt kết nối'
        );

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

        if (
            !this.socket ||
            !this.socket.connected
        ) {

            console.warn(
                `⚠️ [SOCKET] Không thể emit "${event}" vì chưa kết nối`
            );

            return false;

        }


        this.socket.emit(
            event,
            data
        );


        return true;

    }


    // ============================================================
    // GET SOCKET ID
    // ============================================================

    getSocketId() {

        return this.socket?.id || null;

    }

}


// ============================================================
// SINGLETON
// ============================================================

const socketService =
    new SocketService();

export default socketService;