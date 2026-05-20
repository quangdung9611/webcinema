import React from 'react';

import { X } from 'lucide-react';

import '../styles/AdminModal.css';

const AdminModal = ({
    open,
    onClose,
    title,
    children,
    size = 'md'
}) => {

    if (!open) return null;

    return (

        <div
            className="admin-modal-overlay"
            onClick={onClose}
        >

            <div
                className={`admin-modal-container ${size}`}
                onClick={(e) => e.stopPropagation()}
            >

                {/* ================= HEADER ================= */}

                <div className="admin-modal-header">

                    <h2>{title}</h2>

                    <button
                        className="admin-modal-close-btn"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>

                </div>

                {/* ================= BODY ================= */}

                <div className="admin-modal-body">

                    {children}

                </div>

            </div>

        </div>

    );

};

export default AdminModal;