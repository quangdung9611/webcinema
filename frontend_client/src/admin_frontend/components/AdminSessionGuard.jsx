// admin_frontend/components/AdminSessionGuard.jsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import adminapi from '../../api/adminapi';
import adminSocketService from '../../api/adminsocket';
import { useAdminAuth } from '../../context/AdminAuthContext';
import DeviceLoginModal from '../../user_frontend/components/DeviceLogicModal';
import '../styles/AdminSessionGuard.css';

const COUNTDOWN_SECONDS = 10;

const AdminSessionGuard = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const { clearAuthState } = useAdminAuth();

    const isMountedRef = useRef(false);
    const isProcessingRef = useRef(false);
    const hasRedirectedRef = useRef(false);
    const isLoggingOutRef = useRef(false);

    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [modalNewDevice, setModalNewDevice] = useState(null);
    const [modalCode, setModalCode] = useState('TOKEN_EXPIRED');
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

    const handleModalConfirm = useCallback(() => {
        console.log('➡️ [ADMIN SESSION GUARD] Clicking "Đăng nhập lại"!');
        setShowModal(false);
        hasRedirectedRef.current = false;
        isProcessingRef.current = false;
        navigate('/login', {
            replace: true,
            state: { expired: true, message: modalMessage, code: modalCode },
        });
    }, [navigate, modalMessage, modalCode]);

    const openSessionModal = useCallback((detail = {}) => {
        if (!isMountedRef.current) return;
        const code = detail.code || 'TOKEN_EXPIRED';
        const message = detail.message || (code === 'SESSION_REPLACED'
            ? 'Tài khoản admin đã được đăng nhập trên thiết bị khác.'
            : 'Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.');
        const newDevice = detail.newDevice || null;

        console.warn('🔐 [ADMIN SESSION GUARD] Opening modal:', { code, message });
        setModalCode(code);
        setModalMessage(message);
        setModalNewDevice(newDevice);
        setShowModal(true);
        setCountdown(COUNTDOWN_SECONDS);
    }, []);

    const handleSessionExpired = useCallback(async (eventOrDetail = {}) => {
        if (!isMountedRef.current) return;
        if (isLoggingOutRef.current) return;
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        const detail = eventOrDetail?.detail || eventOrDetail || {};
        const code = detail.code || 'TOKEN_EXPIRED';
        console.warn(`🔴 [ADMIN SESSION GUARD] SESSION EXPIRED (${code})`);

        adminapi.resetAdminCache();
        clearAuthState();

        try {
            adminSocketService.disconnect();
        } catch (error) {
            console.warn('Socket disconnect error:', error);
        }

        openSessionModal({ ...detail, code });
    }, [clearAuthState, openSessionModal]);

    useEffect(() => {
        isMountedRef.current = true;
        console.log('🛡️ [ADMIN SESSION GUARD] Started');

        const handleAuthCleanedUp = () => {
            console.log('🧹 [ADMIN SESSION GUARD] authCleanedUp');
            isLoggingOutRef.current = true;
            setTimeout(() => { isLoggingOutRef.current = false; }, 3000);
        };

        window.addEventListener('authCleanedUp', handleAuthCleanedUp);

        return () => {
            isMountedRef.current = false;
            window.removeEventListener('authCleanedUp', handleAuthCleanedUp);
        };
    }, []);

    useEffect(() => {
        const handleSessionEvent = (event) => {
            console.log('📨 [ADMIN SESSION GUARD] sessionExpired event:', event?.detail);
            handleSessionExpired(event);
        };
        window.addEventListener('sessionExpired', handleSessionEvent);
        return () => window.removeEventListener('sessionExpired', handleSessionEvent);
    }, [handleSessionExpired]);

    useEffect(() => {
        const handleSocketSessionExpired = (detail = {}) => {
            console.log('📨 [ADMIN SESSION GUARD] Socket callback:', detail);
            handleSessionExpired({ ...detail, source: 'socket', fromSocket: true });
        };
        adminSocketService.setOnSessionExpired(handleSocketSessionExpired);
        return () => adminSocketService.setOnSessionExpired(null);
    }, [handleSessionExpired]);

    useEffect(() => {
        if (!showModal) return;
        const interval = setInterval(() => {
            setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [showModal]);

    useEffect(() => {
        if (!showModal || countdown !== 0) return;
        handleModalConfirm();
    }, [countdown, showModal, handleModalConfirm]);

    useEffect(() => {
        const handleAdminLoggedIn = () => {
            console.log('🟢 [ADMIN SESSION GUARD] Admin logged in → reset');
            isProcessingRef.current = false;
            hasRedirectedRef.current = false;
            isLoggingOutRef.current = false;
            setShowModal(false);
        };
        window.addEventListener('adminLoggedIn', handleAdminLoggedIn);
        return () => window.removeEventListener('adminLoggedIn', handleAdminLoggedIn);
    }, []);

    // ============================================================
    // ✅ ĐÃ XÓA useEffect reset state khi public route
    // (User SessionGuard KHÔNG có → đồng bộ)
    // ============================================================

    const isDeviceReplacedCode =
        modalCode === 'SESSION_REPLACED' || modalCode === 'SESSION_EXPIRED';

    return (
        <>
            {children}
            <DeviceLoginModal
                show={showModal}
                type="warning"
                title={isDeviceReplacedCode
                    ? '🔐 Phát hiện đăng nhập trên thiết bị khác'
                    : '🔐 Phiên đăng nhập admin đã hết hạn'}
                message={modalMessage}
                onConfirm={handleModalConfirm}
                confirmText={countdown > 0 ? `Đăng nhập lại (${countdown}s)` : 'Đăng nhập lại'}
                className="session-expired-modal-wrapper"
            >
                {isDeviceReplacedCode && modalNewDevice && (
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
                        ⏳ Tự động chuyển đến trang đăng nhập sau <strong>{countdown}</strong> giây...
                    </div>
                )}

                {isDeviceReplacedCode && (
                    <div className="session-expired-security">
                        🛡️ Nếu đây không phải là bạn, vui lòng đổi mật khẩu ngay lập tức.
                    </div>
                )}
            </DeviceLoginModal>
        </>
    );
};

export default AdminSessionGuard;