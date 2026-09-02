import React, { useRef, useEffect, useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
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
}) => {
    const navigate = useNavigate();
    const inputRefs = useRef([]);
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setLocalError('');
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 150);
        }
    }, [isOpen]);

    const handleChange = (index, value) => {
        const cleanValue = value.replace(/\D/g, '').slice(-1);
        const newPin = pin.split('');
        newPin[index] = cleanValue;
        setPin(newPin.join(''));

        if (cleanValue && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
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
            onClose={onClose}
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
                    disabled={pin.length !== 6 || isLoading}
                    className="btn-pin-confirm"
                    spinnerColor="#0a0a0a"
                >
                    XÁC NHẬN
                </LoadingButton>
            )}
        >
            <div className="pin-modal-body">
                <div className="pin-modal-icon">
                    <Lock size={36} strokeWidth={1.5} color="var(--accent-ice)" />
                </div>

                <p className="pin-modal-description">
                    Vui lòng nhập mã PIN 6 số để xác thực thanh toán.
                </p>

                <div className="pin-boxes-container">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <input
                            key={index}
                            ref={(el) => (inputRefs.current[index] = el)}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={pin[index] || ''}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            className={`pin-box ${pin[index] ? 'filled' : ''} ${displayError ? 'pin-box-error' : ''}`}
                            disabled={isLoading}
                            autoComplete="one-time-code"
                        />
                    ))}
                </div>

                {displayError && (
                    <p className="pin-modal-error">
                        <AlertCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                        {displayError}
                    </p>
                )}

                <button
                    type="button"
                    className="forgot-pin-link"
                    onClick={handleForgotPin}
                    disabled={isLoading}
                >
                    Quên mã PIN?
                </button>
            </div>
        </Modal>
    );
};

export default PaymentPinModal;