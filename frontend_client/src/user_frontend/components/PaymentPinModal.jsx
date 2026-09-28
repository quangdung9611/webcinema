import React, { useRef, useEffect, useState } from 'react';
import { Lock, AlertCircle, Check } from 'lucide-react';
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
}) => {
    const navigate = useNavigate();
    const inputRefs = useRef([]);
    const [localError, setLocalError] = useState('');

    // ✅ Trạng thái hiệu ứng success
    const [successPhase, setSuccessPhase] = useState('idle');
    // idle | ripple | flipping | burst | done

    // ✅ Reset khi mở modal
    useEffect(() => {
        if (isOpen) {
            setLocalError('');
            setSuccessPhase('idle');
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 150);
        } else {
            setSuccessPhase('idle');
        }
    }, [isOpen]);

    // ✅ Chạy hiệu ứng khi prop success = true
    useEffect(() => {
        if (!isOpen) return;
        if (!success) return;

        // Phase 1: ripple (nâng hàng ô lên)
        setSuccessPhase('ripple');

        // Phase 2: flip 360° từng ô (delay 400ms)
        const t1 = setTimeout(() => {
            setSuccessPhase('flipping');
        }, 400);

        // Phase 3: burst (particles + ring) sau khi flip xong
        // 6 ô × 80ms delay + 800ms flip = ~1280ms → burst ở 1800ms
        const t2 = setTimeout(() => {
            setSuccessPhase('burst');
        }, 1800);

        const t3 = setTimeout(() => {
            setSuccessPhase('done');
        }, 2600);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [isOpen, success]);

    const handleChange = (index, value) => {
        if (successPhase !== 'idle') return;

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

    return (
        <Modal
            show={isOpen}
            onClose={successPhase !== 'idle' ? () => {} : onClose}
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
                    disabled={pin.length !== 6 || isLoading || successPhase !== 'idle'}
                    className="btn-pin-confirm"
                    spinnerColor="#0a0a0a"
                >
                    XÁC NHẬN
                </LoadingButton>
            )}
        >
            <div className={`pin-modal-body pin-modal-body--${successPhase}`}>
                <div className="pin-modal-icon">
                    <Lock size={36} strokeWidth={1.5} color="var(--accent-ice)" />
                </div>

                <p className="pin-modal-description">
                    {successPhase === 'idle'
                        ? 'Vui lòng nhập mã PIN 6 số để xác thực thanh toán.'
                        : 'Đang xác thực mã PIN...'}
                </p>

                <div className="pin-boxes-container">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div
                            key={index}
                            className={`pin-box-wrapper pin-box-wrapper--${successPhase}`}
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
                                    className={`pin-box ${pin[index] ? 'filled' : ''} ${displayError ? 'pin-box-error' : ''}`}
                                    disabled={isLoading || successPhase !== 'idle'}
                                    autoComplete="one-time-code"
                                />
                            </div>

                            {/* MẶT SAU — dấu tick */}
                            <div className="pin-box-face pin-box-face--back">
                                <Check size={32} strokeWidth={3.5} />
                            </div>
                        </div>
                    ))}

                    {/* ✅ Ring tỏa ra khi burst */}
                    {successPhase === 'burst' && (
                        <div className="pin-success-ring" />
                    )}

                    {/* ✅ Particles bay ra khi burst */}
                    {successPhase === 'burst' && (
                        <>
                            <div className="pin-particles pin-particles--1" />
                            <div className="pin-particles pin-particles--2" />
                        </>
                    )}
                </div>

                {displayError && (
                    <p className="pin-modal-error">
                        <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                        {displayError}
                    </p>
                )}

                {successPhase === 'idle' && (
                    <button
                        type="button"
                        className="forgot-pin-link"
                        onClick={handleForgotPin}
                        disabled={isLoading}
                    >
                        Quên mã PIN?
                    </button>
                )}

                {successPhase !== 'idle' && (
                    <p className="pin-modal-success-text">
                        Mã PIN chính xác!
                    </p>
                )}
            </div>
        </Modal>
    );
};

export default PaymentPinModal;