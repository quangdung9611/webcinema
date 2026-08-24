// src/components/SessionGuard.jsx

import React, {
    useCallback,
    useEffect,
    useRef,
    useState
} from 'react';

import { useNavigate } from 'react-router-dom';

import api from '../../api/api';
import socketService from '../../api/socket';
import { forceLogout } from '../../utils/authCleanup';

import Modal from './Modal';

import '../styles/SessionGuard.css';

// ============================================================
// CONFIG
// ============================================================

// 🔥 GIẢM XUỐNG 3 GIÂY ĐỂ PHÁT HIỆN NHANH HƠN
const SESSION_CHECK_INTERVAL = 3000; // từ 10000 -> 3000

const SESSION_CHECK_TIMEOUT = 5000;

// 🔥 THÊM: DEBOUNCE CHO USER ACTIVITY
const USER_ACTIVITY_DEBOUNCE = 1000;

// ============================================================
// SESSION GUARD
// ============================================================

const SessionGuard = ({ children }) => {
    const navigate = useNavigate();

    // ========================================================
    // REFS
    // ========================================================

    const isMountedRef = useRef(false);

    const isProcessingRef = useRef(false);

    const isCheckingSessionRef = useRef(false);

    const sessionCheckIntervalRef = useRef(null);

    const sessionCheckTimeoutRef = useRef(null);

    const userActivityTimeoutRef = useRef(null); // 🔥 THÊM

    // ========================================================
    // MODAL STATE
    // ========================================================

    const [showModal, setShowModal] = useState(false);

    const [modalMessage, setModalMessage] = useState('');

    const [modalNewDevice, setModalNewDevice] = useState(null);

    const [modalType, setModalType] = useState('token');

    const [countdown, setCountdown] = useState(10);

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
    // HIỆN MODAL
    // ========================================================

    const openSessionModal = useCallback(
        (detail = {}) => {
            if (!isMountedRef.current) {
                return;
            }

            // Nếu modal đã hiện thì không tạo mới
            if (showModal) {
                console.log('⚠️ [SESSION GUARD] Modal already shown');
                return;
            }

            const message =
                detail?.message ||
                'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';

            const type =
                detail?.type === 'device' ||
                detail?.code === 'SESSION_EXPIRED'
                    ? 'device'
                    : 'token';

            const newDevice = detail?.newDevice || null;

            console.warn('🔐 [SESSION GUARD] Open session modal:', {
                message,
                type,
                newDevice,
                fromSocket: detail?.fromSocket || false
            });

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

        // 🔥 THÊM: Clear user activity timeout
        if (userActivityTimeoutRef.current) {
            clearTimeout(userActivityTimeoutRef.current);
            userActivityTimeoutRef.current = null;
        }
    }, []);

    // ========================================================
    // XỬ LÝ SESSION EXPIRED
    //
    // ĐÂY LÀ LUỒNG DUY NHẤT
    // ========================================================

    const handleSessionExpired = useCallback(
        async (eventOrDetail = {}) => {
            if (!isMountedRef.current) {
                return;
            }

            // Đã xử lý rồi thì bỏ qua.
            if (isProcessingRef.current) {
                console.log('⚠️ [SESSION GUARD] Session already processing');
                return;
            }

            const detail = eventOrDetail?.detail || eventOrDetail || {};

            const message =
                detail?.message ||
                'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';

            const type =
                detail?.type === 'device' ||
                detail?.code === 'SESSION_EXPIRED'
                    ? 'device'
                    : 'token';

            const fromSocket = detail?.fromSocket || false;

            console.warn('🔴 [SESSION GUARD] SESSION EXPIRED:', {
                detail,
                fromSocket,
                isProcessing: isProcessingRef.current
            });

            // ====================================================
            // LOCK - Ngăn xử lý nhiều lần
            // ====================================================

            isProcessingRef.current = true;

            // ====================================================
            // STOP HEALTH CHECK
            // ====================================================

            stopSessionCheck();

            // ====================================================
            // HIỆN MODAL
            //
            // Hiện trước để user thấy ngay.
            // ====================================================

            openSessionModal({
                ...detail,
                message,
                type,
                fromSocket
            });

            // ====================================================
            // CLEANUP
            //
            // Không gọi logout API.
            //
            // Vì token có thể:
            // - đã bị xóa
            // - hết hạn
            // - bị invalid
            // - bị backend revoke
            // ====================================================

            try {
                await forceLogout(
                    type === 'device' ? 'device' : 'expired',
                    message
                );

                console.log('🧹 [SESSION GUARD] Auth cleaned up');

                // 🔥 Dispatch event để header và các component khác biết
                window.dispatchEvent(
                    new CustomEvent('authCleanedUp', {
                        detail: {
                            reason: type === 'device' ? 'device' : 'expired',
                            message: message,
                            timestamp: new Date().toISOString()
                        }
                    })
                );
            } catch (error) {
                console.error('🔴 [SESSION GUARD] Cleanup failed:', error);
            }
        },
        [openSessionModal, stopSessionCheck]
    );

    // ========================================================
    // CONFIRM MODAL
    // ========================================================

    const handleModalConfirm = useCallback(() => {
        console.log('🔐 [SESSION GUARD] Redirect login');

        setShowModal(false);

        // Reset processing để cho phép xử lý mới
        isProcessingRef.current = false;

        navigate('/login', {
            replace: true,
            state: {
                expired: true,
                message: modalMessage,
                type: modalType
            }
        });
    }, [navigate, modalMessage, modalType]);

    // ========================================================
    // COUNTDOWN
    // ========================================================

    useEffect(() => {
        if (!showModal) {
            return;
        }

        if (countdown <= 0) {
            const timeout = setTimeout(() => {
                handleModalConfirm();
            }, 300);

            return () => {
                clearTimeout(timeout);
            };
        }

        const interval = setInterval(() => {
            setCountdown((prev) => Math.max(prev - 1, 0));
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [showModal, countdown, handleModalConfirm]);

    // ========================================================
    // 🔥 SESSION HEALTH CHECK - DÙNG API CHECK NHANH
    // ========================================================

    const checkSession = useCallback(
        async () => {
            if (!isMountedRef.current) {
                return;
            }

            if (showModal) {
                return;
            }

            if (isProcessingRef.current) {
                return;
            }

            if (isCheckingSessionRef.current) {
                return;
            }

            // Không có auth state => không check
            if (!hasLocalAuthState()) {
                return;
            }

            isCheckingSessionRef.current = true;

            try {
                console.log('🔄 [SESSION GUARD] Checking session...');

                // 🔥 DÙNG API CHECK NHANH THAY VÌ /me
                const result = await api.checkSession();

                if (!result || !result.valid) {
                    // Session không hợp lệ
                    await handleSessionExpired({
                        code: result?.code || 'SESSION_INVALID',
                        message: result?.message || 'Phiên đăng nhập không còn hợp lệ.',
                        type: 'token'
                    });
                    return;
                }

                // Session vẫn hợp lệ
                console.log('✅ [SESSION GUARD] Session valid:', result.user_id);

            } catch (error) {
                // Bỏ qua lỗi network
                if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
                    console.warn('🟡 [SESSION GUARD] Network error - keep user logged in');
                    return;
                }

                // Timeout
                if (error?.code === 'ECONNABORTED') {
                    console.warn('🟡 [SESSION GUARD] Session check timeout');
                    return;
                }

                console.error('🔴 [SESSION GUARD] Check session error:', error);
            } finally {
                isCheckingSessionRef.current = false;
            }
        },
        [showModal, hasLocalAuthState, handleSessionExpired]
    );

    // ========================================================
    // 🔥 CHECK NGAY KHI USER TƯƠNG TÁC
    // ========================================================

    const handleUserActivity = useCallback(() => {
        // Debounce để tránh check quá nhiều
        if (userActivityTimeoutRef.current) {
            clearTimeout(userActivityTimeoutRef.current);
        }

        userActivityTimeoutRef.current = setTimeout(() => {
            // Chỉ check nếu đang có session và chưa có modal
            if (hasLocalAuthState() && !showModal && !isProcessingRef.current) {
                checkSession();
            }
        }, USER_ACTIVITY_DEBOUNCE);
    }, [hasLocalAuthState, showModal, checkSession]);

    // ========================================================
    // 🔥 API EVENT + SOCKET EVENT
    // ========================================================

    useEffect(() => {
        // =====================================================
        // 1. API INTERCEPTOR EVENT
        // =====================================================
        const handleSessionEvent = (event) => {
            console.log('📨 [SESSION GUARD] sessionExpired from API:', event?.detail);
            handleSessionExpired(event);
        };

        window.addEventListener('sessionExpired', handleSessionEvent);

        // =====================================================
        // 2. SOCKET EVENT - REAL TIME
        // =====================================================
        const handleSocketSessionExpired = (detail) => {
            console.warn('🔴 [SESSION GUARD] Socket session expired REAL-TIME:', detail);

            // Đảm bảo detail có fromSocket flag
            handleSessionExpired({
                ...detail,
                fromSocket: true
            });
        };

        // Đăng ký callback cho socket service
        socketService.setOnSessionExpired(handleSocketSessionExpired);

        // =====================================================
        // 3. LẮNG NGHE THÊM EVENT TỪ SOCKET SERVICE
        // =====================================================
        const handleDeviceLoggedOut = (event) => {
            console.warn('📱 [SESSION GUARD] Device logged out event:', event?.detail);

            if (!isProcessingRef.current) {
                handleSessionExpired({
                    detail: {
                        ...event?.detail,
                        type: 'device',
                        code: 'SESSION_EXPIRED',
                        fromSocket: true
                    }
                });
            }
        };

        const handleTokenExpired = (event) => {
            console.warn('⏰ [SESSION GUARD] Token expired event:', event?.detail);

            if (!isProcessingRef.current) {
                handleSessionExpired({
                    detail: {
                        ...event?.detail,
                        type: 'token',
                        code: 'TOKEN_EXPIRED',
                        fromSocket: true
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

            // Cleanup socket callback
            socketService.setOnSessionExpired(null);
        };
    }, [handleSessionExpired]);

    // ========================================================
    // STORAGE CHANGE
    // ========================================================

    useEffect(() => {
        const handleStorageChange = (event) => {
            const authKeys = ['user_info', 'admin_info', 'user_id'];

            if (!authKeys.includes(event.key)) {
                return;
            }

            if (event.oldValue && !event.newValue) {
                console.warn('🔐 [SESSION GUARD] Auth removed from another tab');

                handleSessionExpired({
                    code: 'LOCAL_AUTH_REMOVED',
                    message: 'Phiên đăng nhập đã được kết thúc.',
                    type: 'token'
                });
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [handleSessionExpired]);

    // ========================================================
    // START SESSION HEALTH CHECK
    // ========================================================

    useEffect(() => {
        isMountedRef.current = true;

        console.log('🛡️ [SESSION GUARD] Started');

        // Check lần đầu
        sessionCheckTimeoutRef.current = setTimeout(() => {
            checkSession();
        }, 1000);

        // 🔥 Check định kỳ mỗi 3 giây
        sessionCheckIntervalRef.current = setInterval(() => {
            checkSession();
        }, SESSION_CHECK_INTERVAL);

        return () => {
            console.log('🛡️ [SESSION GUARD] Stopped');

            isMountedRef.current = false;
            stopSessionCheck();
        };
    }, [checkSession, stopSessionCheck]);

    // ========================================================
    // 🔥 CHECK KHI QUAY LẠI TAB + USER ACTIVITY
    // ========================================================

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Check ngay khi quay lại tab
                checkSession();
            }
        };

        const handleFocus = () => {
            checkSession();
        };

        // 🔥 LẮNG NGHE USER ACTIVITY
        const activityEvents = [
            'click',
            'mousemove',
            'keydown',
            'scroll',
            'touchstart',
            'touchmove'
        ];

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        // Đăng ký tất cả event activity
        activityEvents.forEach((event) => {
            document.addEventListener(event, handleUserActivity);
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
                {/* DEVICE INFO */}
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

                {/* COUNTDOWN */}
                {countdown > 0 && (
                    <div className="session-expired-countdown">
                        ⏳ Tự động chuyển đến trang đăng nhập sau{' '}
                        <strong>{countdown}</strong> giây...
                    </div>
                )}

                {/* SECURITY */}
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