import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import '../styles/LoginLockModal.css';

const LoginLockModal = ({
    show,
    message,
    lockedUntil,
    lockLevel = 1,
    lockDurationText = '1 phút',
    email = '',
    onClose
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

            // ========================================================
            // DÙNG CEIL ĐỂ KHÔNG BỊ MẤT GIÂY NGAY KHI MODAL MỞ
            // ========================================================
            const secondsLeft = Math.max(
                0,
                Math.ceil((lockedUntil - now) / 1000)
            );

            setTimeLeft(secondsLeft);

            // ========================================================
            // THỜI GIAN TỔNG CỘNG THEO LEVEL
            // ========================================================
            let totalSeconds = 60;

            if (lockLevel >= 2) {
                totalSeconds = 180;
            }

            const percent = (secondsLeft / totalSeconds) * 100;

            setRemainingPercent(
                Math.max(0, Math.min(100, percent))
            );

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

            if (closeTimeout) {
                clearTimeout(closeTimeout);
            }
        };
    }, [show, lockedUntil, lockLevel, onClose]);

    if (!show) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const getLevelEmoji = () => {
        if (lockLevel >= 2) return '⚠️';

        return '🔒';
    };

    const getLevelColor = () => {
        if (lockLevel >= 2) return '#f97316';

        return '#3b82f6';
    };

    const getLevelText = () => {
        if (lockLevel >= 2) {
            return 'Khóa nâng cao - 3 phút';
        }

        return 'Khóa cơ bản - 1 phút';
    };

    const renderLockContent = () => {
        if (isExpired) {
            return (
                <div className="login-lock-modal-body">
                    <div
                        style={{
                            textAlign: 'center',
                            marginBottom: '16px'
                        }}
                    >
                        <span className="login-lock-modal-icon">
                            ✅
                        </span>
                    </div>

                    <p
                        style={{
                            textAlign: 'center',
                            lineHeight: 1.6
                        }}
                    >
                        Tài khoản của bạn đã được mở khóa.
                        Vui lòng thử đăng nhập lại.
                    </p>
                </div>
            );
        }

        return (
            <div className="login-lock-modal-body">

                <div
                    className="lock-level-badge"
                    style={{
                        backgroundColor: getLevelColor()
                    }}
                >
                    {getLevelEmoji()}
                    {' '}
                    Cấp độ {Math.min(lockLevel, 2)}/2
                    {' - '}
                    {getLevelText()}
                </div>

                {email && (
                    <p className="lock-email-info">
                        📧 <strong>{email}</strong>
                    </p>
                )}

                <p className="lock-message">
                    {message}
                </p>

                <div className="login-lock-timer">
                    <span className="timer-icon">
                        ⏳
                    </span>

                    <span className="timer-text">
                        Vui lòng thử lại sau{' '}

                        <strong>
                            {minutes}:
                            {seconds
                                .toString()
                                .padStart(2, '0')}
                        </strong>
                    </span>
                </div>

                <div className="lock-progress-bar">
                    <div
                        className="lock-progress-fill"
                        style={{
                            width: `${remainingPercent}%`,
                            backgroundColor: getLevelColor()
                        }}
                    />
                </div>

                <p className="lock-time-remaining">
                    ⏱️ Còn lại{' '}
                    {minutes} phút {seconds} giây
                </p>

                <p className="login-lock-hint">
                    💡 Mẹo: Bạn có thể dùng
                    {' '}
                    "Quên mật khẩu?"
                    {' '}
                    để đặt lại mật khẩu ngay bây giờ.
                </p>

            </div>
        );
    };

    return (
        <Modal
            show={show}
            onClose={onClose}
            type={isExpired ? 'success' : 'warning'}
            title={
                isExpired
                    ? 'Đã mở khóa tài khoản'
                    : 'Tài khoản đã bị khóa'
            }
            confirmText={
                isExpired
                    ? 'Đăng nhập ngay'
                    : 'Quên mật khẩu?'
            }
            onConfirm={() => {
                if (!isExpired) {
                    document
                        .querySelector('.forgot-link')
                        ?.click();
                }

                onClose?.();
            }}
            cancelText="Đóng"
            onCancel={onClose}
            className="login-lock-modal"
        >
            {renderLockContent()}
        </Modal>
    );
};

export default LoginLockModal;