import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MailCheck, ShieldCheck, ArrowLeft, RefreshCw, Eye, EyeOff, AlertCircle } from 'lucide-react';
import api from '../../api/api';
import LoadingButton from '../components/LoadingButton';
import ForgotPinModal from '../components/ForgotPinModal';
import { useAuth } from '../../context/AuthContext'; // ✅ Import useAuth
import '../styles/UserAuth.css';

const ForgotPin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth(); // ✅ Lấy user từ AuthContext

    const [step, setStep] = useState('sent'); // 'sent' -> 'otp' -> 'newPin' -> 'success'
    const [otp, setOtp] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [showPin, setShowPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);

    // ✅ SỬA: Lấy email từ user (useAuth) thay vì sessionStorage
    const email = user?.email || '';

    // Lấy đường dẫn cần quay về (mặc định là /payment nếu có dữ liệu đặt vé, ngược lại là /)
    const returnTo = location.state?.returnTo || (sessionStorage.getItem('tempBookingId') ? '/payment' : '/');

    const otpRefs = useRef([]);
    const pinRefs = useRef([]);
    const confirmPinRefs = useRef([]);

    // 🔥 Rate limit states (giữ nguyên logic cũ)
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState(0);

    // 🔥 Countdown timer cho rate limit
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

    // ✅ Nếu không có email -> về login
    useEffect(() => {
        if (!email) {
            navigate('/login');
        }
    }, [email, navigate]);

    useEffect(() => {
        setStep('sent');
        setOtp('');
        setPin('');
        setConfirmPin('');
        setError('');
        setCountdown(60);
    }, []);

    useEffect(() => {
        if (step === 'otp' && countdown > 0) {
            const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [step, countdown]);

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

    const handlePinChange = (index, value, type) => {
        const clean = value.replace(/\D/g, '').slice(-1);
        if (type === 'pin') {
            const newPin = pin.split('');
            newPin[index] = clean;
            setPin(newPin.join(''));
            if (clean && index < 5) pinRefs.current[index + 1]?.focus();
        } else {
            const newConfirm = confirmPin.split('');
            newConfirm[index] = clean;
            setConfirmPin(newConfirm.join(''));
            if (clean && index < 5) confirmPinRefs.current[index + 1]?.focus();
        }
        if (error) setError('');
    };

    const handlePinKeyDown = (index, e, type) => {
        if (e.key === 'Backspace' && (type === 'pin' ? !pin[index] : !confirmPin[index]) && index > 0) {
            if (type === 'pin') pinRefs.current[index - 1]?.focus();
            else confirmPinRefs.current[index - 1]?.focus();
        }
    };

    // ✅ GIỮ NGUYÊN LOGIC: Gửi OTP lần đầu (nếu cần)
    const handleSendOtp = async () => {
        if (isRateLimited) {
            setError(`⚠️ Vui lòng đợi ${rateLimitTimeLeft} giây trước khi thử lại.`);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await api.post('/api/auth/forgot-pin', { email });
            if (response.data.success) {
                setCountdown(60);
                setStep('otp');
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

    // ✅ GIỮ NGUYÊN LOGIC: Gửi lại OTP
    const handleResendOtp = async () => {
        if (isRateLimited) {
            setError(`⚠️ Vui lòng đợi ${rateLimitTimeLeft} giây trước khi thử lại.`);
            return;
        }

        if (countdown > 0) {
            setError(`⚠️ Vui lòng đợi ${countdown} giây trước khi gửi lại.`);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await api.post('/api/auth/forgot-pin', { email });
            if (response.data.success) {
                setCountdown(60);
                setError('');
            }
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'Không thể gửi lại OTP';
            
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

    // ✅ GIỮ NGUYÊN LOGIC: Xác thực OTP
    const handleVerifyOtp = async () => {
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
            // ✅ Gọi API verify OTP (chỉ verify, chưa đổi PIN)
            const response = await api.post('/api/auth/verify-otp-and-change-pin', {
                email,
                otp,
                newPin: '' // Gửi chuỗi rỗng để chỉ verify OTP
            });

            if (response.data.success) {
                setStep('newPin');
                setError('');
            }
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'OTP không đúng';
            
            if (status === 429) {
                const remainingSeconds = errorData.data?.remainingSeconds || 60;
                const maxAttempts = errorData.data?.maxAttempts || 5;
                setError(`⚠️ Bạn chỉ được thử tối đa ${maxAttempts} lần. Vui lòng thử lại sau ${remainingSeconds} giây.`);
                setIsRateLimited(true);
                setRateLimitTimeLeft(remainingSeconds);
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    // ✅ GIỮ NGUYÊN LOGIC: Đổi PIN
    const handleChangePin = async () => {
        if (!/^\d{6}$/.test(pin)) {
            setError('Vui lòng nhập đủ 6 số PIN mới');
            return;
        }

        if (pin !== confirmPin) {
            setError('Mã PIN xác nhận không khớp');
            return;
        }

        if (isRateLimited) {
            setError(`⚠️ Vui lòng đợi ${rateLimitTimeLeft} giây trước khi thử lại.`);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await api.post('/api/auth/verify-otp-and-change-pin', {
                email,
                otp,
                newPin: pin
            });

            if (response.data.success) {
                setStep('success');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Không thể đổi mã PIN';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // ✅ Khi modal thành công đóng, quay lại Payment
    const handleSuccessModalClose = () => {
        setStep('sent');
        navigate('/payment', { 
            state: { 
                fromForgotPin: true,
                ...location.state 
            } 
        });
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>ĐỔI MÃ PIN</h2>
                <p className="auth-subtitle">
                    {step === 'sent' ? 'Vui lòng kiểm tra email' : 
                     step === 'otp' ? 'Nhập mã OTP' : 
                     step === 'newPin' ? 'Đặt mã PIN mới' : 'Hoàn tất'}
                </p>

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
                        <p className="auth-subtitle" style={{ marginBottom: '20px' }}>
                            Hệ thống đã gửi mã OTP về email <strong className="text-highlight">{email}</strong>.
                            <br />
                            Vui lòng kiểm tra hộp thư để xác thực.
                        </p>
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
                                    className={`pin-box ${error && error.includes('OTP') ? 'input-error' : ''}`}
                                    disabled={loading || isRateLimited}
                                />
                            ))}
                        </div>

                        <div className="input-hint center-text">
                            ⏳ OTP hết hạn sau: <strong style={{ color: countdown <= 10 ? '#ff6b8a' : '#4ade80' }}>{countdown}</strong> giây
                        </div>

                        <button 
                            className="btn-user btn-outline-secondary" 
                            onClick={handleResendOtp} 
                            disabled={loading || countdown > 0 || isRateLimited}
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
                                disabled={loading || isRateLimited}
                                className="btn-user"
                                spinnerColor="#000000"
                            >
                                {isRateLimited ? `Đang chờ (${rateLimitTimeLeft}s)` : 'XÁC NHẬN'}
                            </LoadingButton>
                        </div>
                    </>
                )}

                {step === 'newPin' && (
                    <>
                        <div className="forgot-icon-wrapper">
                            <ShieldCheck size={42} className="forgot-icon" style={{ color: '#4ade80' }} />
                        </div>
                        <p className="auth-subtitle">Nhập mã PIN mới (6 số)</p>

                        <div className="form-group">
                            <label>Mã PIN mới</label>
                            <div className="password-wrapper">
                                <input
                                    type={showPin ? 'text' : 'password'}
                                    className="auth-input"
                                    placeholder="Nhập 6 chữ số"
                                    value={pin}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setPin(value);
                                        if (error) setError('');
                                    }}
                                    disabled={loading}
                                    style={{ letterSpacing: '8px', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--fw-bold)' }}
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPin(!showPin)}
                                    tabIndex="-1"
                                    disabled={loading}
                                >
                                    {showPin ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Xác nhận mã PIN mới</label>
                            <div className="password-wrapper">
                                <input
                                    type={showConfirmPin ? 'text' : 'password'}
                                    className="auth-input"
                                    placeholder="Nhập lại 6 chữ số"
                                    value={confirmPin}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setConfirmPin(value);
                                        if (error) setError('');
                                    }}
                                    disabled={loading}
                                    style={{ letterSpacing: '8px', fontSize: 'var(--font-size-xl)', fontWeight: 'var(--fw-bold)' }}
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                                    tabIndex="-1"
                                    disabled={loading}
                                >
                                    {showConfirmPin ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            </div>
                            {pin && confirmPin && pin.length === 6 && confirmPin.length === 6 && pin !== confirmPin && (
                                <span className="error-text">Mã PIN xác nhận không khớp</span>
                            )}
                        </div>

                        <div className="button-group" style={{ marginTop: '20px' }}>
                            <button className="btn-user back-btn" onClick={() => setStep('otp')}>
                                <ArrowLeft size={16} /> Quay lại
                            </button>
                            <LoadingButton
                                type="button"
                                loading={loading}
                                loadingText="Đang đổi PIN..."
                                onClick={handleChangePin}
                                disabled={loading || pin.length < 6 || confirmPin.length < 6 || pin !== confirmPin || isRateLimited}
                                className="btn-user"
                                spinnerColor="#000000"
                            >
                                {isRateLimited ? `Đang chờ (${rateLimitTimeLeft}s)` : 'XÁC NHẬN ĐỔI PIN'}
                            </LoadingButton>
                        </div>
                    </>
                )}
            </div>

            <ForgotPinModal
                isOpen={step === 'success'}
                onClose={handleSuccessModalClose}
                email={email}
            />
        </div>
    );
};

export default ForgotPin;