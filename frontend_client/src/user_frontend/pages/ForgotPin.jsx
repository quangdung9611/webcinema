import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MailCheck, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import api from '../../api/api';
import LoadingButton from '../components/LoadingButton';

// 🆕 Import ForgotPinModal
import ForgotPinModal from '../components/ForgotPinModal';

import '../styles/UserAuth.css';

const ForgotPin = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [step, setStep] = useState('sent'); // 'sent' -> 'otp' -> 'newPin' -> 'success'
    const [otp, setOtp] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(60);

    // Lấy email từ sessionStorage (đã lưu ở bước đăng nhập hoặc đặt vé)
    const email = sessionStorage.getItem('userEmail') || '';

    // Lấy đường dẫn cần quay về (mặc định là /payment nếu có dữ liệu đặt vé, ngược lại là /)
    const returnTo = location.state?.returnTo || (sessionStorage.getItem('tempBookingId') ? '/payment' : '/');

    const otpRefs = useRef([]);
    const pinRefs = useRef([]);
    const confirmPinRefs = useRef([]);

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
    };

    const handlePinKeyDown = (index, e, type) => {
        if (e.key === 'Backspace' && (type === 'pin' ? !pin[index] : !confirmPin[index]) && index > 0) {
            if (type === 'pin') pinRefs.current[index - 1]?.focus();
            else confirmPinRefs.current[index - 1]?.focus();
        }
    };

    const handleResendOtp = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/api/auth/forgot-pin', { email });
            if (response.data.success) {
                setCountdown(60);
                setStep('otp');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể gửi lại OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!/^\d{6}$/.test(otp)) {
            setError('Vui lòng nhập đủ 6 số OTP');
            return;
        }

        setLoading(true);
        setError('');
        try {
            setStep('newPin');
        } catch (err) {
            setError(err.response?.data?.message || 'OTP không đúng');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePin = async () => {
        if (!/^\d{6}$/.test(pin)) {
            setError('Vui lòng nhập đủ 6 số PIN mới');
            return;
        }

        if (pin !== confirmPin) {
            setError('Mã PIN xác nhận không khớp');
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
                // ✅ Chuyển sang bước success để hiện modal thông báo
                setStep('success');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể đổi mã PIN');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>ĐỔI MÃ PIN</h2>
                <p className="auth-subtitle">
                    {step === 'sent' ? 'Vui lòng kiểm tra email' : step === 'otp' ? 'Nhập mã OTP' : step === 'newPin' ? 'Đặt mã PIN mới' : 'Hoàn tất'}
                </p>

                {step === 'sent' && (
                    <>
                        <div className="forgot-pin-icon">
                            <MailCheck size={36} color="#3b82f6" />
                        </div>
                        <p className="forgot-pin-text">
                            Hệ thống đã gửi mã OTP về email <strong>{email}</strong>.
                            <br />
                            Vui lòng kiểm tra hộp thư để xác thực.
                        </p>
                        <button className="forgot-pin-next-btn" onClick={() => setStep('otp')}>
                            Tiếp tục
                        </button>
                    </>
                )}

                {step === 'otp' && (
                    <>
                        <div className="forgot-pin-icon">
                            <ShieldCheck size={36} color="#3b82f6" />
                        </div>
                        <p className="forgot-pin-text">
                            Nhập mã OTP đã gửi đến <strong>{email}</strong>
                        </p>

                        <div className="forgot-pin-boxes">
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
                                    className="forgot-pin-box"
                                    disabled={loading}
                                />
                            ))}
                        </div>

                        <p className="forgot-pin-timer">
                            OTP hết hạn sau: <strong>{countdown}</strong> giây
                        </p>

                        <button className="forgot-pin-resend" onClick={handleResendOtp} disabled={loading || countdown > 0}>
                            <RefreshCw size={14} /> Gửi lại OTP
                        </button>

                        {error && <p className="forgot-pin-error">{error}</p>}

                        <div className="forgot-pin-actions">
                            <button className="forgot-pin-back" onClick={() => setStep('sent')}>
                                <ArrowLeft size={16} /> Quay lại
                            </button>
                            <LoadingButton
                                type="button"
                                loading={loading}
                                loadingText="Đang xác thực..."
                                onClick={handleVerifyOtp}
                                disabled={loading}
                                className="forgot-pin-confirm"
                            >
                                XÁC NHẬN
                            </LoadingButton>
                        </div>
                    </>
                )}

                {step === 'newPin' && (
                    <>
                        <div className="forgot-pin-icon">
                            <ShieldCheck size={36} color="#22c55e" />
                        </div>
                        <p className="forgot-pin-text">
                            Nhập mã PIN mới (6 số)
                        </p>

                        <div className="forgot-pin-boxes">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (pinRefs.current[index] = el)}
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={pin[index] || ''}
                                    onChange={(e) => handlePinChange(index, e.target.value, 'pin')}
                                    onKeyDown={(e) => handlePinKeyDown(index, e, 'pin')}
                                    className="forgot-pin-box"
                                    disabled={loading}
                                />
                            ))}
                        </div>

                        <p className="forgot-pin-text" style={{ marginTop: '15px' }}>
                            Xác nhận lại mã PIN mới
                        </p>

                        <div className="forgot-pin-boxes">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (confirmPinRefs.current[index] = el)}
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={confirmPin[index] || ''}
                                    onChange={(e) => handlePinChange(index, e.target.value, 'confirmPin')}
                                    onKeyDown={(e) => handlePinKeyDown(index, e, 'confirmPin')}
                                    className="forgot-pin-box"
                                    disabled={loading}
                                />
                            ))}
                        </div>

                        {error && <p className="forgot-pin-error">{error}</p>}

                        <div className="forgot-pin-actions">
                            <button className="forgot-pin-back" onClick={() => setStep('otp')}>
                                <ArrowLeft size={16} /> Quay lại
                            </button>
                            <LoadingButton
                                type="button"
                                loading={loading}
                                loadingText="Đang đổi PIN..."
                                onClick={handleChangePin}
                                disabled={loading}
                                className="forgot-pin-confirm"
                            >
                                XÁC NHẬN ĐỔI PIN
                            </LoadingButton>
                        </div>
                    </>
                )}
            </div>

            {/* 🆕 Hiển thị ForgotPinModal khi bước success */}
            <ForgotPinModal
                isOpen={step === 'success'}
                email={email}
            />
        </div>
    );
};

export default ForgotPin;