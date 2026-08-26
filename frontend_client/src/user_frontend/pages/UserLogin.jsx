import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

import {
    AlertCircle,
    Eye,
    EyeOff,
    CheckCircle,
} from 'lucide-react';

import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { notifyLogin } from '../../utils/authCleanup';

import ForgotPassword from '../components/ForgotPassword';
import LoadingButton from '../components/LoadingButton';
import SuccessModal from '../components/SuccessModal';
import LoginLockModal from '../components/LoginLockModal'; // 🔥 IMPORT MODAL MỚI

import '../styles/UserAuth.css';

const UserLogin = () => {

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showLoginSuccessModal, setShowLoginSuccessModal] = useState(false);
    const [loginSuccessMessage, setLoginSuccessMessage] = useState('');
    const [loggedInUser, setLoggedInUser] = useState(null);

    // 🔥 STATE CHO MODAL BỊ KHÓA
    const [showLockModal, setShowLockModal] = useState(false);
    const [lockMessage, setLockMessage] = useState('');
    const [lockedUntil, setLockedUntil] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();

    const {
        user,
        isLoading,
    } = useAuth();

    const isExpired = Boolean(location.state?.expired);

    useEffect(() => {
        if (!location.state?.verified) {
            return;
        }

        setSuccessMessage(
            location.state.message ||
            'Email đã được xác thực thành công! Vui lòng đăng nhập.'
        );

        window.history.replaceState({}, document.title);

        const timer = setTimeout(() => {
            setSuccessMessage('');
        }, 5000);

        return () => {
            clearTimeout(timer);
        };
    }, [location.state]);

    useEffect(() => {
        if (
            user &&
            !isLoading &&
            !showLoginSuccessModal &&
            !isExpired
        ) {
            navigate('/', {
                replace: true,
            });
        }
    }, [user, isLoading, showLoginSuccessModal, navigate, isExpired]);

    const validate = () => {
        const tempErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!formData.email.trim()) {
            tempErrors.email = 'Vui lòng nhập email';
        } else if (!emailRegex.test(formData.email.trim())) {
            tempErrors.email = 'Email không hợp lệ';
        }

        if (!formData.password.trim()) {
            tempErrors.password = 'Vui lòng nhập mật khẩu';
        } else if (formData.password.length < 6) {
            tempErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
        }

        setErrors(tempErrors);

        return (
            Object.keys(tempErrors).length === 0
        );
    };

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]:
                type === 'checkbox'
                    ? checked
                    : value,
        }));

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: '',
            }));
        }

        if (serverError) {
            setServerError('');
        }

        if (successMessage) {
            setSuccessMessage('');
        }
    };

    const handleLogin = async (event) => {
        event.preventDefault();

        if (!validate()) {
            return;
        }

        setLoading(true);
        setServerError('');
        setSuccessMessage('');
        setErrors({});

        try {
            const response = await api.post(
                '/api/auth/login',
                {
                    email: formData.email.trim(),
                    password: formData.password,
                    rememberMe: formData.rememberMe,
                }
            );

            const responseUser =
                response?.data?.user ||
                response?.data?.data?.user ||
                null;

            if (
                responseUser &&
                !responseUser.email_verified
            ) {
                setServerError(
                    'Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn.'
                );
                return;
            }

            api.resetUserCache();

            notifyLogin(responseUser);

            setLoggedInUser(responseUser);

            setLoginSuccessMessage(
                `Chào mừng ${responseUser?.full_name || responseUser?.username || 'bạn'} quay trở lại!`
            );

            setShowLoginSuccessModal(true);

        } catch (error) {
            console.error('🔴 [LOGIN] Login error:', error);

            const errorData = error?.response?.data || {};
            const errorCode = errorData?.code;
            const errorMessage = errorData?.message || 'Tài khoản hoặc mật khẩu không chính xác';

            // 🔥 XỬ LÝ LỖI 429 (BỊ KHÓA TÀI KHOẢN) - HIỂN THỊ MODAL
            if (error?.response?.status === 429) {
                setLockMessage(errorMessage);
                const retryAfter = error?.response?.data?.retryAfter || 300; // Mặc định 5 phút
                setLockedUntil(Date.now() + retryAfter * 1000);
                setShowLockModal(true);
                return;
            }

            if (errorData?.field === 'email') {
                setErrors((prev) => ({
                    ...prev,
                    email: errorMessage,
                }));
                return;
            }

            if (errorData?.field === 'password') {
                setErrors((prev) => ({
                    ...prev,
                    password: errorMessage,
                }));
                return;
            }

            if (errorCode === 'EMAIL_NOT_VERIFIED') {
                setServerError(
                    errorMessage ||
                    'Vui lòng xác thực email trước khi đăng nhập.'
                );
                return;
            }

            setServerError(errorMessage);

        } finally {
            setLoading(false);
        }
    };

    const handleLoginSuccessConfirm = () => {
        setShowLoginSuccessModal(false);
        setLoggedInUser(null);

        navigate('/', {
            replace: true,
        });
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>ĐĂNG NHẬP</h2>
                <p className="auth-subtitle">Chào mừng bạn quay trở lại Cinema Star</p>

                {successMessage && (
                    <div
                        className="success-message"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 16px',
                            backgroundColor: '#22c55e20',
                            border: '1px solid #22c55e',
                            borderRadius: '8px',
                            color: '#22c55e',
                            marginBottom: '16px',
                        }}
                    >
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
                        {errors.email && (
                            <span className="error-text">{errors.email}</span>
                        )}
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
                                onClick={() => setShowPassword((prev) => !prev)}
                                tabIndex="-1"
                                disabled={loading}
                            >
                                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>
                        {errors.password && (
                            <span className="error-text">{errors.password}</span>
                        )}
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

            {/* 🔥 HIỂN THỊ MODAL BỊ KHÓA */}
            <LoginLockModal
                show={showLockModal}
                message={lockMessage}
                lockedUntil={lockedUntil}
                onClose={() => setShowLockModal(false)}
            />
        </div>
    );
};

export default UserLogin;