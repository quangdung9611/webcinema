// components/SessionExpiredModal.jsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import '../styles/SessionExpiredModal.css';

const SessionExpiredModal = ({ 
    isOpen, 
    onConfirm, 
    message, 
    newDevice,
    autoRedirect = false,
    redirectDelay = 3000
}) => {
    const [countdown, setCountdown] = useState(Math.floor(redirectDelay / 1000));
    const [visible, setVisible] = useState(isOpen);

    useEffect(() => {
        setVisible(isOpen);
        if (isOpen) {
            setCountdown(Math.floor(redirectDelay / 1000));
        }
    }, [isOpen, redirectDelay]);

    // 🔥 Auto redirect countdown
    useEffect(() => {
        let interval = null;
        let timeout = null;

        if (visible && autoRedirect && countdown > 0) {
            interval = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        }

        if (visible && autoRedirect && countdown === 0) {
            timeout = setTimeout(() => {
                if (onConfirm) {
                    onConfirm();
                }
            }, 300);
        }

        return () => {
            if (interval) clearInterval(interval);
            if (timeout) clearTimeout(timeout);
        };
    }, [visible, autoRedirect, countdown, onConfirm]);

    if (!visible) return null;

    const displayMessage = message || 'Tài khoản của bạn vừa được đăng nhập trên một thiết bị khác. Để bảo mật, phiên đăng nhập hiện tại sẽ bị đóng.';

    return (
        <Modal
            show={visible}
            type="warning"
            title="Phiên đăng nhập đã hết hạn"
            message={displayMessage}
            onConfirm={onConfirm}
            onCancel={onConfirm}
            confirmText={autoRedirect && countdown > 0 ? `Đăng nhập lại (${countdown}s)` : "Đăng nhập lại"}
            cancelText={autoRedirect && countdown > 0 ? `Đăng nhập lại (${countdown}s)` : "Đăng nhập lại"}
            className="session-expired-modal-wrapper"
        >
            {/* 🔥 Hiển thị thông tin thiết bị mới nếu có */}
            {newDevice && (
                <div className="session-expired-device-info">
                    <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '14px' }}>
                        <strong>📱 Thiết bị mới:</strong> {typeof newDevice === 'string' ? newDevice : JSON.stringify(newDevice)}
                    </p>
                </div>
            )}
            
            {/* 🔥 Hiển thị countdown nếu auto redirect */}
            {autoRedirect && countdown > 0 && (
                <div className="session-expired-countdown">
                    <span>⏳ Tự động chuyển hướng sau <strong>{countdown}</strong> giây...</span>
                </div>
            )}
        </Modal>
    );
};

export default SessionExpiredModal;