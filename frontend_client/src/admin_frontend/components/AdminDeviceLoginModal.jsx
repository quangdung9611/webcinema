import React, { useState, useEffect } from 'react';
import AdminModal from './AdminModal';
import '../styles/AdminDeviceModal.css';

const AdminDeviceLoginModal = ({
    show,
    type = 'warning',
    title = '🔐 Phát hiện đăng nhập trên thiết bị khác',
    message = 'Tài khoản admin đã được đăng nhập trên thiết bị khác. Vui lòng đăng nhập lại.',
    onConfirm,
    onCancel,
    confirmText = 'Đăng nhập lại',
    cancelText = 'Ở lại',
    countdown = 10,
    children,
    className = '',
}) => {
    const [timeLeft, setTimeLeft] = useState(countdown);

    useEffect(() => {
        if (!show) {
            setTimeLeft(countdown);
            return;
        }

        setTimeLeft(countdown);

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [show, countdown]);

    useEffect(() => {
        if (show && timeLeft === 0) {
            if (onConfirm) onConfirm();
        }
    }, [show, timeLeft, onConfirm]);

    if (!show) return null;

    return (
        <AdminModal
            open={show}
            type={type}
            title={title}
            onClose={onCancel}
            size="md"
        >
            <div className={`admin-device-modal-content ${className}`}>
                <p className="admin-device-modal-message">{message}</p>

                {children}

                <div className="admin-device-modal-countdown">
                    ⏳ Tự động chuyển đến trang đăng nhập sau{' '}
                    <strong>{timeLeft}</strong> giây...
                </div>

                <div className="admin-device-modal-actions">
                    {onCancel && (
                        <button
                            className="admin-device-btn admin-device-btn-secondary"
                            onClick={onCancel}
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        className="admin-device-btn admin-device-btn-primary"
                        onClick={onConfirm}
                        disabled={timeLeft > 0}
                    >
                        {timeLeft > 0 ? `${confirmText} (${timeLeft}s)` : confirmText}
                    </button>
                </div>
            </div>
        </AdminModal>
    );
};

export default  AdminDeviceLoginModal;