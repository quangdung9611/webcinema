// ForgotPassword.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MailCheck,
    AlertCircle,
    CheckCircle,
    ArrowLeft,
    AlertTriangle,
    XCircle,
    Lock,
} from 'lucide-react';
import api from '../../api/api';
import LoadingButton from '../components/LoadingButton';
import Recaptcha from '../components/Recaptcha';
import '../styles/UserAuth.css';

const ForgotPassword = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

    // ✅ CAPTCHA STATE
    const [recaptchaToken, setRecaptchaToken] = useState('');
    const recaptchaRef = useRef(null);

    const RATE_LIMIT_STORAGE_KEY = 'forgot_password_rate_limit';

    const saveRateLimitToStorage = (timeLeft) => {
        if (timeLeft > 0 && email) {
            const data = { timeLeft, startedAt: Date.now(), email };
            localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(data));
        } else {
            localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
        }
    };

    const restoreRateLimitFromStorage = () => {
        try {
            const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
            if (!stored) return null;

            const data = JSON.parse(stored);
            if (data.email !== email) {
                localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
                return null;
            }

            const elapsed = Math.floor((Date.now() - data.startedAt) / 1000);
            const remaining = Math.max(0, data.timeLeft - elapsed);

            if (remaining > 0) return remaining;
            localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
            return null;
        } catch (error) {
            localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
            return null;
        }
    };

    useEffect(() => {
        const restoredRateLimit = restoreRateLimitFromStorage();
        if (restoredRateLimit !== null) {
            setIsRateLimited(true);
            setRateLimitTimeLeft(restoredRateLimit);
        }
    }, []);

    useEffect(() => {
        if (!isRateLimited || rateLimitTimeLeft <= 0) {
            if (!isRateLimited && rateLimitTimeLeft === 0) {
                localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
            }
            return;
        }

        saveRateLimitToStorage(rateLimitTimeLeft);

        const timer = setInterval(() => {
            setRateLimitTimeLeft(prev => {
                const newTime = prev - 1;
                if (newTime <= 1) {
                    setIsRateLimited(false);
                    setError(null);
                    localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
                    return 0;
                }
                if (newTime % 5 === 0 || newTime <= 10) {
                    saveRateLimitToStorage(newTime);
                }
                return newTime;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isRateLimited, rateLimitTimeLeft]);

    const formatLockTime = (totalSeconds) => {
        if (totalSeconds <= 0) return '0:00';
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const makeError = (IconComponent, text) => ({
        icon: <IconComponent size={18} />,
        text,
    });

    const handleSendOtp = async () => {
        if (!email.trim()) {
            setError(makeError(AlertCircle, 'Vui lòng nhập email'));
            return;
        }

        // ✅ CHECK CAPTCHA
        if (!recaptchaToken) {
            setError(makeError(
                AlertTriangle,
                'Vui lòng tick vào ô "Tôi không phải là robot" để tiếp tục.'
            ));
            return;
        }

        if (isRateLimited) {
            setError(makeError(
                AlertTriangle,
                `Vui lòng đợi ${formatLockTime(rateLimitTimeLeft)} trước khi thử lại.`
            ));
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await api.post('/api/auth/forgot-password', {
                email,
                recaptchaToken,   // ✅ GỬI KÈM
            });

            if (response.data.success) {
                await new Promise(resolve => setTimeout(resolve, 1000));

                setSuccessMessage({
                    icon: <CheckCircle size={20} />,
                    text: 'Mã OTP đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư.',
                });

                const { expiresIn = 300, serverTime = Date.now() } = response.data?.data || {};

                sessionStorage.setItem('verify_otp_password_serverTime', String(serverTime));
                sessionStorage.setItem('verify_otp_password_expiresIn', String(expiresIn));

                setTimeout(() => {
                    navigate('/verify-otp-password', {
                        state: {
                            email,
                            purpose: 'RESET_PASSWORD',
                            serverTime,
                            expiresIn
                        }
                    });
                }, 100);
            }
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'Không thể gửi OTP';
            const field = errorData.field;

            // ✅ NẾU CAPTCHA SAI → RESET
            if (field === 'recaptcha') {
                recaptchaRef.current?.reset();
                setRecaptchaToken('');
            }

            if (status === 429) {
                const remainingSeconds = errorData.data?.remainingSeconds || 300;
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
                saveRateLimitToStorage(remainingSeconds);
                setError(makeError(
                    AlertTriangle,
                    `Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau ${formatLockTime(remainingSeconds)}.`
                ));
            } else if (status === 404) {
                setError(makeError(
                    XCircle,
                    'Email này chưa được đăng ký trong hệ thống. Vui lòng kiểm tra lại.'
                ));
            } else if (status === 400 && errorMessage?.toLowerCase().includes('verified')) {
                setError(makeError(
                    AlertTriangle,
                    'Tài khoản chưa được xác thực email. Vui lòng kiểm tra hộp thư để xác thực.'
                ));
            } else if (status === 403) {
                setError(makeError(
                    Lock,
                    'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ để được giúp đỡ.'
                ));
            } else {
                setError(makeError(AlertCircle, errorMessage));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="forgot-icon-wrapper">
                    <MailCheck size={42} className="forgot-icon" />
                </div>

                <h2>QUÊN MẬT KHẨU</h2>
                <p className="auth-subtitle">Nhập email đăng ký để nhận mã OTP</p>

                {successMessage && (
                    <div className="success-message">
                        {successMessage.icon}
                        <span>{successMessage.text}</span>
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        {error.icon}
                        <span>{error.text}</span>
                    </div>
                )}

                <div className="form-group">
                    <label>Email đăng ký</label>
                    <input
                        type="email"
                        className="auth-input"
                        placeholder="example@gmail.com"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError(null);
                        }}
                        disabled={loading || isRateLimited}
                        autoComplete="email"
                    />
                </div>

                {/* ✅ CAPTCHA */}
                <Recaptcha
                    ref={recaptchaRef}
                    onChange={(token) => setRecaptchaToken(token)}
                    onExpired={() => setRecaptchaToken('')}
                />

                <div className="button-group">
                    <LoadingButton
                        type="button"
                        loading={loading}
                        loadingText="Đang gửi và chờ email vào hộp thư..."
                        onClick={handleSendOtp}
                        disabled={loading || isRateLimited}
                        className="btn-user btn-user-silver"
                        spinnerColor="#000000"
                    >
                        {isRateLimited ? (
                            `Đang chờ (${formatLockTime(rateLimitTimeLeft)})`
                        ) : (
                            'GỬI OTP'
                        )}
                    </LoadingButton>
                </div>

                <div className="auth-footer">
                    <button
                        type="button"
                        className="btn-link back-btn"
                        onClick={() => navigate('/login')}
                        disabled={loading}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <ArrowLeft size={16} /> Quay lại đăng nhập
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;