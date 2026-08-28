import React, { useRef, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
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

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
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
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        setPin(pasted);
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    };

    // ✅ CHUYỂN THẲNG ĐẾN TRANG FORGOT-PIN
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
        >
            <div className="pin-modal-body">
                <div className="pin-modal-icon">
                    <Lock size={36} color="#f59e0b" />
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
                            className={`pin-box ${error ? 'pin-box-error' : ''}`}
                            disabled={isLoading}
                            autoComplete="one-time-code"
                        />
                    ))}
                </div>

                {error && (
                    <p className="pin-modal-error">{error}</p>
                )}

                <button
                    type="button"
                    className="forgot-pin-link"
                    onClick={handleForgotPin}
                >
                    Quên mã PIN?
                </button>
            </div>
        </Modal>
    );
};

export default PaymentPinModal;