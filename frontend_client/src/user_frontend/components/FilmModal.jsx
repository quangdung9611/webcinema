import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

import "../styles/FilmModal.css"; // ⚠️ nhớ đổi tên file CSS thành FilmModal.css

const FilmModal = ({
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
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [open]);

    if (!visible) return null;

    const renderIcon = () => {
        switch (type) {
            case "success": return <CheckCircle2 size={40} strokeWidth={2} />;
            case "error":   return <XCircle size={40} strokeWidth={2} />;
            case "warning": return <AlertTriangle size={40} strokeWidth={2} />;
            case "info":    return <Info size={40} strokeWidth={2} />;
            default: return null;
        }
    };

    return createPortal(
        <div className={`film-modal-overlay ${animate ? "open" : "close"}`} onClick={onClose}>
            <div
                className={`film-modal-container ${size} ${type} ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {type !== "default" && (
                    <div className={`film-modal-icon ${type}`}>
                        {renderIcon()}
                    </div>
                )}

                {showCloseButton && (
                    <button className="film-modal-close-btn" onClick={onClose}>
                        <X size={22} />
                    </button>
                )}

                <div className="film-modal-body">
                    {children}
                </div>

                {/* Ánh sáng lướt – giữ hiệu ứng */}
                <div className="film-light-sweep" />
            </div>
        </div>,
        document.body
    );
};

export default FilmModal;