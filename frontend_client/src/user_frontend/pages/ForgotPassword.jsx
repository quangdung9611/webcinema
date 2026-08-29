// ForgotPassword.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailCheck, ShieldCheck, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../../api/api';
import LoadingButton from '../components/LoadingButton';
import LockModal from '../components/LockModal';
import '../styles/UserAuth.css';

const ForgotPassword = () => {
    const navigate = useNavigate();

    const [step, setStep] = useState('sent');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(300);
    const [isOtpExpired, setIsOtpExpired] = useState(false);
    const [otpAttempts, setOtpAttempts] = useState(0);
    const [showLockModal, setShowLockModal] = useState(false);
    const [lockMessage, setLockMessage] = useState('');

    const [showLockTimer, setShowLockTimer] = useState(false);
    const [lockTimeLeft, setLockTimeLeft] = useState(0);
    const [lockUntil, setLockUntil] = useState(null);

    const [email, setEmail] = useState('');
    const otpRefs = useRef([]);
    const intervalRef = useRef(null);
    const lockIntervalRef = useRef(null);

    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

    // Rate limit timer
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

    // Lock timer - DÙNG remainingSeconds THỰC TẾ
    useEffect(() => {
        if (!showLockTimer || !lockUntil) return;

        const tick = () => {
            const left = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
            setLockTimeLeft(left);
            setRateLimitTimeLeft(left);

            if (left <= 0) {
                setShowLockTimer(false);
                setLockTimeLeft(0);
                setLockUntil(null);
                setIsRateLimited(false);
                setRateLimitTimeLeft(0);
                setShowLockModal(false);
                setError('✅ Bạn đã được mở khóa. Vui lòng thử gửi OTP lại.');
                setTimeout(() => setError(''), 5000);
            }
        };

        tick();
        lockIntervalRef.current = setInterval(tick, 1000);

        return () => {
            if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
        };
    }, [showLockTimer, lockUntil]);

    // ✅ Đồng bộ TTL từ Redis MỖI 1 GIÂY - KHÔNG TỰ ĐẾM
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
        intervalRef.current = setInterval(syncTTL, 1000);

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
        setOtpAttempts(0);
        setShowLockModal(false);
        setShowLockTimer(false);
        setLockTimeLeft(0);
        setLockUntil(null);
        setIsRateLimited(false);
        setRateLimitTimeLeft(0);
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

    const formatLockTime = (totalSeconds) => {
        if (totalSeconds <= 0) return '0:00';
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const formatTime = (seconds) => {
        if (seconds <= 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isLocked = showLockTimer && lockUntil && lockUntil > Date.now();

    // Gửi OTP
    const handleSendOtp = async () => {
        if (!email.trim()) {
            setError('Vui lòng nhập email');
            return;
        }

        if (isRateLimited) {
            setError(`⚠️ Vui lòng đợi ${formatLockTime(rateLimitTimeLeft)} trước khi thử lại.`);
            return;
        }

        if (isLocked) {
            setError(`⚠️ Bạn đã bị khóa. Vui lòng đợi ${formatLockTime(lockTimeLeft)} để thử lại.`);
            return;
        }

        setLoading(true);
        setError('');
        setOtpAttempts(0);
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
                // ✅ Lấy remainingSeconds THỰC TẾ từ response
                const remainingSeconds = errorData.data?.remainingSeconds || 300;
                const maxAttempts = errorData.data?.maxAttempts || 3;
                
                const lockUntilTimestamp = Date.now() + remainingSeconds * 1000;
                setShowLockTimer(true);
                setLockTimeLeft(remainingSeconds);
                setLockUntil(lockUntilTimestamp);
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
                
                setError(`⚠️ Bạn chỉ được gửi tối đa ${maxAttempts} lần trong 5 phút. Vui lòng thử lại sau ${formatLockTime(remainingSeconds)}.`);
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    // Gửi lại OTP
    const handleResendOtp = async () => {
        if (isRateLimited) {
            setError(`⚠️ Vui lòng đợi ${formatLockTime(rateLimitTimeLeft)} trước khi thử lại.`);
            return;
        }

        if (isLocked) {
            setError(`⚠️ Bạn đã bị khóa. Vui lòng đợi ${formatLockTime(lockTimeLeft)} để thử lại.`);
            return;
        }

        if (countdown > 0 && !isOtpExpired) {
            setError(`⚠️ Vui lòng đợi ${formatTime(countdown)} trước khi gửi lại.`);
            return;
        }

        setLoading(true);
        setError('');
        setOtpAttempts(0);
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
                // ✅ Lấy remainingSeconds THỰC TẾ từ response
                const remainingSeconds = errorData.data?.remainingSeconds || 300;
                const lockUntilTimestamp = Date.now() + remainingSeconds * 1000;
                setShowLockTimer(true);
                setLockTimeLeft(remainingSeconds);
                setLockUntil(lockUntilTimestamp);
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
                
                setError(`⚠️ Vui lòng thử lại sau ${formatLockTime(remainingSeconds)}.`);
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

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
            setError(`⚠️ Vui lòng đợi ${formatLockTime(rateLimitTimeLeft)} trước khi thử lại.`);
            return;
        }

        if (isLocked) {
            setError(`⚠️ Bạn đã bị khóa. Vui lòng đợi ${formatLockTime(lockTimeLeft)} để thử lại.`);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await api.post('/api/auth/verify-otp-and-reset', {
                email,
                otp,
                newPassword: ''
            });

            if (response.data.success) {
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
            
            const newAttempts = otpAttempts + 1;
            setOtpAttempts(newAttempts);
            const remainingAttempts = 5 - newAttempts;
            
            if (status === 429) {
                const remainingSeconds = errorData.data?.remainingSeconds || 300;
                errorMessage = `⚠️ Vui lòng thử lại sau ${formatLockTime(remainingSeconds)}.`;
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
            } else if (errorMessage.includes('hết hạn')) {
                setIsOtpExpired(true);
                setCountdown(0);
            } else {
                if (remainingAttempts > 0) {
                    errorMessage = `❌ OTP không đúng. Bạn còn ${remainingAttempts} lần thử.`;
                } else {
                    errorMessage = `❌ Bạn đã nhập sai 5 lần. Tài khoản đã bị khóa 5 phút.`;
                    
                    const lockDuration = 300;
                    const lockUntilTimestamp = Date.now() + lockDuration * 1000;
                    setShowLockTimer(true);
                    setLockTimeLeft(lockDuration);
                    setLockUntil(lockUntilTimestamp);
                    
                    setLockMessage('Bạn đã nhập sai OTP quá nhiều lần. Vui lòng đợi hết thời gian khóa để thử lại.');
                    setShowLockModal(true);
                    setOtpAttempts(0);
                }
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
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
                                disabled={loading || isRateLimited || isLocked}
                                autoComplete="email"
                            />
                        </div>
                        <div className="button-group">
                            <LoadingButton
                                type="button"
                                loading={loading}
                                loadingText="Đang gửi..."
                                onClick={handleSendOtp}
                                disabled={loading || isRateLimited || isLocked}
                                className="btn-user"
                                spinnerColor="#000000"
                            >
                                {isLocked ? (
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
                                ) : isRateLimited ? (
                                    `Đang chờ (${formatLockTime(rateLimitTimeLeft)})`
                                ) : (
                                    'GỬI OTP'
                                )}
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

                        {otpAttempts > 0 && !isLocked && !showLockModal && (
                            <div style={{ 
                                textAlign: 'center', 
                                marginBottom: '10px',
                                fontSize: '14px',
                                color: otpAttempts >= 3 ? '#ff6b8a' : '#fbbf24'
                            }}>
                                ⚠️ Bạn đã nhập sai {otpAttempts}/5 lần. Còn {5 - otpAttempts} lần thử.
                            </div>
                        )}

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
                                    disabled={loading || isRateLimited || isOtpExpired || isLocked || showLockModal}
                                />
                            ))}
                        </div>

                        {!isLocked && !showLockModal && (
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
                        )}

                        {isLocked && (
                            <div className="input-hint center-text">
                                <span style={{ color: '#ff6b8a' }}>
                                    🔒 Tài khoản bị khóa. Vui lòng đợi <strong>{formatLockTime(lockTimeLeft)}</strong> để thử lại.
                                </span>
                            </div>
                        )}

                        <button 
                            className="btn-user btn-outline-secondary" 
                            onClick={handleResendOtp} 
                            disabled={loading || (countdown > 0 && !isOtpExpired) || isRateLimited || isLocked || showLockModal}
                            style={{ marginTop: '10px' }}
                        >
                            <RefreshCw size={16} /> 
                            {isLocked ? (
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
                            ) : isRateLimited ? (
                                `Đang chờ (${formatLockTime(rateLimitTimeLeft)})`
                            ) : (
                                'Gửi lại OTP'
                            )}
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
                                disabled={loading || isRateLimited || isOtpExpired || isLocked || showLockModal}
                                className="btn-user"
                                spinnerColor="#000000"
                            >
                                {isLocked ? (
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
                                ) : isRateLimited ? (
                                    `Đang chờ (${formatLockTime(rateLimitTimeLeft)})`
                                ) : (
                                    'XÁC NHẬN'
                                )}
                            </LoadingButton>
                        </div>
                    </>
                )}
            </div>

            <LockModal
                show={showLockModal}
                message={lockMessage || 'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng đợi hết thời gian khóa để thử lại.'}
                email={email}
                onClose={() => {
                    setShowLockModal(false);
                }}
                onResend={() => {
                    setShowLockModal(false);
                    handleResendOtp();
                }}
            />
        </div>
    );
};

export default ForgotPassword;