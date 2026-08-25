import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import {
    useNavigate,
    useLocation,
} from 'react-router-dom';

import api from '../../api/api';
import socketService from '../../api/socket';
import { forceLogout } from '../../utils/authCleanup';
import { useAuth } from '../../context/AuthContext';

import Modal from './Modal';

import '../styles/SessionGuard.css';

// ============================================================
// CONFIG
// ============================================================

const COUNTDOWN_SECONDS = 10;

// ============================================================
// SESSION GUARD
// ============================================================

const SessionGuard = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        isLoading,
    } = useAuth();

    // ========================================================
    // REFS
    // ========================================================

    const isMountedRef = useRef(false);

    // Đang xử lý session expired
    const isProcessingRef = useRef(false);

    // Đã redirect chưa
    const hasRedirectedRef = useRef(false);

    // Đã hiện modal chưa
    const hasShownModalRef = useRef(false);

    // ========================================================
    // MODAL STATE
    // ========================================================

    const [showModal, setShowModal] =
        useState(false);

    const [modalMessage, setModalMessage] =
        useState('');

    const [modalNewDevice, setModalNewDevice] =
        useState(null);

    const [modalType, setModalType] =
        useState('token');

    const [countdown, setCountdown] =
        useState(COUNTDOWN_SECONDS);

    // ========================================================
    // KIỂM TRA BOOKING PAGE
    // ========================================================

    const isBookingPage = useCallback(() => {
        const path = location.pathname;

        return (
            path.includes('/booking/') ||
            path.includes('/foods') ||
            path.includes('/payment') ||
            path.includes('/confirm-success') ||
            path.includes('/bank-app') ||
            path.includes('/momo-app')
        );
    }, [location.pathname]);

    // ========================================================
    // XÓA BOOKING SESSION
    // ========================================================

    const clearBookingSession = useCallback(() => {
        console.log(
            '🧹 [SESSION GUARD] Clearing booking session...'
        );

        const bookingKeys = [
            'selectedSeats',
            'holdExpiresAt',
            'currentShowtimeId',
            'booking_seats',
            'booking_showtime',
            'booking_data',
            'selected_foods',
            'food_selection',
            'booking_cinema',
            'booking_date',
            'booking_movie',
            'paymentInitiated',
            'paymentCompleted',
            'tempBookingId',
            'completedBookingId',
            'lastSuccessTicket',
            'bankHasSentOtp',
            'bankHasVisited',
            'bankOtpTimeLeft',
            'bankOtpInput',
            'bankLastOtpSentAt',
        ];

        bookingKeys.forEach((key) => {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        });

        window.dispatchEvent(
            new CustomEvent(
                'clearBookingSession',
                {
                    detail: {
                        reason: 'session_expired',
                        timestamp:
                            new Date().toISOString(),
                    },
                }
            )
        );

        // ====================================================
        // CLEAR HOLDING SEATS
        // ====================================================

        const currentUserId =
            socketService.userId;

        if (
            socketService.isConnectedStatus() &&
            currentUserId
        ) {
            socketService.emit(
                'clear_all_holding_seats',
                {
                    userId:
                        currentUserId,

                    timestamp:
                        new Date().toISOString(),
                }
            );
        }

        console.log(
            '✅ [SESSION GUARD] Booking session cleared'
        );
    }, []);

    // ========================================================
    // RESET FLAGS
    // ========================================================

    const resetFlags = useCallback(() => {
        isProcessingRef.current = false;

        hasRedirectedRef.current = false;

        hasShownModalRef.current = false;

        setShowModal(false);

        setCountdown(
            COUNTDOWN_SECONDS
        );

        console.log(
            '🔄 [SESSION GUARD] Flags reset'
        );
    }, []);

    // ========================================================
    // CONFIRM MODAL
    // ========================================================

    const handleModalConfirm = useCallback(() => {
        if (
            hasRedirectedRef.current
        ) {
            return;
        }

        hasRedirectedRef.current = true;

        console.log(
            '➡️ [SESSION GUARD] Redirecting after session expired'
        );

        setShowModal(false);

        // ====================================================
        // BOOKING PAGE
        // ====================================================

        if (isBookingPage()) {
            navigate(
                '/',
                {
                    replace: true,
                }
            );

            return;
        }

        // ====================================================
        // REDIRECT LOGIN
        // ====================================================

        navigate(
            '/login',
            {
                replace: true,

                state: {
                    expired: true,

                    message:
                        modalMessage,

                    type:
                        modalType,
                },
            }
        );
    }, [
        navigate,
        modalMessage,
        modalType,
        isBookingPage,
    ]);

    // ========================================================
    // MỞ MODAL
    // ========================================================

    const openSessionModal = useCallback(
        (detail = {}) => {
            if (
                !isMountedRef.current
            ) {
                return;
            }

            if (
                hasShownModalRef.current
            ) {
                console.log(
                    '⚠️ [SESSION GUARD] Modal already shown'
                );

                return;
            }

            const isDeviceLogin =
                detail.type === 'device' ||
                detail.code === 'SESSION_EXPIRED';

            const type =
                isDeviceLogin
                    ? 'device'
                    : 'token';

            const message =
                detail.message ||
                (
                    type === 'device'
                        ? 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.'
                        : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
                );

            const newDevice =
                detail.newDevice ||
                null;

            console.warn(
                '🔐 [SESSION GUARD] Opening modal:',
                {
                    type,
                    message,
                    newDevice,
                }
            );

            // ====================================================
            // ĐÁNH DẤU TRƯỚC
            // ====================================================

            hasShownModalRef.current =
                true;

            // ====================================================
            // HIỆN MODAL NGAY
            // ====================================================

            setModalType(type);

            setModalMessage(message);

            setModalNewDevice(newDevice);

            setCountdown(
                COUNTDOWN_SECONDS
            );

            setShowModal(true);
        },
        []
    );

    // ========================================================
    // HANDLE SESSION EXPIRED
    // ========================================================

    const handleSessionExpired = useCallback(
        (eventOrDetail = {}) => {
            if (
                !isMountedRef.current
            ) {
                return;
            }

            // ====================================================
            // CHỐNG XỬ LÝ TRÙNG
            // ====================================================

            if (
                isProcessingRef.current ||
                hasShownModalRef.current ||
                hasRedirectedRef.current
            ) {
                console.log(
                    '⚠️ [SESSION GUARD] Session already handled'
                );

                return;
            }

            const detail =
                eventOrDetail?.detail ||
                eventOrDetail ||
                {};

            const isDeviceLogin =
                detail.type === 'device' ||
                detail.code === 'SESSION_EXPIRED';

            const type =
                isDeviceLogin
                    ? 'device'
                    : 'token';

            const message =
                detail.message ||
                (
                    type === 'device'
                        ? 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.'
                        : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
                );

            const source =
                detail.source ||
                (
                    detail.fromSocket
                        ? 'socket'
                        : 'api'
                );

            console.warn(
                `🔴 [SESSION GUARD] SESSION EXPIRED FROM ${source.toUpperCase()}`,
                {
                    ...detail,
                    type,
                    message,
                }
            );

            // ====================================================
            // KHÓA NGAY
            // ====================================================

            isProcessingRef.current =
                true;

            // ====================================================
            // 1. XÓA API CACHE
            // ====================================================

            api.resetUserCache();

            // ====================================================
            // 2. XÓA BOOKING SESSION
            // ====================================================

            clearBookingSession();

            // ====================================================
            // 3. HIỆN MODAL NGAY LẬP TỨC
            // ====================================================

            openSessionModal({
                ...detail,

                type,

                message,

                source,
            });

            // ====================================================
            // 4. CLEANUP AUTH CHẠY BACKGROUND
            //
            // KHÔNG await
            //
            // Modal đã hiện rồi, cleanup tự chạy sau.
            // ====================================================

            Promise.resolve(
                forceLogout(
                    type === 'device'
                        ? 'device'
                        : 'expired',

                    message
                )
            )
                .then(() => {
                    console.log(
                        '🧹 [SESSION GUARD] Auth cleanup completed'
                    );
                })
                .catch((error) => {
                    console.error(
                        '🔴 [SESSION GUARD] Auth cleanup failed:',
                        error
                    );
                });
        },
        [
            clearBookingSession,
            openSessionModal,
        ]
    );

    // ========================================================
    // MOUNT
    // ========================================================

    useEffect(() => {
        isMountedRef.current =
            true;

        console.log(
            '🛡️ [SESSION GUARD] Started'
        );

        return () => {
            isMountedRef.current =
                false;
        };
    }, []);

    // ========================================================
    // API SESSION EVENT
    // ========================================================

    useEffect(() => {
        const handleSessionEvent =
            (event) => {
                console.log(
                    '📨 [SESSION GUARD] sessionExpired event:',
                    event?.detail
                );

                handleSessionExpired(
                    event
                );
            };

        window.addEventListener(
            'sessionExpired',
            handleSessionEvent
        );

        return () => {
            window.removeEventListener(
                'sessionExpired',
                handleSessionEvent
            );
        };
    }, [
        handleSessionExpired,
    ]);

    // ========================================================
    // SOCKET CALLBACK
    // ========================================================

    useEffect(() => {
        const handleSocketSessionExpired =
            (detail = {}) => {
                console.log(
                    '📨 [SESSION GUARD] Socket callback:',
                    detail
                );

                handleSessionExpired({
                    ...detail,

                    source: 'socket',

                    fromSocket: true,
                });
            };

        socketService.setOnSessionExpired(
            handleSocketSessionExpired
        );

        return () => {
            socketService.setOnSessionExpired(
                null
            );
        };
    }, [
        handleSessionExpired,
    ]);

    // ========================================================
    // COUNTDOWN
    // ========================================================

    useEffect(() => {
        if (
            !showModal
        ) {
            return;
        }

        const interval =
            setInterval(() => {
                setCountdown(
                    (previous) => {
                        if (
                            previous <= 1
                        ) {
                            return 0;
                        }

                        return previous - 1;
                    }
                );
            }, 1000);

        return () => {
            clearInterval(
                interval
            );
        };
    }, [
        showModal,
    ]);

    // ========================================================
    // AUTO REDIRECT WHEN COUNTDOWN = 0
    // ========================================================

    useEffect(() => {
        if (
            !showModal
        ) {
            return;
        }

        if (
            countdown !== 0
        ) {
            return;
        }

        handleModalConfirm();
    }, [
        countdown,
        showModal,
        handleModalConfirm,
    ]);

    // ========================================================
    // USER LOGGED IN
    // ========================================================

    useEffect(() => {
        const handleUserLoggedIn =
            () => {
                console.log(
                    '🟢 [SESSION GUARD] User logged in → reset'
                );

                resetFlags();
            };

        window.addEventListener(
            'userLoggedIn',
            handleUserLoggedIn
        );

        return () => {
            window.removeEventListener(
                'userLoggedIn',
                handleUserLoggedIn
            );
        };
    }, [
        resetFlags,
    ]);

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <>
            {children}

            <Modal
                show={showModal}
                type="warning"
                title={
                    modalType === 'device'
                        ? '🔐 Phát hiện đăng nhập trên thiết bị khác'
                        : '🔐 Phiên đăng nhập đã hết hạn'
                }
                message={modalMessage}
                onConfirm={handleModalConfirm}
                onCancel={handleModalConfirm}
                confirmText={
                    countdown > 0
                        ? `Đăng nhập lại (${countdown}s)`
                        : 'Đăng nhập lại'
                }
                cancelText="Đăng nhập lại"
                className="session-expired-modal-wrapper"
            >
                {/* ============================================
                    NEW DEVICE INFO
                ============================================ */}

                {modalType === 'device' &&
                    modalNewDevice && (
                        <div className="session-expired-device-info">
                            <p>
                                <strong>
                                    📱 Thiết bị mới:
                                </strong>{' '}

                                {typeof modalNewDevice ===
                                'string'
                                    ? modalNewDevice
                                    : (
                                        modalNewDevice?.deviceName ||
                                        modalNewDevice?.name ||
                                        JSON.stringify(
                                            modalNewDevice
                                        )
                                    )}
                            </p>
                        </div>
                    )}

                {/* ============================================
                    COUNTDOWN
                ============================================ */}

                {countdown > 0 && (
                    <div className="session-expired-countdown">
                        ⏳ Tự động chuyển đến trang đăng nhập sau{' '}

                        <strong>
                            {countdown}
                        </strong>{' '}

                        giây...
                    </div>
                )}

                {/* ============================================
                    SECURITY WARNING
                ============================================ */}

                {modalType === 'device' && (
                    <div className="session-expired-security">
                        🛡️ Nếu đây không phải là bạn,
                        vui lòng đổi mật khẩu ngay lập tức.
                    </div>
                )}
            </Modal>
        </>
    );
};

export default SessionGuard;