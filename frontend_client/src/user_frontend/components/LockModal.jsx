// src/user_frontend/components/LockModal.jsx
import React from 'react';
import Modal from './Modal';
import '../styles/LockModal.css';

const LockModal = ({
    show,
    onClose = () => {},
    message = 'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng gửi lại OTP mới.',
    email = '',
    onResend = () => {},
}) => {
    if (!show) return null;

    return (
        <Modal
            show={show}
            onClose={onClose}
            type="warning"
            title="🔒 OTP đã bị khóa"
            confirmText="Gửi lại OTP"
            cancelText="Đóng"
            onConfirm={() => {
                onResend();
                onClose();
            }}
            onCancel={onClose}
            className="otp-lock-modal"
        >
            <div className="otp-lock-modal-body">
                {email && (
                    <p className="lock-email">
                        📧 <strong>{email}</strong>
                    </p>
                )}

                <div className="lock-icon-wrapper">
                    <span className="lock-icon">❌</span>
                </div>

                <p className="lock-message">
                    {message}
                </p>

                <p className="lock-sub-message">
                    Vui lòng bấm <strong>"Gửi lại OTP"</strong> để nhận mã mới.
                </p>

                <div className="lock-hint">
                    <p>
                        💡 Bạn chỉ được gửi lại OTP tối đa <strong>3 lần</strong> trong <strong>5 phút</strong>.
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default LockModal;