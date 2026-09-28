// user_frontend/pages/ResetPin.jsx
// ============================================================
// RESET PIN — PREMIUM CINEMATIC SILVER
// Layout: form card ở giữa màn hình
// Giữ nguyên 100% logic
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import {
    ArrowLeft,
    Eye,
    EyeOff,
    AlertCircle,
    Film,
    KeyRound,
    ShieldCheck,
    Loader2,
} from 'lucide-react';

import api from '../../api/api';
import LoadingButton from '../components/LoadingButton';
import ForgotPinModal from '../components/ForgotPinModal';
import useOTPGuard from '../../hooks/useOTPGuard';
import '../styles/ResetPassword.css';

const ResetPin = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const email = location.state?.email || '';
    const otp = location.state?.otp || '';
    const returnTo = location.state?.returnTo || '/';
    const purpose = 'FORGOT_PIN';

    const { safeNavigate } = useOTPGuard(email, purpose, {
        onInvalidate: () => {
            console.log(
                '🔴 [RESET PIN] OTP đã bị vô hiệu do rời trang'
            );
        },
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
    // CHECK OTP ON MOUNT
    // ============================================================
    useEffect(() => {
        const checkOTP = async () => {
            if (!email || !otp) {
                safeNavigate('/forgot-pin');
                return;
            }

            try {
                setIsCheckingOTP(true);
                const response = await api.get(
                    '/api/auth/check-otp-ttl',
                    {
                        params: { email, purpose },
                    }
                );

                const data = response.data?.data;
                if (data?.exists && data?.expiresIn > 0) {
                    setIsOtpValid(true);
                } else {
                    setError(
                        'Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.'
                    );
                    setTimeout(() => {
                        safeNavigate('/forgot-pin', {
                            state: {
                                error:
                                    'Mã OTP đã hết hạn. Vui lòng gửi lại.',
                            },
                        });
                    }, 3000);
                }
            } catch (error) {
                console.error(
                    '❌ [RESET PIN] Check OTP error:',
                    error
                );
                setError(
                    'Không thể kiểm tra OTP. Vui lòng thử lại.'
                );
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
            if (clean && index < 5)
                pinRefs.current[index + 1]?.focus();
        } else {
            const newConfirm = confirmPin.split('');
            newConfirm[index] = clean;
            setConfirmPin(newConfirm.join(''));
            if (clean && index < 5)
                confirmPinRefs.current[index + 1]?.focus();
        }
        if (error) setError('');
    };

    const handlePinKeyDown = (index, e, type) => {
        if (
            e.key === 'Backspace' &&
            (type === 'pin' ? !pin[index] : !confirmPin[index]) &&
            index > 0
        ) {
            if (type === 'pin')
                pinRefs.current[index - 1]?.focus();
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
            const response = await api.post(
                '/api/auth/verify-otp-and-change-pin',
                {
                    email,
                    otp,
                    newPin: pin,
                }
            );

            if (response.data.success) {
                setShowSuccessModal(true);
            }
        } catch (err) {
            const status = err.response?.status;
            const errorData = err.response?.data || {};
            const errorMessage =
                errorData.message || 'Không thể đổi mã PIN';
            const field = errorData?.field;

            if (status === 404) {
                setError(
                    'Email này chưa được đăng ký trong hệ thống.'
                );
            } else if (
                status === 400 &&
                errorMessage?.toLowerCase().includes('otp')
            ) {
                setError(
                    'Mã OTP không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã mới.'
                );
            } else if (field === 'newPin') {
                setError(errorMessage);
            } else if (status === 403) {
                setError(
                    'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.'
                );
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

    // ============================================================
    // LOADING STATE
    // ============================================================
    if (isCheckingOTP) {
        return (
            <div className="reset-page">
                <div className="reset-page__logo">
                    <Film size={20} strokeWidth={2.4} />
                    <span>Cinema Star</span>
                </div>

                <div className="reset-shell">
                    <div className="reset-card">
                        <div className="reset-card__header">
                            <div className="reset-card__icon">
                                <KeyRound
                                    size={30}
                                    strokeWidth={2}
                                />
                            </div>

                            <div className="reset-card__eyebrow">
                                RESET PIN
                            </div>

                            <h1 className="reset-card__title">
                                ĐỔI MÃ PIN
                            </h1>

                            <p className="reset-card__subtitle">
                                Đang kiểm tra mã OTP...
                            </p>
                        </div>

                        <div className="reset-loading">
                            <Loader2
                                size={20}
                                className="reset-spin"
                            />
                            <span>Đang xác thực OTP...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isOtpValid) {
        return null;
    }

    const isPinMismatch =
        pin &&
        confirmPin &&
        pin.length === 6 &&
        confirmPin.length === 6 &&
        pin !== confirmPin;

    // ============================================================
    // MAIN FORM
    // ============================================================
    return (
        <div className="reset-page">
            <div className="reset-page__logo">
                <Film size={20} strokeWidth={2.4} />
                <span>Cinema Star</span>
            </div>

            <div className="reset-shell">
                <div className="reset-card">
                    <div className="reset-card__header">
                        <div className="reset-card__icon">
                            <KeyRound
                                size={30}
                                strokeWidth={2}
                            />
                        </div>

                        <div className="reset-card__eyebrow">
                            RESET PIN
                        </div>

                        <h1 className="reset-card__title">
                            ĐỔI MÃ PIN
                        </h1>

                        <p className="reset-card__subtitle">
                            Nhập mã PIN mới (6 số) cho tài khoản{' '}
                            <strong className="reset-card__email">
                                {email}
                            </strong>
                        </p>
                    </div>

                    {error && (
                        <div className="reset-alert reset-alert--error">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* NEW PIN */}
                    <div className="reset-field">
                        <label className="reset-field__label">
                            <span>Mã PIN mới</span>
                            <small>6 chữ số</small>
                        </label>

                        <div className="reset-pin-wrapper">
                            <div className="reset-pin-inputs">
                                {Array.from({ length: 6 }).map(
                                    (_, index) => (
                                        <input
                                            key={index}
                                            ref={(el) =>
                                                (pinRefs.current[
                                                    index
                                                ] = el)
                                            }
                                            type={
                                                showPin
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={
                                                pin[index] || ''
                                            }
                                            onChange={(e) =>
                                                handlePinChange(
                                                    index,
                                                    e.target
                                                        .value,
                                                    'pin'
                                                )
                                            }
                                            onKeyDown={(e) =>
                                                handlePinKeyDown(
                                                    index,
                                                    e,
                                                    'pin'
                                                )
                                            }
                                            className={`reset-pin-input ${
                                                pin[index]
                                                    ? 'reset-pin-input--filled'
                                                    : ''
                                            }`}
                                            disabled={loading}
                                            autoComplete="one-time-code"
                                            aria-label={`PIN digit ${
                                                index + 1
                                            }`}
                                        />
                                    )
                                )}
                            </div>

                            <button
                                type="button"
                                className="reset-pin-toggle"
                                onClick={() =>
                                    setShowPin((prev) => !prev)
                                }
                                disabled={loading}
                                tabIndex="-1"
                                aria-label="Hiện hoặc ẩn PIN"
                            >
                                {showPin ? (
                                    <EyeOff size={16} />
                                ) : (
                                    <Eye size={16} />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* CONFIRM PIN */}
                    <div className="reset-field">
                        <label className="reset-field__label">
                            <span>Xác nhận mã PIN mới</span>
                            <small>Nhập lại chính xác</small>
                        </label>

                        <div className="reset-pin-wrapper">
                            <div className="reset-pin-inputs">
                                {Array.from({ length: 6 }).map(
                                    (_, index) => (
                                        <input
                                            key={index}
                                            ref={(el) =>
                                                (confirmPinRefs.current[
                                                    index
                                                ] = el)
                                            }
                                            type={
                                                showConfirmPin
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={
                                                confirmPin[index] ||
                                                ''
                                            }
                                            onChange={(e) =>
                                                handlePinChange(
                                                    index,
                                                    e.target
                                                        .value,
                                                    'confirm'
                                                )
                                            }
                                            onKeyDown={(e) =>
                                                handlePinKeyDown(
                                                    index,
                                                    e,
                                                    'confirm'
                                                )
                                            }
                                            className={`reset-pin-input ${
                                                confirmPin[index]
                                                    ? 'reset-pin-input--filled'
                                                    : ''
                                            } ${
                                                isPinMismatch
                                                    ? 'reset-pin-input--error'
                                                    : ''
                                            }`}
                                            disabled={loading}
                                            autoComplete="one-time-code"
                                            aria-label={`Confirm PIN digit ${
                                                index + 1
                                            }`}
                                        />
                                    )
                                )}
                            </div>

                            <button
                                type="button"
                                className="reset-pin-toggle"
                                onClick={() =>
                                    setShowConfirmPin(
                                        (prev) => !prev
                                    )
                                }
                                disabled={loading}
                                tabIndex="-1"
                                aria-label="Hiện hoặc ẩn PIN xác nhận"
                            >
                                {showConfirmPin ? (
                                    <EyeOff size={16} />
                                ) : (
                                    <Eye size={16} />
                                )}
                            </button>
                        </div>

                        {isPinMismatch && (
                            <span className="reset-field__error">
                                Mã PIN xác nhận không khớp
                            </span>
                        )}
                    </div>

                    {/* ACTIONS */}
                    <div className="reset-actions">
                        <button
                            type="button"
                            className="reset-back"
                            onClick={() =>
                                safeNavigate('/forgot-pin')
                            }
                            disabled={loading}
                        >
                            <ArrowLeft size={14} />
                            QUAY LẠI
                        </button>

                        <LoadingButton
                            type="button"
                            loading={loading}
                            loadingText="ĐANG ĐỔI PIN..."
                            onClick={handleChangePin}
                            disabled={
                                loading ||
                                pin.length < 6 ||
                                confirmPin.length < 6 ||
                                pin !== confirmPin
                            }
                            className="reset-submit"
                            spinnerColor="#0a0a0b"
                        >
                            <span>XÁC NHẬN ĐỔI PIN</span>
                            <KeyRound
                                size={16}
                                strokeWidth={2.4}
                            />
                        </LoadingButton>
                    </div>
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