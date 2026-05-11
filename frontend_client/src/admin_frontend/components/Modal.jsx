import React from 'react';

import {
    Check,
    X,
    CircleAlert,
    X as CloseIcon
} from 'lucide-react';

import '../styles/Modal.css';

const Modal = ({
    show,
    type,
    title,
    message,
    onConfirm,
    onCancel
}) => {

    if (!show) return null;

    // =========================
    // ICON
    // =========================

    const getIcon = () => {

        const icons = {
            success: (
                <Check
                    size={34}
                    strokeWidth={2.8}
                />
            ),

            error: (
                <X
                    size={34}
                    strokeWidth={2.8}
                />
            ),

            confirm: (
                <CircleAlert
                    size={34}
                    strokeWidth={2.5}
                />
            )
        };

        return (
            icons[type] ||
            <CircleAlert size={34} />
        );
    };

    // =========================
    // RENDER
    // =========================

    return (
        <div className="modal-overlay">

            <div className="modal-content">

                {/* CLOSE */}
                <button
                    className="modal-close-x"
                    onClick={onCancel || onConfirm}
                >
                    <CloseIcon
                        size={18}
                        strokeWidth={2.5}
                    />
                </button>

                {/* ICON */}
                <div className={`modal-icon ${type}`}>
                    {getIcon()}
                </div>

                {/* TITLE */}
                <h3>
                    {title}
                </h3>

                {/* MESSAGE */}
                <div className="modal-message">
                    {message}
                </div>

                {/* ACTIONS */}
                <div className="modal-actions">

                    {type === 'confirm' ? (
                        <>
                            {/* CANCEL */}
                            <button
                                className="modal-btn btn-cancel"
                                onClick={onCancel}
                            >
                                Hủy bỏ
                            </button>

                            {/* CONFIRM */}
                            <button
                                className="modal-btn confirm-btn"
                                onClick={onConfirm}
                            >
                                Xác nhận
                            </button>
                        </>
                    ) : (
                        <button
                            className="modal-btn confirm-btn"
                            onClick={onConfirm}
                        >
                            Đóng
                        </button>
                    )}

                </div>

            </div>

        </div>
    );
};

export default Modal;