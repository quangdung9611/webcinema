// admin_frontend/components/AdminSessionGuard.jsx
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
import socketService from '../../api/socket';

import DeviceLoginModal from '../../user_frontend/components/DeviceLogicModal'; // 🔥 IMPORT TỪ USER

import '../styles/AdminSessionGuard.css';

const COUNTDOWN_SECONDS = 10;

const AdminSessionGuard = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isMountedRef = useRef(false);
    const isProcessingRef = useRef(false);
    const hasRedirectedRef = useRef(false);

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
        const publicPaths = [
            '/login',
            // '/forgot-password',
            // '/reset-password',
        ];
        return publicPaths.some(p => path === p || path.startsWith(p + '/'));
    }, [location.pathname]);

    // ============================================================
    // XÓA SESSION ADMIN
    // ============================================================
    const clearAdminSession = useCallback(() => {
        console.log('🧹 [ADMIN SESSION GUARD] Clearing admin session...');

        const adminKeys = [
            'admin_info',
            'admin_token',
            'adminLockedEmail',
            'admin_login_lock',
            'admin_remember_me',
        ];

        adminKeys.forEach((key) => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'user_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

        delete adminapi.defaults.headers.common['Authorization'];

        console.log('✅ [ADMIN SESSION GUARD] Admin session cleared');
    }, []);

    // ============================================================
    // HANDLE MODAL CONFIRM - ĐĂNG NHẬP LẠI
    // ============================================================
    const handleModalConfirm = useCallback(() => {
        console.log('➡️ [ADMIN SESSION GUARD] Clicking "Đăng nhập lại"!');
        
        setShowModal(false);
        hasRedirectedRef.current = false;

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
    // OPEN SESSION MODAL
    // ============================================================
    const openSessionModal = useCallback(
        (detail = {}) => {
            if (!isMountedRef.current) return;
            if (hasRedirectedRef.current) return;

            const code = detail.code || 'TOKEN_EXPIRED';
            const message = detail.message || (code === 'SESSION_REPLACED'
                ? 'Tài khoản admin đã được đăng nhập trên thiết bị khác.'
                : 'Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.');
            const newDevice = detail.newDevice || null;

            console.warn('🔐 [ADMIN SESSION GUARD] Opening modal:', {
                code,
                message,
                newDevice,
            });

            setModalCode(code);
            setModalMessage(message);
            setModalNewDevice(newDevice);
            setShowModal(true);
            setCountdown(COUNTDOWN_SECONDS);
        },
        []
    );

    // ============================================================
    // HANDLE SESSION EXPIRED - GIỐNG HỆT SessionGuard
    // ============================================================
    const handleSessionExpired = useCallback(
        async (eventOrDetail = {}) => {
            if (!isMountedRef.current) return;
            
            if (isProcessingRef.current) {
                console.log('⚠️ [ADMIN SESSION GUARD] Already processed, skip');
                return;
            }

            if (isAdminPublicRoute()) {
                console.log('⏭️ [ADMIN SESSION GUARD] Public route, skip session expired');
                return;
            }

            isProcessingRef.current = true;

            const detail = eventOrDetail?.detail || eventOrDetail || {};
            const code = detail.code || 'TOKEN_EXPIRED';

            console.warn(`🔴 [ADMIN SESSION GUARD] SESSION EXPIRED (${code})`, {
                ...detail,
            });

            if (typeof adminapi.resetAdminCache === 'function') {
                adminapi.resetAdminCache();
            }

            clearAdminSession();

            try {
                socketService.disconnect();
            } catch (error) {
                console.warn('Socket disconnect error:', error);
            }

            openSessionModal({
                ...detail,
                code,
            });

            setTimeout(() => {
                isProcessingRef.current = false;
            }, 500);
        },
        [clearAdminSession, openSessionModal, isAdminPublicRoute]
    );

    // ============================================================
    // MOUNT
    // ============================================================
    useEffect(() => {
        isMountedRef.current = true;
        console.log('🛡️ [ADMIN SESSION GUARD] Started');

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // ============================================================
    // LẮNG NGHE SESSION EXPIRED TỪ WINDOW
    // ============================================================
    useEffect(() => {
        const handleSessionEvent = (event) => {
            console.log('📨 [ADMIN SESSION GUARD] sessionExpired event:', event?.detail);
            handleSessionExpired(event);
        };

        window.addEventListener('sessionExpired', handleSessionEvent);

        return () => {
            window.removeEventListener('sessionExpired', handleSessionEvent);
        };
    }, [handleSessionExpired]);

    // ============================================================
    // LẮNG NGHE SESSION EXPIRED TỪ SOCKET
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

        socketService.setOnSessionExpired(handleSocketSessionExpired);

        return () => {
            socketService.setOnSessionExpired(null);
        };
    }, [handleSessionExpired]);

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
    // RESET KHI ADMIN LOGIN
    // ============================================================
    useEffect(() => {
        const handleAdminLoggedIn = () => {
            console.log('🟢 [ADMIN SESSION GUARD] Admin logged in → reset');
            isProcessingRef.current = false;
            hasRedirectedRef.current = false;
            setShowModal(false);
        };

        window.addEventListener('adminLoggedIn', handleAdminLoggedIn);

        return () => {
            window.removeEventListener('adminLoggedIn', handleAdminLoggedIn);
        };
    }, []);

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <>
            {children}

            {/* 🔥 DÙNG DeviceLoginModal CỦA USER - GIỐNG HỆT SessionGuard */}
            <DeviceLoginModal
                show={showModal}
                type="warning"
                title={
                    modalCode === 'SESSION_REPLACED'
                        ? '🔐 Phát hiện đăng nhập trên thiết bị khác'
                        : '🔐 Phiên đăng nhập admin đã hết hạn'
                }
                message={modalMessage}
                onConfirm={handleModalConfirm}
                confirmText={
                    countdown > 0 ? `Đăng nhập lại (${countdown}s)` : 'Đăng nhập lại'
                }
                className="admin-session-expired-modal-wrapper"
            >
                {modalCode === 'SESSION_REPLACED' && modalNewDevice && (
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

                {modalCode === 'SESSION_REPLACED' && (
                    <div className="admin-session-expired-security">
                        🛡️ Nếu đây không phải là bạn, vui lòng đổi mật khẩu ngay lập tức.
                    </div>
                )}
            </DeviceLoginModal>
        </>
    );
};

export default AdminSessionGuard;