// pages/UserLogin.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
    AlertCircle,
    Eye,
    EyeOff
} from 'lucide-react';

import api from '../../api/api';
import Modal from '../components/Modal';
import ForgotPassword from '../components/ForgotPassword';
import LoadingButton from '../components/LoadingButton';

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

    // 👉 STATE CHO MODAL BỊ CHẶN ĐĂNG NHẬP
    const [deviceConflictModal, setDeviceConflictModal] = useState({
        show: false,
        title: 'Tài khoản đang được sử dụng!',
        message: ''
    });

    const navigate = useNavigate();
    const location = useLocation();

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
        ✅ LẮNG NGHE SỰ KIỆN DEVICE_ALREADY_LOGGED_IN
    ===================================================== */
    useEffect(() => {
        const handleDeviceConflict = (event) => {
            console.log('🔴 [USER LOGIN] Nhận được sự kiện deviceAlreadyLoggedIn!');
            console.log('🔴 [USER LOGIN] Message:', event.detail?.message);
            
            // 👉 HIỂN THỊ MODAL THÔNG BÁO
            setDeviceConflictModal({
                show: true,
                title: 'Tài khoản đang được sử dụng!',
                message: event.detail?.message || 'Tài khoản của bạn đang đăng nhập trên thiết bị khác. Vui lòng đăng xuất thiết bị đó trước khi tiếp tục.'
            });
            
            // Reset trạng thái loading
            setLoading(false);
        };

        // Đăng ký lắng nghe
        window.addEventListener('deviceAlreadyLoggedIn', handleDeviceConflict);

        return () => {
            window.removeEventListener('deviceAlreadyLoggedIn', handleDeviceConflict);
        };
    }, []);

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

            const from = location.state?.from?.pathname || '/';
            window.dispatchEvent(new Event('userLoggedIn'));
            navigate(from, { replace: true });

        } catch (err) {
            console.error('Login Error:', err);
            
            // 👉 Nếu là lỗi DEVICE_ALREADY_LOGGED_IN (đã được interceptor xử lý)
            // Modal sẽ được hiển thị qua event listener
            if (err.response?.status === 409) {
                // Đã được interceptor bắt và dispatch event
                setLoading(false);
                return;
            }
            
            const errorMessage = err.response?.data?.message ||
                                 err.response?.data?.error ||
                                 'Tài khoản hoặc mật khẩu không chính xác';

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

            {/* =================================================
                MODAL THÔNG BÁO BỊ CHẶN ĐĂNG NHẬP (DEVICE CONFLICT)
            ================================================= */}
            <Modal
                show={deviceConflictModal.show}
                type="warning"
                title={deviceConflictModal.title}
                message={deviceConflictModal.message}
                onConfirm={() => {
                    setDeviceConflictModal({ show: false, title: '', message: '' });
                    // Reset form
                    setFormData({
                        email: '',
                        password: '',
                        rememberMe: false
                    });
                    setErrors({});
                    setServerError('');
                }}
                confirmText="Đã hiểu"
            />
        </div>
    );
};

export default UserLogin;