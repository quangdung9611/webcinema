import React from 'react';
import { X } from 'lucide-react';
import '../styles/DeviceLogicModal.css';

const DeviceLoginModal = ({
    show,
    onClose = () => {},
    title,
    message,
    children,
    type = 'default',
    className = '',
    onConfirm,
    confirmText = 'Xác nhận',
    countdown = null,
}) => {
    if (!show) return null;

    const handleClose = () => {
        onClose();
    };

    const renderHeaderIcon = () => {
        switch (type) {
            case 'success': return <span className="modal-icon success-icon">✅</span>;
            case 'error': return <span className="modal-icon error-icon">❌</span>;
            case 'warning': return <span className="modal-icon warning-icon">⚠️</span>;
            case 'info': return <span className="modal-icon info-icon">ℹ️</span>;
            default: return null;
        }
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div
                className={`modal-container ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Nút đóng (X) - Vẫn giữ */}
                <button className="modal-close-btn" onClick={handleClose}>
                    <X size={20} />
                </button>

                <div className="modal-content">
                    <div className={`modal-title-group ${type}`}>
                        {type !== 'default' && renderHeaderIcon()}
                        <h2 className="modal-title">{title}</h2>
                    </div>

                    <div className="modal-divider" />

                    <div className="modal-body">
                        {message ? <p>{message}</p> : children}
                    </div>

                    {/* Chỉ có 1 nút Confirm, KHÔNG có nút Cancel */}
                    {onConfirm && (
                        <div className="modal-footer">
                            <button className="modal-btn-confirm" onClick={onConfirm}>
                                {confirmText}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeviceLoginModal;