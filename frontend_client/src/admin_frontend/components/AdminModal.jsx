import React from 'react';
import { X } from 'lucide-react'; // Chỉ giữ X cho nút đóng
import '../styles/AdminModal.css';

const AdminModal = ({
    open,
    onClose,
    title,
    children,
    size = 'md',
    type = 'default'
}) => {
    if (!open) return null;

    const renderHeaderIcon = () => {
        switch (type) {
            case 'success':
                return <span className="admin-modal-icon success-icon">✅</span>;
            case 'error':
                return <span className="admin-modal-icon error-icon">❌</span>;
            case 'warning':
                return <span className="admin-modal-icon warning-icon">⚠️</span>;
            case 'info':
                return <span className="admin-modal-icon info-icon">ℹ️</span>;
            default:
                return null;
        }
    };

    return (
        <div className="admin-modal-overlay" onClick={onClose}>
            <div
                className={`admin-modal-container ${size} ${type}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="admin-modal-header">
                    <div className={`admin-modal-title-group ${type}`}>
                        {type !== 'default' && renderHeaderIcon()}
                        <h2 className="admin-modal-title">{title}</h2>
                    </div>
                    <button className="admin-modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="admin-modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AdminModal;