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

        // =====================================================
        // SESSION STATE
        // =====================================================

        this.isSessionExpired = false;

        // =====================================================
        // BOOKING OWNER TOKEN
        //
        // Backend hiện tại dùng socket.id làm ownerToken
        // của Redis seat lock.
        // =====================================================

        this.ownerToken = null;
    }


    // =========================================================
    // SESSION EXPIRED CALLBACK
    // =========================================================

    setOnSessionExpired(callback) {
        this.onSessionExpired =
            typeof callback === 'function'
                ? callback
                : null;
    }


    // =========================================================
    // EMIT SESSION EXPIRED
    // =========================================================

    emitSessionExpired(detail = {}) {

        const payload = {
            code:
                detail.code ||
                'TOKEN_EXPIRED',

            message:
                detail.message ||
                'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',

            newDevice:
                detail.newDevice || null,

            source:
                detail.source || 'socket',

            fromSocket:
                detail.fromSocket ?? true,

            timestamp:
                detail.timestamp ||
                new Date().toISOString()
        };


        console.warn(
            '🔴 [SOCKET] SESSION EXPIRED:',
            payload
        );


        if (
            typeof this.onSessionExpired ===
            'function'
        ) {
            this.onSessionExpired(payload);
        }
    }


    // =========================================================
    // CONNECT
    // =========================================================

    connect(userId) {

        if (!userId) {

            console.warn(
                '⚠️ [SOCKET] Không có userId, không thể kết nối'
            );

            return null;
        }


        // =====================================================
        // ĐÃ CÓ SOCKET CÙNG USER
        // =====================================================

        if (
            this.socket &&
            this.socket.connected &&
            String(this.userId) === String(userId)
        ) {

            console.log(
                '🟢 [SOCKET] Đã kết nối sẵn:',
                userId
            );

            return this.socket;
        }


        // =====================================================
        // SOCKET CŨ
        // =====================================================

        if (this.socket) {

            console.log(
                '🟡 [SOCKET] Có socket cũ → disconnect'
            );

            this.disconnect({
                preserveSessionState: false
            });
        }


        // =====================================================
        // RESET STATE
        // =====================================================

        this.isSessionExpired = false;

        this.userId = userId;

        this.reconnectAttempts = 0;

        this.ownerToken = null;


        console.log(
            '🔄 [SOCKET] Connecting user:',
            userId
        );


        // =====================================================
        // CREATE SOCKET
        // =====================================================

        this.socket = io(
            SOCKET_URL,
            {
                withCredentials: true,

                transports: [
                    'websocket',
                    'polling'
                ],

                reconnection: true,

                reconnectionAttempts:
                    this.maxReconnectAttempts,

                reconnectionDelay: 1000,

                reconnectionDelayMax: 5000,

                timeout: 10000
            }
        );


        // =====================================================
        // CONNECTED
        // =====================================================

        this.socket.on(
            'connect',
            () => {

                if (!this.socket) {
                    return;
                }


                this.isConnected = true;

                this.reconnectAttempts = 0;


                // =================================================
                // BACKEND DÙNG socket.id LÀ OWNER TOKEN
                // =================================================

                this.ownerToken =
                    this.socket.id || null;


                console.log(
                    '🟢 [SOCKET] Kết nối thành công!'
                );

                console.log(
                    '🆔 [SOCKET] Socket ID:',
                    this.socket.id
                );

                console.log(
                    '🔐 [SOCKET] Owner Token:',
                    this.ownerToken
                );


                // =================================================
                // REGISTER USER SOCKET
                // =================================================

                if (this.userId) {

                    this.socket.emit(
                        'register_socket',
                        {
                            userId: this.userId
                        }
                    );
                }
            }
        );


        // =====================================================
        // SOCKET RECONNECT
        // =====================================================

        this.socket.on(
            'reconnect',
            (attempt) => {

                console.log(
                    `🔄 [SOCKET] Reconnected sau ${attempt} lần`
                );


                this.reconnectAttempts = 0;


                if (this.socket) {

                    this.ownerToken =
                        this.socket.id || null;


                    console.log(
                        '🆔 [SOCKET] Socket ID mới:',
                        this.socket.id
                    );

                    console.log(
                        '🔐 [SOCKET] Owner Token mới:',
                        this.ownerToken
                    );
                }
            }
        );


        // =====================================================
        // SESSION EXPIRED
        // =====================================================

        this.socket.on(
            'session_expired',
            (data = {}) => {

                console.warn(
                    '🔴 [SOCKET] Session expired received!'
                );

                console.log(
                    '📨 [SOCKET] Data:',
                    data
                );


                this.emitSessionExpired({
                    ...data,

                    source:
                        'socket',

                    fromSocket:
                        true
                });
            }
        );


        // =====================================================
        // CONNECT ERROR
        // =====================================================

        this.socket.on(
            'connect_error',
            (error) => {

                console.error(
                    '🔴 [SOCKET] Lỗi kết nối:',
                    error?.message
                );


                const errorCode =
                    error?.data?.code ||
                    error?.code ||
                    '';


                // =============================================
                // TOKEN / SESSION ERROR
                // =============================================

                if (
                    errorCode ===
                        'SESSION_REPLACED' ||

                    errorCode ===
                        'TOKEN_EXPIRED' ||

                    errorCode ===
                        'UNAUTHORIZED' ||

                    error?.message ===
                        'Token expired' ||

                    error?.message ===
                        'Session expired'
                ) {

                    this.emitSessionExpired({

                        code:
                            errorCode ||
                            'TOKEN_EXPIRED',

                        message:
                            errorCode ===
                            'SESSION_REPLACED'

                                ? 'Tài khoản đã được đăng nhập trên thiết bị khác.'

                                : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',

                        source:
                            'socket',

                        fromSocket:
                            true
                    });
                }


                // =============================================
                // RECONNECT LIMIT
                // =============================================

                if (
                    this.reconnectAttempts >=
                    this.maxReconnectAttempts
                ) {

                    console.error(
                        '🔴 [SOCKET] Đã quá số lần reconnect'
                    );


                    this.disconnect();
                }
            }
        );


        // =====================================================
        // RECONNECT ATTEMPT
        // =====================================================

        this.socket.io.on(
            'reconnect_attempt',
            (attempt) => {

                this.reconnectAttempts =
                    attempt;


                console.log(
                    `🔄 [SOCKET] Reconnect attempt #${attempt}`
                );
            }
        );


        // =====================================================
        // DISCONNECT EVENT
        // =====================================================

        this.socket.on(
            'disconnect',
            (reason) => {

                console.warn(
                    '🟡 [SOCKET] Disconnected:',
                    reason
                );


                this.isConnected = false;


                /*
                 * Không xóa ownerToken ngay ở đây.
                 *
                 * Backend sẽ tự release Redis locks
                 * khi socket disconnect.
                 *
                 * Khi reconnect thành công,
                 * ownerToken sẽ được cập nhật thành socket.id mới.
                 */
            }
        );


        return this.socket;
    }


    // =========================================================
    // DISCONNECT
    // =========================================================

    disconnect(options = {}) {

        const {
            preserveSessionState = false
        } = options;


        // =====================================================
        // KHÔNG CÓ SOCKET
        // =====================================================

        if (!this.socket) {

            this.isConnected = false;


            if (!preserveSessionState) {

                this.userId = null;

                this.ownerToken = null;

                this.reconnectAttempts = 0;
            }


            return;
        }


        console.log(
            '🔴 [SOCKET] Đang ngắt kết nối...'
        );


        const socket =
            this.socket;


        // =====================================================
        // CLEAR LOCAL REFERENCE TRƯỚC
        // =====================================================

        this.socket = null;

        this.isConnected = false;


        // =====================================================
        // CLEANUP
        // =====================================================

        try {

            socket.removeAllListeners();

            if (socket.io) {
                socket.io.removeAllListeners();
            }

            socket.disconnect();

        } catch (error) {

            console.warn(
                '⚠️ [SOCKET] Disconnect cleanup error:',
                error
            );
        }


        // =====================================================
        // CLEAR SESSION
        // =====================================================

        if (!preserveSessionState) {

            this.userId = null;

            this.ownerToken = null;

            this.reconnectAttempts = 0;
        }


        console.log(
            '🔴 [SOCKET] Đã ngắt kết nối'
        );
    }


    // =========================================================
    // CONNECTION STATUS
    // =========================================================

    isConnectedStatus() {

        return Boolean(
            this.socket &&
            this.socket.connected &&
            this.isConnected
        );
    }


    // =========================================================
    // GET SOCKET
    // =========================================================

    getSocket() {

        return this.socket;
    }


    // =========================================================
    // GET SOCKET ID
    // =========================================================

    getSocketId() {

        return this.socket?.id || null;
    }


    // =========================================================
    // GET OWNER TOKEN
    //
    // Backend hiện tại:
    // ownerToken = socket.id
    // =========================================================

    getOwnerToken() {

        if (
            this.socket &&
            this.socket.connected
        ) {

            return this.socket.id || null;
        }


        return this.ownerToken || null;
    }


    // =========================================================
    // GET USER ID
    // =========================================================

    getUserId() {

        return this.userId;
    }


    // =========================================================
    // EMIT
    // =========================================================

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


    // =========================================================
    // EMIT SEAT LOCK
    //
    // Không tự nhét ownerToken vào payload.
    //
    // Backend hiện tại lấy:
    // ownerToken = socket.id
    //
    // Việc này giúp frontend/backend đồng nhất.
    // =========================================================

    lockSeat(
        showtimeId,
        seatId
    ) {

        if (
            !showtimeId ||
            !seatId
        ) {

            return false;
        }


        return this.emit(
            'client-chon-ghe',
            {
                showtimeId,
                seatId
            }
        );
    }


    // =========================================================
    // RELEASE SEAT
    // =========================================================

    releaseSeat(
        showtimeId,
        seatId
    ) {

        if (
            !showtimeId ||
            !seatId
        ) {

            return false;
        }


        return this.emit(
            'client-huy-chon-ghe',
            {
                showtimeId,
                seatId
            }
        );
    }


    // =========================================================
    // REQUEST HOLDING SEATS
    // =========================================================

    requestHoldingSeats(
        showtimeId = null
    ) {

        return this.emit(
            'request-holding-seats',
            showtimeId
                ? { showtimeId }
                : {}
        );
    }


    // =========================================================
    // CLEAR ALL HOLDING SEATS
    // =========================================================

    clearAllHoldingSeats(
        showtimeId = null
    ) {

        return this.emit(
            'clear_all_holding_seats',
            showtimeId
                ? { showtimeId }
                : {}
        );
    }
}


// =============================================================
// SINGLETON
// =============================================================

const socketService =
    new SocketService();


export default socketService;