// admin_frontend/components/AdminDeviceLoginModal.jsx
// ============================================================
// ADMIN DEVICE LOGIN MODAL
// Cấu trúc giống DeviceLogicModal của user:
// - Nhận children để custom
// - Nhận className từ ngoài
// - Dùng type/title/message chuẩn
// ============================================================

import React from 'react';
import { X } from 'lucide-react';
import '../styles/AdminDeviceModal.css';

const AdminDeviceLoginModal = ({
    show,
    onClose = () => {},
    title,
    message,
    children,
    type = 'default',
    className = '',
    onConfirm,
    onCancel,
    confirmText = 'Đăng nhập lại',
    cancelText = 'Ở lại',
}) => {
    if (!show) return null;

    const handleClose = () => {
        if (onCancel) {
            onCancel();
        } else {
            onClose();
        }
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
                {/* Nút đóng (X) */}
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

                    {/* 2 nút: Cancel + Confirm */}
                    <div className="modal-footer modal-footer-2btns">
                        {onCancel && (
                            <button
                                className="modal-btn-cancel"
                                onClick={onCancel}
                            >
                                {cancelText}
                            </button>
                        )}

                        {onConfirm && (
                            <button
                                className="modal-btn-confirm"
                                onClick={onConfirm}
                            >
                                {confirmText}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDeviceLoginModal;