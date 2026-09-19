// user_frontend/pages/UserLogin.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, CheckCircle, MailCheck } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';   // ✅ ĐỔI: dùng hook thay vì component
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { notifyLogin } from '../../utils/authCleanup';
import LoadingButton from '../components/LoadingButton';
import SuccessModal from '../components/SuccessModal';
import LoginLockModal from '../components/LoginLockModal';
import Modal from '../components/Modal';
import UpdatePhoneModal from '../components/UpdatePhoneModal';
import socketService from '../../api/socket';
import '../styles/UserAuth.css';

const UserLogin = () => {
    // =========================================================
    // REF
    // =========================================================
    const formRef = useRef(null);
    const lockIntervalRef = useRef(null);

    // =========================================================
    // FORM
    // =========================================================
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showLoginSuccessModal, setShowLoginSuccessModal] = useState(false);
    const [loginSuccessMessage, setLoginSuccessMessage] = useState('');
    const [loggedInUser, setLoggedInUser] = useState(null);

    // =========================================================
    // ✅ GOOGLE LOGIN STATE
    // =========================================================
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showUpdatePhone, setShowUpdatePhone] = useState(false);

    // =========================================================
    // MODAL THÔNG BÁO KIỂM TRA EMAIL
    // =========================================================
    const [showVerifyEmailModal, setShowVerifyEmailModal] = useState(false);
    const [verifyEmailData, setVerifyEmailData] = useState({
        email: '',
        full_name: ''
    });

    // =========================================================
    // LOGIN LOCK
    // =========================================================
    const [showLockModal, setShowLockModal] = useState(false);
    const [lockInfo, setLockInfo] = useState(null);
    const [lockTimeLeft, setLockTimeLeft] = useState(0);

    // =========================================================
    // ROUTER & AUTH CONTEXT
    // =========================================================
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isLoading } = useAuth();

    const isExpired = Boolean(location.state?.expired);

    const LOCK_STORAGE_KEY = 'user_login_lock';

    // =========================================================
    // ✅ GOOGLE LOGIN HOOK (KHÔNG DÙNG COMPONENT)
    // =========================================================
    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            if (googleLoading) return;

            try {
                setGoogleLoading(true);
                setServerError('');
                setSuccessMessage('');

                // ✅ Gửi access_token (từ hook) thay vì credential (từ component)
                const res = await api.post('/api/auth/google', {
                    credential: tokenResponse.access_token,     // ← token từ hook
                    isAccessToken: true,                         // ← flag để BE phân biệt
                });

                const responseUser = res.data?.user;

                if (!responseUser) {
                    setServerError('Không nhận được thông tin người dùng từ Google.');
                    return;
                }

                api.resetUserCache();
                notifyLogin(responseUser);

                setLoggedInUser(responseUser);

                if (res.data?.needPhone) {
                    setShowUpdatePhone(true);
                } else {
                    setLoginSuccessMessage(
                        `Chào mừng ${responseUser?.full_name || responseUser?.username || 'bạn'} quay trở lại!`
                    );
                    setShowLoginSuccessModal(true);
                }
            } catch (err) {
                console.error('🔴 [GOOGLE LOGIN] Error:', err);
                const errorData = err?.response?.data || {};
                const errorMessage = errorData?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.';
                setServerError(errorMessage);
            } finally {
                setGoogleLoading(false);
            }
        },
        onError: () => {
            setServerError('Không thể kết nối với Google. Vui lòng thử lại sau.');
        },
        flow: 'implicit',   // ✅ Dùng implicit flow để lấy access_token
    });

    // =========================================================
    // LƯU LOCK VÀO LOCALSTORAGE
    // =========================================================
    const saveLockToStorage = (lockData) => {
        if (lockData && lockData.lockedUntil > Date.now()) {
            const dataToStore = {
                ...lockData,
                lockedAt: Date.now()
            };
            localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(dataToStore));
            localStorage.setItem('lockedEmail', lockData.email);
        } else {
            localStorage.removeItem(LOCK_STORAGE_KEY);
            localStorage.removeItem('lockedEmail');
        }
    };

    const restoreLockFromStorage = () => {
        try {
            const stored = localStorage.getItem(LOCK_STORAGE_KEY);
            if (!stored) return null;

            const lockData = JSON.parse(stored);
            const remaining = Math.max(0, Math.ceil((lockData.lockedUntil - Date.now()) / 1000));

            if (remaining > 0) {
                return {
                    ...lockData,
                    remainingSeconds: remaining,
                    lockedUntil: lockData.lockedUntil
                };
            } else {
                localStorage.removeItem(LOCK_STORAGE_KEY);
                localStorage.removeItem('lockedEmail');
                return null;
            }
        } catch (error) {
            localStorage.removeItem(LOCK_STORAGE_KEY);
            localStorage.removeItem('lockedEmail');
            return null;
        }
    };

    useEffect(() => {
        return () => {
            if (lockIntervalRef.current) {
                clearInterval(lockIntervalRef.current);
                lockIntervalRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (formRef.current) {
            formRef.current.reset();
        }
        setFormData({
            email: '',
            password: '',
            rememberMe: false,
        });
        console.log('🔄 [LOGIN] Form đã được reset');
    }, []);

    useEffect(() => {
        if (location.state?.showVerifyEmailModal) {
            setVerifyEmailData({
                email: location.state.email || '',
                full_name: location.state.full_name || ''
            });
            setShowVerifyEmailModal(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    useEffect(() => {
        const restoredLock = restoreLockFromStorage();

        if (restoredLock) {
            setLockInfo(restoredLock);
            setShowLockModal(true);
            setLockTimeLeft(restoredLock.remainingSeconds);
            return;
        }

        const storedEmail = localStorage.getItem('lockedEmail');
        if (!storedEmail) return;

        api.get(`/api/auth/check-lock?email=${encodeURIComponent(storedEmail)}`)
            .then((res) => {
                const serverData = res.data?.data || null;

                if (serverData?.isLocked) {
                    const remainingSeconds = Math.max(0, Number(serverData.remainingSeconds) || 0);
                    const lockUntilTimestamp = Date.now() + remainingSeconds * 1000;

                    const updatedLockInfo = {
                        email: storedEmail,
                        message: serverData.message,
                        level: Number(serverData.level) || 1,
                        remainingSeconds: remainingSeconds,
                        lockDuration: Number(serverData.lockDuration) || remainingSeconds,
                        lockDurationText: serverData.lockDurationText || '1 phút',
                        maxAttempts: serverData.maxAttempts || 5,
                        lockedUntil: lockUntilTimestamp,
                        lockedAt: Date.now()
                    };

                    setLockInfo(updatedLockInfo);
                    setShowLockModal(true);
                    setLockTimeLeft(remainingSeconds);
                    saveLockToStorage(updatedLockInfo);
                } else {
                    localStorage.removeItem('lockedEmail');
                    localStorage.removeItem(LOCK_STORAGE_KEY);
                }
            })
            .catch((error) => {
                console.error('Không thể kiểm tra lock từ server:', error);
            });
    }, []);

    useEffect(() => {
        if (lockIntervalRef.current) {
            clearInterval(lockIntervalRef.current);
            lockIntervalRef.current = null;
        }

        if (!lockInfo?.lockedUntil) return;
        if (lockInfo.lockedUntil <= Date.now()) {
            setLockInfo(null);
            setShowLockModal(false);
            setLockTimeLeft(0);
            localStorage.removeItem(LOCK_STORAGE_KEY);
            localStorage.removeItem('lockedEmail');
            return;
        }

        const updateLockTime = () => {
            const left = Math.max(0, Math.ceil((lockInfo.lockedUntil - Date.now()) / 1000));
            setLockTimeLeft(left);

            if (left <= 0) {
                clearInterval(lockIntervalRef.current);
                lockIntervalRef.current = null;
                setLockInfo(null);
                setShowLockModal(false);
                setLockTimeLeft(0);
                localStorage.removeItem(LOCK_STORAGE_KEY);
                localStorage.removeItem('lockedEmail');
                setSuccessMessage('✅ Tài khoản đã được mở khóa. Vui lòng thử đăng nhập lại.');
                setTimeout(() => setSuccessMessage(''), 5000);
            } else {
                if (left % 5 === 0 || left <= 10) {
                    const updatedLockInfo = {
                        ...lockInfo,
                        remainingSeconds: left,
                        lockedAt: Date.now()
                    };
                    saveLockToStorage(updatedLockInfo);
                }
            }
        };

        updateLockTime();
        lockIntervalRef.current = setInterval(updateLockTime, 1000);

        return () => {
            if (lockIntervalRef.current) {
                clearInterval(lockIntervalRef.current);
                lockIntervalRef.current = null;
            }
        };
    }, [lockInfo?.lockedUntil]);

    useEffect(() => {
        if (location.state?.verified) {
            if (showVerifyEmailModal) {
                setShowVerifyEmailModal(false);
            }

            setSuccessMessage(location.state.message || '✅ Xác thực email thành công! Vui lòng đăng nhập.');
            window.history.replaceState({}, document.title);
            const timer = setTimeout(() => setSuccessMessage(''), 5000);
            return () => clearTimeout(timer);
        }

        const verifiedSession = sessionStorage.getItem('email_verified_success');
        if (verifiedSession === 'true') {
            if (showVerifyEmailModal) {
                setShowVerifyEmailModal(false);
            }
            setSuccessMessage('✅ Xác thực email thành công! Vui lòng đăng nhập.');
            sessionStorage.removeItem('email_verified_success');
            const timer = setTimeout(() => setSuccessMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [location.state, showVerifyEmailModal]);

    useEffect(() => {
        if (!location.state?.expired) return;
        const message =
            location.state?.message ||
            'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        setServerError(message);
        window.history.replaceState({}, document.title);
    }, [location.state]);

    useEffect(() => {
        if (
            user &&
            !isLoading &&
            !showLoginSuccessModal &&
            !showUpdatePhone &&
            !isExpired &&
            user.email_verified === 1
        ) {
            navigate('/', { replace: true });
        }
    }, [user, isLoading, showLoginSuccessModal, showUpdatePhone, navigate, isExpired]);

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
        return Object.keys(tempErrors).length === 0;
    };

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
        if (serverError) setServerError('');
        if (successMessage) setSuccessMessage('');

        if (name === 'email') {
            const storedEmail = localStorage.getItem('lockedEmail');
            if (storedEmail && storedEmail !== value) {
                localStorage.removeItem('lockedEmail');
                localStorage.removeItem(LOCK_STORAGE_KEY);
                setLockInfo(null);
                setShowLockModal(false);
                setLockTimeLeft(0);
                if (lockIntervalRef.current) {
                    clearInterval(lockIntervalRef.current);
                    lockIntervalRef.current = null;
                }
            }
        }
    };

    const handleLogin = async (event) => {
        event.preventDefault();

        if (loading) {
            console.log('⚠️ [LOGIN] Already loading — skip');
            return;
        }

        if (lockInfo && lockInfo.lockedUntil > Date.now()) {
            setShowLockModal(true);
            return;
        }

        if (!validate()) return;

        setLoading(true);
        setServerError('');
        setSuccessMessage('');
        setErrors({});

        try {
            const response = await api.post('/api/auth/login', {
                email: formData.email.trim(),
                password: formData.password,
                rememberMe: formData.rememberMe,
            });

            const responseUser = response?.data?.user || response?.data?.data?.user || null;

            if (responseUser && !responseUser.email_verified) {
                setServerError('Vui lòng xác thực email trước khi đăng nhập. Kiểm tra hộp thư của bạn.');
                return;
            }

            api.resetUserCache();
            notifyLogin(responseUser);

            setLoggedInUser(responseUser);
            setLoginSuccessMessage(`Chào mừng ${responseUser?.full_name || responseUser?.username || 'bạn'} quay trở lại!`);
            setShowLoginSuccessModal(true);

        } catch (error) {
            console.error('🔴 [LOGIN] Login error:', error);

            const errorData = error?.response?.data || {};
            const errorCode = errorData?.code;
            const errorMessage = errorData?.message || 'Tài khoản hoặc mật khẩu không chính xác';

            if (error?.response?.status === 429 || errorCode === 'ACCOUNT_LOCKED') {
                const lockData = errorData?.data || {};
                const level = Number(lockData.level) || 1;
                const remainingSeconds = Math.max(0, Number(lockData.remainingSeconds) || 60);
                const lockUntilTimestamp = Date.now() + remainingSeconds * 1000;
                const durationText = lockData.lockDurationText || (level >= 2 ? '3 phút' : '1 phút');

                const lockInfoData = {
                    email: formData.email.trim(),
                    message: errorMessage,
                    level: level,
                    remainingSeconds: remainingSeconds,
                    lockDuration: remainingSeconds,
                    lockDurationText: durationText,
                    maxAttempts: lockData.maxAttempts || 5,
                    lockedUntil: lockUntilTimestamp,
                    lockedAt: Date.now()
                };

                setLockInfo(lockInfoData);
                setShowLockModal(true);
                setLockTimeLeft(remainingSeconds);
                saveLockToStorage(lockInfoData);
                return;
            }

            if (errorData?.field === 'email') {
                setErrors((prev) => ({ ...prev, email: errorMessage }));
                return;
            }

            if (errorData?.field === 'password') {
                setErrors((prev) => ({ ...prev, password: errorMessage }));
                return;
            }

            if (errorCode === 'SESSION_EXPIRED') {
                setServerError(errorMessage || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
                return;
            }

            if (errorCode === 'SESSION_REPLACED') {
                setServerError(errorMessage || 'Tài khoản đã được đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.');
                return;
            }

            if (errorCode === 'TOKEN_INVALID') {
                setServerError(errorMessage || 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
                socketService.disconnect();
                return;
            }

            if (errorCode === 'UNAUTHORIZED') {
                setServerError(errorMessage || 'Vui lòng đăng nhập để tiếp tục.');
                socketService.disconnect();
                return;
            }

            if (errorCode === 'EMAIL_NOT_VERIFIED') {
                setServerError(errorMessage || 'Vui lòng xác thực email trước khi đăng nhập.');
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
        navigate('/', { replace: true });
    };

    const handleUpdatePhoneSuccess = () => {
        setShowUpdatePhone(false);
        setLoginSuccessMessage(
            `Chào mừng ${loggedInUser?.full_name || loggedInUser?.username || 'bạn'} quay trở lại!`
        );
        setShowLoginSuccessModal(true);
    };

    const handleUpdatePhoneClose = () => {
        setShowUpdatePhone(false);
        navigate('/', { replace: true });
    };

    const handleCloseLockModal = () => setShowLockModal(false);
    const handleVerifyEmailModalClose = () => setShowVerifyEmailModal(false);

    const formatLockTime = (totalSeconds) => {
        if (totalSeconds <= 0) return '0:00';
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const isLockedActive = lockInfo && lockInfo.lockedUntil > Date.now();

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>ĐĂNG NHẬP</h2>
                <p className="auth-subtitle">Chào mừng bạn quay trở lại Cinema Star</p>

                {successMessage && (
                    <div className="success-message">
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

                <form ref={formRef} onSubmit={handleLogin} noValidate autoComplete="off">
                    <input type="text" style={{ display: 'none' }} />
                    <input type="password" style={{ display: 'none' }} />

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
                            autoComplete="off"
                            disabled={loading || isLockedActive || googleLoading}
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
                                autoComplete="new-password"
                                disabled={loading || isLockedActive || googleLoading}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword((prev) => !prev)}
                                tabIndex="-1"
                                disabled={loading || isLockedActive || googleLoading}
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
                                disabled={loading || isLockedActive || googleLoading}
                            />
                            Remember me
                        </label>

                        <button
                            type="button"
                            className="forgot-link"
                            onClick={() => navigate('/forgot-password')}
                            disabled={loading || isLockedActive || googleLoading}
                        >
                            Forgot password?
                        </button>
                    </div>

                    <LoadingButton
                        type="submit"
                        loading={loading}
                        loadingText="Đang đăng nhập..."
                        disabled={loading || isLockedActive || googleLoading}
                        className="btn-user btn-user-silver"
                        spinnerColor="#000000"
                    >
                        {isLockedActive ? (
                            `ĐANG BỊ KHÓA (${formatLockTime(lockTimeLeft)})`
                        ) : (
                            'SIGN IN'
                        )}
                    </LoadingButton>
                </form>

                {/* ============================================
                    ✅ GOOGLE LOGIN - CUSTOM BUTTON
                ============================================ */}
                <div className="google-login-wrapper">
                    <div className="divider">
                        <span>Hoặc</span>
                    </div>

                    <button
                        type="button"
                        className="google-custom-btn"
                        onClick={() => googleLogin()}
                        disabled={loading || isLockedActive || googleLoading}
                    >
                        <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>{googleLoading ? 'Đang đăng nhập...' : 'Đăng nhập bằng Google'}</span>
                    </button>
                </div>

                <div className="auth-footer">
                    <span>Chưa có tài khoản?</span>
                    <Link to="/register" className="btn-link">Đăng ký ngay</Link>
                </div>
            </div>

            {/* MODAL: Thông báo kiểm tra email */}
            <Modal
                show={showVerifyEmailModal}
                type="success"
                title="📧 Xác thực email"
                confirmText="Đã hiểu"
                onConfirm={handleVerifyEmailModalClose}
                onCancel={handleVerifyEmailModalClose}
            >
                <div className="verify-email-content">
                    <div className="verify-email-icon">
                        <MailCheck size={40} color="#4ade80" />
                    </div>
                    <p className="verify-email-text">
                        Chào mừng <strong>{verifyEmailData.full_name || "bạn"}</strong> đến với Cinema Star!
                    </p>
                    <p className="verify-email-text">
                        Vui lòng kiểm tra hộp thư <strong className="text-highlight">{verifyEmailData.email}</strong> và bấm vào
                        link xác thực để hoàn tất đăng ký.
                    </p>
                    <div className="verify-email-hint">
                        <p>💡 Sau khi xác thực, quay lại đây để đăng nhập</p>
                    </div>
                </div>
            </Modal>

            {/* MODAL: Đăng nhập thành công */}
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

            {/* MODAL: Tài khoản bị khóa */}
            <LoginLockModal
                show={showLockModal}
                message={lockInfo?.message || 'Tài khoản đã bị khóa'}
                lockedUntil={lockInfo?.lockedUntil || Date.now() + 60000}
                lockLevel={lockInfo?.level || 1}
                lockDurationText={lockInfo?.lockDurationText || '1 phút'}
                email={lockInfo?.email || formData.email}
                onClose={handleCloseLockModal}
            />

            {/* ✅ MODAL: Bổ sung SĐT sau Google Login */}
            <UpdatePhoneModal
                show={showUpdatePhone}
                onSuccess={handleUpdatePhoneSuccess}
                onClose={handleUpdatePhoneClose}
            />
        </div>
    );
};

export default UserLogin;