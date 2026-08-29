import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailCheck, ShieldCheck, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../../api/api';
import LoadingButton from '../components/LoadingButton';
import '../styles/UserAuth.css';

const ForgotPassword = () => {
    const navigate = useNavigate();

    const [step, setStep] = useState('sent'); // 'sent' -> 'otp'
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(300);
    const [isOtpExpired, setIsOtpExpired] = useState(false);

    const [email, setEmail] = useState('');
    const otpRefs = useRef([]);
    const timerRef = useRef(null);
    const intervalRef = useRef(null);

    // Rate limit states
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

    // Countdown timer cho rate limit
    useEffect(() => {
        if (!isRateLimited || rateLimitTimeLeft <= 0) return;
        const timer = setInterval(() => {
            setRateLimitTimeLeft(prev => {
                if (prev <= 1) {
                    setIsRateLimited(false);
                    setError('');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isRateLimited, rateLimitTimeLeft]);

    // ✅ Countdown OTP
    useEffect(() => {
        if (step === 'otp' && countdown > 0) {
            timerRef.current = setTimeout(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        setIsOtpExpired(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearTimeout(timerRef.current);
    }, [step, countdown]);

    // ✅ Đồng bộ TTL từ Redis mỗi 10 giây
    useEffect(() => {
        if (step !== 'otp') return;

        const syncTTL = async () => {
            try {
                const response = await api.get(`/api/auth/check-otp-ttl`, {
                    params: {
                        email: email,
                        purpose: 'RESET_PASSWORD'
                    }
                });
                if (response.data.success) {
                    const ttl = response.data.data.expiresIn;
                    if (ttl > 0) {
                        setCountdown(ttl);
                        setIsOtpExpired(false);
                    } else {
                        setIsOtpExpired(true);
                        setCountdown(0);
                    }
                }
            } catch (error) {
                console.error('Failed to sync OTP TTL:', error);
            }
        };

        syncTTL();
        intervalRef.current = setInterval(syncTTL, 10000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [step, email]);

    useEffect(() => {
        setStep('sent');
        setOtp('');
        setEmail('');
        setError('');
        setCountdown(300);
        setIsOtpExpired(false);
    }, []);

    const handleOtpChange = (index, value) => {
        const clean = value.replace(/\D/g, '').slice(-1);
        const newOtp = otp.split('');
        newOtp[index] = clean;
        setOtp(newOtp.join(''));
        if (clean && index < 5) otpRefs.current[index + 1]?.focus();
        if (error) setError('');
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    // ✅ Gửi OTP
    const handleSendOtp = async () => {
        if (!email.trim()) {
            setError('Vui lòng nhập email');
            return;
        }

        if (isRateLimited) {
            setError(`⚠️ Vui lòng đợi ${rateLimitTimeLeft} giây trước khi thử lại.`);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await api.post('/api/auth/forgot-password', { email });
            if (response.data.success) {
                const expiresIn = response.data.data?.expiresIn || 300;
                setCountdown(expiresIn);
                setIsOtpExpired(false);
                setStep('otp');
                setError('');
            }
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'Không thể gửi OTP';
            
            if (status === 429) {
                const remainingSeconds = errorData.data?.remainingSeconds || 60;
                const maxAttempts = errorData.data?.maxAttempts || 3;
                setError(`⚠️ Bạn chỉ được gửi tối đa ${maxAttempts} lần. Vui lòng thử lại sau ${remainingSeconds} giây.`);
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    // ✅ Gửi lại OTP
    const handleResendOtp = async () => {
        if (isRateLimited) {
            setError(`⚠️ Vui lòng đợi ${rateLimitTimeLeft} giây trước khi thử lại.`);
            return;
        }

        if (countdown > 0 && !isOtpExpired) {
            setError(`⚠️ Vui lòng đợi ${Math.ceil(countdown)} giây trước khi gửi lại.`);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await api.post('/api/auth/resend-otp', { 
                email,
                purpose: 'RESET_PASSWORD'
            });
            if (response.data.success) {
                const expiresIn = response.data.data?.expiresIn || 300;
                setCountdown(expiresIn);
                setIsOtpExpired(false);
                setError('');
            }
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'Không thể gửi lại OTP';
            
            if (status === 429) {
                const remainingSeconds = errorData.data?.remainingSeconds || 60;
                setError(`⚠️ Vui lòng thử lại sau ${remainingSeconds} giây.`);
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    // ✅ Xác thực OTP -> chuyển sang ResetPassword
    const handleVerifyOtp = async () => {
        if (isOtpExpired) {
            setError('⚠️ OTP đã hết hạn. Vui lòng gửi lại.');
            return;
        }

        if (!/^\d{6}$/.test(otp)) {
            setError('Vui lòng nhập đủ 6 số OTP');
            return;
        }

        if (isRateLimited) {
            setError(`⚠️ Vui lòng đợi ${rateLimitTimeLeft} giây trước khi thử lại.`);
            return;
        }

        setLoading(true);
        setError('');
        try {
            // ✅ Gọi API verify OTP
            const response = await api.post('/api/auth/verify-otp-and-reset', {
                email,
                otp,
                newPassword: '' // Sẽ nhập ở ResetPassword
            });

            if (response.data.success) {
                // ✅ Chuyển sang ResetPassword
                navigate('/reset-password', {
                    state: {
                        email: email,
                        otp: otp,
                        fromForgotPassword: true
                    }
                });
            }
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            let errorMessage = errorData.message || 'OTP không đúng';
            
            if (status === 429) {
                const remainingSeconds = errorData.data?.remainingSeconds || 60;
                errorMessage = `⚠️ Vui lòng thử lại sau ${remainingSeconds} giây.`;
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
            } else if (errorMessage.includes('hết hạn')) {
                setIsOtpExpired(true);
                setCountdown(0);
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        if (seconds <= 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>XÁC THỰC OTP</h2>

                {error && (
                    <div className="forgot-message error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {step === 'sent' && (
                    <>
                        <div className="forgot-icon-wrapper">
                            <MailCheck size={42} className="forgot-icon" />
                        </div>
                        <p className="auth-subtitle" style={{ marginBottom: '10px' }}>
                            Chúng tôi sẽ gửi mã OTP về email <strong className="text-highlight">{email}</strong>.
                        </p>
                        <p className="auth-subtitle" style={{ marginBottom: '20px', fontSize: '14px', color: '#94a3b8' }}>
                            Vui lòng bấm nút <strong>"GỬI OTP"</strong> để nhận mã xác thực.
                        </p>
                        <div className="form-group">
                            <label>Email đăng ký</label>
                            <input
                                type="email"
                                className="auth-input"
                                placeholder="example@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                                className="btn-user"
                                spinnerColor="#000000"
                            >
                                {isRateLimited ? `Đang chờ (${rateLimitTimeLeft}s)` : 'GỬI OTP'}
                            </LoadingButton>
                        </div>
                    </>
                )}

                {step === 'otp' && (
                    <>
                        <div className="forgot-icon-wrapper">
                            <ShieldCheck size={42} className="forgot-icon" />
                        </div>
                        <p className="auth-subtitle">
                            Nhập mã OTP đã gửi đến <strong className="text-highlight">{email}</strong>
                        </p>

                        <div className="pin-input-container">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (otpRefs.current[index] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={otp[index] || ''}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                    className={`pin-box ${isOtpExpired ? 'input-error' : ''} ${error && error.includes('OTP') ? 'input-error' : ''}`}
                                    disabled={loading || isRateLimited || isOtpExpired}
                                />
                            ))}
                        </div>

                        <div className="input-hint center-text">
                            {isOtpExpired ? (
                                <span style={{ color: '#ff6b8a' }}>
                                    ⚠️ OTP đã hết hạn. Vui lòng <strong>gửi lại</strong> mã mới.
                                </span>
                            ) : (
                                <span>
                                    ⏳ OTP hết hạn sau: <strong style={{ color: countdown <= 60 ? '#ff6b8a' : '#4ade80' }}>
                                        {formatTime(countdown)}
                                    </strong> (5 phút)
                                </span>
                            )}
                        </div>

                        <button 
                            className="btn-user btn-outline-secondary" 
                            onClick={handleResendOtp} 
                            disabled={loading || (countdown > 0 && !isOtpExpired) || isRateLimited}
                            style={{ marginTop: '10px' }}
                        >
                            <RefreshCw size={16} /> 
                            {isRateLimited ? `Đang chờ (${rateLimitTimeLeft}s)` : 'Gửi lại OTP'}
                        </button>

                        <div className="button-group" style={{ marginTop: '20px' }}>
                            <button className="btn-user back-btn" onClick={() => setStep('sent')}>
                                <ArrowLeft size={16} /> Quay lại
                            </button>
                            <LoadingButton
                                type="button"
                                loading={loading}
                                loadingText="Đang xác thực..."
                                onClick={handleVerifyOtp}
                                disabled={loading || isRateLimited || isOtpExpired}
                                className="btn-user"
                                spinnerColor="#000000"
                            >
                                {isRateLimited ? `Đang chờ (${rateLimitTimeLeft}s)` : 'XÁC NHẬN'}
                            </LoadingButton>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;