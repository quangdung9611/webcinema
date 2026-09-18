// components/SessionExpiredModal.jsx
import React, { useState, useEffect } from 'react';
import {
    Lock,
    Smartphone,
    Hourglass,
    ShieldCheck,
} from 'lucide-react';
import Modal from './Modal';
import '../styles/SessionExpiredModal.css';

const SessionExpiredModal = ({
    isOpen,
    onConfirm,
    message,
    newDevice,
    autoRedirect = false,
    redirectDelay = 10
}) => {
    const [countdown, setCountdown] = useState(
        typeof redirectDelay === 'number' ? redirectDelay : 10
    );
    const [visible, setVisible] = useState(isOpen);

    useEffect(() => {
        setVisible(isOpen);
        if (isOpen) {
            setCountdown(typeof redirectDelay === 'number' ? redirectDelay : 10);
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
            title={
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <Lock size={22} /> Phiên đăng nhập đã hết hạn
                </span>
            }
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
                    <p style={{
                        margin: '4px 0',
                        color: '#6b7280',
                        fontSize: '14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexWrap: 'wrap'
                    }}>
                        <Smartphone size={16} />
                        <strong>Thiết bị mới:</strong>
                        {' '}
                        {typeof newDevice === 'string' ? newDevice : JSON.stringify(newDevice)}
                    </p>
                </div>
            )}

            {/* 🔥 Hiển thị countdown với style nổi bật */}
            {autoRedirect && countdown > 0 && (
                <div className="session-expired-countdown" style={{
                    marginTop: '12px',
                    padding: '10px 16px',
                    background: '#fef3c7',
                    borderRadius: '8px',
                    border: '1px solid #f59e0b',
                    textAlign: 'center'
                }}>
                    <span style={{
                        fontSize: '16px',
                        color: '#92400e',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        <Hourglass size={18} color="#92400e" />
                        Tự động đăng xuất sau{' '}
                        <strong style={{ fontSize: '20px', color: '#dc2626' }}>{countdown}</strong>
                        {' '}giây...
                    </span>
                </div>
            )}

            {/* 🔥 Lời khuyên bảo mật */}
            <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: '#f0fdf4',
                borderRadius: '6px',
                border: '1px solid #86efac',
                fontSize: '13px',
                color: '#166534'
            }}>
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                }}>
                    <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Vì lý do bảo mật, nếu đây không phải là bạn, vui lòng đổi mật khẩu ngay lập tức.</span>
                </span>
            </div>
        </Modal>
    );
};

export default SessionExpiredModal;