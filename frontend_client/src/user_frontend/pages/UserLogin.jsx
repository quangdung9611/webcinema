import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
    AlertCircle,
    Eye,
    EyeOff,
    CheckCircle
} from 'lucide-react';

import api from '../../api/api';
import socketService from '../../api/socket';
import { forceLogout } from '../../utils/authCleanup';

import ForgotPassword from '../components/ForgotPassword';
import LoadingButton from '../components/LoadingButton';
import SuccessModal from '../components/SuccessModal';

import '../styles/UserAuth.css';

const UserLogin = () => {

    /* =====================================================
        STATES
    ===================================================== */

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [showLoginSuccessModal, setShowLoginSuccessModal] = useState(false);
    const [loginSuccessMessage, setLoginSuccessMessage] = useState('');

    const navigate = useNavigate();
    const location = useLocation();

    // ============================================================
    // ✅ KIỂM TRA STATE TỪ VERIFY-EMAIL
    // ============================================================
    useEffect(() => {
        if (location.state?.verified) {
            setSuccessMessage(location.state.message || 'Email đã được xác thực thành công! Vui lòng đăng nhập.');
            window.history.replaceState({}, document.title);

            const timer = setTimeout(() => {
                setSuccessMessage('');
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [location.state]);

    // ============================================================
    // 🔥 XỬ LÝ SESSION EXPIRED - KHÔNG HIỂN THỊ LỖI ĐỎ
    // ============================================================
    const handleSessionExpired = (detail) => {
        console.log('🔴 [LOGIN] Session expired:', detail);
        setErrors({});
        socketService.disconnect();
    };

    // ============================================================
    // 🔥 XỬ LÝ COOKIE EXPIRED - KHÔNG HIỂN THỊ LỖI ĐỎ
    // ============================================================
    const handleCookieExpired = (event) => {
        console.log('🔴 [LOGIN] Cookie expired:', event?.detail);
        socketService.disconnect();
        localStorage.removeItem('user_info');
        localStorage.removeItem('admin_info');
        delete api.defaults.headers.common['Authorization'];
    };

    // ============================================================
    // 🔥 ĐĂNG KÝ CALLBACK CHO SOCKET
    // ============================================================
    useEffect(() => {
        socketService.setOnSessionExpired(handleSessionExpired);
        console.log('✅ [LOGIN] Đã đăng ký callback cho socket');

        return () => {
            socketService.setOnSessionExpired(null);
        };
    }, []);

    // ============================================================
    // Kiểm tra nếu bị redirect từ session expired
    // ============================================================
    useEffect(() => {
        if (location.state?.expired) {
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // ============================================================
    // CHECK SESSION
    // ============================================================
    useEffect(() => {
        const checkUserSession = async () => {
            try {
                const res = await api.get('/api/auth/me');
                const raw = res.data;
                const account = raw?.user || raw?.data?.user || raw;

                if (account) {
                    navigate('/', { replace: true });
                }
            } catch (error) {
                console.log('Chưa đăng nhập, hiển thị form login.');
            }
        };
        checkUserSession();
    }, [navigate]);

    // ============================================================
    // LẮNG NGHE SỰ KIỆN WINDOW - FALLBACK
    // ============================================================
    useEffect(() => {
        const handleWindowSessionExpired = (event) => {
            console.log('🔴 [LOGIN] Nhận sự kiện sessionExpired từ window:', event.detail);
            socketService.disconnect();
        };

        const handleTokenInvalid = (event) => {
            console.log('🔴 [LOGIN] Token invalid:', event.detail);
        };

        const handleUnauthorized = (event) => {
            console.log('🔴 [LOGIN] Unauthorized:', event.detail);
        };

        const handleCookieExpiredEvent = (event) => {
            console.log('🔴 [LOGIN] Cookie expired:', event.detail);
            socketService.disconnect();
            localStorage.removeItem('user_info');
            localStorage.removeItem('admin_info');
            delete api.defaults.headers.common['Authorization'];
        };

        window.addEventListener('sessionExpired', handleWindowSessionExpired);
        window.addEventListener('tokenInvalid', handleTokenInvalid);
        window.addEventListener('unauthorized', handleUnauthorized);
        window.addEventListener('cookieExpired', handleCookieExpiredEvent);

        console.log('✅ [LOGIN] Đã đăng ký lắng nghe sự kiện auth');

        return () => {
            window.removeEventListener('sessionExpired', handleWindowSessionExpired);
            window.removeEventListener('tokenInvalid', handleTokenInvalid);
            window.removeEventListener('unauthorized', handleUnauthorized);
            window.removeEventListener('cookieExpired', handleCookieExpiredEvent);
            console.log('🧹 [LOGIN] Đã hủy lắng nghe sự kiện auth');
        };
    }, []);

    // ============================================================
    // VALIDATE
    // ============================================================
    const validate = () => {
        const tempErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!formData.email.trim()) {
            tempErrors.email = 'Vui lòng nhập email';
        } else if (!emailRegex.test(formData.email)) {
            tempErrors.email = 'Email không hợp lệ';
        }

        if (!formData.password.trim()) {
            tempErrors.password = 'Vui lòng nhập mật khẩu';
        } else if (formData.password.length < 6) {
            tempErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    // ============================================================
    // HANDLE INPUT
    // ============================================================
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        if (serverError) {
            setServerError('');
        }
        if (successMessage) {
            setSuccessMessage('');
        }
    };

    // ============================================================
    // 🔥 LOGIN - THÊM XỬ LÝ FORCE LOGOUT KHI SESSION EXPIRED
    // ============================================================
    const handleLogin = async (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setLoading(true);
        setServerError('');
        setSuccessMessage('');

        try {
            const response = await api.post(
                '/api/auth/login',
                {
                    email: formData.email.trim(),
                    password: formData.password,
                    rememberMe: formData.rememberMe
                }
            );

            if (response.data?.user && !response.data.user.email_verified) {
                setServerError(
                    'Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn.'
                );
                setLoading(false);
                return;
            }

            const userData = response.data?.user;
            if (userData) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 500));

                    socketService.setOnSessionExpired(handleSessionExpired);
                    socketService.connect(userData.user_id);
                    console.log('✅ [LOGIN] Socket connected for user:', userData.user_id);
                } catch (socketError) {
                    console.warn('⚠️ Không thể kết nối WebSocket:', socketError);
                }
            }

            // HIỂN THỊ MODAL ĐĂNG NHẬP THÀNH CÔNG
            setLoginSuccessMessage(`Chào mừng ${userData?.full_name || userData?.username || 'bạn'} quay trở lại!`);
            setShowLoginSuccessModal(true);

        } catch (err) {
            console.error('Login Error:', err);

            const errorCode = err.response?.data?.code;
            const errorMessage = err.response?.data?.message || 'Tài khoản hoặc mật khẩu không chính xác';

            // 🔥 XỬ LÝ SESSION EXPIRED - FORCE LOGOUT
            if (errorCode === 'SESSION_EXPIRED' || errorCode === 'TOKEN_EXPIRED') {
                console.log(`🔴 [LOGIN] Nhận lỗi ${errorCode}, force logout...`);
                forceLogout(navigate, errorMessage);
                return;
            }

            if (errorCode === 'UNAUTHORIZED') {
                // Không hiển thị lỗi đỏ, chỉ log
                console.log('🔴 [LOGIN] Unauthorized - bỏ qua');
                return;
            }

            if (err.response?.data?.field === 'email') {
                setErrors(prev => ({ ...prev, email: errorMessage }));
            } else if (err.response?.data?.field === 'password') {
                setErrors(prev => ({ ...prev, password: errorMessage }));
            } else {
                setServerError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // 🔥 HANDLE SAU KHI MODAL THÀNH CÔNG ĐÓNG - VỀ TRANG CHỦ
    // ============================================================
    const handleLoginSuccessConfirm = () => {
        setShowLoginSuccessModal(false);
        window.dispatchEvent(new Event('userLoggedIn'));
        navigate('/', { replace: true });
    };

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>ĐĂNG NHẬP</h2>
                <p className="auth-subtitle">Chào mừng bạn quay trở lại Cinema Star</p>

                {successMessage && (
                    <div className="success-message" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 16px',
                        backgroundColor: '#22c55e20',
                        border: '1px solid #22c55e',
                        borderRadius: '8px',
                        color: '#22c55e',
                        marginBottom: '16px'
                    }}>
                        <CheckCircle size={20} />
                        <span>{successMessage}</span>
                    </div>
                )}

                {serverError && (
                    <div className="error-message">
                        <AlertCircle size={18} />
                        <span>{serverError}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} noValidate>
                    <div className="form-group">
                        <label>Email address</label>
                        <input
                            id="login-email"
                            type="email"
                            name="email"
                            placeholder="example@gmail.com"
                            className={`auth-input ${errors.email ? 'input-error' : ''}`}
                            value={formData.email}
                            onChange={handleChange}
                            autoComplete="email"
                            disabled={loading}
                        />
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                placeholder="••••••••"
                                className={`auth-input ${errors.password ? 'input-error' : ''}`}
                                value={formData.password}
                                onChange={handleChange}
                                autoComplete="current-password"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(prev => !prev)}
                                tabIndex="-1"
                                disabled={loading}
                            >
                                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>

                    <div className="form-options">
                        <label className="remember-me">
                            <input
                                type="checkbox"
                                name="rememberMe"
                                checked={formData.rememberMe}
                                onChange={handleChange}
                                disabled={loading}
                            />
                            Remember me
                        </label>

                        <button
                            type="button"
                            className="forgot-link"
                            onClick={() => setShowForgotModal(true)}
                            disabled={loading}
                        >
                            Forgot password?
                        </button>
                    </div>

                    <LoadingButton
                        type="submit"
                        loading={loading}
                        loadingText="Đang đăng nhập..."
                        disabled={loading}
                        className="btn-user"
                        spinnerColor="#000000"
                    >
                        SIGN IN
                    </LoadingButton>
                </form>

                <div className="auth-footer">
                    <span>Chưa có tài khoản?</span>
                    <Link to="/register" className="btn-link">Đăng ký ngay</Link>
                </div>
            </div>

            {showForgotModal && (
                <ForgotPassword onClose={() => setShowForgotModal(false)} />
            )}

            <SuccessModal
                isOpen={showLoginSuccessModal}
                onConfirm={handleLoginSuccessConfirm}
                onClose={handleLoginSuccessConfirm}
                title="🎉 Đăng nhập thành công!"
                message={loginSuccessMessage}
                confirmText="Vào trang chủ"
                autoClose={true}
                autoCloseDelay={3000}
            />
        </div>
    );
};

export default UserLogin;