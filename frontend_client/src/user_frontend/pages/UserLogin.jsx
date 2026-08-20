import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
    AlertCircle,
    Eye,
    EyeOff
} from 'lucide-react';

import api from '../../api/api';

import ForgotPassword from '../components/ForgotPassword';
import LoadingButton from '../components/LoadingButton';
import SessionExpiredModal from '../components/SessionExpiredModal'; // 👈 THÊM IMPORT

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
    const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false); // 👈 THÊM STATE

    const navigate = useNavigate();
    const location = useLocation();

    /* =====================================================
        CHECK SESSION - Nếu đã đăng nhập thì chuyển về trang chủ
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
        LẮNG NGHE SỰ KIỆN SESSION EXPIRED TỪ API INTERCEPTOR
    ===================================================== */
    useEffect(() => {
        const handleSessionExpired = (event) => {
            // Hiển thị modal thay vì setServerError
            setShowSessionExpiredModal(true);
        };

        // Lắng nghe sự kiện sessionExpired
        window.addEventListener('sessionExpired', handleSessionExpired);

        // Cleanup
        return () => {
            window.removeEventListener('sessionExpired', handleSessionExpired);
        };
    }, []);

    /* =====================================================
        HANDLE SESSION EXPIRED CONFIRM - Đăng nhập lại
    ===================================================== */
    const handleSessionExpiredConfirm = () => {
        setShowSessionExpiredModal(false);
        // Reset form
        setFormData({
            email: '',
            password: '',
            rememberMe: false
        });
        setErrors({});
        setServerError('');
        // Focus vào input email
        document.getElementById('login-email')?.focus();
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

            // Check email đã verify chưa
            if (response.data?.user && !response.data.user.email_verified) {
                setServerError(
                    'Vui lòng xác thực email trước khi đăng nhập. ' +
                    'Kiểm tra hộp thư của bạn.'
                );
                setLoading(false);
                return;
            }

            /* =================================================
                LOGIN SUCCESS
            ================================================= */
            const from = location.state?.from?.pathname || '/';
            
            // Dispatch event để UserHeader tự cập nhật
            window.dispatchEvent(new Event('userLoggedIn')); 

            navigate(from, { replace: true });

        } catch (err) {
            console.error('Login Error:', err);
            
            // ✅ KIỂM TRA LỖI SESSION_EXPIRED TỪ BACKEND
            if (err.response?.data?.code === 'SESSION_EXPIRED') {
                // Hiển thị modal thay vì setServerError
                setShowSessionExpiredModal(true);
            } else {
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
                            id="login-email" // 👈 THÊM ID CHO FOCUS
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

            {/* 👈 THÊM SESSION EXPIRED MODAL */}
            <SessionExpiredModal
                isOpen={showSessionExpiredModal}
                onConfirm={handleSessionExpiredConfirm}
            />
        </div>
    );
};

export default UserLogin;