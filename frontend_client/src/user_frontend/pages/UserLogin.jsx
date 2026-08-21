import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
    AlertCircle,
    Eye,
    EyeOff
} from 'lucide-react';

import api from '../../api/api';
import socketService from '../../api/socket';

import ForgotPassword from '../components/ForgotPassword';
import LoadingButton from '../components/LoadingButton';

import '../styles/UserAuth.css';

// ============================================================
// 🟢 SESSION EXPIRED MODAL COMPONENT
// ============================================================

const SessionExpiredModal = ({ isOpen, onConfirm, message, newDevice }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-icon">🔐</div>
                <h2>Phiên đăng nhập đã hết hạn</h2>
                <p className="message">{message || 'Tài khoản đã được đăng nhập trên thiết bị khác.'}</p>
                {newDevice && (
                    <div className="device-info">
                        <span>📱 Thiết bị mới: <strong>{typeof newDevice === 'string' ? newDevice : JSON.stringify(newDevice)}</strong></span>
                    </div>
                )}
                <p className="warning">
                    Để đảm bảo an toàn, vui lòng đăng nhập lại.
                </p>
                <button className="btn-primary" onClick={onConfirm}>
                    Đăng nhập lại
                </button>
            </div>
        </div>
    );
};

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
    const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
    const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');
    const [newDevice, setNewDevice] = useState('');

    const navigate = useNavigate();
    const location = useLocation();

    // 🔥 SỬA: Kiểm tra location.state
    useEffect(() => {
        if (location.state?.expired) {
            setSessionExpiredMessage('Tài khoản đã được đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.');
            setShowSessionExpiredModal(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    /* =====================================================
        CHECK SESSION
    ===================================================== */
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

    /* =====================================================
        LẮNG NGHE SỰ KIỆN SESSION EXPIRED
    ===================================================== */
    useEffect(() => {
        const handleSessionExpired = (event) => {
            console.log('🔴 [USER LOGIN] Nhận được sự kiện sessionExpired!');
            console.log('🔴 [USER LOGIN] Detail:', event.detail);
            
            const detail = event.detail || {};
            const message = detail.message || 'Tài khoản đã được đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.';
            const device = detail.newDevice || '';
            
            setSessionExpiredMessage(message);
            setNewDevice(device);
            setShowSessionExpiredModal(true);
            setServerError('');
            setErrors({});

            // Ngắt socket
            socketService.disconnect();
        };

        const handleTokenInvalid = (event) => {
            console.log('🔴 [USER LOGIN] Token invalid:', event.detail);
            setServerError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
        };

        const handleUnauthorized = (event) => {
            console.log('🔴 [USER LOGIN] Unauthorized:', event.detail);
        };

        window.addEventListener('sessionExpired', handleSessionExpired);
        window.addEventListener('tokenInvalid', handleTokenInvalid);
        window.addEventListener('unauthorized', handleUnauthorized);
        
        console.log('✅ [USER LOGIN] Đã đăng ký lắng nghe sự kiện auth');

        return () => {
            window.removeEventListener('sessionExpired', handleSessionExpired);
            window.removeEventListener('tokenInvalid', handleTokenInvalid);
            window.removeEventListener('unauthorized', handleUnauthorized);
            console.log('🧹 [USER LOGIN] Đã hủy lắng nghe sự kiện auth');
        };
    }, []);

    /* =====================================================
        HANDLE SESSION EXPIRED CONFIRM
    ===================================================== */
    const handleSessionExpiredConfirm = () => {
        console.log('🔴 [USER LOGIN] User xác nhận đăng nhập lại');
        setShowSessionExpiredModal(false);
        setSessionExpiredMessage('');
        setNewDevice('');
        
        setFormData({
            email: '',
            password: '',
            rememberMe: false
        });
        setErrors({});
        setServerError('');
        
        setTimeout(() => {
            document.getElementById('login-email')?.focus();
        }, 100);
    };

    /* =====================================================
        VALIDATE
    ===================================================== */
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

    /* =====================================================
        HANDLE INPUT
    ===================================================== */
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
    };

    /* =====================================================
        LOGIN
    ===================================================== */
    const handleLogin = async (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setLoading(true);
        setServerError('');

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

            // 🔥 SỬA: Kết nối socket sau khi login
            const userData = response.data?.user;
            if (userData) {
                try {
                    // Kết nối WebSocket với user_id
                    socketService.connect(userData.user_id);
                    console.log('✅ [USER LOGIN] Socket connected for user:', userData.user_id);
                } catch (socketError) {
                    console.warn('⚠️ Không thể kết nối WebSocket:', socketError);
                }
            }

            const from = location.state?.from?.pathname || '/';
            window.dispatchEvent(new Event('userLoggedIn'));
            navigate(from, { replace: true });

        } catch (err) {
            console.error('Login Error:', err);
            
            const errorCode = err.response?.data?.code;
            const errorMessage = err.response?.data?.message || 'Tài khoản hoặc mật khẩu không chính xác';

            if (errorCode === 'SESSION_EXPIRED') {
                console.log('🔴 [USER LOGIN] Nhận lỗi SESSION_EXPIRED từ login API');
                setSessionExpiredMessage(errorMessage);
                setShowSessionExpiredModal(true);
            } else if (errorCode === 'TOKEN_INVALID') {
                setServerError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
            } else if (errorCode === 'UNAUTHORIZED') {
                setServerError('Vui lòng đăng nhập để tiếp tục.');
            } else if (err.response?.data?.field === 'email') {
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

    /* =====================================================
        RENDER
    ===================================================== */
    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>ĐĂNG NHẬP</h2>
                <p className="auth-subtitle">Chào mừng bạn quay trở lại Cinema Star</p>

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

            {/* MODAL SESSION EXPIRED */}
            <SessionExpiredModal
                isOpen={showSessionExpiredModal}
                onConfirm={handleSessionExpiredConfirm}
                message={sessionExpiredMessage}
                newDevice={newDevice}
            />
        </div>
    );
};

export default UserLogin;