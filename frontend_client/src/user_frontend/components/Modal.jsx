import React, { useEffect, useState } from "react";
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

    const [visible, setVisible] = useState(open);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        if (open) {
            setVisible(true);
            requestAnimationFrame(() => {
                setAnimate(true);
            });
        } else {
            setAnimate(false);
            const timer = setTimeout(() => {
                setVisible(false);
            }, 800); // 👈 KHỚP VỚI filmReelOut 0.7s
            return () => clearTimeout(timer);
        }
    }, [open]);

    if (!visible) return null;

    return createPortal(
        <div className={`modal-overlay ${animate ? "open" : "close"}`} onClick={onClose}>
            <div
                className={`modal-container ${size} ${type} ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {type !== "default" && (
                    <div className={`modal-icon ${type}`}>
                        {renderIcon()}
                    </div>
                )}

                {/* {showHeader && (
                    <div className="modal-header">
                        <h2 className="modal-title">{title}</h2>
                    </div>
                )} */}

                {showCloseButton && (
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={22} />
                    </button>
                )}

                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;