// ResetPin.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import api from '../../api/api';
import LoadingButton from '../components/LoadingButton';
import ForgotPinModal from '../components/ForgotPinModal';
import useOTPGuard from '../../hooks/useOTPGuard'; // 🔥 IMPORT
import '../styles/UserAuth.css';

const ResetPin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const email = location.state?.email || '';
    const otp = location.state?.otp || '';
    const returnTo = location.state?.returnTo || '/';
    const purpose = 'FORGOT_PIN';

    // 🔥 SỬ DỤNG useOTPGuard
    const { safeNavigate } = useOTPGuard(email, purpose, {
        onInvalidate: () => {
            console.log('🔴 [RESET PIN] OTP đã bị vô hiệu do rời trang');
        }
    });

    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isCheckingOTP, setIsCheckingOTP] = useState(true);
    const [isOtpValid, setIsOtpValid] = useState(false);

    const pinRefs = useRef([]);
    const confirmPinRefs = useRef([]);

    // ============================================================
    // 🔥 KIỂM TRA OTP CÒN HIỆU LỰC KHI VÀO TRANG
    // ============================================================
    useEffect(() => {
        const checkOTP = async () => {
            if (!email || !otp) {
                safeNavigate('/forgot-pin');
                return;
            }

            try {
                setIsCheckingOTP(true);
                const response = await api.get('/api/auth/check-otp-ttl', {
                    params: { email, purpose }
                });

                const data = response.data?.data;
                if (data?.exists && data?.expiresIn > 0) {
                    setIsOtpValid(true);
                } else {
                    setError('❌ Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.');
                    setTimeout(() => {
                        safeNavigate('/forgot-pin', {
                            state: { error: 'Mã OTP đã hết hạn. Vui lòng gửi lại.' }
                        });
                    }, 3000);
                }
            } catch (error) {
                console.error('❌ [RESET PIN] Check OTP error:', error);
                setError('❌ Không thể kiểm tra OTP. Vui lòng thử lại.');
                setTimeout(() => {
                    safeNavigate('/forgot-pin');
                }, 3000);
            } finally {
                setIsCheckingOTP(false);
            }
        };

        checkOTP();
    }, [email, otp, purpose, safeNavigate]);

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
                setShowSuccessModal(true);
            }
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            const errorMessage = errorData.message || 'Không thể đổi mã PIN';
            const field = errorData?.field;

            if (status === 404) {
                setError('❌ Email này chưa được đăng ký trong hệ thống.');
            } else if (status === 400 && errorMessage?.toLowerCase().includes('otp')) {
                setError('❌ Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới.');
            } else if (field === 'newPin') {
                setError(errorMessage);
            } else if (status === 403) {
                setError('🔒 Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.');
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        setShowSuccessModal(false);
        safeNavigate(returnTo);
    };

    // 🔥 HIỂN THỊ LOADING KHI KIỂM TRA OTP
    if (isCheckingOTP) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h2>ĐỔI MÃ PIN</h2>
                    <p className="auth-subtitle">⏳ Đang kiểm tra mã OTP...</p>
                    <div className="loading-spinner" style={{ textAlign: 'center', padding: '20px' }}>
                        <div className="spinner"></div>
                    </div>
                </div>
            </div>
        );
    }

    // 🔥 NẾU OTP KHÔNG HỢP LỆ, KHÔNG HIỂN THỊ FORM
    if (!isOtpValid) {
        return null;
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>ĐỔI MÃ PIN</h2>
                <p className="auth-subtitle">
                    Nhập mã PIN mới (6 số) cho tài khoản <strong className="text-highlight">{email}</strong>
                </p>

                {error && (
                    <div className="error-message">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="form-group">
                    <label>Mã PIN mới</label>
                    <div className="pin-wrapper">
                        <div className="pin-input-container">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (pinRefs.current[index] = el)}
                                    type={showPin ? 'text' : 'password'}
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={pin[index] || ''}
                                    onChange={(e) => handlePinChange(index, e.target.value, 'pin')}
                                    onKeyDown={(e) => handlePinKeyDown(index, e, 'pin')}
                                    className="pin-box"
                                    disabled={loading}
                                />
                            ))}
                        </div>
                        <button
                            type="button"
                            className="pin-toggle-btn"
                            onClick={() => setShowPin(!showPin)}
                            disabled={loading}
                        >
                            {showPin ? <Eye size={18} /> : <EyeOff size={18} />}
                            <span>{showPin ? 'Ẩn PIN' : 'Hiện PIN'}</span>
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label>Xác nhận mã PIN mới</label>
                    <div className="pin-wrapper">
                        <div className="pin-input-container">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <input
                                    key={index}
                                    ref={(el) => (confirmPinRefs.current[index] = el)}
                                    type={showConfirmPin ? 'text' : 'password'}
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={confirmPin[index] || ''}
                                    onChange={(e) => handlePinChange(index, e.target.value, 'confirm')}
                                    onKeyDown={(e) => handlePinKeyDown(index, e, 'confirm')}
                                    className="pin-box"
                                    disabled={loading}
                                />
                            ))}
                        </div>
                        <button
                            type="button"
                            className="pin-toggle-btn"
                            onClick={() => setShowConfirmPin(!showConfirmPin)}
                            disabled={loading}
                        >
                            {showConfirmPin ? <Eye size={18} /> : <EyeOff size={18} />}
                            <span>{showConfirmPin ? 'Ẩn PIN' : 'Hiện PIN'}</span>
                        </button>
                    </div>
                    {pin && confirmPin && pin.length === 6 && confirmPin.length === 6 && pin !== confirmPin && (
                        <span className="error-text">Mã PIN xác nhận không khớp</span>
                    )}
                </div>

                <div className="button-group">
                    <button 
                        className="btn-user btn-back" 
                        onClick={() => safeNavigate('/forgot-pin')}
                        disabled={loading}
                    >
                        <ArrowLeft size={16} /> Quay lại
                    </button>
                    <LoadingButton
                        type="button"
                        loading={loading}
                        loadingText="Đang đổi PIN..."
                        onClick={handleChangePin}
                        disabled={loading || pin.length < 6 || confirmPin.length < 6 || pin !== confirmPin}
                        className="btn-user btn-user-silver"
                        spinnerColor="#000000"
                    >
                        XÁC NHẬN ĐỔI PIN
                    </LoadingButton>
                </div>
            </div>

            <ForgotPinModal
                isOpen={showSuccessModal}
                onClose={handleModalClose}
                email={email}
            />
        </div>
    );
};

export default ResetPin;