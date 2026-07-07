import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import ForgotPassword from '../components/ForgotPassword';

import '../styles/UserAuth.css';

// API URL từ env
const API_URL = process.env.REACT_APP_API_URL || 'https://api.quangdungcinema.id.vn';

const UserLogin = () => {
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

    const navigate = useNavigate();
    const location = useLocation();
    const { checkAuth } = useAuth();

    // ==========================================
    // VALIDATE
    // ==========================================

    const validate = () => {
        let tempErrors = {};

        // Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email.trim()) {
            tempErrors.email = 'Vui lòng nhập email';
        } else if (!emailRegex.test(formData.email)) {
            tempErrors.email = 'Email không hợp lệ';
        }

        // Password
        if (!formData.password.trim()) {
            tempErrors.password = 'Vui lòng nhập mật khẩu';
        } else if (formData.password.length < 6) {
            tempErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    // ==========================================
    // HANDLE INPUT
    // ==========================================

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });

        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
        if (serverError) {
            setServerError('');
        }
    };

    // ==========================================
    // LOGIN
    // ==========================================

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);
        setServerError('');

        try {
            const response = await axios.post(
                `${API_URL}/api/auth/login`,
                {
                    email: formData.email,
                    password: formData.password
                },
                {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Check if email is verified
            if (response.data?.user && !response.data.user.email_verified) {
                setServerError('Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn.');
                setLoading(false);
                return;
            }

            // Update auth context
            await checkAuth();
            window.dispatchEvent(new Event('authChange'));

            // Navigate to previous page or home
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });

        } catch (err) {
            console.error('Login Error:', err);

            const errorMessage = err.response?.data?.message ||
                err.response?.data?.error ||
                'Tài khoản hoặc mật khẩu không chính xác';

            // Show field-specific errors if available
            if (err.response?.data?.field === 'email') {
                setErrors({ email: errorMessage });
            } else if (err.response?.data?.field === 'password') {
                setErrors({ password: errorMessage });
            } else {
                setServerError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>ĐĂNG NHẬP</h2>
                <p className="auth-subtitle">
                    Chào mừng bạn quay trở lại Cinema Star
                </p>

                {serverError && (
                    <div className="error-message">
                        <AlertCircle size={18} />
                        <span>{serverError}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} noValidate>
                    {/* EMAIL */}
                    <div className="form-group">
                        <label>Email address</label>
                        <input
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

                    {/* PASSWORD */}
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
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>
                        {errors.password && (
                            <span className="error-text">{errors.password}</span>
                        )}
                    </div>

                    {/* OPTIONS */}
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

                    {/* SUBMIT */}
                    <button
                        type="submit"
                        className="btn-user"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="loading-spinner">⏳</span>
                        ) : (
                            'SIGN IN'
                        )}
                    </button>
                </form>

                {/* FOOTER */}
                <div className="auth-footer">
                    <span>Chưa có tài khoản?</span>
                    <Link to="/register" className="btn-link">
                        Đăng ký ngay
                    </Link>
                </div>
            </div>

            {/* FORGOT PASSWORD MODAL */}
            {showForgotModal && (
                <ForgotPassword
                    onClose={() => setShowForgotModal(false)}
                />
            )}
        </div>
    );
};

export default UserLogin;