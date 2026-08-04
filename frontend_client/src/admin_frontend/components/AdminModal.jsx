import React from 'react';
import { X } from 'lucide-react';
import '../styles/AdminModal.css';

const AdminModal = ({
    open, // đổi tên prop từ show -> open
    onClose, // thay vì onCancel
    type = 'default',
    title,
    message,
    onConfirm,
    children,
    size = 'md'
}) => {
    if (!open) return null;

    const renderHeaderIcon = () => {
        switch (type) {
            case 'success': return <span className="admin-modal-icon success-icon">✅</span>;
            case 'error': return <span className="admin-modal-icon error-icon">❌</span>;
            case 'warning': return <span className="admin-modal-icon warning-icon">⚠️</span>;
            case 'info': return <span className="admin-modal-icon info-icon">ℹ️</span>;
            default: return null;
        }
    };

    const handleClose = () => {
        if (onClose) onClose();
    };

    const bodyContent = children || (message && <p>{message}</p>);
    const showActions = type === 'confirm' || onConfirm;

    return (
        <div className="admin-modal-overlay" onClick={handleClose}>
            <div
                className={`admin-modal-container ${size} ${type}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="admin-modal-header">
                    <div className={`admin-modal-title-group ${type}`}>
                        {type !== 'default' && renderHeaderIcon()}
                        <h2 className="admin-modal-title">{title}</h2>
                    </div>
                    <button className="admin-modal-close-btn" onClick={handleClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="admin-modal-body">
                    {bodyContent}
                    {showActions && (
                        <div className="admin-modal-actions">
                            {onClose && (
                                <button className="admin-modal-btn cancel" onClick={onClose}>
                                    Hủy
                                </button>
                            )}
                            {onConfirm && (
                                <button className="admin-modal-btn confirm" onClick={onConfirm}>
                                    Xác nhận
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminModal;