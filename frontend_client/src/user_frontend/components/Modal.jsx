import React from "react";
import { X } from "lucide-react"; // giữ nút X từ lucide
import "../styles/Modal.css";

const Modal = ({
    show,
    onClose = () => {},
    title,
    message,
    children,
    type = "default",
    className = "",
    onConfirm,
    onCancel,
    confirmText = "Xác nhận",
    cancelText = "Hủy",
}) => {
    if (!show) return null;

    // Hàm đóng modal – ưu tiên onCancel, nếu không có thì dùng onClose
    const handleClose = () => {
        if (onCancel) onCancel();
        else onClose();
    };

    const renderHeaderIcon = () => {
        switch (type) {
            case "success":
                return <span className="modal-icon success-icon">✅</span>;
            case "error":
                return <span className="modal-icon error-icon">❌</span>;
            case "warning":
                return <span className="modal-icon warning-icon">⚠️</span>;
            case "info":
                return <span className="modal-icon info-icon">ℹ️</span>;
            default:
                return null;
        }
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div
                className={`modal-container ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Nút đóng (X) – gọi handleClose */}
                <button className="modal-close-btn" onClick={handleClose}>
                    <X size={20} />
                </button>

                <div className="modal-content">
                    <div className={`modal-title-group ${type}`}>
                        {type !== "default" && renderHeaderIcon()}
                        <h2 className="modal-title">{title}</h2>
                    </div>

                    <div className="modal-divider" />

                    <div className="modal-body">
                        {message ? <p>{message}</p> : children}
                    </div>

                    {(onConfirm || onCancel) && (
                        <div className="modal-footer">
                            <button className="modal-btn-cancel" onClick={onCancel || handleClose}>
                                {cancelText}
                            </button>
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

export default Modal;