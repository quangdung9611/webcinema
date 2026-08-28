// src/user_frontend/components/ResetPasswordSuccessModal.jsx
import React from 'react';
import Modal from './Modal';

const ResetPasswordSuccessModal = ({
    show,
    onClose = () => {},
    onConfirm = () => {},
}) => {
    if (!show) return null;

    return (
        <Modal
            show={show}
            type="success"
            title="🎉 Đặt lại mật khẩu thành công!"
            confirmText="Đăng nhập ngay"
            cancelText="Đóng"
            onConfirm={onConfirm}
            onCancel={onClose}
            className="reset-password-success-modal"
        >
            <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{
                    width: "70px",
                    height: "70px",
                    borderRadius: "50%",
                    background: "rgba(74, 222, 128, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 15px"
                }}>
                    <span style={{ fontSize: "36px" }}>✅</span>
                </div>

                <p style={{
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    marginBottom: "8px"
                }}>
                    Mật khẩu của bạn đã được đặt lại thành công!
                </p>
                <p style={{
                    color: "var(--text-muted)",
                    fontSize: "14px",
                    lineHeight: 1.6
                }}>
                    Vui lòng đăng nhập lại để tiếp tục trải nghiệm.
                </p>
            </div>
        </Modal>
    );
};

export default ResetPasswordSuccessModal;