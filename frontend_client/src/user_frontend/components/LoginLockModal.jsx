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

        const calculateTimeLeft = () => {
            const now = Date.now();

            // ============================================================
            // DÙNG CEIL ĐỂ KHÔNG BỊ MẤT 1 GIÂY NGAY KHI MODAL VỪA HIỆN
            // ============================================================
            const totalDuration = lockedUntil - now;

            const secondsLeft = Math.max(
                0,
                Math.ceil(totalDuration / 1000)
            );

            setTimeLeft(secondsLeft);

            // ============================================================
            // XÁC ĐỊNH TỔNG THỜI GIAN KHÓA
            // Level 1 = 60 giây
            // Level 2 = 180 giây
            // ============================================================
            let totalSeconds = 60;

            if (lockLevel >= 2) {
                totalSeconds = 180;
            }

            const percent = (secondsLeft / totalSeconds) * 100;

            setRemainingPercent(
                Math.max(
                    0,
                    Math.min(100, percent)
                )
            );

            // ============================================================
            // KIỂM TRA HẾT THỜI GIAN KHÓA
            // ============================================================
            if (secondsLeft <= 0) {
                isExpiredRef.current = true;
                setIsExpired(true);
            } else {
                isExpiredRef.current = false;
                setIsExpired(false);
            }
        };

        // Chạy ngay khi modal mở
        calculateTimeLeft();

        const interval = setInterval(() => {
            calculateTimeLeft();

            if (isExpiredRef.current) {
                clearInterval(interval);

                setTimeout(() => {
                    onClose();
                }, 2000);
            }
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [
        show,
        lockedUntil,
        lockLevel,
        onClose
    ]);

    if (!show) return null;

    // ============================================================
    // FORMAT THỜI GIAN
    // ============================================================
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    // ============================================================
    // UI THEO LEVEL KHÓA
    // ============================================================
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

    // ============================================================
    // NỘI DUNG MODAL
    // ============================================================
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

                {/* LEVEL BADGE */}
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

                {/* EMAIL */}
                {email && (
                    <p className="lock-email-info">
                        📧 <strong>{email}</strong>
                    </p>
                )}

                {/* MESSAGE */}
                <p className="lock-message">
                    {message}
                </p>

                {/* TIMER */}
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

                {/* PROGRESS BAR */}
                <div className="lock-progress-bar">
                    <div
                        className="lock-progress-fill"
                        style={{
                            width: `${remainingPercent}%`,
                            backgroundColor: getLevelColor()
                        }}
                    />
                </div>

                {/* REMAINING TIME */}
                <p className="lock-time-remaining">
                    ⏱️ Còn lại {minutes} phút {seconds} giây
                </p>

                {/* HINT */}
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
                document
                    .querySelector('.forgot-link')
                    ?.click();

                onClose();
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