import React, { useEffect } from 'react';
import { MailCheck } from 'lucide-react';
import Modal from './Modal';

const EmailVerificationSentModal = ({
    show,
    onConfirm = () => {},
    onClose = () => {},
    email = "",
    full_name = "",
    confirmText = "Đã hiểu",
    autoClose = false, // 🆕 Mặc định KHÔNG tự đóng
    autoCloseDelay = 3000,
}) => {
    // 🆕 Chỉ tự động đóng khi autoClose = true
    useEffect(() => {
        if (show && autoClose) {
            const timer = setTimeout(() => {
                if (onConfirm) onConfirm();
                else if (onClose) onClose();
            }, autoCloseDelay);
            return () => clearTimeout(timer);
        }
    }, [show, autoClose, autoCloseDelay, onConfirm, onClose]);

    if (!show) return null;

    return (
        <Modal
            show={show}
            onConfirm={onConfirm}
            onCancel={onClose}
            type="success"
            title="📧 Xác thực email"
            confirmText={confirmText}
            cancelText="Đóng"
            className="email-verification-modal"
        >
            <div style={{ textAlign: "center", padding: "10px 0" }}>
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
                <div style={{ 
                    marginTop: "15px", 
                    padding: "10px", 
                    background: "rgba(255, 255, 255, 0.03)", 
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.05)"
                }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
                        🔄 Đang kết nối real-time... Trang sẽ tự động cập nhật khi bạn xác thực email thành công!
                    </p>
                    <div style={{ 
                        marginTop: "8px",
                        display: "flex",
                        justifyContent: "center",
                        gap: "4px"
                    }}>
                        <span className="dot-pulse" style={{ 
                            display: "inline-block",
                            width: "8px", height: "8px",
                            borderRadius: "50%",
                            background: "#4ade80",
                            animation: "pulse 1.5s ease-in-out infinite"
                        }}></span>
                        <span className="dot-pulse" style={{ 
                            display: "inline-block",
                            width: "8px", height: "8px",
                            borderRadius: "50%",
                            background: "#4ade80",
                            animation: "pulse 1.5s ease-in-out infinite 0.3s"
                        }}></span>
                        <span className="dot-pulse" style={{ 
                            display: "inline-block",
                            width: "8px", height: "8px",
                            borderRadius: "50%",
                            background: "#4ade80",
                            animation: "pulse 1.5s ease-in-out infinite 0.6s"
                        }}></span>
                    </div>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "12px" }}>
                    💡 Bạn có thể đóng modal này và vẫn nhận được thông báo khi xác thực thành công
                </p>
            </div>
        </Modal>
    );
};

export default EmailVerificationSentModal;