// admin_frontend/pages/Auth/AdminForgotPassword.jsx

import React, { useState, useEffect } from 'react';
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
import adminapi from '../../../api/adminapi';
import LoadingButton from '../../../user_frontend/components/LoadingButton';
import '../../styles/AdminAuth.css';

const AdminForgotPassword = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [error, setError] = useState(null);          // { icon, text }
    const [successMessage, setSuccessMessage] = useState(null); // { icon, text }
    const [loading, setLoading] = useState(false);

    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

    const RATE_LIMIT_STORAGE_KEY = 'admin_forgot_password_rate_limit';

    // ============================================================
    // RATE LIMIT STORAGE
    // ============================================================
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

    // ============================================================
    // HELPERS
    // ============================================================
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

    // ============================================================
    // HANDLE SEND OTP
    // ============================================================
    const handleSendOtp = async () => {
        if (!email.trim()) {
            setError(makeError(AlertCircle, 'Vui lòng nhập email quản trị'));
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
            const response = await adminapi.post('/admin/api/auth/forgot-password', { email });

            if (response.data.success) {
                // Chờ 1 giây để email thực sự được gửi
                await new Promise(resolve => setTimeout(resolve, 1000));

                setSuccessMessage({
                    icon: <CheckCircle size={20} />,
                    text: 'Mã OTP đã được gửi tới email quản trị. Vui lòng kiểm tra hộp thư.',
                });

                const { expiresIn = 300, serverTime = Date.now() } = response.data?.data || {};

                sessionStorage.setItem('admin_verify_otp_serverTime', String(serverTime));
                sessionStorage.setItem('admin_verify_otp_expiresIn', String(expiresIn));

                setTimeout(() => {
                    navigate('/verify-otp-password', {
                        state: {
                            email: email,
                            purpose: 'RESET_PASSWORD',
                            serverTime: serverTime,
                            expiresIn: expiresIn
                        }
                    });
                }, 100);
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
                    'Tài khoản chưa được xác thực email. Vui lòng liên hệ kỹ thuật.'
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

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div className="admin-login-wrapper">
            <div className="admin-login-overlay"></div>

            <div className="admin-forgot-container">
                <div className="admin-forgot-card">
                    <div className="admin-forgot-icon-wrapper">
                        <MailCheck size={42} className="admin-forgot-icon" />
                    </div>

                    <h2>QUÊN MẬT KHẨU ADMIN</h2>
                    <p className="admin-forgot-subtitle">
                        Nhập email quản trị để nhận mã OTP
                    </p>

                    {successMessage && (
                        <div className="admin-forgot-message success">
                            {successMessage.icon}
                            <span>{successMessage.text}</span>
                        </div>
                    )}

                    {error && (
                        <div className="admin-forgot-message error">
                            {error.icon}
                            <span>{error.text}</span>
                        </div>
                    )}

                    <div className="admin-forgot-form-group">
                        <label>Email quản trị</label>
                        <input
                            type="email"
                            className="admin-forgot-input"
                            placeholder="admin@cinemastar.com"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (error) setError(null);
                            }}
                            disabled={loading || isRateLimited}
                            autoComplete="email"
                        />
                    </div>

                    <div className="admin-forgot-button-group">
                        <LoadingButton
                            type="button"
                            loading={loading}
                            loadingText="Đang gửi và chờ email..."
                            onClick={handleSendOtp}
                            disabled={loading || isRateLimited}
                            className="btn-admin-forgot"
                            spinnerColor="#000000"
                        >
                            {isRateLimited ? (
                                `Đang chờ (${formatLockTime(rateLimitTimeLeft)})`
                            ) : (
                                'GỬI OTP'
                            )}
                        </LoadingButton>
                    </div>

                    <div className="admin-forgot-footer">
                        <button
                            type="button"
                            className="admin-back-link"
                            onClick={() => navigate('/login')}
                            disabled={loading}
                        >
                            <ArrowLeft size={16} /> Quay lại đăng nhập
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminForgotPassword;