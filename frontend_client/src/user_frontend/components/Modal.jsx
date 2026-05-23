import React from 'react';

import {
    X,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Info
} from 'lucide-react';

import '../styles/Modal.css';

const Modal = ({

    /* =========================================================
        MODAL CONTROL
    ========================================================= */

    open,
    onClose,

    /* =========================================================
        CONTENT
    ========================================================= */

    title,
    children,

    /* =========================================================
        SIZE
    ========================================================= */

    size = 'md',

    /* =========================================================
        TYPE
        success | error | warning | info | default
    ========================================================= */

    type = 'default'

}) => {

    /* =========================================================
        HIDE MODAL
    ========================================================= */

    if (!open) return null;

    /* =========================================================
        RENDER ICON
    ========================================================= */

    const renderIcon = () => {

        switch (type) {

            /* =========================
                SUCCESS
            ========================= */

            case 'success':

                return (

                    <div className="modal-icon success">

                        <CheckCircle2
                            size={72}
                            strokeWidth={2.5}
                        />

                    </div>

                );

            /* =========================
                ERROR
            ========================= */

            case 'error':

                return (

                    <div className="modal-icon error">

                        <XCircle
                            size={72}
                            strokeWidth={2.5}
                        />

                    </div>

                );

            /* =========================
                WARNING
            ========================= */

            case 'warning':

                return (

                    <div className="modal-icon warning">

                        <AlertTriangle
                            size={72}
                            strokeWidth={2.5}
                        />

                    </div>

                );

            /* =========================
                INFO
            ========================= */

            case 'info':

                return (

                    <div className="modal-icon info">

                        <Info
                            size={72}
                            strokeWidth={2.5}
                        />

                    </div>

                );

            /* =========================
                DEFAULT
            ========================= */

            default:

                return null;

        }

    };

    return (

        <div
            className="modal-overlay"
            onClick={onClose}
        >

            <div
                className={`modal-container ${size} ${type}`}
                onClick={(e) => e.stopPropagation()}
            >

                {/* =====================================================
                    ICON
                ===================================================== */}

                {
                    type !== 'default' && (

                        <div className="modal-icon-wrapper">

                            {renderIcon()}

                        </div>

                    )
                }

                {/* =====================================================
                    HEADER
                ===================================================== */}

                <div className="modal-header">

                    <h2 className="modal-title">

                        {title}

                    </h2>

                    <button
                        className="modal-close-btn"
                        onClick={onClose}
                    >

                        <X size={20} />

                    </button>

                </div>

                {/* =====================================================
                    BODY
                ===================================================== */}

                <div className="modal-body">

                    {children}

                </div>

            </div>

        </div>

    );

};

export default Modal;