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
import { useAuth } from '../../context/AuthContext';

import Modal from './Modal';

import '../styles/SessionGuard.css';

const COUNTDOWN_SECONDS = 10;

const SessionGuard = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        clearAuthState,
    } = useAuth();

    const isMountedRef = useRef(false);
    const isProcessingRef = useRef(false);
    const hasRedirectedRef = useRef(false);

    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalNewDevice, setModalNewDevice] = useState(null);
    const [modalType, setModalType] = useState('token');
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

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

    const clearBookingSession = useCallback(() => {
        console.log('🧹 [SESSION GUARD] Clearing booking session...');

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
            new CustomEvent('clearBookingSession', {
                detail: {
                    reason: 'session_expired',
                    timestamp: new Date().toISOString(),
                },
            })
        );

        const currentUserId = socketService.userId;

        if (socketService.isConnectedStatus() && currentUserId) {
            socketService.emit('clear_all_holding_seats', {
                userId: currentUserId,
                timestamp: new Date().toISOString(),
            });
        }

        console.log('✅ [SESSION GUARD] Booking session cleared');
    }, []);

    const handleModalConfirm = useCallback(() => {
        if (hasRedirectedRef.current) {
            return;
        }

        hasRedirectedRef.current = true;

        console.log('➡️ [SESSION GUARD] Redirecting after session expired');

        setShowModal(false);

        if (isBookingPage()) {
            navigate('/', { replace: true });
            return;
        }

        navigate('/login', {
            replace: true,
            state: {
                expired: true,
                message: modalMessage,
                type: modalType,
            },
        });
    }, [navigate, modalMessage, modalType, isBookingPage]);

    const openSessionModal = useCallback(
        (detail = {}) => {
            if (!isMountedRef.current) return;

            const isDeviceLogin = detail.type === 'device' || detail.code === 'SESSION_EXPIRED';
            const type = isDeviceLogin ? 'device' : 'token';
            const message = detail.message || (type === 'device'
                ? 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.'
                : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            const newDevice = detail.newDevice || null;

            console.warn('🔐 [SESSION GUARD] Opening modal:', {
                type,
                message,
                newDevice,
            });

            setModalType(type);
            setModalMessage(message);
            setModalNewDevice(newDevice);
            setCountdown(COUNTDOWN_SECONDS);
            setShowModal(true);
        },
        []
    );

    const handleSessionExpired = useCallback(
        async (eventOrDetail = {}) => {
            if (!isMountedRef.current) return;
            if (isProcessingRef.current || hasRedirectedRef.current) {
                console.log('⚠️ [SESSION GUARD] Session already handled');
                return;
            }

            const detail = eventOrDetail?.detail || eventOrDetail || {};
            const isDeviceLogin = detail.type === 'device' || detail.code === 'SESSION_EXPIRED';
            const type = isDeviceLogin ? 'device' : 'token';
            const message = detail.message || (type === 'device'
                ? 'Tài khoản của bạn đã được đăng nhập trên thiết bị khác.'
                : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
            const source = detail.source || (detail.fromSocket ? 'socket' : 'api');

            console.warn(`🔴 [SESSION GUARD] SESSION EXPIRED FROM ${source.toUpperCase()}`, {
                ...detail,
                type,
                message,
            });

            isProcessingRef.current = true;

            api.resetUserCache();
            clearBookingSession();

            try {
                socketService.disconnect();
            } catch (error) {
                console.warn('Socket disconnect error:', error);
            }

            clearAuthState();
            openSessionModal({
                ...detail,
                type,
                message,
                source,
            });
        },
        [clearBookingSession, openSessionModal, clearAuthState]
    );

    useEffect(() => {
        isMountedRef.current = true;
        console.log('🛡️ [SESSION GUARD] Started');

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        const handleSessionEvent = (event) => {
            console.log('📨 [SESSION GUARD] sessionExpired event:', event?.detail);
            handleSessionExpired(event);
        };

        window.addEventListener('sessionExpired', handleSessionEvent);

        return () => {
            window.removeEventListener('sessionExpired', handleSessionEvent);
        };
    }, [handleSessionExpired]);

    useEffect(() => {
        const handleSocketSessionExpired = (detail = {}) => {
            console.log('📨 [SESSION GUARD] Socket callback:', detail);
            handleSessionExpired({
                ...detail,
                source: 'socket',
                fromSocket: true,
            });
        };

        socketService.setOnSessionExpired(handleSocketSessionExpired);

        return () => {
            socketService.setOnSessionExpired(null);
        };
    }, [handleSessionExpired]);

    useEffect(() => {
        if (!showModal) return;

        const interval = setInterval(() => {
            setCountdown((previous) => {
                if (previous <= 1) return 0;
                return previous - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [showModal]);

    useEffect(() => {
        if (!showModal || countdown !== 0) return;

        handleModalConfirm();
    }, [countdown, showModal, handleModalConfirm]);

    useEffect(() => {
        const handleUserLoggedIn = () => {
            console.log('🟢 [SESSION GUARD] User logged in → reset');
            isProcessingRef.current = false;
            hasRedirectedRef.current = false;
        };

        window.addEventListener('userLoggedIn', handleUserLoggedIn);

        return () => {
            window.removeEventListener('userLoggedIn', handleUserLoggedIn);
        };
    }, []);

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
                    countdown > 0 ? `Đăng nhập lại (${countdown}s)` : 'Đăng nhập lại'
                }
                cancelText="Đăng nhập lại"
                className="session-expired-modal-wrapper"
            >
                {modalType === 'device' && modalNewDevice && (
                    <div className="session-expired-device-info">
                        <p>
                            <strong>📱 Thiết bị mới:</strong>{' '}
                            {typeof modalNewDevice === 'string'
                                ? modalNewDevice
                                : modalNewDevice?.deviceName ||
                                  modalNewDevice?.name ||
                                  JSON.stringify(modalNewDevice)}
                        </p>
                    </div>
                )}

                {countdown > 0 && (
                    <div className="session-expired-countdown">
                        ⏳ Tự động chuyển đến trang đăng nhập sau{' '}
                        <strong>{countdown}</strong> giây...
                    </div>
                )}

                {modalType === 'device' && (
                    <div className="session-expired-security">
                        🛡️ Nếu đây không phải là bạn, vui lòng đổi mật khẩu ngay lập tức.
                    </div>
                )}
            </Modal>
        </>
    );
};

export default SessionGuard;