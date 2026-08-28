import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, CheckCircle, MailCheck } from 'lucide-react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { notifyLogin } from '../../utils/authCleanup';
import LoadingButton from '../components/LoadingButton';
import SuccessModal from '../components/SuccessModal';
import LoginLockModal from '../components/LoginLockModal';
import Modal from '../components/Modal'; // 🆕 Import Modal
import socketService from '../../api/socket'; // 🆕 Import socket
import '../styles/UserAuth.css';

const UserLogin = () => {
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
    // 🆕 MODAL THÔNG BÁO KIỂM TRA EMAIL (từ RegisterPin)
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

    // =========================================================
    // 🆕 KIỂM TRA STATE TỪ REGISTERPIN (Modal kiểm tra email)
    // =========================================================
    useEffect(() => {
        // Nếu từ RegisterPin gửi sang
        if (location.state?.showVerifyEmailModal) {
            setVerifyEmailData({
                email: location.state.email || '',
                full_name: location.state.full_name || ''
            });
            setShowVerifyEmailModal(true);
            // Xóa state để không hiện lại khi refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // =========================================================
    // LOAD LOCK STATUS KHI REFRESH TRANG
    // =========================================================
    useEffect(() => {
        const storedEmail = localStorage.getItem('lockedEmail');
        const storedLockInfo = localStorage.getItem('lockInfo');

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
                        lockedUntil: lockUntilTimestamp
                    };

                    setLockInfo(updatedLockInfo);
                    setShowLockModal(true);
                    localStorage.setItem('lockInfo', JSON.stringify(updatedLockInfo));
                    setLockTimeLeft(remainingSeconds);
                } else {
                    localStorage.removeItem('lockedEmail');
                    localStorage.removeItem('lockInfo');
                }
            })
            .catch((error) => {
                console.error('Không thể kiểm tra lock từ server:', error);
                if (!storedLockInfo) return;

                try {
                    const parsed = JSON.parse(storedLockInfo);
                    if (parsed.lockedUntil > Date.now()) {
                        const secondsLeft = Math.max(0, Math.ceil((parsed.lockedUntil - Date.now()) / 1000));
                        setLockInfo(parsed);
                        setShowLockModal(true);
                        setLockTimeLeft(secondsLeft);
                    }
                } catch (e) {
                    console.error('Không thể đọc lockInfo:', e);
                }
            });
    }, []);

    // =========================================================
    // COUNTDOWN LOGIN LOCK
    // =========================================================
    useEffect(() => {
        if (!lockInfo?.lockedUntil) return;

        const tick = () => {
            const left = Math.max(0, Math.ceil((lockInfo.lockedUntil - Date.now()) / 1000));
            setLockTimeLeft(left);

            if (left <= 0) {
                localStorage.removeItem('lockedEmail');
                localStorage.removeItem('lockInfo');
                setLockInfo(null);
                setShowLockModal(false);
                setLockTimeLeft(0);
                setSuccessMessage('✅ Tài khoản đã được mở khóa. Vui lòng thử đăng nhập lại.');
                setTimeout(() => setSuccessMessage(''), 5000);
            }
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [lockInfo]);

    // =========================================================
    // 🆕 EMAIL VERIFIED MESSAGE (Từ RegisterPin / VerifyEmail)
    // =========================================================
    useEffect(() => {
        // Trường hợp 1: Từ RegisterPin (verified = true)
        if (location.state?.verified) {
            // Nếu modal kiểm tra email đang mở → đóng nó lại
            if (showVerifyEmailModal) {
                setShowVerifyEmailModal(false);
            }
            
            setSuccessMessage(location.state.message || '✅ Xác thực email thành công! Vui lòng đăng nhập.');
            window.history.replaceState({}, document.title);
            const timer = setTimeout(() => setSuccessMessage(''), 5000);
            return () => clearTimeout(timer);
        }

        // Trường hợp 2: Từ sessionStorage (fallback)
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
                localStorage.removeItem('lockInfo');
                setLockInfo(null);
                setShowLockModal(false);
                setLockTimeLeft(0);
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
                    lockedUntil: lockUntilTimestamp
                };

                setLockInfo(lockInfoData);
                setShowLockModal(true);
                setLockTimeLeft(remainingSeconds);
                localStorage.setItem('lockedEmail', formData.email.trim());
                localStorage.setItem('lockInfo', JSON.stringify(lockInfoData));
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
    };

    // =========================================================
    // 🆕 CLOSE VERIFY EMAIL MODAL
    // =========================================================
    const handleVerifyEmailModalClose = () => {
        setShowVerifyEmailModal(false);
    };

    // =========================================================
    // FORMAT TIME
    // =========================================================
    const formatLockTime = (totalSeconds) => {
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
                    <div className="success-message" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        padding: '12px 16px', 
                        backgroundColor: 'rgba(34, 197, 94, 0.12)', 
                        border: '1px solid rgba(34, 197, 94, 0.3)', 
                        borderRadius: '8px', 
                        color: '#4ade80', 
                        marginBottom: '16px' 
                    }}>
                        <CheckCircle size={20} />
                        <span>{successMessage}</span>
                    </div>
                )}

                {serverError && (
                    <div className="error-message" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 16px',
                        backgroundColor: 'rgba(255, 59, 92, 0.12)',
                        border: '1px solid rgba(255, 59, 92, 0.3)',
                        borderRadius: '8px',
                        color: '#ff6b8a',
                        marginBottom: '16px'
                    }}>
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
                                autoComplete="current-password"
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
                        className="btn-user"
                        spinnerColor="#000000"
                    >
                        {isLockedActive ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                ĐANG BỊ KHÓA
                                <span style={{ 
                                    background: 'rgba(255,255,255,0.2)', 
                                    padding: '2px 8px', 
                                    borderRadius: '4px', 
                                    fontWeight: 'bold' 
                                }}>
                                    {formatLockTime(lockTimeLeft)}
                                </span>
                            </span>
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

            {/* 🆕 MODAL: Thông báo kiểm tra email (từ RegisterPin) */}
            <Modal
                show={showVerifyEmailModal}
                type="success"
                title="📧 Xác thực email"
                confirmText="Đã hiểu"
                onConfirm={handleVerifyEmailModalClose}
                onCancel={handleVerifyEmailModalClose}
            >
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <div style={{
                        width: "70px", height: "70px", borderRadius: "50%",
                        background: "rgba(34, 197, 94, 0.1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 15px"
                    }}>
                        <MailCheck size={40} color="#4ade80" />
                    </div>

                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "10px" }}>
                        Chào mừng <strong style={{ color: "var(--text-heading)" }}>{verifyEmailData.full_name || "bạn"}</strong> đến với Cinema Star!
                    </p>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        Vui lòng kiểm tra hộp thư <strong style={{ color: "var(--silver-primary)" }}>{verifyEmailData.email}</strong> và bấm vào
                        link xác thực để hoàn tất đăng ký.
                    </p>
                    <div style={{ 
                        marginTop: "15px", 
                        padding: "10px", 
                        background: "rgba(255, 255, 255, 0.03)", 
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 255, 255, 0.05)"
                    }}>
                        <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
                            💡 Sau khi xác thực, quay lại đây để đăng nhập
                        </p>
                    </div>
                </div>
            </Modal>

            {/* 🆕 MODAL: Đăng nhập thành công */}
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

            {/* 🆕 MODAL: Tài khoản bị khóa */}
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