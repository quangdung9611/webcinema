// user_frontend/components/UpdatePhoneModal.jsx

import React, { useState } from "react";
import { Phone, AlertCircle, CheckCircle } from "lucide-react";
import api from "../../api/api";
import LoadingButton from "./LoadingButton";
import Modal from "./Modal";
import "../styles/UserAuth.css";

const UpdatePhoneModal = ({ show, onSuccess, onClose }) => {
    const [phone, setPhone] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError("");

        // Validate
        if (!phone.trim()) {
            setError("Vui lòng nhập số điện thoại");
            return;
        }
        if (!/^[0-9]{10}$/.test(phone.trim())) {
            setError("Số điện thoại phải đúng 10 chữ số");
            return;
        }

        setLoading(true);

        try {
            await api.post("/api/auth/update-phone", { phone: phone.trim() });
            onSuccess?.();
        } catch (err) {
            setError(err?.response?.data?.message || "Không thể cập nhật số điện thoại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            show={show}
            type="info"
            title="📱 Bổ sung số điện thoại"
            onCancel={onClose}
            showCancel={false}
            showConfirm={false}
        >
            <div className="update-phone-content">
                <div className="update-phone-icon">
                    <Phone size={40} color="#d6b36a" />
                </div>
                <p className="update-phone-text">
                    Vui lòng bổ sung <strong>số điện thoại</strong> để chúng tôi liên hệ
                    khi có vấn đề về đơn hàng của bạn.
                </p>

                {error && (
                    <div className="error-message">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="form-group">
                    <label>Số điện thoại</label>
                    <input
                        type="tel"
                        className="auth-input"
                        placeholder="0123456789"
                        value={phone}
                        onChange={(e) => {
                            setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                            if (error) setError("");
                        }}
                        disabled={loading}
                        autoFocus
                    />
                </div>

                <LoadingButton
                    type="button"
                    loading={loading}
                    loadingText="Đang lưu..."
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn-user btn-user-silver"
                    spinnerColor="#000000"
                >
                    XÁC NHẬN
                </LoadingButton>
            </div>
        </Modal>
    );
};

export default UpdatePhoneModal;