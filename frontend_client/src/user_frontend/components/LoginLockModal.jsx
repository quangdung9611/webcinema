import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        if (!show || !lockedUntil) return;

        const calculateTimeLeft = () => {
            const now = Date.now();
            const totalDuration = lockedUntil - now; // milliseconds
            const secondsLeft = Math.max(0, Math.floor(totalDuration / 1000));
            setTimeLeft(secondsLeft);
            
            // Tính phần trăm còn lại
            let totalSeconds = 60; // Mặc định 1 phút
            if (lockLevel === 1) totalSeconds = 60;
            else if (lockLevel === 2) totalSeconds = 300;
            else if (lockLevel === 3) totalSeconds = 900;
            else if (lockLevel >= 4) totalSeconds = 3600;
            
            const percent = (secondsLeft / totalSeconds) * 100;
            setRemainingPercent(Math.max(0, Math.min(100, percent)));
            
            // Kiểm tra đã hết lock chưa
            if (secondsLeft <= 0) {
                setIsExpired(true);
            } else {
                setIsExpired(false);
            }
        };

        calculateTimeLeft();

        const interval = setInterval(() => {
            calculateTimeLeft();
            // Tự động đóng modal khi hết lock
            if (timeLeft <= 0) {
                clearInterval(interval);
                setTimeout(() => {
                    onClose();
                    // Có thể gọi callback để refresh UI
                }, 500);
            }
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [show, lockedUntil, lockLevel, timeLeft, onClose]);

    if (!show) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    // Lấy emoji theo level
    const getLevelEmoji = () => {
        if (lockLevel >= 4) return '🚫';
        if (lockLevel >= 3) return '⛔';
        if (lockLevel >= 2) return '⚠️';
        return '🔒';
    };

    // Lấy màu theo level
    const getLevelColor = () => {
        if (lockLevel >= 4) return '#dc2626'; // đỏ đậm
        if (lockLevel >= 3) return '#f59e0b'; // cam
        if (lockLevel >= 2) return '#f97316'; // cam nhạt
        return '#3b82f6'; // xanh
    };

    // Lấy text mô tả level
    const getLevelText = () => {
        if (lockLevel >= 4) return 'Khóa nặng - 1 giờ';
        if (lockLevel === 3) return 'Khóa trung bình - 15 phút';
        if (lockLevel === 2) return 'Khóa nhẹ - 5 phút';
        return 'Khóa cơ bản - 1 phút';
    };

    // Nếu đã hết lock, hiển thị thông báo
    if (isExpired) {
        return (
            <div className="login-lock-modal-overlay" onClick={onClose}>
                <div className="login-lock-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="login-lock-modal-header">
                        <span className="login-lock-modal-icon">✅</span>
                        <h2>Đã mở khóa tài khoản</h2>
                    </div>
                    <div className="login-lock-modal-body">
                        <p>Tài khoản của bạn đã được mở khóa. Vui lòng thử đăng nhập lại.</p>
                    </div>
                    <div className="login-lock-modal-footer">
                        <button className="login-lock-btn login-lock-btn-primary" onClick={onClose}>
                            Đăng nhập ngay
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-lock-modal-overlay" onClick={onClose}>
            <div className="login-lock-modal" onClick={(e) => e.stopPropagation()}>
                <div className="login-lock-modal-header">
                    <span className="login-lock-modal-icon">{getLevelEmoji()}</span>
                    <h2>Tài khoản đã bị khóa</h2>
                </div>

                <div className="login-lock-modal-body">
                    {/* Badge hiển thị level */}
                    <div className="lock-level-badge" style={{ backgroundColor: getLevelColor() }}>
                        {getLevelEmoji()} Cấp độ {lockLevel}/4 - {getLevelText()}
                    </div>
                    
                    {/* Thông tin email nếu có */}
                    {email && (
                        <p className="lock-email-info">
                            📧 <strong>{email}</strong>
                        </p>
                    )}
                    
                    <p className="lock-message">{message}</p>

                    {/* Timer */}
                    <div className="login-lock-timer">
                        <span className="timer-icon">⏳</span>
                        <span className="timer-text">
                            Vui lòng thử lại sau <strong>{minutes}:{seconds.toString().padStart(2, '0')}</strong>
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className="lock-progress-bar">
                        <div 
                            className="lock-progress-fill" 
                            style={{ 
                                width: `${remainingPercent}%`,
                                backgroundColor: getLevelColor()
                            }}
                        />
                    </div>

                    {/* Thời gian lock còn lại dạng text */}
                    <p className="lock-time-remaining">
                        ⏱️ Còn lại {minutes} phút {seconds} giây
                    </p>

                    {/* Gợi ý */}
                    <p className="login-lock-hint">
                        💡 Mẹo: Bạn có thể dùng "Quên mật khẩu?" để đặt lại mật khẩu ngay bây giờ.
                    </p>
                </div>

                <div className="login-lock-modal-footer">
                    <button className="login-lock-btn" onClick={onClose}>
                        Đóng
                    </button>
                    <button 
                        className="login-lock-btn login-lock-btn-primary" 
                        onClick={() => {
                            // Mở forgot password
                            document.querySelector('.forgot-link')?.click();
                            onClose();
                        }}
                    >
                        Quên mật khẩu?
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginLockModal;