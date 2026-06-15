import React from 'react';

import {
    X,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Info
} from 'lucide-react';

import '../styles/AdminModal.css';

const AdminModal = ({

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
        HEADER ICON
    ========================================================= */

    const renderHeaderIcon = () => {

        switch (type) {

            case 'success':
                return (
                    <CheckCircle2
                        size={44}
                        strokeWidth={2.5}
                    />
                );

            case 'error':
                return (
                    <XCircle
                        size={44}
                        strokeWidth={2.5}
                    />
                );

            case 'warning':
                return (
                    <AlertTriangle
                        size={44}
                        strokeWidth={2.5}
                    />
                );

            case 'info':
                return (
                    <Info
                        size={44}
                        strokeWidth={2.5}
                    />
                );

            default:
                return null;
        }
    };

    return (

        <div
            className="admin-modal-overlay"
            onClick={onClose}
        >

            <div
                className={`admin-modal-container ${size} ${type}`}
                onClick={(e) => e.stopPropagation()}
            >

                {/* =====================================================
                    HEADER
                ===================================================== */}

                <div className="admin-modal-header">

                    <div
                        className={`admin-modal-title-group ${type}`}
                    >

                        {
                            type !== 'default' &&
                            renderHeaderIcon()
                        }

                        <h2 className="admin-modal-title">

                            {title}

                        </h2>

                    </div>

                    <button
                        className="admin-modal-close-btn"
                        onClick={onClose}
                    >

                        <X size={20} />

                    </button>

                </div>

                {/* =====================================================
                    BODY
                ===================================================== */}

                <div className="admin-modal-body">

                    {children}

                </div>

            </div>

        </div>

    );

};

export default AdminModal;