import React, { useState, useEffect } from 'react';
import '../styles/LoginLockModal.css';

const LoginLockModal = ({ show, message, lockedUntil, onClose }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!show || !lockedUntil) return;

        const calculateTimeLeft = () => {
            const secondsLeft = Math.max(0, Math.floor((lockedUntil - Date.now()) / 1000));
            setTimeLeft(secondsLeft);
        };

        calculateTimeLeft();

        const interval = setInterval(() => {
            calculateTimeLeft();
            if (timeLeft <= 0) {
                clearInterval(interval);
            }
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [show, lockedUntil, timeLeft]);

    if (!show) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="login-lock-modal-overlay" onClick={onClose}>
            <div className="login-lock-modal" onClick={(e) => e.stopPropagation()}>
                <div className="login-lock-modal-header">
                    <span className="login-lock-modal-icon">🔒</span>
                    <h2>Tài khoản đã bị khóa</h2>
                </div>

                <div className="login-lock-modal-body">
                    <p>{message}</p>

                    <div className="login-lock-timer">
                        <span className="timer-icon">⏳</span>
                        <span className="timer-text">
                            Vui lòng thử lại sau <strong>{minutes}:{seconds.toString().padStart(2, '0')}</strong>
                        </span>
                    </div>

                    <p className="login-lock-hint">
                        💡 Mẹo: Bạn có thể dùng "Quên mật khẩu?" để đặt lại mật khẩu ngay bây giờ.
                    </p>
                </div>

                <div className="login-lock-modal-footer">
                    <button className="login-lock-btn" onClick={onClose}>
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginLockModal;