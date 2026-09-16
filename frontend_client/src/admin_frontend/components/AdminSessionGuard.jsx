// admin_frontend/components/AdminSessionGuard.jsx
// ============================================================
// ADMIN SESSION GUARD — Dùng AdminDeviceLoginModal
// ✅ Dùng adminSocketService (RIÊNG cho admin)
// ============================================================

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

import adminapi from '../../api/adminapi';
import adminSocketService from '../../api/adminsocket';   // ✅ ĐỔI
import { useAdminAuth } from '../../context/AdminAuthContext';

import AdminDeviceLoginModal from './AdminDeviceLoginModal';

import '../styles/AdminSessionGuard.css';

const COUNTDOWN_SECONDS = 10;

const AdminSessionGuard = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        clearAuthState,
    } = useAdminAuth();

    const isMountedRef = useRef(false);
    const isProcessingRef = useRef(false);
    const hasRedirectedRef = useRef(false);
    const isLoggingOutRef = useRef(false);

    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalNewDevice, setModalNewDevice] = useState(null);
    const [modalCode, setModalCode] = useState('TOKEN_EXPIRED');
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

    // ============================================================
    // KIỂM TRA TRANG PUBLIC CỦA ADMIN
    // ============================================================
    const isAdminPublicRoute = useCallback(() => {
        const path = location.pathname;
        const publicPaths = ['/login'];
        return publicPaths.some(
            (p) => path === p || path.startsWith(p + '/')
        );
    }, [location.pathname]);

    // ============================================================
    // HANDLE MODAL CONFIRM — Đăng nhập lại
    // ============================================================
    const handleModalConfirm = useCallback(() => {
        console.log('➡️ [ADMIN SESSION GUARD] Clicking "Đăng nhập lại"!');

        setShowModal(false);
        hasRedirectedRef.current = false;
        isProcessingRef.current = false;

        navigate('/login', {
            replace: true,
            state: {
                expired: true,
                message: modalMessage,
                code: modalCode,
            },
        });
    }, [navigate, modalMessage, modalCode]);

    // ============================================================
    // HANDLE MODAL CANCEL — Ở lại
    // ============================================================
    const handleModalCancel = useCallback(() => {
        console.log('➡️ [ADMIN SESSION GUARD] Clicking "Ở lại"!');
        setShowModal(false);
    }, []);

    // ============================================================
    // OPEN SESSION MODAL
    // ============================================================
    const openSessionModal = useCallback((detail = {}) => {
        if (!isMountedRef.current) return;
        if (hasRedirectedRef.current) return;

        const code = detail.code || 'TOKEN_EXPIRED';

        const isDeviceReplaced =
            code === 'SESSION_REPLACED' ||
            code === 'SESSION_EXPIRED';

        const message =
            detail.message ||
            (isDeviceReplaced
                ? 'Tài khoản admin của bạn đã được đăng nhập trên thiết bị khác.'
                : 'Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.');

        const newDevice = detail.newDevice || null;

        console.warn('🔐 [ADMIN SESSION GUARD] Opening modal:', {
            code,
            message,
            newDevice,
            isDeviceReplaced,
        });

        setModalCode(code);
        setModalMessage(message);
        setModalNewDevice(newDevice);
        setShowModal(true);
        setCountdown(COUNTDOWN_SECONDS);
    }, []);

    // ============================================================
    // HANDLE SESSION EXPIRED
    // ============================================================
    const handleSessionExpired = useCallback(
        async (eventOrDetail = {}) => {
            if (!isMountedRef.current) return;

            if (isLoggingOutRef.current) {
                console.log('⏭️ [ADMIN SESSION GUARD] Đang logout → bỏ qua');
                return;
            }

            if (isProcessingRef.current) {
                console.log('⚠️ [ADMIN SESSION GUARD] Already processed, skip');
                return;
            }

            if (isAdminPublicRoute()) {
                console.log('⏭️ [ADMIN SESSION GUARD] Public route, skip');
                return;
            }

            isProcessingRef.current = true;

            const detail = eventOrDetail?.detail || eventOrDetail || {};
            const code = detail.code || 'TOKEN_EXPIRED';

            console.warn(`🔴 [ADMIN SESSION GUARD] SESSION EXPIRED (${code})`, {
                ...detail,
            });

            adminapi.resetAdminCache();
            clearAuthState();

            try {
                adminSocketService.disconnect();   // ✅ ĐỔI
            } catch (error) {
                console.warn('Socket disconnect error:', error);
            }

            openSessionModal({ ...detail, code });

            setTimeout(() => {
                isProcessingRef.current = false;
            }, 500);
        },
        [clearAuthState, openSessionModal, isAdminPublicRoute]
    );

    // ============================================================
    // COUNTDOWN TIMER
    // ============================================================
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

    // ============================================================
    // AUTO CONFIRM KHI COUNTDOWN = 0
    // ============================================================
    useEffect(() => {
        if (!showModal || countdown !== 0) return;
        if (hasRedirectedRef.current) return;

        hasRedirectedRef.current = true;
        handleModalConfirm();
    }, [countdown, showModal, handleModalConfirm]);

    // ============================================================
    // MOUNT + LẮNG NGHE authCleanedUp
    // ============================================================
    useEffect(() => {
        isMountedRef.current = true;
        console.log('🛡️ [ADMIN SESSION GUARD] Started');

        const handleAuthCleanedUp = (event) => {
            console.log('🧹 [ADMIN SESSION GUARD] authCleanedUp:', event?.detail);
            isLoggingOutRef.current = true;

            setTimeout(() => {
                isLoggingOutRef.current = false;
            }, 3000);
        };

        window.addEventListener('authCleanedUp', handleAuthCleanedUp);

        return () => {
            isMountedRef.current = false;
            window.removeEventListener('authCleanedUp', handleAuthCleanedUp);
        };
    }, []);

    // ============================================================
    // LẮNG NGHE SESSION EXPIRED TỪ WINDOW
    // ============================================================
    useEffect(() => {
        const handleSessionEvent = (event) => {
            console.log('📨 [ADMIN SESSION GUARD] sessionExpired:', event?.detail);
            handleSessionExpired(event);
        };

        window.addEventListener('sessionExpired', handleSessionEvent);

        return () => {
            window.removeEventListener('sessionExpired', handleSessionEvent);
        };
    }, [handleSessionExpired]);

    // ============================================================
    // LẮNG NGHE SESSION EXPIRED TỪ SOCKET
    // ✅ ĐỔI sang adminSocketService
    // ============================================================
    useEffect(() => {
        const handleSocketSessionExpired = (detail = {}) => {
            console.log('📨 [ADMIN SESSION GUARD] Socket callback:', detail);
            handleSessionExpired({
                ...detail,
                source: 'socket',
                fromSocket: true,
            });
        };

        adminSocketService.setOnSessionExpired(handleSocketSessionExpired);   // ✅ ĐỔI

        return () => {
            adminSocketService.setOnSessionExpired(null);   // ✅ ĐỔI
        };
    }, [handleSessionExpired]);

    // ============================================================
    // RESET KHI ADMIN LOGIN
    // ============================================================
    useEffect(() => {
        const handleAdminLoggedIn = () => {
            console.log('🟢 [ADMIN SESSION GUARD] Admin logged in → reset');
            isProcessingRef.current = false;
            hasRedirectedRef.current = false;
            isLoggingOutRef.current = false;
            setShowModal(false);
            setCountdown(COUNTDOWN_SECONDS);
        };

        window.addEventListener('adminLoggedIn', handleAdminLoggedIn);

        return () => {
            window.removeEventListener('adminLoggedIn', handleAdminLoggedIn);
        };
    }, []);

    // ============================================================
    // RESET KHI RỜI KHỎI PUBLIC ROUTE
    // ============================================================
    useEffect(() => {
        if (isAdminPublicRoute()) {
            console.log('🧹 [ADMIN SESSION GUARD] Entering public route → reset');
            isProcessingRef.current = false;
            hasRedirectedRef.current = false;
        }
    }, [location.pathname, isAdminPublicRoute]);

    // ============================================================
    // RENDER
    // ============================================================
    const isDeviceReplacedCode =
        modalCode === 'SESSION_REPLACED' || modalCode === 'SESSION_EXPIRED';

    return (
        <>
            {children}

            <AdminDeviceLoginModal
                show={showModal}
                type="warning"
                title={
                    isDeviceReplacedCode
                        ? '🔐 Phát hiện đăng nhập trên thiết bị khác'
                        : '🔐 Phiên đăng nhập admin đã hết hạn'
                }
                message={modalMessage}
                onConfirm={handleModalConfirm}
                onCancel={handleModalCancel}
                confirmText={
                    countdown > 0
                        ? `Đăng nhập lại (${countdown}s)`
                        : 'Đăng nhập lại'
                }
                cancelText="Ở lại"
                className="admin-session-expired-modal-wrapper"
            >
                {isDeviceReplacedCode && modalNewDevice && (
                    <div className="admin-session-expired-device-info">
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
                    <div className="admin-session-expired-countdown">
                        ⏳ Tự động chuyển đến trang đăng nhập sau{' '}
                        <strong>{countdown}</strong> giây...
                    </div>
                )}

                {isDeviceReplacedCode && (
                    <div className="admin-session-expired-security">
                        🛡️ Nếu đây không phải là bạn, vui lòng đổi mật khẩu
                        ngay lập tức.
                    </div>
                )}
            </AdminDeviceLoginModal>
        </>
    );
};

export default AdminSessionGuard;