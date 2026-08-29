import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/api';
import { ShieldCheck, AlertCircle, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import LoadingButton from '../components/LoadingButton';
import ResetPasswordSuccessModal from '../components/ResetPasswordSuccessModal';
import '../styles/UserAuth.css';

const VerifyOTP = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const email = location.state?.email || '';
    const newPassword = location.state?.newPassword || '';
    const purpose = location.state?.purpose || 'RESET_PASSWORD';
    const initialExpiresIn = location.state?.expiresIn || 300;

    const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef([]);

    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    // ✅ Countdown states
    const [countdown, setCountdown] = useState(initialExpiresIn);
    const [isOtpExpired, setIsOtpExpired] = useState(false);
    const timerRef = useRef(null);
    const intervalRef = useRef(null);

    // ✅ Rate limit states
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

    // ✅ Countdown timer cho rate limit
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

    // Auto focus vào ô đầu tiên khi mount
    useEffect(() => {
        if (email && newPassword) {
            inputRefs.current[0]?.focus();
        }
    }, [email, newPassword]);

    // ✅ Countdown OTP
    useEffect(() => {
        if (countdown > 0) {
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
    }, [countdown]);

    // ✅ Đồng bộ TTL từ Redis mỗi 10 giây
    useEffect(() => {
        const syncTTL = async () => {
            try {
                const response = await api.get(`/api/auth/check-otp-ttl`, {
                    params: {
                        email: email,
                        purpose: purpose
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
    }, [email, purpose]);

    if (!email || !newPassword) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="forgot-icon-wrapper">
                        <AlertCircle size={42} className="forgot-icon" style={{ color: '#f87171' }} />
                    </div>
                    <h2>LỖI DỮ LIỆU</h2>
                    <p className="auth-subtitle">Vui lòng thực hiện lại quy trình đặt lại mật khẩu.</p>
                    <div className="button-group">
                        <button 
                            className="btn-user" 
                            onClick={() => navigate('/forgot-password')}
                        >
                            Quay lại
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const handleOtpChange = (index, value) => {
        const cleanValue = value.replace(/\D/g, '').slice(-1);
        const newOtpValues = [...otpValues];
        newOtpValues[index] = cleanValue;
        setOtpValues(newOtpValues);
        
        if (message && messageType === 'error') {
            setMessage('');
        }
        
        if (cleanValue && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6);
        const pastedArray = pastedData.split('');
        
        const newOtpValues = [...otpValues];
        for (let i = 0; i < 6; i++) {
            newOtpValues[i] = i < pastedArray.length ? pastedArray[i] : '';
        }
        setOtpValues(newOtpValues);
        
        const lastFilledIndex = Math.min(pastedArray.length, 5);
        if (lastFilledIndex < 5) {
            inputRefs.current[lastFilledIndex]?.focus();
        } else {
            inputRefs.current[5]?.focus();
        }
    };

    const handleVerifyOTP = async () => {
        if (isOtpExpired) {
            setMessage('⚠️ OTP đã hết hạn. Vui lòng gửi lại.');
            setMessageType('error');
            return;
        }

        if (isRateLimited) {
            setMessage(`⚠️ Vui lòng đợi ${rateLimitTimeLeft} giây trước khi thử lại.`);
            setMessageType('error');
            return;
        }

        const otp = otpValues.join('');
        
        if (!otp.trim()) {
            setMessage('Vui lòng nhập OTP');
            setMessageType('error');
            return;
        }

        if (otp.length < 6) {
            setMessage('OTP phải có 6 chữ số');
            setMessageType('error');
            return;
        }

        try {
            setLoading(true);
            setMessage('');

            const res = await api.post('/api/auth/verify-otp-and-reset', {
                email,
                otp,
                newPassword
            });

            setMessage(res.data.message || 'Đặt lại mật khẩu thành công!');
            setMessageType('success');
            setShowSuccessModal(true);

        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'OTP không hợp lệ';
            
            if (status === 429) {
                const remainingSeconds = errorData.data?.remainingSeconds || 60;
                setMessage(`⚠️ Vui lòng thử lại sau ${remainingSeconds} giây.`);
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
            } else if (errorMessage.includes('hết hạn')) {
                setIsOtpExpired(true);
                setCountdown(0);
                setMessage('⚠️ OTP đã hết hạn. Vui lòng gửi lại.');
            } else {
                setMessage(errorMessage);
            }
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async () => {
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

        try {
            setResendLoading(true);
            setMessage('');

            // ✅ Dùng API resend-otp
            const res = await api.post('/api/auth/resend-otp', {
                email,
                purpose: purpose
            });

            if (res.data.success) {
                const expiresIn = res.data.data?.expiresIn || 300;
                setCountdown(expiresIn);
                setIsOtpExpired(false);
                setMessage(res.data.message || 'OTP đã được gửi lại');
                setMessageType('success');

                setOtpValues(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'Không thể gửi lại OTP';
            
            if (status === 429) {
                const remainingSeconds = errorData.data?.remainingSeconds || 60;
                setMessage(`⚠️ Vui lòng thử lại sau ${remainingSeconds} giây.`);
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
            } else {
                setMessage(errorMessage);
            }
            setMessageType('error');
        } finally {
            setResendLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleVerifyOTP();
        }
    };

    const formatTime = (seconds) => {
        if (seconds <= 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // ✅ Xử lý đóng modal và chuyển về login
    const handleModalConfirm = () => {
        setShowSuccessModal(false);
        navigate('/login');
    };

    const handleModalClose = () => {
        setShowSuccessModal(false);
        navigate('/login');
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="forgot-icon-wrapper">
                    <ShieldCheck size={42} className="forgot-icon" />
                </div>

                <h2>XÁC THỰC OTP</h2>
                <p className="auth-subtitle">
                    Nhập mã OTP gửi đến <strong className="text-highlight">{email}</strong>
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
                        <div className="form-group">
                            <label>Nhập mã OTP (6 số)</label>
                            <div className="pin-input-container">
                                {otpValues.map((val, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => (inputRefs.current[index] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={val}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onPaste={handlePaste}
                                        className={`pin-box ${isOtpExpired ? 'input-error' : ''} ${messageType === 'error' && message.includes('OTP') ? 'input-error' : ''}`}
                                        disabled={loading || resendLoading || isOtpExpired || isRateLimited}
                                        autoComplete="one-time-code"
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
                        </div>

                        <div className="button-group">
                            <LoadingButton
                                type="button"
                                loading={loading}
                                loadingText="Đang xác thực..."
                                disabled={loading || resendLoading || isOtpExpired || isRateLimited}
                                className="btn-user"
                                spinnerColor="#000000"
                                onClick={handleVerifyOTP}
                            >
                                {isRateLimited ? `Đang chờ (${rateLimitTimeLeft}s)` : 'XÁC NHẬN OTP'}
                            </LoadingButton>

                            <LoadingButton
                                type="button"
                                loading={resendLoading}
                                loadingText="Đang gửi..."
                                disabled={loading || resendLoading || (countdown > 0 && !isOtpExpired) || isRateLimited}
                                className="btn-user btn-outline-secondary"
                                onClick={handleResendOTP}
                            >
                                <RefreshCw size={16} />
                                {isRateLimited ? `Đang chờ (${rateLimitTimeLeft}s)` : 'GỬI LẠI OTP'}
                            </LoadingButton>
                        </div>
                    </form>
                </div>

                <div className="auth-footer">
                    <button
                        type="button"
                        className="btn-link back-btn"
                        onClick={() => navigate('/forgot-password')}
                    >
                        <ArrowLeft size={16} />
                        Quay lại
                    </button>
                </div>
            </div>

            <ResetPasswordSuccessModal
                show={showSuccessModal}
                onClose={handleModalClose}
                onConfirm={handleModalConfirm}
            />
        </div>
    );
};

export default VerifyOTP;