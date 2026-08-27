import React, { useState, useEffect, useRef } from 'react';
import { MailCheck, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import Modal from './Modal';
import LoadingButton from './LoadingButton';
import '../styles/ForgotPinModal.css'; // Import CSS riêng (bạn cần tạo file CSS này hoặc copy bên dưới)

const ForgotPinModal = ({
    isOpen,
    onClose = () => {},
    email = '',
    onPinChanged = () => {}, // Gọi khi đổi PIN thành công
    api = null, // Truyền api để gọi API (nếu không truyền thì dùng window.fetch)
}) => {
    const [step, setStep] = useState('sent'); // 'sent' -> 'otp' -> 'newPin' -> 'success'
    const [otp, setOtp] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const otpRefs = useRef([]);
    const pinRefs = useRef([]);
    const confirmPinRefs = useRef([]);

    // Reset khi mở modal
    useEffect(() => {
        if (isOpen) {
            setStep('sent');
            setOtp('');
            setPin('');
            setConfirmPin('');
            setError('');
            setCountdown(60);
        }
    }, [isOpen]);

    // Đếm ngược
    useEffect(() => {
        if (step === 'otp' && countdown > 0) {
            const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [step, countdown]);

    // Xử lý nhập OTP
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

    // Xử lý nhập PIN mới
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

    // Gửi lại OTP
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

    // Nhập OTP -> Chuyển sang bước nhập PIN mới
    const handleVerifyOtp = async () => {
        if (!/^\d{6}$/.test(otp)) {
            setError('Vui lòng nhập đủ 6 số OTP');
            return;
        }

        setLoading(true);
        setError('');
        try {
            // Kiểm tra OTP (tạm thời dùng trực tiếp không gọi API vì bước này sẽ gộp vào bước đổi PIN)
            // Hoặc bạn có thể gọi API verify-otp riêng nếu có
            setStep('newPin');
        } catch (err) {
            setError(err.response?.data?.message || 'OTP không đúng');
        } finally {
            setLoading(false);
        }
    };

    // Đổi PIN mới
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
            // Gọi API đổi PIN
            const response = await api.post('/api/auth/verify-otp-and-change-pin', {
                email,
                otp,
                newPin: pin
            });

            if (response.data.success) {
                setStep('success');
                onPinChanged(); // Gọi callback để báo cho Parent biết đã đổi PIN
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể đổi mã PIN');
        } finally {
            setLoading(false);
        }
    };

    // Đóng modal khi thành công
    const handleSuccessClose = () => {
        onClose();
        setStep('sent'); // Reset về bước đầu
    };

    return (
        <Modal
            show={isOpen}
            onClose={onClose}
            onConfirm={step === 'success' ? handleSuccessClose : undefined}
            onCancel={onClose}
            type="info"
            title="QUÊN MÃ PIN"
            confirmText={step === 'success' ? "Đã hiểu" : undefined}
            cancelText="Đóng"
            className="forgot-pin-modal"
        >
            <div className="forgot-pin-body">
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

                        {/* Ô nhập PIN mới */}
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

                        {/* Ô xác nhận PIN mới */}
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

                {step === 'success' && (
                    <>
                        <div className="forgot-pin-icon success">
                            <ShieldCheck size={40} color="#22c55e" />
                        </div>
                        <p className="forgot-pin-text">
                            Đổi mã PIN thành công!
                        </p>
                        <p className="forgot-pin-subtext">
                            Bạn có thể sử dụng mã PIN mới để thanh toán.
                        </p>
                        <button className="forgot-pin-next-btn" onClick={handleSuccessClose}>
                            Đã hiểu
                        </button>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default ForgotPinModal;