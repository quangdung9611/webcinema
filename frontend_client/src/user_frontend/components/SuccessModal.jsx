import React, { useEffect } from 'react';
import Modal from './Modal';

const SuccessModal = ({
    isOpen,
    onConfirm,
    onClose,
    title = 'Thành công!',
    message = 'Thao tác đã được thực hiện thành công.',
    confirmText = 'Vào trang chủ',
    cancelText = 'Đóng',
    autoClose = true,
    autoCloseDelay = 3000,
    className = "",
}) => {
    useEffect(() => {
        if (isOpen && autoClose) {
            const timer = setTimeout(() => {
                if (onConfirm) onConfirm();
                else if (onClose) onClose();
            }, autoCloseDelay);
            return () => clearTimeout(timer);
        }
    }, [isOpen, autoClose, autoCloseDelay, onConfirm, onClose]);

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        else if (onClose) onClose();
    };

    const handleCancel = () => {
        if (onClose) onClose();
        else if (onConfirm) onConfirm();
    };

    return (
        <Modal
            show={isOpen}
            onClose={handleCancel}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            title={title}
            message={message}
            type="success"
            confirmText={confirmText}
            cancelText={cancelText}
            className={className}
        />
    );
};

export default SuccessModal;