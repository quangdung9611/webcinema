import { io } from 'socket.io-client';

const SOCKET_URL = 'https://api.quangdungcinema.id.vn';

class SocketService {
    constructor() {
        this.socket = null;

        this.isConnected = false;
        this.userId = null;

        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        // Callback
        this.onSessionExpired = null;
        this.onTokenExpired = null;

        // Chặn event session expired chạy nhiều lần
        this.isSessionExpired = false;
    }

    /* =========================================================
        CALLBACKS
    ========================================================= */

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

    /* =========================================================
        SESSION EXPIRED - XỬ LÝ DUY NHẤT 1 LẦN
    ========================================================= */

    emitSessionExpired(detail = {}) {
        if (this.isSessionExpired) {
            console.log(
                '⚠️ [SOCKET] Session expired already processing'
            );
            return false;
        }

        // Đánh dấu NGAY TẠI ĐÂY
        this.isSessionExpired = true;

        const isDeviceLogin =
            detail.type === 'device' ||
            detail.code === 'SESSION_EXPIRED' ||
            detail.code === 'SESSION_REPLACED';

        const payload = {
            code:
                detail.code ||
                (
                    isDeviceLogin
                        ? 'SESSION_REPLACED'
                        : 'TOKEN_EXPIRED'
                ),

            message:
                detail.message ||
                (
                    isDeviceLogin
                        ? 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.'
                        : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
                ),

            type:
                isDeviceLogin
                    ? 'device'
                    : 'token',

            newDevice:
                detail.newDevice || null,

            source:
                detail.source || 'socket',

            fromSocket: true,

            timestamp:
                detail.timestamp ||
                new Date().toISOString(),
        };

        console.warn(
            '🔴 [SOCKET] SESSION EXPIRED:',
            payload
        );

        /*
        =====================================================
        GỌI CALLBACK CHO AUTH / MODAL
        =====================================================
        */

        if (typeof this.onSessionExpired === 'function') {
            try {
                this.onSessionExpired(payload);
            } catch (error) {
                console.error(
                    '🔴 [SOCKET] onSessionExpired error:',
                    error
                );
            }
        }

        /*
        =====================================================
        TOKEN EXPIRED CALLBACK
        =====================================================
        */

        if (
            payload.type === 'token' &&
            typeof this.onTokenExpired === 'function'
        ) {
            try {
                this.onTokenExpired(payload);
            } catch (error) {
                console.error(
                    '🔴 [SOCKET] onTokenExpired error:',
                    error
                );
            }
        }

        /*
        =====================================================
        EVENT GLOBAL
        =====================================================
        */

        window.dispatchEvent(
            new CustomEvent('sessionExpired', {
                detail: payload,
            })
        );

        return true;
    }

    /* =========================================================
        CONNECT
    ========================================================= */

    connect(userId) {
        if (!userId) {
            console.warn(
                '⚠️ [SOCKET] Không có userId, không thể kết nối'
            );

            return null;
        }

        /*
        =====================================================
        ĐÃ KẾT NỐI ĐÚNG USER
        =====================================================
        */

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

        /*
        =====================================================
        CÓ SOCKET CŨ
        =====================================================
        */

        if (this.socket) {
            console.log(
                '🟡 [SOCKET] Có socket cũ → disconnect'
            );

            this.disconnect({
                preserveSessionState: false,
            });
        }

        /*
        =====================================================
        RESET STATE CHO SESSION MỚI
        =====================================================
        */

        this.isSessionExpired = false;

        this.userId = userId;

        this.reconnectAttempts = 0;

        console.log(
            '🔄 [SOCKET] Connecting user:',
            userId
        );

        /*
        =====================================================
        TẠO SOCKET
        =====================================================
        */

        this.socket = io(
            SOCKET_URL,
            {
                withCredentials: true,

                transports: [
                    'websocket',
                    'polling',
                ],

                reconnection: true,

                reconnectionAttempts:
                    this.maxReconnectAttempts,

                reconnectionDelay: 1000,

                reconnectionDelayMax: 5000,

                timeout: 10000,
            }
        );

        /* =====================================================
            CONNECT SUCCESS
        ===================================================== */

        this.socket.on(
            'connect',
            () => {
                if (!this.socket) {
                    return;
                }

                if (this.isSessionExpired) {
                    console.warn(
                        '⚠️ [SOCKET] Session đã hết hạn → bỏ qua connect'
                    );

                    return;
                }

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

                /*
                =============================================
                REGISTER SOCKET
                =============================================
                */

                if (this.userId) {
                    this.socket.emit(
                        'register_socket',
                        {
                            userId: this.userId,
                        }
                    );

                    console.log(
                        '📤 [SOCKET] register_socket:',
                        this.userId
                    );
                }

                window.dispatchEvent(
                    new CustomEvent(
                        'socketConnected',
                        {
                            detail: {
                                userId:
                                    this.userId,

                                socketId:
                                    this.socket.id,
                            },
                        }
                    )
                );
            }
        );

        /* =====================================================
            🔥 REALTIME SESSION EXPIRED
        ===================================================== */

        this.socket.on(
            'session_expired',
            (data = {}) => {
                console.warn(
                    '🔴 [SOCKET] session_expired received!'
                );

                console.log(
                    '📨 [SOCKET] Data:',
                    data
                );

                /*
                =================================================
                QUAN TRỌNG:

                KHÔNG set:
                this.isSessionExpired = true

                ở đây.

                Để emitSessionExpired()
                tự set.
                =================================================
                */

                if (this.isSessionExpired) {
                    console.log(
                        '⚠️ [SOCKET] Already processing session expired'
                    );

                    return;
                }

                /*
                =============================================
                ACK SERVER
                =============================================
                */

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
                                new Date().toISOString(),
                        }
                    );
                }

                /*
                =============================================
                🔥 BẮN EVENT NGAY LẬP TỨC
                =============================================
                */

                const emitted =
                    this.emitSessionExpired({
                        ...data,

                        source:
                            'socket',

                        fromSocket:
                            true,
                    });

                /*
                =============================================
                DISCONNECT SAU KHI EVENT ĐÃ BẮN
                =============================================
                */

                if (emitted) {
                    setTimeout(
                        () => {
                            this.disconnect({
                                preserveSessionState: true,
                            });
                        },
                        300
                    );
                }
            }
        );

        /* =====================================================
            🔥 CONNECT ERROR
        ===================================================== */

        this.socket.on(
            'connect_error',
            (error) => {
                console.error(
                    '🔴 [SOCKET] Lỗi kết nối:',
                    error?.message
                );

                console.log(
                    '📨 [SOCKET] Error data:',
                    error?.data
                );

                this.isConnected = false;

                this.reconnectAttempts++;

                const errorCode =
                    error?.data?.code ||
                    error?.code ||
                    '';

                const isSessionError =
                    errorCode === 'SESSION_EXPIRED' ||
                    errorCode === 'SESSION_REPLACED' ||
                    errorCode === 'TOKEN_EXPIRED' ||
                    errorCode === 'UNAUTHORIZED' ||
                    error?.message === 'Token expired' ||
                    error?.message === 'Session expired';

                if (isSessionError) {
                    const isDeviceSession =
                        errorCode === 'SESSION_EXPIRED' ||
                        errorCode === 'SESSION_REPLACED';

                    this.emitSessionExpired({
                        code:
                            errorCode ||
                            (
                                isDeviceSession
                                    ? 'SESSION_REPLACED'
                                    : 'TOKEN_EXPIRED'
                            ),

                        type:
                            isDeviceSession
                                ? 'device'
                                : 'token',

                        message:
                            isDeviceSession
                                ? 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.'
                                : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',

                        source:
                            'socket',

                        fromSocket:
                            true,
                    });

                    /*
                    =============================================
                    NGỪNG RECONNECT
                    =============================================
                    */

                    this.disconnect({
                        preserveSessionState: true,
                    });

                    return;
                }

                /*
                =============================================
                QUÁ SỐ LẦN RECONNECT
                =============================================
                */

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

        /* =====================================================
            DISCONNECT
        ===================================================== */

        this.socket.on(
            'disconnect',
            (reason) => {
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
                                userId:
                                    this.userId,

                                reason,
                            },
                        }
                    )
                );
            }
        );

        /* =====================================================
            RECONNECT SUCCESS
        ===================================================== */

        this.socket.io.on(
            'reconnect',
            (attemptNumber) => {
                if (
                    !this.socket ||
                    this.isSessionExpired
                ) {
                    return;
                }

                console.log(
                    `🟢 [SOCKET] Reconnect thành công lần ${attemptNumber}`
                );

                this.isConnected = true;

                this.reconnectAttempts = 0;

                if (this.userId) {
                    this.socket.emit(
                        'register_socket',
                        {
                            userId:
                                this.userId,
                        }
                    );
                }
            }
        );

        /* =====================================================
            RECONNECT ATTEMPT
        ===================================================== */

        this.socket.io.on(
            'reconnect_attempt',
            (attemptNumber) => {
                console.log(
                    `🔄 [SOCKET] Đang reconnect lần ${attemptNumber}`
                );
            }
        );

        /* =====================================================
            RECONNECT FAILED
        ===================================================== */

        this.socket.io.on(
            'reconnect_failed',
            () => {
                console.error(
                    '🔴 [SOCKET] Reconnect thất bại hoàn toàn'
                );

                this.isConnected = false;
            }
        );

        return this.socket;
    }

    /* =========================================================
        DISCONNECT
    ========================================================= */

    disconnect(options = {}) {
        const {
            preserveSessionState = false,
        } = options;

        if (!this.socket) {
            this.isConnected = false;

            if (!preserveSessionState) {
                this.userId = null;

                this.reconnectAttempts = 0;

                this.isSessionExpired = false;
            }

            return;
        }

        console.log(
            '🔴 [SOCKET] Đang ngắt kết nối...'
        );

        const socket =
            this.socket;

        /*
        =====================================================
        XÓA REFERENCE TRƯỚC
        =====================================================
        */

        this.socket = null;

        this.isConnected = false;

        try {
            socket.removeAllListeners();

            socket.io.removeAllListeners();

            socket.disconnect();
        } catch (error) {
            console.warn(
                '⚠️ [SOCKET] Disconnect cleanup error:',
                error
            );
        }

        if (!preserveSessionState) {
            this.userId = null;

            this.reconnectAttempts = 0;

            this.isSessionExpired = false;
        }

        console.log(
            '🔴 [SOCKET] Đã ngắt kết nối'
        );
    }

    /* =========================================================
        STATUS
    ========================================================= */

    isConnectedStatus() {
        return Boolean(
            this.socket &&
            this.socket.connected &&
            this.isConnected
        );
    }

    getSocket() {
        return this.socket;
    }

    getSocketId() {
        return this.socket?.id || null;
    }

    /* =========================================================
        EMIT CUSTOM EVENT
    ========================================================= */

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
}

const socketService =
    new SocketService();

export default socketService;