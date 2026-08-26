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
import LoginLockModal from '../components/LoginLockModal';

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

    // 🔥 STATE CHO MODAL BỊ KHÓA - LƯU THÔNG TIN CHI TIẾT
    const [showLockModal, setShowLockModal] = useState(false);
    const [lockInfo, setLockInfo] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();

    const {
        user,
        isLoading,
    } = useAuth();

    const isExpired = Boolean(location.state?.expired);

    // 🔥 KIỂM TRA LOCK KHI COMPONENT MOUNT
    useEffect(() => {
        // Kiểm tra sessionStorage cho email hiện tại
        const storedEmail = sessionStorage.getItem('lockedEmail');
        const storedLockInfo = sessionStorage.getItem('lockInfo');
        
        if (storedEmail && storedLockInfo) {
            try {
                const parsed = JSON.parse(storedLockInfo);
                // Kiểm tra xem lock còn hiệu lực không và đúng email
                if (parsed.lockedUntil > Date.now() && parsed.email === formData.email) {
                    setLockInfo(parsed);
                    setShowLockModal(true);
                } else {
                    // Hết lock hoặc sai email, xóa sessionStorage
                    sessionStorage.removeItem('lockedEmail');
                    sessionStorage.removeItem('lockInfo');
                }
            } catch (error) {
                console.error('Error parsing lock info:', error);
                sessionStorage.removeItem('lockedEmail');
                sessionStorage.removeItem('lockInfo');
            }
        }
    }, [formData.email]);

    // 🔥 KHI LOCK HẾT HẠN, TỰ ĐỘNG ĐÓNG MODAL
    useEffect(() => {
        if (!lockInfo) return;
        
        if (lockInfo.lockedUntil <= Date.now()) {
            // Xóa sessionStorage
            sessionStorage.removeItem('lockedEmail');
            sessionStorage.removeItem('lockInfo');
            setLockInfo(null);
            setShowLockModal(false);
            // Thông báo cho user biết đã hết lock
            setSuccessMessage('✅ Tài khoản đã được mở khóa. Vui lòng thử đăng nhập lại.');
            
            // Tự động xóa thông báo sau 5s
            const timer = setTimeout(() => {
                setSuccessMessage('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [lockInfo]);

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

        // Khi user thay đổi email, xóa lock info cũ
        if (name === 'email') {
            const storedEmail = sessionStorage.getItem('lockedEmail');
            if (storedEmail && storedEmail !== value) {
                sessionStorage.removeItem('lockedEmail');
                sessionStorage.removeItem('lockInfo');
                setLockInfo(null);
                setShowLockModal(false);
            }
        }
    };

    const handleLogin = async (event) => {
        event.preventDefault();

        // 🔥 KIỂM TRA NẾU ĐANG BỊ LOCK TRƯỚC KHI GỬI REQUEST
        if (lockInfo && lockInfo.lockedUntil > Date.now()) {
            setShowLockModal(true);
            setServerError(`Tài khoản đang bị khóa. Vui lòng đợi ${Math.ceil((lockInfo.lockedUntil - Date.now()) / 1000)} giây.`);
            return;
        }

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

            // 🔥 XỬ LÝ LỖI 429 - ACCOUNT_LOCKED
            if (error?.response?.status === 429 && errorCode === 'ACCOUNT_LOCKED') {
                const lockData = errorData?.data || {};
                
                // Lưu thông tin lock vào state và sessionStorage
                const lockInfoData = {
                    email: formData.email.trim(),
                    message: errorMessage,
                    level: lockData.level || 1,
                    remainingSeconds: lockData.remainingSeconds || 60,
                    lockDuration: lockData.lockDuration || 60,
                    lockDurationText: lockData.lockDurationText || '1 phút',
                    maxAttempts: lockData.maxAttempts || 5,
                    lockedUntil: Date.now() + (lockData.remainingSeconds || 60) * 1000
                };
                
                setLockInfo(lockInfoData);
                setShowLockModal(true);
                
                // Lưu vào sessionStorage để khi reload vẫn giữ
                sessionStorage.setItem('lockedEmail', formData.email.trim());
                sessionStorage.setItem('lockInfo', JSON.stringify(lockInfoData));
                
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

    // 🔥 XỬ LÝ ĐÓNG MODAL LOCK - GIỮ NGUYÊN THÔNG TIN TRONG SESSION
    const handleCloseLockModal = () => {
        // Nếu lock vẫn còn hiệu lực, giữ nguyên trong sessionStorage
        if (lockInfo && lockInfo.lockedUntil > Date.now()) {
            // Không xóa sessionStorage, chỉ đóng modal
            setShowLockModal(false);
        } else {
            // Nếu hết hạn, xóa sessionStorage
            sessionStorage.removeItem('lockedEmail');
            sessionStorage.removeItem('lockInfo');
            setLockInfo(null);
            setShowLockModal(false);
        }
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
                            disabled={loading || (lockInfo && lockInfo.lockedUntil > Date.now())}
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
                                disabled={loading || (lockInfo && lockInfo.lockedUntil > Date.now())}
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
                        disabled={loading || (lockInfo && lockInfo.lockedUntil > Date.now())}
                        className="btn-user"
                        spinnerColor="#000000"
                    >
                        {lockInfo && lockInfo.lockedUntil > Date.now() ? 'ĐANG BỊ KHÓA' : 'SIGN IN'}
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

            {/* 🔥 MODAL LOCK VỚI THÔNG TIN CHI TIẾT */}
            <LoginLockModal
                show={showLockModal}
                message={lockInfo?.message || 'Tài khoản đã bị khóa'}
                lockedUntil={lockInfo?.lockedUntil || Date.now() + 60000}
                lockLevel={lockInfo?.level || 1}
                lockDurationText={lockInfo?.lockDurationText || '1 phút'}
                email={lockInfo?.email || formData.email}
                onClose={handleCloseLockModal}
            />
        </div>
    );
};

export default UserLogin;