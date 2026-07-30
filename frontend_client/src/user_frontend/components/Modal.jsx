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
    onClose = () => {}, // Quan trọng: fallback hàm rỗng để nút X luôn an toàn
    title,
    message,
    children,
    type = "default",
    className = "",
    // ✨ Thêm mới: Hỗ trợ nút Xác nhận / Hủy
    onConfirm,
    onCancel,
    confirmText = "Xác nhận",
    cancelText = "Hủy",
}) => {

    if (!show) return null;

    const renderHeaderIcon = () => {
        switch (type) {
            case "success":
                return <CheckCircle2 size={34} strokeWidth={2.4} />;
            case "error":
                return <XCircle size={34} strokeWidth={2.4} />;
            case "warning":
                return <AlertTriangle size={34} strokeWidth={2.4} />;
            case "info":
                return <Info size={34} strokeWidth={2.4} />;
            default:
                return null;
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal-container ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Nút đóng (X) luôn hiển thị */}
                <button className="modal-close-btn" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="modal-content">
                    {/* Tiêu đề và icon */}
                    <div className={`modal-title-group ${type}`}>
                        {type !== "default" && renderHeaderIcon()}
                        <h2 className="modal-title">{title}</h2>
                    </div>

                    <div className="modal-divider" />

                    {/* Nội dung */}
                    <div className="modal-body">
                        {message ? <p>{message}</p> : children}
                    </div>

                    {/* ✨ THÊM MỚI: Footer chứa nút Xác nhận / Hủy */}
                    {(onConfirm || onCancel) && (
                        <div className="modal-footer">
                            <button 
                                className="modal-btn-cancel" 
                                onClick={onCancel || onClose}
                            >
                                {cancelText}
                            </button>
                            <button 
                                className="modal-btn-confirm" 
                                onClick={onConfirm}
                            >
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