// src/components/SessionGuard.jsx

import React, {
    useCallback,
    useEffect,
    useRef,
    useState
} from 'react';

import { useNavigate, useLocation } from 'react-router-dom';

import api from '../../api/api';
import socketService from '../../api/socket';
import { forceLogout } from '../../utils/authCleanup';

import Modal from './Modal';

import '../styles/SessionGuard.css';

// ============================================================
// CONFIG - TỐC ĐỘ CỰC NHANH
// ============================================================

const SESSION_CHECK_INTERVAL = 100;
const SESSION_CHECK_TIMEOUT = 1000;
const USER_ACTIVITY_DEBOUNCE = 50;
const SESSION_EXPIRED_DEBOUNCE = 300;

// ============================================================
// SESSION GUARD
// ============================================================

const SessionGuard = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // ========================================================
    // REFS
    // ========================================================

    const isMountedRef = useRef(false);
    const isProcessingRef = useRef(false);
    const isCheckingSessionRef = useRef(false);
    const sessionCheckIntervalRef = useRef(null);
    const sessionCheckTimeoutRef = useRef(null);
    const userActivityTimeoutRef = useRef(null);
    const hasRedirectedRef = useRef(false);
    const hasShownModalRef = useRef(false);
    const sessionExpiredTimeoutRef = useRef(null);

    // ========================================================
    // MODAL STATE
    // ========================================================

    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalNewDevice, setModalNewDevice] = useState(null);
    const [modalType, setModalType] = useState('token');
    const [countdown, setCountdown] = useState(10);

    // ========================================================
    // XÓA SẠCH SESSION STORAGE BOOKING
    // ========================================================

    const clearBookingSession = useCallback(() => {
        console.log('🧹 [SESSION GUARD] Clearing booking session storage...');

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
            'booking_showtime'
        ];

        bookingKeys.forEach(key => {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
            console.log(`🗑️ [SESSION GUARD] Removed key: ${key}`);
        });

        window.dispatchEvent(new CustomEvent('clearBookingSession', {
            detail: {
                reason: 'session_expired',
                timestamp: new Date().toISOString()
            }
        }));

        if (socketService.isConnectedStatus()) {
            const socket = socketService.getSocket();
            if (socket) {
                socket.emit('clear_all_holding_seats', {
                    userId: socketService.userId,
                    timestamp: new Date().toISOString()
                });
                console.log('📤 [SESSION GUARD] Sent clear_all_holding_seats');
            }
        }

        console.log('✅ [SESSION GUARD] Booking session cleared');
    }, []);

    // ========================================================
    // KIỂM TRA CÓ ĐANG Ở TRANG BOOKING KHÔNG
    // ========================================================

    const isBookingPage = useCallback(() => {
        const path = location.pathname;
        return path.includes('/booking/') ||
               path.includes('/foods') ||
               path.includes('/payment') ||
               path.includes('/confirm-success') ||
               path.includes('/bank-app') ||
               path.includes('/momo-app');
    }, [location.pathname]);

    // ========================================================
    // KIỂM TRA FRONTEND CÓ ĐANG LOGIN KHÔNG
    // ========================================================

    const hasLocalAuthState = useCallback(() => {
        const userInfo = localStorage.getItem('user_info');
        const adminInfo = localStorage.getItem('admin_info');
        const userId = localStorage.getItem('user_id');
        return Boolean(userInfo || adminInfo || userId);
    }, []);

    // ========================================================
    // RESET FLAGS
    // ========================================================

    const resetFlags = useCallback(() => {
        hasRedirectedRef.current = false;
        hasShownModalRef.current = false;
        isProcessingRef.current = false;
        if (sessionExpiredTimeoutRef.current) {
            clearTimeout(sessionExpiredTimeoutRef.current);
            sessionExpiredTimeoutRef.current = null;
        }
    }, []);

    // ========================================================
    // HIỆN MODAL
    // ========================================================

    const openSessionModal = useCallback(
        (detail = {}) => {
            if (!isMountedRef.current) return;
            if (showModal || hasShownModalRef.current || hasRedirectedRef.current) {
                console.log('⚠️ [SESSION GUARD] Modal already shown or redirecting, skip');
                return;
            }

            const message = detail?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
            const type = detail?.type === 'device' || detail?.code === 'SESSION_EXPIRED' ? 'device' : 'token';
            const newDevice = detail?.newDevice || null;

            console.warn('🔐 [SESSION GUARD] Open session modal:', { message, type, newDevice });

            hasShownModalRef.current = true;
            setModalMessage(message);
            setModalType(type);
            setModalNewDevice(newDevice);
            setCountdown(10);
            setShowModal(true);
        },
        [showModal]
    );

    // ========================================================
    // DỪNG SESSION CHECK
    // ========================================================

    const stopSessionCheck = useCallback(() => {
        if (sessionCheckIntervalRef.current) {
            clearInterval(sessionCheckIntervalRef.current);
            sessionCheckIntervalRef.current = null;
        }
        if (sessionCheckTimeoutRef.current) {
            clearTimeout(sessionCheckTimeoutRef.current);
            sessionCheckTimeoutRef.current = null;
        }
        if (userActivityTimeoutRef.current) {
            clearTimeout(userActivityTimeoutRef.current);
            userActivityTimeoutRef.current = null;
        }
        if (sessionExpiredTimeoutRef.current) {
            clearTimeout(sessionExpiredTimeoutRef.current);
            sessionExpiredTimeoutRef.current = null;
        }
    }, []);

    // ========================================================
    // XỬ LÝ SESSION EXPIRED
    // ========================================================

    const handleSessionExpired = useCallback(
        async (eventOrDetail = {}) => {
            if (!isMountedRef.current) return;
            if (isProcessingRef.current || hasRedirectedRef.current || hasShownModalRef.current) {
                console.log('⚠️ [SESSION GUARD] Already processed or redirecting, skip');
                return;
            }

            const detail = eventOrDetail?.detail || eventOrDetail || {};
            const source = detail?.source || (detail?.fromSocket ? 'socket' : 'polling');

            console.warn(`🔴 [SESSION GUARD] SESSION EXPIRED from ${source}:`, detail);

            if (sessionExpiredTimeoutRef.current) {
                console.log('⏰ [SESSION GUARD] Already debouncing, skip');
                return;
            }

            // XÓA SESSION STORAGE BOOKING
            clearBookingSession();

            isProcessingRef.current = true;
            stopSessionCheck();

            openSessionModal({
                ...detail,
                source: source
            });

            try {
                await forceLogout(
                    detail?.type === 'device' ? 'device' : 'expired',
                    detail?.message || 'Phiên đăng nhập đã hết hạn.'
                );

                console.log('🧹 [SESSION GUARD] Auth cleaned up');

                window.dispatchEvent(
                    new CustomEvent('authCleanedUp', {
                        detail: {
                            reason: detail?.type === 'device' ? 'device' : 'expired',
                            message: detail?.message || 'Phiên đăng nhập đã hết hạn',
                            timestamp: new Date().toISOString()
                        }
                    })
                );
            } catch (error) {
                console.error('🔴 [SESSION GUARD] Cleanup failed:', error);
            }

            // NẾU ĐANG Ở TRANG BOOKING -> VỀ TRANG CHỦ
            if (isBookingPage()) {
                console.log('🏠 [SESSION GUARD] On booking page, redirect to home');
                setTimeout(() => {
                    navigate('/', { replace: true });
                }, 500);
            }

            sessionExpiredTimeoutRef.current = setTimeout(() => {
                sessionExpiredTimeoutRef.current = null;
                console.log('⏰ [SESSION GUARD] Debounce timeout cleared');
            }, SESSION_EXPIRED_DEBOUNCE);
        },
        [openSessionModal, stopSessionCheck, clearBookingSession, isBookingPage, navigate]
    );

    // ========================================================
    // CONFIRM MODAL
    // ========================================================

    const handleModalConfirm = useCallback(() => {
        if (hasRedirectedRef.current) {
            console.log('⚠️ [SESSION GUARD] Already redirected, skip');
            return;
        }

        console.log('🔐 [SESSION GUARD] Redirect login');
        hasRedirectedRef.current = true;
        setShowModal(false);

        if (isBookingPage()) {
            console.log('🏠 [SESSION GUARD] On booking page, redirect to home');
            navigate('/', { replace: true });
        } else {
            navigate('/login', {
                replace: true,
                state: {
                    expired: true,
                    message: modalMessage,
                    type: modalType
                }
            });
        }

        setTimeout(() => resetFlags(), 2000);
    }, [navigate, modalMessage, modalType, resetFlags, isBookingPage]);

    // ========================================================
    // COUNTDOWN
    // ========================================================

    useEffect(() => {
        if (!showModal) return;

        if (countdown <= 0) {
            const timeout = setTimeout(() => handleModalConfirm(), 300);
            return () => clearTimeout(timeout);
        }

        const interval = setInterval(() => {
            setCountdown((prev) => Math.max(prev - 1, 0));
        }, 1000);

        return () => clearInterval(interval);
    }, [showModal, countdown, handleModalConfirm]);

    // ========================================================
    // SESSION HEALTH CHECK
    // ========================================================

    const checkSession = useCallback(
        async () => {
            if (!isMountedRef.current) return;
            if (showModal || isProcessingRef.current || hasRedirectedRef.current || hasShownModalRef.current) return;
            if (isCheckingSessionRef.current) return;
            if (!hasLocalAuthState()) return;

            isCheckingSessionRef.current = true;

            try {
                const result = await api.checkSession();

                if (!result || !result.valid) {
                    console.warn('🔴 [SESSION GUARD] Session invalid!');
                    await handleSessionExpired({
                        code: result?.code || 'SESSION_INVALID',
                        message: result?.message || 'Phiên đăng nhập không còn hợp lệ.',
                        type: 'token',
                        source: 'polling'
                    });
                    return;
                }
            } catch (error) {
                if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') return;
                if (error?.code === 'ECONNABORTED') return;
                console.warn('🟡 [SESSION GUARD] Check error:', error?.message);
            } finally {
                isCheckingSessionRef.current = false;
            }
        },
        [showModal, hasLocalAuthState, handleSessionExpired]
    );

    // ========================================================
    // CHECK KHI USER TƯƠNG TÁC
    // ========================================================

    const handleUserActivity = useCallback(() => {
        if (userActivityTimeoutRef.current) {
            clearTimeout(userActivityTimeoutRef.current);
        }

        userActivityTimeoutRef.current = setTimeout(() => {
            if (hasLocalAuthState() && !showModal && !isProcessingRef.current && !hasRedirectedRef.current && !hasShownModalRef.current) {
                checkSession();
            }
        }, USER_ACTIVITY_DEBOUNCE);
    }, [hasLocalAuthState, showModal, checkSession]);

    // ========================================================
    // RESET FLAGS KHI UNMOUNT
    // ========================================================

    useEffect(() => {
        return () => resetFlags();
    }, [resetFlags]);

    // ========================================================
    // API EVENT + SOCKET EVENT
    // ========================================================

    useEffect(() => {
        const handleSessionEvent = (event) => {
            console.log('📨 [SESSION GUARD] sessionExpired from API:', event?.detail);
            handleSessionExpired({ detail: { ...event?.detail, source: 'api' } });
        };

        window.addEventListener('sessionExpired', handleSessionEvent);

        const handleSocketSessionExpired = (detail) => {
            console.warn('🔴 [SESSION GUARD] Socket session expired REAL-TIME:', detail);
            handleSessionExpired({ ...detail, fromSocket: true, source: 'socket' });
        };

        socketService.setOnSessionExpired(handleSocketSessionExpired);

        const handleDeviceLoggedOut = (event) => {
            console.warn('📱 [SESSION GUARD] Device logged out event:', event?.detail);
            if (!isProcessingRef.current && !hasRedirectedRef.current && !hasShownModalRef.current) {
                handleSessionExpired({
                    detail: {
                        ...event?.detail,
                        type: 'device',
                        code: 'SESSION_EXPIRED',
                        fromSocket: true,
                        source: 'socket'
                    }
                });
            }
        };

        const handleTokenExpired = (event) => {
            console.warn('⏰ [SESSION GUARD] Token expired event:', event?.detail);
            if (!isProcessingRef.current && !hasRedirectedRef.current && !hasShownModalRef.current) {
                handleSessionExpired({
                    detail: {
                        ...event?.detail,
                        type: 'token',
                        code: 'TOKEN_EXPIRED',
                        fromSocket: true,
                        source: 'socket'
                    }
                });
            }
        };

        window.addEventListener('deviceLoggedOut', handleDeviceLoggedOut);
        window.addEventListener('tokenExpired', handleTokenExpired);

        return () => {
            window.removeEventListener('sessionExpired', handleSessionEvent);
            window.removeEventListener('deviceLoggedOut', handleDeviceLoggedOut);
            window.removeEventListener('tokenExpired', handleTokenExpired);
            socketService.setOnSessionExpired(null);
        };
    }, [handleSessionExpired]);

    // ========================================================
    // STORAGE CHANGE
    // ========================================================

    useEffect(() => {
        const handleStorageChange = (event) => {
            const authKeys = ['user_info', 'admin_info', 'user_id'];
            if (!authKeys.includes(event.key)) return;
            if (event.oldValue && !event.newValue) {
                console.warn('🔐 [SESSION GUARD] Auth removed from another tab');
                handleSessionExpired({
                    code: 'LOCAL_AUTH_REMOVED',
                    message: 'Phiên đăng nhập đã được kết thúc.',
                    type: 'token',
                    source: 'storage'
                });
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [handleSessionExpired]);

    // ========================================================
    // START SESSION HEALTH CHECK
    // ========================================================

    useEffect(() => {
        isMountedRef.current = true;
        console.log('🛡️ [SESSION GUARD] Started');

        setTimeout(() => checkSession(), 10);

        if (SESSION_CHECK_INTERVAL !== null) {
            console.log(`🔄 [SESSION GUARD] Polling every ${SESSION_CHECK_INTERVAL}ms`);
            sessionCheckIntervalRef.current = setInterval(() => {
                checkSession();
            }, SESSION_CHECK_INTERVAL);
        } else {
            console.log('🔄 [SESSION GUARD] Polling DISABLED - using socket + activity only');
        }

        return () => {
            console.log('🛡️ [SESSION GUARD] Stopped');
            isMountedRef.current = false;
            stopSessionCheck();
        };
    }, [checkSession, stopSessionCheck]);

    // ========================================================
    // CHECK KHI QUAY LẠI TAB + USER ACTIVITY
    // ========================================================

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkSession();
            }
        };

        const handleFocus = () => checkSession();

        const activityEvents = [
            'click', 'mousedown', 'mouseup', 'mousemove',
            'keydown', 'keyup', 'scroll',
            'touchstart', 'touchmove', 'touchend', 'wheel'
        ];

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        activityEvents.forEach((event) => {
            document.addEventListener(event, handleUserActivity, { passive: true });
        });

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            activityEvents.forEach((event) => {
                document.removeEventListener(event, handleUserActivity);
            });
            if (userActivityTimeoutRef.current) {
                clearTimeout(userActivityTimeoutRef.current);
            }
        };
    }, [checkSession, handleUserActivity]);

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
                        ? '🔐 Phát hiện phiên đăng nhập mới'
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
                {modalType === 'device' && modalNewDevice && (
                    <div className="session-expired-device-info">
                        <p>
                            <strong>📱 Thiết bị mới:</strong>{' '}
                            {typeof modalNewDevice === 'string'
                                ? modalNewDevice
                                : JSON.stringify(modalNewDevice)}
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
                        🛡️ Nếu đây không phải là bạn,
                        vui lòng đổi mật khẩu ngay lập tức.
                    </div>
                )}
            </Modal>
        </>
    );
};

export default SessionGuard;