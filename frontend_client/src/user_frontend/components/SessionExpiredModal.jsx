// components/SessionExpiredModal.jsx
import React from 'react';
import Modal from './Modal';
import '../styles/SessionExpiredModal.css';

const SessionExpiredModal = ({ isOpen, onConfirm, message }) => {
    if (!isOpen) return null;

    return (
        <Modal
            show={isOpen}
            type="warning"
            title="Đã đăng nhập ở thiết bị khác!"
            message={message || 'Tài khoản của bạn vừa được đăng nhập trên một thiết bị khác. Để bảo mật, phiên đăng nhập hiện tại sẽ bị đóng.'}
            onConfirm={onConfirm}
            onCancel={onConfirm}
            confirmText="Đăng nhập lại"
            cancelText="Đăng nhập lại"
            className="session-expired-modal-wrapper"
        />
    );
};

export default SessionExpiredModal;