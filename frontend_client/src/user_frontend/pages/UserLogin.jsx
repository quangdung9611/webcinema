// user_frontend/pages/UserLogin.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
    AlertCircle,
    Eye,
    EyeOff,
    CheckCircle,
    MailCheck,
    Sparkles,
    Film,
    ArrowRight,
    Ticket,
    Zap,
    Star,
    Mail,
    LockKeyhole,
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { notifyLogin } from '../../utils/authCleanup';
import LoadingButton from '../components/LoadingButton';
import SuccessModal from '../components/SuccessModal';
import LoginLockModal from '../components/LoginLockModal';
import Modal from '../components/Modal';
import UpdatePhoneModal from '../components/UpdatePhoneModal';
import socketService from '../../api/socket';
import '../styles/UserLogin.css';

const UserLogin = () => {
    const formRef = useRef(null);
    const lockIntervalRef = useRef(null);

    const [loginEffect, setLoginEffect] = useState('idle');
    const effectTimerRef = useRef(null);

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

    const [googleLoading, setGoogleLoading] = useState(false);
    const [showUpdatePhone, setShowUpdatePhone] = useState(false);

    const [showVerifyEmailModal, setShowVerifyEmailModal] = useState(false);
    const [verifyEmailData, setVerifyEmailData] = useState({
        email: '',
        full_name: ''
    });

    const [showLockModal, setShowLockModal] = useState(false);
    const [lockInfo, setLockInfo] = useState(null);
    const [lockTimeLeft, setLockTimeLeft] = useState(0);

    const navigate = useNavigate();
    const location = useLocation();
    const { user, isLoading } = useAuth();

    const isExpired = Boolean(location.state?.expired);
    const LOCK_STORAGE_KEY = 'user_login_lock';

    const triggerEffect = (effectName, duration = 900) => {
        if (effectTimerRef.current) clearTimeout(effectTimerRef.current);
        setLoginEffect(effectName);
        effectTimerRef.current = setTimeout(() => {
            setLoginEffect('idle');
            effectTimerRef.current = null;
        }, duration);
    };

    // =========================================================
    // GOOGLE LOGIN
    // =========================================================
    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            if (googleLoading) return;
            try {
                setGoogleLoading(true);
                setServerError('');
                setSuccessMessage('');
                setLoginEffect('loading');

                const res = await api.post('/api/auth/google', {
                    credential: tokenResponse.access_token,
                    isAccessToken: true,
                });

                const responseUser = res.data?.user;
                if (!responseUser) {
                    setServerError('Không nhận được thông tin người dùng từ Google.');
                    triggerEffect('error', 900);
                    return;
                }

                api.resetUserCache();
                notifyLogin(responseUser);
                setLoggedInUser(responseUser);

                if (res.data?.needPhone) {
                    setShowUpdatePhone(true);
                    setLoginEffect('idle');
                } else {
                    setLoginSuccessMessage(
                        `Chào mừng ${responseUser?.full_name || responseUser?.username || 'bạn'} quay trở lại!`
                    );
                    setLoginEffect('success');
                    if (effectTimerRef.current) clearTimeout(effectTimerRef.current);
                    effectTimerRef.current = setTimeout(() => {
                        setShowLoginSuccessModal(true);
                        setLoginEffect('idle');
                        effectTimerRef.current = null;
                    }, 1400);
                }
            } catch (err) {
                console.error('🔴 [GOOGLE LOGIN] Error:', err);
                const errorData = err?.response?.data || {};
                setServerError(errorData?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
                triggerEffect('error', 900);
            } finally {
                setGoogleLoading(false);
            }
        },
        onError: () => {
            setServerError('Không thể kết nối với Google. Vui lòng thử lại sau.');
            triggerEffect('error', 900);
        },
        flow: 'implicit',
    });

    const saveLockToStorage = (lockData) => {
        if (lockData && lockData.lockedUntil > Date.now()) {
            const dataToStore = { ...lockData, lockedAt: Date.now() };
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
                return { ...lockData, remainingSeconds: remaining };
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
            if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
            if (effectTimerRef.current) clearTimeout(effectTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (formRef.current) formRef.current.reset();
        setFormData({ email: '', password: '', rememberMe: false });
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
                        remainingSeconds,
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
            .catch((error) => console.error('Không thể kiểm tra lock từ server:', error));
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
                setSuccessMessage('Tài khoản đã được mở khóa. Vui lòng thử đăng nhập lại.');
                setTimeout(() => setSuccessMessage(''), 5000);
            } else {
                if (left % 5 === 0 || left <= 10) {
                    const updatedLockInfo = { ...lockInfo, remainingSeconds: left, lockedAt: Date.now() };
                    saveLockToStorage(updatedLockInfo);
                }
            }
        };
        updateLockTime();
        lockIntervalRef.current = setInterval(updateLockTime, 1000);
        return () => {
            if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
        };
    }, [lockInfo?.lockedUntil]);

    useEffect(() => {
        if (location.state?.verified) {
            if (showVerifyEmailModal) setShowVerifyEmailModal(false);
            setSuccessMessage(location.state.message || 'Xác thực email thành công! Vui lòng đăng nhập.');
            window.history.replaceState({}, document.title);
            const timer = setTimeout(() => setSuccessMessage(''), 5000);
            return () => clearTimeout(timer);
        }
        const verifiedSession = sessionStorage.getItem('email_verified_success');
        if (verifiedSession === 'true') {
            if (showVerifyEmailModal) setShowVerifyEmailModal(false);
            setSuccessMessage('Xác thực email thành công! Vui lòng đăng nhập.');
            sessionStorage.removeItem('email_verified_success');
            const timer = setTimeout(() => setSuccessMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [location.state, showVerifyEmailModal]);

    useEffect(() => {
        if (!location.state?.expired) return;
        const message = location.state?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        setServerError(message);
        window.history.replaceState({}, document.title);
    }, [location.state]);

    useEffect(() => {
        if (user && !isLoading && !showLoginSuccessModal && !showUpdatePhone && !isExpired && user.email_verified === 1) {
            navigate('/', { replace: true });
        }
    }, [user, isLoading, showLoginSuccessModal, showUpdatePhone, navigate, isExpired]);

    const validate = () => {
        const tempErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email.trim()) tempErrors.email = 'Vui lòng nhập email';
        else if (!emailRegex.test(formData.email.trim())) tempErrors.email = 'Email không hợp lệ';
        if (!formData.password.trim()) tempErrors.password = 'Vui lòng nhập mật khẩu';
        else if (formData.password.length < 6) tempErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));

        if (loginEffect !== 'loading' && loginEffect !== 'success' && loginEffect !== 'error') {
            setLoginEffect('typing');
            if (effectTimerRef.current) clearTimeout(effectTimerRef.current);
            effectTimerRef.current = setTimeout(() => {
                setLoginEffect('idle');
                effectTimerRef.current = null;
            }, 800);
        }

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
                if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
            }
        }
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        if (loading) return;
        if (lockInfo && lockInfo.lockedUntil > Date.now()) {
            setShowLockModal(true);
            return;
        }
        if (!validate()) {
            triggerEffect('error', 900);
            return;
        }
        setLoading(true);
        setLoginEffect('loading');
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
                triggerEffect('error', 900);
                return;
            }
            api.resetUserCache();
            notifyLogin(responseUser);
            setLoggedInUser(responseUser);
            setLoginSuccessMessage(`Chào mừng ${responseUser?.full_name || responseUser?.username || 'bạn'} quay trở lại!`);
            setLoginEffect('success');
            if (effectTimerRef.current) clearTimeout(effectTimerRef.current);
            effectTimerRef.current = setTimeout(() => {
                setShowLoginSuccessModal(true);
                setLoginEffect('idle');
                effectTimerRef.current = null;
            }, 1400);
        } catch (error) {
            console.error('🔴 [LOGIN] Login error:', error);
            const errorData = error?.response?.data || {};
            const errorCode = errorData?.code;
            const errorMessage = errorData?.message || 'Tài khoản hoặc mật khẩu không chính xác';
            triggerEffect('error', 900);

            if (error?.response?.status === 429 || errorCode === 'ACCOUNT_LOCKED') {
                const lockData = errorData?.data || {};
                const level = Number(lockData.level) || 1;
                const remainingSeconds = Math.max(0, Number(lockData.remainingSeconds) || 60);
                const lockUntilTimestamp = Date.now() + remainingSeconds * 1000;
                const durationText = lockData.lockDurationText || (level >= 2 ? '3 phút' : '1 phút');
                const lockInfoData = {
                    email: formData.email.trim(),
                    message: errorMessage,
                    level,
                    remainingSeconds,
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
            if (errorData?.field === 'email') { setErrors((prev) => ({ ...prev, email: errorMessage })); return; }
            if (errorData?.field === 'password') { setErrors((prev) => ({ ...prev, password: errorMessage })); return; }
            if (errorCode === 'SESSION_EXPIRED') { setServerError(errorMessage); return; }
            if (errorCode === 'SESSION_REPLACED') { setServerError(errorMessage); return; }
            if (errorCode === 'TOKEN_INVALID') { setServerError(errorMessage); socketService.disconnect(); return; }
            if (errorCode === 'UNAUTHORIZED') { setServerError(errorMessage); socketService.disconnect(); return; }
            if (errorCode === 'EMAIL_NOT_VERIFIED') { setServerError(errorMessage); return; }
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
        setLoginSuccessMessage(`Chào mừng ${loggedInUser?.full_name || loggedInUser?.username || 'bạn'} quay trở lại!`);
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
        <div className="login-page">
            {/* Background is the cinematic image itself. */}
            <div className="login-page__overlay" aria-hidden="true" />

            {/* TOP-LEFT BRAND */}
            <div className="login-page__logo">
                <Film size={19} strokeWidth={2.2} />
                <span>CINEMA STAR</span>
            </div>

            <main className="login-shell">
                {/* LEFT — INTRO */}
                <section className="login-content" aria-label="Thông tin đăng nhập">
                    <div className="login-content__badge">
                        <span className="login-content__badge-icon" aria-hidden="true">
                            <Ticket size={14} strokeWidth={2.2} />
                        </span>
                        <span>Đặt vé trực tuyến 24/7</span>
                    </div>

                    <h1 className="login-content__title">
                        CHÀO MỪNG
                        <span>TRỞ LẠI</span>
                    </h1>

                    <p className="login-content__desc">
                        Đăng nhập để tiếp tục đặt vé, theo dõi lịch sử giao dịch
                        và nhận những ưu đãi độc quyền dành riêng cho bạn.
                    </p>

                    <ul className="login-content__list">
                        <li>
                            <span className="login-content__list-icon" aria-hidden="true">
                                <Ticket size={17} strokeWidth={2} />
                            </span>
                            <span>Ưu đãi độc quyền mỗi tuần</span>
                        </li>
                        <li>
                            <span className="login-content__list-icon" aria-hidden="true">
                                <Zap size={17} strokeWidth={2} />
                            </span>
                            <span>Đặt vé siêu tốc, không chờ đợi</span>
                        </li>
                        <li>
                            <span className="login-content__list-icon" aria-hidden="true">
                                <Star size={17} strokeWidth={2} />
                            </span>
                            <span>Tích điểm đổi quà hấp dẫn</span>
                        </li>
                    </ul>

                    <div className="login-content__footer">
                        © 2026 Cinema Star — All rights reserved.
                    </div>
                </section>

                {/* RIGHT — LOGIN CARD */}
                <section className="login-form-area">
                    <div className={`login-form-card login-form-card--${loginEffect}`}>
                        {loginEffect === 'success' && <div className="login-form-card__ring" aria-hidden="true" />}
                        {loginEffect === 'error' && <div className="login-form-card__glow" aria-hidden="true" />}

                        <div className="login-form-card__header">
                            <div className="login-form-card__eyebrow">
                                <LockKeyhole size={14} strokeWidth={2} />
                                <span>SECURE ACCESS</span>
                            </div>
                            <h2 className="login-form-card__title">ĐĂNG NHẬP</h2>
                            <p className="login-form-card__subtitle">
                                Nhập thông tin để tiếp tục
                            </p>
                        </div>

                        {successMessage && (
                            <div className="login-msg login-msg--success" role="status">
                                <CheckCircle size={16} strokeWidth={2} />
                                <span>{successMessage}</span>
                            </div>
                        )}

                        {serverError && (
                            <div className="login-msg login-msg--error" role="alert">
                                <AlertCircle size={16} strokeWidth={2} />
                                <span>{serverError}</span>
                            </div>
                        )}

                        <form ref={formRef} onSubmit={handleLogin} noValidate autoComplete="off">
                            <input type="text" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
                            <input type="password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />

                            {/* EMAIL */}
                            <div className="login-field">
                                <label htmlFor="login-email" className="login-field__label">
                                    Email
                                </label>
                                <div className="login-field__wrap">
                                    <Mail className="login-field__leading-icon" size={16} strokeWidth={1.9} aria-hidden="true" />
                                    <input
                                        id="login-email"
                                        type="email"
                                        name="email"
                                        placeholder="you@example.com"
                                        className={`login-field__input login-field__input--with-icon ${errors.email ? 'input-error' : ''}`}
                                        value={formData.email}
                                        onChange={handleChange}
                                        autoComplete="off"
                                        disabled={loading || isLockedActive || googleLoading}
                                    />
                                </div>
                                {errors.email && (
                                    <span className="login-field__error">{errors.email}</span>
                                )}
                            </div>

                            {/* PASSWORD */}
                            <div className="login-field">
                                <div className="login-field__row">
                                    <label htmlFor="login-password" className="login-field__label">
                                        Mật khẩu
                                    </label>
                                    <button
                                        type="button"
                                        className="login-field__forgot"
                                        onClick={() => navigate('/forgot-password')}
                                        disabled={loading || isLockedActive || googleLoading}
                                    >
                                        Quên mật khẩu?
                                    </button>
                                </div>

                                <div className="login-field__wrap">
                                    <LockKeyhole className="login-field__leading-icon" size={16} strokeWidth={1.9} aria-hidden="true" />
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        placeholder="••••••••"
                                        className={`login-field__input login-field__input--with-icon has-toggle ${errors.password ? 'input-error' : ''}`}
                                        value={formData.password}
                                        onChange={handleChange}
                                        autoComplete="new-password"
                                        disabled={loading || isLockedActive || googleLoading}
                                    />
                                    <button
                                        type="button"
                                        className="login-field__toggle"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                        disabled={loading || isLockedActive || googleLoading}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <span className="login-field__error">{errors.password}</span>
                                )}
                            </div>

                            {/* REMEMBER */}
                            <label className="login-checkbox">
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleChange}
                                    disabled={loading || isLockedActive || googleLoading}
                                />
                                <span className="login-checkbox__mark" aria-hidden="true" />
                                <span className="login-checkbox__text">Ghi nhớ đăng nhập</span>
                            </label>

                            {/* SUBMIT */}
                            <LoadingButton
                                type="submit"
                                loading={loading}
                                loadingText="ĐANG ĐĂNG NHẬP..."
                                disabled={loading || isLockedActive || googleLoading}
                                className="login-submit"
                                spinnerColor="#0a0a0b"
                            >
                                {isLockedActive ? (
                                    <>
                                        <LockKeyhole size={16} strokeWidth={2.2} />
                                        <span>ĐANG BỊ KHÓA ({formatLockTime(lockTimeLeft)})</span>
                                    </>
                                ) : (
                                    <>
                                        <span>ĐĂNG NHẬP</span>
                                        <ArrowRight size={17} strokeWidth={2.4} />
                                    </>
                                )}
                            </LoadingButton>
                        </form>

                        {/* DIVIDER */}
                        <div className="login-divider">
                            <span>hoặc</span>
                        </div>

                        {/* GOOGLE */}
                        <button
                            type="button"
                            className="login-google"
                            onClick={() => googleLogin()}
                            disabled={loading || isLockedActive || googleLoading}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            <span>{googleLoading ? 'Đang xử lý...' : 'Tiếp tục với Google'}</span>
                        </button>

                        {/* FOOTER */}
                        <div className="login-footer">
                            <span>Chưa có tài khoản?</span>
                            <Link to="/register" className="login-footer__link">
                                <span>Đăng ký</span>
                                <ArrowRight size={14} strokeWidth={2.4} />
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* VERIFY EMAIL */}
            <Modal
                show={showVerifyEmailModal}
                type="success"
                title="Xác thực email"
                confirmText="Đã hiểu"
                onConfirm={handleVerifyEmailModalClose}
                onCancel={handleVerifyEmailModalClose}
            >
                <div className="verify-email-content">
                    <div className="verify-email-icon">
                        <MailCheck size={40} strokeWidth={2} />
                    </div>
                    <p className="verify-email-text">
                        Chào mừng <strong>{verifyEmailData.full_name || 'bạn'}</strong> đến với Cinema Star!
                    </p>
                    <p className="verify-email-text">
                        Vui lòng kiểm tra hộp thư <strong className="text-highlight">{verifyEmailData.email}</strong> và bấm vào
                        link xác thực để hoàn tất đăng ký.
                    </p>
                    <div className="verify-email-hint">
                        <Sparkles size={14} strokeWidth={2.2} />
                        <p>Sau khi xác thực, quay lại đây để đăng nhập</p>
                    </div>
                </div>
            </Modal>

            {/* LOGIN SUCCESS */}
            <SuccessModal
                isOpen={showLoginSuccessModal}
                onConfirm={handleLoginSuccessConfirm}
                onClose={handleLoginSuccessConfirm}
                title="Đăng nhập thành công!"
                message={loginSuccessMessage}
                confirmText="Vào trang chủ"
                autoClose={true}
                autoCloseDelay={3000}
            />

            {/* LOGIN LOCK */}
            <LoginLockModal
                show={showLockModal}
                message={lockInfo?.message || 'Tài khoản đã bị khóa'}
                lockedUntil={lockInfo?.lockedUntil || Date.now() + 60000}
                lockLevel={lockInfo?.level || 1}
                lockDurationText={lockInfo?.lockDurationText || '1 phút'}
                email={lockInfo?.email || formData.email}
                onClose={handleCloseLockModal}
            />

            {/* UPDATE PHONE */}
            <UpdatePhoneModal
                show={showUpdatePhone}
                onSuccess={handleUpdatePhoneSuccess}
                onClose={handleUpdatePhoneClose}
            />
        </div>
    );
};

export default UserLogin;