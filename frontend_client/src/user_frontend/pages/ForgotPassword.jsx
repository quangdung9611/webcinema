import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import LoadingButton from '../components/LoadingButton';
import '../styles/UserAuth.css';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [step, setStep] = useState('form'); // 'form' -> 'sent'

    // 🔥 Countdown states
    const [countdown, setCountdown] = useState(300); // 5 phút
    const [isOtpExpired, setIsOtpExpired] = useState(false);
    const timerRef = useRef(null);
    const intervalRef = useRef(null);

    // 🔥 Rate limit states
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

    // 🔥 Countdown timer cho OTP
    useEffect(() => {
        if (step === 'sent' && countdown > 0) {
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

    // 🔥 Đồng bộ TTL từ Redis mỗi 10 giây
    useEffect(() => {
        if (step !== 'sent') return;

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

    // 🔥 Rate limit timer
    useEffect(() => {
        if (!isRateLimited || rateLimitTimeLeft <= 0) return;

        const timer = setInterval(() => {
            setRateLimitTimeLeft(prev => {
                if (prev <= 1) {
                    setIsRateLimited(false);
                    setMessage('');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isRateLimited, rateLimitTimeLeft]);

    const handleSendLink = async () => {
        if (!email.trim()) {
            setMessage('Vui lòng nhập email');
            setMessageType('error');
            return;
        }

        if (isRateLimited) {
            setMessage(`⚠️ Vui lòng đợi ${rateLimitTimeLeft} giây trước khi thử lại.`);
            setMessageType('error');
            return;
        }

        setMessage('');
        setLoading(true);

        try {
            const res = await api.post('/api/auth/forgot-password', { email });

            // ✅ Lấy TTL từ response
            const expiresIn = res.data.data?.expiresIn || 300;
            setCountdown(expiresIn);
            setIsOtpExpired(false);
            setStep('sent');
            setMessage(res.data.message || 'Liên kết đặt lại mật khẩu đã được gửi tới email của bạn');
            setMessageType('success');
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'Không gửi được liên kết. Vui lòng thử lại!';
            
            if (status === 429) {
                const remaining = errorData.data?.remaining;
                const remainingSeconds = errorData.data?.remainingSeconds || 60;
                const maxAttempts = errorData.data?.maxAttempts || 3;
                
                let displayMessage = `⚠️ Bạn chỉ được gửi tối đa ${maxAttempts} lần.`;
                if (remaining !== undefined && remaining >= 0) {
                    displayMessage += ` Còn ${remaining} lần thử.`;
                }
                displayMessage += ` Vui lòng thử lại sau ${remainingSeconds} giây.`;
                
                setMessage(displayMessage);
                setMessageType('error');
                
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
            } else {
                setMessage(errorMessage);
                setMessageType('error');
            }
        } finally {
            setLoading(false);
        }
    };

    // 🔥 Gửi lại OTP (resend)
    const handleResendOtp = async () => {
        if (isRateLimited) {
            setMessage(`⚠️ Vui lòng đợi ${rateLimitTimeLeft} giây trước khi thử lại.`);
            setMessageType('error');
            return;
        }

        if (countdown > 0 && !isOtpExpired) {
            setMessage(`⚠️ Vui lòng đợi ${countdown} giây trước khi gửi lại.`);
            setMessageType('error');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const res = await api.post('/api/auth/resend-otp', {
                email,
                purpose: 'RESET_PASSWORD'
            });

            if (res.data.success) {
                const expiresIn = res.data.data?.expiresIn || 300;
                setCountdown(expiresIn);
                setIsOtpExpired(false);
                setMessage(res.data.message || 'OTP đã được gửi lại');
                setMessageType('success');
            }
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'Không thể gửi lại OTP';
            
            if (status === 429) {
                const remainingSeconds = errorData.data?.remainingSeconds || 60;
                setMessage(`⚠️ Vui lòng thử lại sau ${remainingSeconds} giây.`);
                setMessageType('error');
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
            } else {
                setMessage(errorMessage);
                setMessageType('error');
            }
        } finally {
            setLoading(false);
        }
    };

    // 🔥 Chuyển sang VerifyOTP
    const handleGoToVerify = () => {
        if (isOtpExpired) {
            setMessage('⚠️ OTP đã hết hạn. Vui lòng gửi lại.');
            setMessageType('error');
            return;
        }

        // Chuyển sang VerifyOTP với email
        navigate('/verify-otp', {
            state: {
                email: email,
                purpose: 'RESET_PASSWORD',
                fromForgotPassword: true
            }
        });
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSendLink();
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
                <div className="forgot-icon-wrapper">
                    <Mail size={42} className="forgot-icon" />
                </div>

                <h2>QUÊN MẬT KHẨU</h2>
                <p className="auth-subtitle">
                    {step === 'form' 
                        ? 'Nhập email đăng ký để nhận OTP đặt lại mật khẩu'
                        : 'Mã OTP đã được gửi đến email của bạn'
                    }
                </p>

                {message && (
                    <div className={`forgot-message ${messageType}`}>
                        {messageType === 'success' ? (
                            <CheckCircle size={18} />
                        ) : (
                            <AlertCircle size={18} />
                        )}
                        <span>{message}</span>
                    </div>
                )}

                <div className="auth-form-wrapper">
                    <form onSubmit={(e) => e.preventDefault()} noValidate>
                        {step === 'form' ? (
                            <div className="form-group">
                                <label>Email đăng ký</label>
                                <input
                                    type="email"
                                    className="auth-input"
                                    placeholder="example@gmail.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    disabled={loading || isRateLimited}
                                    autoComplete="email"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label>Email nhận OTP</label>
                                    <input
                                        type="email"
                                        className="auth-input"
                                        value={email}
                                        disabled
                                        style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                                    />
                                </div>

                                <div className="input-hint center-text" style={{ marginTop: '10px' }}>
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
                                    type="button"
                                    className="btn-user btn-outline-secondary" 
                                    onClick={handleResendOtp} 
                                    disabled={loading || (countdown > 0 && !isOtpExpired) || isRateLimited}
                                    style={{ marginTop: '10px', width: '100%' }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <span>🔄</span>
                                        {isRateLimited ? `Đang chờ (${rateLimitTimeLeft}s)` : 'Gửi lại OTP'}
                                    </span>
                                </button>
                            </>
                        )}

                        <div className="button-group" style={{ marginTop: step === 'sent' ? '10px' : '20px' }}>
                            {step === 'form' ? (
                                <LoadingButton
                                    type="button"
                                    loading={loading}
                                    loadingText="Đang gửi..."
                                    disabled={loading || isRateLimited}
                                    className="btn-user"
                                    spinnerColor="#000000"
                                    onClick={handleSendLink}
                                >
                                    {isRateLimited ? (
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            ĐANG CHỜ
                                            <span style={{ 
                                                background: 'rgba(255,255,255,0.2)', 
                                                padding: '2px 8px', 
                                                borderRadius: '4px', 
                                                fontWeight: 'bold' 
                                            }}>
                                                {rateLimitTimeLeft}s
                                            </span>
                                        </span>
                                    ) : (
                                        'GỬI OTP'
                                    )}
                                </LoadingButton>
                            ) : (
                                <LoadingButton
                                    type="button"
                                    loading={loading}
                                    loadingText="Đang chuyển..."
                                    disabled={loading || isOtpExpired}
                                    className="btn-user"
                                    spinnerColor="#000000"
                                    onClick={handleGoToVerify}
                                >
                                    {isOtpExpired ? 'OTP ĐÃ HẾT HẠN' : 'TIẾP TỤC XÁC THỰC'}
                                </LoadingButton>
                            )}
                        </div>
                    </form>
                </div>

                <div className="auth-footer">
                    <button
                        type="button"
                        className="btn-link back-btn"
                        onClick={() => {
                            if (step === 'sent') {
                                setStep('form');
                                setMessage('');
                                setCountdown(300);
                                setIsOtpExpired(false);
                            } else {
                                navigate('/login');
                            }
                        }}
                    >
                        <ArrowLeft size={16} />
                        {step === 'sent' ? 'Quay lại nhập email' : 'Quay lại đăng nhập'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;