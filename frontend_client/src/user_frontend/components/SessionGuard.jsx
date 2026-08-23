import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/api';
import socketService from '../../api/socket';
import '../styles/SessionGuard.css';

const SessionGuard = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isProcessingRef = useRef(false);
    const tokenCheckIntervalRef = useRef(null);
    const isMountedRef = useRef(true);

    // ============================================================
    // XỬ LÝ SESSION EXPIRED - HIỂN THỊ MODAL
    // ============================================================
    const showSessionExpiredModal = (detail = {}) => {
        console.log('🛡️ [SESSION GUARD] Show session expired modal:', detail);
        
        localStorage.removeItem('user_info');
        localStorage.removeItem('admin_info');
        delete api.defaults.headers.common['Authorization'];
        
        try {
            document.cookie.split(";").forEach((c) => {
                document.cookie = c
                    .replace(/^ +/, "")
                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
        } catch (error) {
            console.warn('Không thể xóa cookie:', error);
        }
        
        socketService.disconnect();
        
        window.dispatchEvent(new CustomEvent('showSessionExpiredModal', {
            detail: {
                message: detail?.message || 'Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.',
                type: detail?.type || 'token',
                newDevice: detail?.newDevice || null,
                timestamp: new Date().toISOString()
            }
        }));
    };

    // ============================================================
    // XỬ LÝ SESSION EXPIRED - HÀM TRUNG TÂM
    // ============================================================
    const handleSessionExpired = (event) => {
        if (isProcessingRef.current) {
            console.log('🛡️ [SESSION GUARD] Đang xử lý, bỏ qua event');
            return;
        }

        const detail = event?.detail || event || {};
        console.log('🛡️ [SESSION GUARD] Session expired detected:', detail);

        isProcessingRef.current = true;

        if (location.pathname === '/login') {
            console.log('🛡️ [SESSION GUARD] Đã ở trang login, hiển thị modal trực tiếp');
            showSessionExpiredModal(detail);
            
            setTimeout(() => {
                if (isMountedRef.current) {
                    isProcessingRef.current = false;
                }
            }, 500);
            return;
        }

        console.log('🛡️ [SESSION GUARD] Navigate to login with state');
        
        window.dispatchEvent(new CustomEvent('userSessionExpired', {
            detail: {
                message: detail?.message || 'Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.',
                type: detail?.type || 'token',
                newDevice: detail?.newDevice || null
            }
        }));

        navigate('/login', {
            replace: true,
            state: {
                sessionExpired: true,
                message: detail?.message || 'Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.',
                type: detail?.type || 'token',
                newDevice: detail?.newDevice || null,
                showModal: true
            }
        });

        setTimeout(() => {
            if (isMountedRef.current) {
                isProcessingRef.current = false;
            }
        }, 500);
    };

    // ============================================================
    // KIỂM TRA TOKEN ĐỊNH KỲ
    // ============================================================
    const checkTokenPeriodically = async () => {
        if (!isMountedRef.current || isProcessingRef.current) return;
        
        try {
            const userInfo = localStorage.getItem('user_info');
            if (!userInfo) {
                console.log('🛡️ [SESSION GUARD] Không có token, bỏ qua kiểm tra');
                return;
            }

            const response = await api.get('/api/auth/me', {
                timeout: 5000
            });

            if (!response.data?.user && !response.data?.data?.user) {
                console.log('🛡️ [SESSION GUARD] Token không hợp lệ');
                handleSessionExpired({
                    message: 'Phiên đăng nhập không hợp lệ',
                    type: 'token'
                });
            }
        } catch (error) {
            console.log('🛡️ [SESSION GUARD] Kiểm tra token thất bại:', error.message);

            if (error.response?.status === 401) {
                const errorCode = error.response?.data?.code;
                if (errorCode === 'TOKEN_INVALID' || errorCode === 'SESSION_EXPIRED' || 
                    errorCode === 'TOKEN_EXPIRED' || !errorCode) {
                    console.log('🛡️ [SESSION GUARD] Token hết hạn');
                    handleSessionExpired({
                        message: error.response?.data?.message || 'Phiên đăng nhập đã hết hạn',
                        type: errorCode === 'SESSION_EXPIRED' ? 'device' : 'token',
                        newDevice: error.response?.data?.newDevice || null
                    });
                }
            }
        }
    };

    // ============================================================
    // ĐĂNG KÝ LẮNG NGHE SỰ KIỆN
    // ============================================================
    useEffect(() => {
        console.log('🛡️ [SESSION GUARD] Mount - Đăng ký lắng nghe sự kiện');
        isMountedRef.current = true;

        window.addEventListener('sessionExpired', handleSessionExpired);
        window.addEventListener('userSessionExpired', handleSessionExpired);
        window.addEventListener('tokenInvalid', handleSessionExpired);
        window.addEventListener('unauthorized', handleSessionExpired);
        window.addEventListener('cookieExpired', handleSessionExpired);

        socketService.setOnSessionExpired((detail) => {
            console.log('🛡️ [SESSION GUARD] Socket callback:', detail);
            handleSessionExpired({ detail });
        });

        setTimeout(() => {
            if (isMountedRef.current) {
                checkTokenPeriodically();
            }
        }, 1000);

        tokenCheckIntervalRef.current = setInterval(() => {
            if (isMountedRef.current) {
                checkTokenPeriodically();
            }
        }, 30000);

        return () => {
            console.log('🛡️ [SESSION GUARD] Unmount - Hủy lắng nghe');
            isMountedRef.current = false;
            window.removeEventListener('sessionExpired', handleSessionExpired);
            window.removeEventListener('userSessionExpired', handleSessionExpired);
            window.removeEventListener('tokenInvalid', handleSessionExpired);
            window.removeEventListener('unauthorized', handleSessionExpired);
            window.removeEventListener('cookieExpired', handleSessionExpired);

            if (socketService.setOnSessionExpired) {
                socketService.setOnSessionExpired(null);
            }

            if (tokenCheckIntervalRef.current) {
                clearInterval(tokenCheckIntervalRef.current);
                tokenCheckIntervalRef.current = null;
            }
        };
    }, []);

    // ============================================================
    // KIỂM TRA KHI TAB ĐƯỢC FOCUS
    // ============================================================
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isMountedRef.current && !isProcessingRef.current) {
                console.log('🔄 [SESSION GUARD] Tab được focus, kiểm tra token...');
                checkTokenPeriodically();
            }
        };

        const handleFocus = () => {
            if (isMountedRef.current && !isProcessingRef.current) {
                console.log('🔄 [SESSION GUARD] Window được focus, kiểm tra token...');
                checkTokenPeriodically();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    return children;
};

export default SessionGuard;