import React from "react";
import { 
    X, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle, 
    Info 
} from "lucide-react"; 
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
    // ✅ PROP MỚI — cho phép custom nút
    confirmButton = null,
    cancelButton = null,
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
                return (
                    <span className="modal-icon success-icon">
                        <CheckCircle2 size={24} />
                    </span>
                );
            case "error":
                return (
                    <span className="modal-icon error-icon">
                        <XCircle size={24} />
                    </span>
                );
            case "warning":
                return (
                    <span className="modal-icon warning-icon">
                        <AlertTriangle size={24} />
                    </span>
                );
            case "info":
                return (
                    <span className="modal-icon info-icon">
                        <Info size={24} />
                    </span>
                );
            default:
                return null;
        }
    };

    // ========================================================
    // ✅ RENDER NÚT CANCEL
    // ========================================================
    const renderCancelButton = () => {
        // Nếu có cancelButton custom → dùng nó
        if (cancelButton) {
            return cancelButton({
                onClick: onCancel || onConfirm || handleClose,
                disabled: false,
            });
        }

        // Mặc định
        return (
            <button
                className="modal-btn-cancel"
                onClick={onCancel || onConfirm || handleClose}
            >
                {cancelText}
            </button>
        );
    };

    // ========================================================
    // ✅ RENDER NÚT CONFIRM
    // ========================================================
    const renderConfirmButton = () => {
        // Nếu có confirmButton custom → dùng nó
        if (confirmButton) {
            return confirmButton({
                onClick: onConfirm,
                disabled: false,
            });
        }

        // Mặc định
        return (
            <button
                className="modal-btn-confirm"
                onClick={onConfirm}
            >
                {confirmText}
            </button>
        );
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
                        {type !== "default" && renderHeaderIcon()}
                        <h2 className="modal-title">{title}</h2>
                    </div>

                    <div className="modal-divider" />

                    <div className="modal-body">
                        {message ? <p>{message}</p> : children}
                    </div>

                    {(onConfirm || onCancel) && (
                        <div className="modal-footer">
                            {renderCancelButton()}
                            {renderConfirmButton()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Modal;