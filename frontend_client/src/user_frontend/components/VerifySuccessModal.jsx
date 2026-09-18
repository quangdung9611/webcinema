// src/user_frontend/components/VerifySuccessModal.js
import React, { useEffect } from 'react';
import { PartyPopper, CheckCircle, Hourglass } from 'lucide-react';
import Modal from './Modal';

const VerifySuccessModal = ({
    show,
    full_name = '',
    countdown = 3,
    onClose = () => {},
}) => {
    if (!show) return null;

    return (
        <Modal
            show={show}
            type="success"
            title={
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <PartyPopper size={22} /> Xác thực thành công!
                </span>
            }
            confirmText={`Đăng nhập (${countdown}s)`}
            onConfirm={onClose}
            onCancel={onClose}
        >
            <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{
                    width: "70px", height: "70px", borderRadius: "50%",
                    background: "rgba(34, 197, 94, 0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 15px"
                }}>
                    <CheckCircle size={40} color="#4ade80" />
                </div>

                <p style={{ color: "var(--text-heading)", fontSize: "18px", fontWeight: "bold", marginBottom: "8px" }}>
                    Chúc mừng {full_name || "bạn"}!
                </p>
                <p style={{
                    color: "var(--text-secondary)",
                    lineHeight: 1.6,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    width: "100%"
                }}>
                    Tài khoản của bạn đã được xác thực thành công!
                    <PartyPopper size={18} color="#4ade80" />
                </p>
                <p style={{
                    color: "var(--text-muted)",
                    fontSize: "14px",
                    marginTop: "10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    width: "100%"
                }}>
                    <Hourglass size={14} />
                    <span>
                        Tự động chuyển đến trang đăng nhập sau{' '}
                        <strong style={{ color: "#4ade80" }}>{countdown}</strong> giây...
                    </span>
                </p>
            </div>
        </Modal>
    );
};

export default VerifySuccessModal;