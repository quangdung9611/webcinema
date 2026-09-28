import React, { useRef, useEffect, useState } from 'react';
import { Lock, AlertCircle, Check, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import LoadingButton from './LoadingButton';
import '../styles/PaymentPinModal.css';

const PaymentPinModal = ({
    isOpen,
    onClose = () => {},
    onConfirm = () => {},
    pin = '',
    setPin = () => {},
    error = '',
    isLoading = false,
    email = '',
    success = false,
    // ✅ Prop mới: khi true → chạy animation error
    hasError = false,
}) => {
    const navigate = useNavigate();
    const inputRefs = useRef([]);
    const [localError, setLocalError] = useState('');

    // ✅ Trạng thái hiệu ứng
    // idle | shake | ripple | flipping | burst | done
    const [successPhase, setSuccessPhase] = useState('idle');
    const [errorPhase, setErrorPhase] = useState(false);

    // =========================================================
    // ✅ RESET KHI MỞ MODAL
    // =========================================================
    useEffect(() => {
        if (isOpen) {
            setLocalError('');
            setSuccessPhase('idle');
            setErrorPhase(false);
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 150);
        } else {
            setSuccessPhase('idle');
            setErrorPhase(false);
        }
    }, [isOpen]);

    // =========================================================
    // ✅ SUCCESS ANIMATION
    // =========================================================
    useEffect(() => {
        if (!isOpen) return;
        if (!success) return;
        if (errorPhase) return; // không chạy success nếu đang error

        // Phase 1: ripple (400ms)
        setSuccessPhase('ripple');

        // Phase 2: flipping từng ô (sau 400ms)
        const t1 = setTimeout(() => {
            setSuccessPhase('flipping');
        }, 400);

        // Phase 3: burst (particles + ring) sau khi flip xong (~1800ms)
        const t2 = setTimeout(() => {
            setSuccessPhase('burst');
        }, 1800);

        // Phase 4: done (2600ms)
        const t3 = setTimeout(() => {
            setSuccessPhase('done');
        }, 2600);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [isOpen, success, errorPhase]);

    // =========================================================
    // ✅ ERROR ANIMATION — KHI CÓ ERROR
    // =========================================================
    useEffect(() => {
        if (!isOpen) return;
        if (!hasError && !error) return;

        // Chạy shake animation
        setErrorPhase(true);

        // Sau 800ms → reset để user nhập lại
        const t = setTimeout(() => {
            setErrorPhase(false);
        }, 900);

        return () => clearTimeout(t);
    }, [isOpen, hasError, error]);

    // =========================================================
    // ✅ KHI ERROR XUẤT HIỆN → XÓA PIN ĐỂ USER NHẬP LẠI
    // =========================================================
    useEffect(() => {
        if (!isOpen) return;
        if (!error && !hasError) return;

        // Delay nhẹ để user thấy PIN cũ trước khi xóa
        const t = setTimeout(() => {
            setPin('');
            inputRefs.current[0]?.focus();
        }, 800);

        return () => clearTimeout(t);
    }, [error, hasError, isOpen, setPin]);

    // =========================================================
    // ✅ NHẬP PIN
    // =========================================================
    const handleChange = (index, value) => {
        if (successPhase !== 'idle') return;
        if (errorPhase) return;

        const cleanValue = value.replace(/\D/g, '').slice(-1);
        const newPin = pin.split('');
        newPin[index] = cleanValue;
        setPin(newPin.join(''));

        if (cleanValue && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (successPhase !== 'idle') return;
        if (errorPhase) return;

        if (e.key === 'Backspace') {
            if (!pin[index] && index > 0) {
                const newPin = pin.split('');
                newPin[index - 1] = '';
                setPin(newPin.join(''));
                inputRefs.current[index - 1]?.focus();
            } else if (pin[index]) {
                const newPin = pin.split('');
                newPin[index] = '';
                setPin(newPin.join(''));
            }
        }

        if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }

        if (e.key === 'ArrowRight' && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        if (e.key === 'Enter' && pin.length === 6) {
            onConfirm();
        }
    };

    const handlePaste = (e) => {
        if (successPhase !== 'idle') return;
        if (errorPhase) return;

        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted) {
            setPin(pasted);
            const lastIndex = Math.min(pasted.length - 1, 5);
            inputRefs.current[lastIndex]?.focus();
        }
    };

    const handleForgotPin = () => {
        onClose();
        navigate('/forgot-pin', {
            state: {
                returnTo: '/payment',
                fromPayment: true,
                email: email
            }
        });
    };

    const displayError = error || localError;

    if (!isOpen) return null;

    // =========================================================
    // ✅ XÁC ĐỊNH TRẠNG THÁI HIỂN THỊ
    // =========================================================
    const isSuccess = successPhase !== 'idle';
    const isError = errorPhase || (displayError && successPhase === 'idle');

    // Text description
    const getDescription = () => {
        if (isSuccess) return 'Đang xác thực mã PIN...';
        if (errorPhase) return 'Mã PIN không chính xác, vui lòng thử lại.';
        return 'Vui lòng nhập mã PIN 6 số để xác thực thanh toán.';
    };

    return (
        <Modal
            show={isOpen}
            onClose={isSuccess ? () => {} : onClose}
            onConfirm={onConfirm}
            onCancel={onClose}
            type="warning"
            title="NHẬP MÃ PIN THANH TOÁN"
            confirmText="XÁC NHẬN"
            cancelText="HỦY"
            className="payment-pin-modal"
            confirmButton={({ onClick, disabled }) => (
                <LoadingButton
                    type="button"
                    loading={isLoading}
                    loadingText="ĐANG XÁC NHẬN..."
                    onClick={onConfirm}
                    disabled={
                        pin.length !== 6 ||
                        isLoading ||
                        successPhase !== 'idle' ||
                        errorPhase
                    }
                    className="btn-pin-confirm"
                    spinnerColor="#0a0a0a"
                >
                    XÁC NHẬN
                </LoadingButton>
            )}
        >
            <div
                className={[
                    'pin-modal-body',
                    isSuccess ? `pin-modal-body--${successPhase}` : '',
                    errorPhase ? 'pin-modal-body--error' : '',
                ].filter(Boolean).join(' ')}
            >
                {/* ✅ ICON — thay đổi theo trạng thái */}
                <div
                    className={[
                        'pin-modal-icon',
                        errorPhase ? 'pin-modal-icon--error' : '',
                        isSuccess ? 'pin-modal-icon--success' : '',
                    ].filter(Boolean).join(' ')}
                >
                    {errorPhase ? (
                        <XCircle size={36} strokeWidth={1.8} />
                    ) : isSuccess ? (
                        <Check size={36} strokeWidth={2.4} />
                    ) : (
                        <Lock size={36} strokeWidth={1.5} />
                    )}
                </div>

                <p
                    className={[
                        'pin-modal-description',
                        errorPhase ? 'pin-modal-description--error' : '',
                    ].filter(Boolean).join(' ')}
                >
                    {getDescription()}
                </p>

                {/* ✅ Ô NHẬP PIN — với shake khi error */}
                <div
                    className={[
                        'pin-boxes-container',
                        errorPhase ? 'pin-boxes-container--shake' : '',
                    ].filter(Boolean).join(' ')}
                >
                    {Array.from({ length: 6 }).map((_, index) => {
                        // Xác định class cho từng ô
                        const boxWrapperClasses = [
                            'pin-box-wrapper',
                            isSuccess ? `pin-box-wrapper--${successPhase}` : '',
                            errorPhase ? 'pin-box-wrapper--error' : '',
                        ].filter(Boolean).join(' ');

                        return (
                            <div
                                key={index}
                                className={boxWrapperClasses}
                                style={{ '--pin-index': index }}
                            >
                                {/* MẶT TRƯỚC — ô input */}
                                <div className="pin-box-face pin-box-face--front">
                                    <input
                                        ref={(el) => (inputRefs.current[index] = el)}
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={pin[index] || ''}
                                        onChange={(e) => handleChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onPaste={handlePaste}
                                        className={[
                                            'pin-box',
                                            pin[index] ? 'filled' : '',
                                            displayError ? 'pin-box-error' : '',
                                            errorPhase ? 'pin-box--error-shake' : '',
                                        ].filter(Boolean).join(' ')}
                                        disabled={isLoading || successPhase !== 'idle' || errorPhase}
                                        autoComplete="one-time-code"
                                    />
                                </div>

                                {/* MẶT SAU — dấu tick khi success */}
                                <div className="pin-box-face pin-box-face--back">
                                    <Check size={32} strokeWidth={3.5} />
                                </div>
                            </div>
                        );
                    })}

                    {/* Ring + Particles khi burst */}
                    {successPhase === 'burst' && (
                        <>
                            <div className="pin-success-ring" />
                            <div className="pin-particles pin-particles--1" />
                            <div className="pin-particles pin-particles--2" />
                        </>
                    )}

                    {/* ✅ Error overlay icon */}
                    {errorPhase && (
                        <div className="pin-error-badge">
                            <XCircle size={18} strokeWidth={3} />
                        </div>
                    )}
                </div>

                {/* ✅ ERROR MESSAGE */}
                {isError && displayError && !errorPhase && (
                    <p className="pin-modal-error">
                        <AlertCircle
                            size={16}
                            style={{
                                display: 'inline',
                                marginRight: '6px',
                                verticalAlign: 'middle',
                            }}
                        />
                        {displayError}
                    </p>
                )}

                {/* ✅ ERROR MESSAGE trong lúc shake */}
                {errorPhase && (
                    <p className="pin-modal-error pin-modal-error--shake">
                        <AlertCircle
                            size={16}
                            style={{
                                display: 'inline',
                                marginRight: '6px',
                                verticalAlign: 'middle',
                            }}
                        />
                        Mã PIN không đúng. Vui lòng thử lại.
                    </p>
                )}

                {/* ✅ FORGOT PIN — chỉ hiện khi idle */}
                {successPhase === 'idle' && !errorPhase && !displayError && (
                    <button
                        type="button"
                        className="forgot-pin-link"
                        onClick={handleForgotPin}
                        disabled={isLoading}
                    >
                        Quên mã PIN?
                    </button>
                )}

                {/* ✅ SUCCESS TEXT */}
                {successPhase !== 'idle' && (
                    <p className="pin-modal-success-text">
                        <Check
                            size={16}
                            strokeWidth={3}
                            style={{
                                display: 'inline',
                                marginRight: '6px',
                                verticalAlign: 'middle',
                            }}
                        />
                        Mã PIN chính xác!
                    </p>
                )}
            </div>
        </Modal>
    );
};

export default PaymentPinModal;