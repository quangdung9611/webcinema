import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Modal from './Modal';

const ForgotPinModal = ({
    isOpen,
    onClose = () => {},
    email = '',
}) => {
    const navigate = useNavigate();

    // Tự động quay về trang payment sau 3 giây
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                navigate('/payment');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, navigate]);

    if (!isOpen) return null;

    return (
        <Modal
            show={isOpen}
            onClose={onClose}
            type="success"
            title="ĐỔI MÃ PIN THÀNH CÔNG"
            className="forgot-pin-modal"
        >
            <div className="forgot-pin-body">
                <div className="forgot-pin-icon success">
                    <ShieldCheck size={48} color="#22c55e" />
                </div>
                <p className="forgot-pin-text">
                    Bạn đã đặt lại mã PIN thành công!
                </p>
                <p className="forgot-pin-subtext">
                    Bạn có thể sử dụng mã PIN mới để thanh toán.
                    <br />
                    Đang chuyển về trang thanh toán...
                </p>
            </div>
        </Modal>
    );
};

export default ForgotPinModal;