import React, { useRef, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import Modal from './Modal';
import ForgotPinModal from './ForgotPinModal';
import '../styles/PaymentPinModal.css'; // Import CSS riêng

const PaymentPinModal = ({
    isOpen,
    onClose = () => {},
    onConfirm = () => {},
    pin = '',
    setPin = () => {},
    error = '',
    isLoading = false,
    email = '',
    api = null, // 🆕 Nhận api từ Payment.js
}) => {
    const inputRefs = useRef([]);

    // 🆕 State cho ForgotPinModal
    const [showForgotPin, setShowForgotPin] = useState(false);

    // Tự động focus ô đầu tiên khi mở modal
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
        }
    }, [isOpen]);

    // Xử lý nhập số từng ô
    const handleChange = (index, value) => {
        const cleanValue = value.replace(/\D/g, '').slice(-1);
        const newPin = pin.split('');
        newPin[index] = cleanValue;
        setPin(newPin.join(''));

        // Tự động nhảy ô kế tiếp
        if (cleanValue && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Xử lý phím Backspace
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

    // 🆕 Khi bấm "Quên mã PIN?"
    const handleForgotPin = () => {
        setShowForgotPin(true);
    };

    // 🆕 Khi đổi PIN thành công, đóng ForgotPinModal và mở lại PaymentPinModal để thanh toán tiếp
    const handlePinChanged = () => {
        setShowForgotPin(false);
        // Reset lại PIN mới để người dùng nhập tiếp
        setPin('');
        // Focus lại ô nhập PIN đầu tiên
        setTimeout(() => {
            inputRefs.current[0]?.focus();
        }, 100);
    };

    if (!isOpen) return null;

    return (
        <>
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
                    {/* Icon */}
                    <div className="pin-modal-icon">
                        <Lock size={36} color="#f59e0b" />
                    </div>

                    <p className="pin-modal-description">
                        Vui lòng nhập mã PIN 6 số để xác thực thanh toán.
                    </p>

                    {/* 6 Ô NHẬP PIN */}
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

                    {/* 🆕 NÚT QUÊN MÃ PIN */}
                    <button
                        type="button"
                        className="forgot-pin-link"
                        onClick={handleForgotPin}
                    >
                        Quên mã PIN?
                    </button>
                </div>
            </Modal>

            {/* 🆕 Gắn ForgotPinModal bên trong */}
            <ForgotPinModal
                isOpen={showForgotPin}
                onClose={() => setShowForgotPin(false)}
                email={email}
                api={api}
                onPinChanged={handlePinChanged}
            />
        </>
    );
};

export default PaymentPinModal;