import React from "react";
import { MailCheck } from "lucide-react";
import Modal from "./Modal";

const EmailVerificationSentModal = ({
    show,
    onConfirm = () => {},
    onClose = () => {},
    email = "",
    full_name = "",
    confirmText = "Đã hiểu",
}) => {
    if (!show) return null;

    return (
        <Modal
            show={show}
            onConfirm={onConfirm}
            onCancel={onClose}
            type="success"
            title="🎉 Đăng ký thành công!"
            confirmText={confirmText}
            cancelText="Đóng"
            className="email-verification-modal"
        >
            {/* Nội dung riêng truyền vào children */}
            <div style={{ textAlign: "center", padding: "10px 0" }}>
                {/* Icon xác thực email */}
                <div style={{
                    width: "70px", height: "70px", borderRadius: "50%",
                    background: "rgba(34, 197, 94, 0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 15px"
                }}>
                    <MailCheck size={40} color="#4ade80" />
                </div>

                <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "10px" }}>
                    Chào mừng <strong style={{ color: "var(--text-heading)" }}>{full_name || "bạn"}</strong> đến với Cinema Star!
                </p>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    Vui lòng kiểm tra hộp thư <strong style={{ color: "var(--silver-primary)" }}>{email}</strong> và bấm vào
                    link xác thực để hoàn tất đăng ký.
                </p>
            </div>
        </Modal>
    );
};

export default EmailVerificationSentModal;