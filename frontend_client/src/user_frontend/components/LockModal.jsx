// src/user_frontend/components/LockModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import '../styles/LockModal.css';

const LockModal = ({
    show,
    message = 'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng gửi lại OTP mới.',
    lockedUntil,
    email = '',
    onClose = () => {},
    onResend = () => {},
}) => {
    const [timeLeft, setTimeLeft] = useState(0);
    const [remainingPercent, setRemainingPercent] = useState(100);
    const [isExpired, setIsExpired] = useState(false);
    const isExpiredRef = useRef(false);

    useEffect(() => {
        if (!show || !lockedUntil) return;

        let closeTimeout;

        const calculateTimeLeft = () => {
            const now = Date.now();
            const secondsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

            setTimeLeft(secondsLeft);

            // ✅ Tổng thời gian khóa cố định là 5 phút (300 giây)
            const totalSeconds = 300;
            const percent = (secondsLeft / totalSeconds) * 100;
            setRemainingPercent(Math.max(0, Math.min(100, percent)));

            if (secondsLeft <= 0) {
                if (!isExpiredRef.current) {
                    isExpiredRef.current = true;
                    setIsExpired(true);

                    closeTimeout = setTimeout(() => {
                        onClose?.();
                    }, 2000);
                }
            } else {
                isExpiredRef.current = false;
                setIsExpired(false);
            }
        };

        calculateTimeLeft();

        const interval = setInterval(() => {
            calculateTimeLeft();
            if (isExpiredRef.current) {
                clearInterval(interval);
            }
        }, 1000);

        return () => {
            clearInterval(interval);
            if (closeTimeout) clearTimeout(closeTimeout);
        };
    }, [show, lockedUntil, onClose]);

    if (!show) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const renderLockContent = () => {
        if (isExpired) {
            return (
                <div className="otp-lock-modal-body">
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                        <span className="lock-icon" style={{ fontSize: '48px' }}>✅</span>
                    </div>
                    <p style={{ textAlign: 'center', lineHeight: 1.6, color: '#4ade80' }}>
                        OTP đã được mở khóa. Vui lòng thử lại.
                    </p>
                </div>
            );
        }

        return (
            <div className="otp-lock-modal-body">
                {email && (
                    <p className="lock-email">
                        📧 <strong>{email}</strong>
                    </p>
                )}

                <div className="lock-icon-wrapper">
                    <span className="lock-icon">🔒</span>
                </div>

                <p className="lock-message">{message}</p>

                <div className="lock-timer">
                    <span className="timer-icon">⏳</span>
                    <span className="timer-text">
                        Vui lòng thử lại sau{' '}
                        <strong>
                            {minutes}:{seconds.toString().padStart(2, '0')}
                        </strong>
                    </span>
                </div>

                <div className="lock-progress-bar">
                    <div
                        className="lock-progress-fill"
                        style={{ width: `${remainingPercent}%` }}
                    />
                </div>

                <p className="lock-time-remaining">
                    ⏱️ Còn lại {minutes} phút {seconds} giây
                </p>

                <p className="lock-sub-message">
                    Vui lòng bấm <strong>"Gửi lại OTP"</strong> để nhận mã mới sau khi hết thời gian khóa.
                </p>

                <div className="lock-hint">
                    <p>
                        💡 Bạn chỉ được gửi lại OTP tối đa <strong>3 lần</strong> trong <strong>5 phút</strong>.
                    </p>
                </div>
            </div>
        );
    };

    return (
        <Modal
            show={show}
            onClose={onClose}
            type={isExpired ? 'success' : 'warning'}
            title={isExpired ? 'Đã mở khóa OTP' : '🔒 OTP đã bị khóa'}
            confirmText={isExpired ? 'Thử lại' : 'Gửi lại OTP'}
            cancelText="Đóng"
            onConfirm={() => {
                if (isExpired) {
                    onResend?.();
                } else {
                    onResend?.();
                }
                onClose?.();
            }}
            onCancel={onClose}
            className="otp-lock-modal"
        >
            {renderLockContent()}
        </Modal>
    );
};

export default LockModal;