import React from 'react';
import { X } from 'lucide-react';
import '../styles/AdminModal.css';

const AdminModal = ({
    show,
    onCancel,
    type = 'default',
    title,
    message,
    onConfirm,
    children,
    size = 'md'
}) => {
    if (!show) return null;

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
        if (onCancel) onCancel();
    };

    // Nội dung body: ưu tiên children, nếu không có thì dùng message
    const bodyContent = children || (message && <p>{message}</p>);

    // Hiển thị nút action nếu type là confirm hoặc có onConfirm
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
                            {onCancel && (
                                <button className="admin-modal-btn cancel" onClick={onCancel}>
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