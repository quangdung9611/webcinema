// src/user_frontend/components/LockModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import '../styles/LockModal.css';

const LockModal = ({
    show,
    message = 'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng gửi lại OTP mới.',
    lockedUntil,
    lockDuration = 300,
    lockDurationText = '5 phút',
    email = '',
    onClose = () => {},
    onResend = () => {},
    autoClose = false, // Thêm prop để kiểm soát tự đóng
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

            const totalSeconds = lockDuration || 300;
            const percent = (secondsLeft / totalSeconds) * 100;
            setRemainingPercent(Math.max(0, Math.min(100, percent)));

            if (secondsLeft <= 0) {
                if (!isExpiredRef.current) {
                    isExpiredRef.current = true;
                    setIsExpired(true);

                    // Chỉ tự đóng nếu autoClose = true
                    if (autoClose) {
                        closeTimeout = setTimeout(() => {
                            onClose?.();
                        }, 2000);
                    }
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
    }, [show, lockedUntil, lockDuration, onClose, autoClose]);

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
                    <p style={{ textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>
                        Bạn có thể đóng modal này và nhập OTP mới.
                    </p>
                </div>
            );
        }

        return (
            <div className="otp-lock-modal-body">
                {email && (
                    <p className="lock-email" style={{ textAlign: 'center', marginBottom: '12px' }}>
                        📧 <strong>{email}</strong>
                    </p>
                )}

                <div className="lock-icon-wrapper" style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <span className="lock-icon" style={{ fontSize: '48px' }}>🔒</span>
                </div>

                <p className="lock-message" style={{ textAlign: 'center', marginBottom: '16px', lineHeight: 1.6 }}>
                    {message}
                </p>

                <div className="lock-timer" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '10px',
                    marginBottom: '12px'
                }}>
                    <span className="timer-icon">⏳</span>
                    <span className="timer-text">
                        Vui lòng thử lại sau{' '}
                        <strong style={{ color: '#fbbf24' }}>
                            {minutes}:{seconds.toString().padStart(2, '0')}
                        </strong>
                    </span>
                </div>

                <div className="lock-progress-bar" style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '12px'
                }}>
                    <div
                        className="lock-progress-fill"
                        style={{
                            width: `${remainingPercent}%`,
                            height: '100%',
                            backgroundColor: remainingPercent <= 20 ? '#ff6b8a' : '#fbbf24',
                            borderRadius: '4px',
                            transition: 'width 1s linear'
                        }}
                    />
                </div>

                <p className="lock-time-remaining" style={{ 
                    textAlign: 'center', 
                    fontSize: '14px', 
                    color: '#94a3b8',
                    marginBottom: '16px'
                }}>
                    ⏱️ Còn lại {minutes} phút {seconds} giây
                </p>

                <p className="lock-sub-message" style={{ 
                    textAlign: 'center', 
                    fontSize: '13px', 
                    color: '#94a3b8',
                    marginBottom: '12px'
                }}>
                    💡 Bạn có thể đóng modal này, timer vẫn chạy ở phía sau.
                </p>

                <p className="lock-sub-message" style={{ 
                    textAlign: 'center', 
                    fontSize: '13px', 
                    color: '#94a3b8'
                }}>
                    Vui lòng bấm <strong>"Gửi lại OTP"</strong> sau khi hết thời gian khóa.
                </p>
            </div>
        );
    };

    // Kiểm tra xem còn thời gian lock không
    const isStillLocked = lockedUntil && lockedUntil > Date.now();

    return (
        <Modal
            show={show}
            onClose={onClose}
            type={isExpired ? 'success' : 'warning'}
            title={isExpired ? '✅ Đã mở khóa OTP' : '🔒 OTP đã bị khóa'}
            confirmText={isStillLocked ? `⏳ Gửi lại OTP (${minutes}:${seconds.toString().padStart(2, '0')})` : 'Gửi lại OTP'}
            cancelText={isStillLocked ? `Đóng (${minutes}:${seconds.toString().padStart(2, '0')})` : 'Đóng'}
            onConfirm={() => {
                if (!isStillLocked) {
                    onResend?.();
                    onClose?.();
                }
            }}
            onCancel={onClose}
            className="otp-lock-modal"
            confirmDisabled={isStillLocked}
        >
            {renderLockContent()}
        </Modal>
    );
};

export default LockModal;