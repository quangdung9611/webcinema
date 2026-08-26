import React, { useState, useEffect, useRef } from 'react';
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
            const totalDuration = lockedUntil - now; 
            const secondsLeft = Math.max(0, Math.floor(totalDuration / 1000));
            setTimeLeft(secondsLeft);
            
            // Tính phần trăm: Nếu level 2 thì mặc định 180s (3 phút), nếu level 1 thì 60s
            let totalSeconds = 60; 
            if (lockLevel >= 2) totalSeconds = 180;
            
            const percent = (secondsLeft / totalSeconds) * 100;
            setRemainingPercent(Math.max(0, Math.min(100, percent)));
            
            if (secondsLeft <= 0) {
                isExpiredRef.current = true;
                setIsExpired(true);
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
                setTimeout(() => {
                    onClose();
                }, 2000); 
            }
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [show, lockedUntil, lockLevel, onClose]);

    if (!show) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    // Chỉ hiển thị 2 cấp độ
    const getLevelEmoji = () => {
        if (lockLevel >= 2) return '⚠️';
        return '🔒';
    };

    const getLevelColor = () => {
        if (lockLevel >= 2) return '#f97316'; // Cam nhạt
        return '#3b82f6'; // Xanh
    };

    const getLevelText = () => {
        if (lockLevel >= 2) return 'Khóa nâng cao - 3 phút';
        return 'Khóa cơ bản - 1 phút';
    };

    if (isExpired) {
        return (
            <div className="login-lock-modal-overlay">
                <div className="login-lock-modal">
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
        <div className="login-lock-modal-overlay">
            <div className="login-lock-modal">
                <div className="login-lock-modal-header">
                    <span className="login-lock-modal-icon">{getLevelEmoji()}</span>
                    <h2>Tài khoản đã bị khóa</h2>
                </div>

                <div className="login-lock-modal-body">
                    {/* Badge hiển thị level: Chỉ hiển thị Cấp 1 hoặc Cấp 2 */}
                    <div className="lock-level-badge" style={{ backgroundColor: getLevelColor() }}>
                        {getLevelEmoji()} Cấp độ {Math.min(lockLevel, 2)}/2 - {getLevelText()}
                    </div>
                    
                    {email && (
                        <p className="lock-email-info">
                            📧 <strong>{email}</strong>
                        </p>
                    )}
                    
                    <p className="lock-message">{message}</p>

                    <div className="login-lock-timer">
                        <span className="timer-icon">⏳</span>
                        <span className="timer-text">
                            Vui lòng thử lại sau <strong>{minutes}:{seconds.toString().padStart(2, '0')}</strong>
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
                        ⏱️ Còn lại {minutes} phút {seconds} giây
                    </p>

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