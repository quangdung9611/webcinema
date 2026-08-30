import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, CheckCircle, MailCheck } from 'lucide-react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { notifyLogin } from '../../utils/authCleanup';
import LoadingButton from '../components/LoadingButton';
import SuccessModal from '../components/SuccessModal';
import LoginLockModal from '../components/LoginLockModal';
import Modal from '../components/Modal';
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
    // MODAL THÔNG BÁO KIỂM TRA EMAIL (từ RegisterPin)
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

    // Key lưu localStorage
    const LOCK_STORAGE_KEY = 'user_login_lock';

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

    // =========================================================
    // KHÔI PHỤC LOCK TỪ LOCALSTORAGE
    // =========================================================
    const restoreLockFromStorage = () => {
        try {
            const stored = localStorage.getItem(LOCK_STORAGE_KEY);
            if (!stored) return null;

            const lockData = JSON.parse(stored);
            
            const elapsed = Math.floor((Date.now() - lockData.lockedAt) / 1000);
            const remaining = Math.max(0, Math.ceil((lockData.lockedUntil - Date.now()) / 1000));

            if (remaining > 0) {
                const restoredData = {
                    ...lockData,
                    remainingSeconds: remaining,
                    lockedUntil: lockData.lockedUntil
                };
                return restoredData;
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

    // =========================================================
    // CLEANUP INTERVAL
    // =========================================================
    useEffect(() => {
        return () => {
            if (lockIntervalRef.current) {
                clearInterval(lockIntervalRef.current);
                lockIntervalRef.current = null;
            }
        };
    }, []);

    // =========================================================
    // CLEAR FORM KHI COMPONENT MOUNT
    // =========================================================
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

    // =========================================================
    // KIỂM TRA STATE TỪ REGISTERPIN (Modal kiểm tra email)
    // =========================================================
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

    // =========================================================
    // LOAD LOCK STATUS KHI REFRESH TRANG - KHÔI PHỤC TỪ LOCALSTORAGE
    // =========================================================
    useEffect(() => {
        // Ưu tiên khôi phục từ localStorage trước
        const restoredLock = restoreLockFromStorage();
        
        if (restoredLock) {
            setLockInfo(restoredLock);
            setShowLockModal(true);
            setLockTimeLeft(restoredLock.remainingSeconds);
            return;
        }

        // Nếu không có trong localStorage, kiểm tra từ server
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

    // =========================================================
    // COUNTDOWN LOGIN LOCK - CẬP NHẬT LIÊN TỤC
    // =========================================================
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
                // Cập nhật localStorage mỗi 5 giây
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

    // =========================================================
    // EMAIL VERIFIED MESSAGE (Từ RegisterPin / VerifyEmail)
    // =========================================================
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

    // =========================================================
    // REDIRECT IF ALREADY LOGIN
    // =========================================================
    useEffect(() => {
        if (user && !isLoading && !showLoginSuccessModal && !isExpired && user.email_verified === 1) {
            navigate('/', { replace: true });
        }
    }, [user, isLoading, showLoginSuccessModal, navigate, isExpired]);

    // =========================================================
    // VALIDATE
    // =========================================================
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

    // =========================================================
    // HANDLE CHANGE
    // =========================================================
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

    // =========================================================
    // HANDLE LOGIN
    // =========================================================
    const handleLogin = async (event) => {
        event.preventDefault();

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

            if (errorCode === 'EMAIL_NOT_VERIFIED') {
                setServerError(errorMessage || 'Vui lòng xác thực email trước khi đăng nhập.');
                return;
            }

            setServerError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // =========================================================
    // LOGIN SUCCESS
    // =========================================================
    const handleLoginSuccessConfirm = () => {
        setShowLoginSuccessModal(false);
        setLoggedInUser(null);
        navigate('/', { replace: true });
    };

    // =========================================================
    // CLOSE LOCK MODAL
    // =========================================================
    const handleCloseLockModal = () => {
        setShowLockModal(false);
        // Không xóa lockInfo, timer vẫn chạy background
    };

    // =========================================================
    // CLOSE VERIFY EMAIL MODAL
    // =========================================================
    const handleVerifyEmailModalClose = () => {
        setShowVerifyEmailModal(false);
    };

    // =========================================================
    // FORMAT TIME
    // =========================================================
    const formatLockTime = (totalSeconds) => {
        if (totalSeconds <= 0) return '0:00';
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const isLockedActive = lockInfo && lockInfo.lockedUntil > Date.now();

    // =========================================================
    // RENDER
    // =========================================================
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
                            disabled={loading || isLockedActive}
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
                                disabled={loading || isLockedActive}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword((prev) => !prev)}
                                tabIndex="-1"
                                disabled={loading || isLockedActive}
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
                                disabled={loading || isLockedActive}
                            />
                            Remember me
                        </label>

                        <button
                            type="button"
                            className="forgot-link"
                            onClick={() => navigate('/forgot-password')}
                            disabled={loading || isLockedActive}
                        >
                            Forgot password?
                        </button>
                    </div>

                    <LoadingButton
                        type="submit"
                        loading={loading}
                        loadingText="Đang đăng nhập..."
                        disabled={loading || isLockedActive}
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

                <div className="auth-footer">
                    <span>Chưa có tài khoản?</span>
                    <Link to="/register" className="btn-link">Đăng ký ngay</Link>
                </div>
            </div>

            {/* MODAL: Thông báo kiểm tra email (từ RegisterPin) */}
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
        </div>
    );
};

export default UserLogin;