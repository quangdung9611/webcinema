// ForgotPassword.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailCheck, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../api/api';
import LoadingButton from '../components/LoadingButton';
import '../styles/UserAuth.css';

const ForgotPassword = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

    const RATE_LIMIT_STORAGE_KEY = 'forgot_password_rate_limit';

    const saveRateLimitToStorage = (timeLeft) => {
        if (timeLeft > 0 && email) {
            const data = {
                timeLeft: timeLeft,
                startedAt: Date.now(),
                email: email
            };
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

            if (remaining > 0) {
                return remaining;
            } else {
                localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
                return null;
            }
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
                    setError('');
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

    const handleSendOtp = async () => {
        if (!email.trim()) {
            setError('Vui lòng nhập email');
            return;
        }

        if (isRateLimited) {
            setError(`⚠️ Vui lòng đợi ${formatLockTime(rateLimitTimeLeft)} trước khi thử lại.`);
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const response = await api.post('/api/auth/forgot-password', { email });
            if (response.data.success) {
                setSuccessMessage('✅ Mã OTP đã được gửi tới email của bạn.');
                setTimeout(() => setSuccessMessage(''), 5000);

                navigate('/verify-otp-password', {
                    state: {
                        email: email,
                        purpose: 'RESET_PASSWORD'
                    }
                });
            }
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'Không thể gửi OTP';

            if (status === 429) {
                const remainingSeconds = errorData.data?.remainingSeconds || 300;
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
                saveRateLimitToStorage(remainingSeconds);
                setError(`⚠️ Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau ${formatLockTime(remainingSeconds)}.`);
            } else {
                setError(errorMessage);
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
                        <CheckCircle size={20} />
                        <span>{successMessage}</span>
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        <AlertCircle size={18} />
                        <span>{error}</span>
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
                            if (error) setError('');
                        }}
                        disabled={loading || isRateLimited}
                        autoComplete="email"
                    />
                </div>

                <div className="button-group">
                    <LoadingButton
                        type="button"
                        loading={loading}
                        loadingText="Đang gửi..."
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
                    >
                        ← Quay lại đăng nhập
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;