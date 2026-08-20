import React from 'react';
import Modal from './Modal'; 
import '../styles/SessionExpiredModal.css';

const SessionExpiredModal = ({ isOpen, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <Modal
            show={isOpen}
            type="warning"
            title="Đã đăng nhập ở thiết bị khác!"
            message="Tài khoản của bạn đang đăng nhập trên một thiết bị khác. Để đăng nhập thiết bị này, vui lòng đăng xuất thiết bị kia trước."
            onConfirm={onConfirm}
            // 👇 SỬA Ở ĐÂY: Cả 2 nút đều dùng onConfirm để đóng modal
            onCancel={onConfirm} 
            confirmText="Đăng nhập lại"
            cancelText="Đăng nhập lại"
            className="session-expired-modal-wrapper"
        />
    );
};

export default SessionExpiredModal;