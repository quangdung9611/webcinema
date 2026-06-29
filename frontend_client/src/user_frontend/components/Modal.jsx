import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

import "../styles/Modal.css";

const Modal = ({
    open,
    onClose,
    title = "",
    children,
    size = "md",
    type = "default",
    showHeader = true,
    showCloseButton = true,
    className = ""
}) => {

    useEffect(() => {
        if (!open) return;

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    if (!open) return null;

    const renderIcon = () => {
        switch (type) {
            case "success": return <CheckCircle2 size={64} />;
            case "error": return <XCircle size={64} />;
            case "warning": return <AlertTriangle size={64} />;
            case "info": return <Info size={64} />;
            default: return null;
        }
    };

    const modal = (
        <div className="modal-overlay" onClick={onClose}>

            <div
                className={`modal-container ${size} ${type} ${className}`}
                onClick={(e) => e.stopPropagation()}
            >

                {type !== "default" && (
                    <div className={`modal-icon ${type}`}>
                        {renderIcon()}
                    </div>
                )}

                {showHeader && (
                    <div className="modal-header">
                        <h2 className="modal-title">{title}</h2>
                    </div>
                )}

                {showCloseButton && (
                    <button
                        className="modal-close-btn"
                        onClick={onClose}
                    >
                        <X size={22} />
                    </button>
                )}

                <div className="modal-body">
                    {children}
                </div>

            </div>
        </div>
    );

    return createPortal(modal, document.body);
};

export default Modal;