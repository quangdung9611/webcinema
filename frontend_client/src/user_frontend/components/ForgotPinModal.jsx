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

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                if (onClose) onClose();
                navigate('/payment', { 
                    state: { 
                        fromForgotPin: true 
                    } 
                });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, navigate, onClose]);

    if (!isOpen) return null;

    return (
        <Modal
            show={isOpen}
            onClose={onClose}
            type="success"
            title="ĐỔI MÃ PIN THÀNH CÔNG"
            className="forgot-pin-modal"
        >
            <div className="forgot-pin-body" style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    background: 'rgba(34, 197, 94, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px'
                }}>
                    <ShieldCheck size={40} color="#4ade80" />
                </div>
                <p style={{ color: 'var(--text-heading)', fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                    Đổi mã PIN thành công!
                </p>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
                    Bạn có thể sử dụng mã PIN mới để thanh toán.
                    <br />
                    Đang chuyển về trang thanh toán...
                </p>
            </div>
        </Modal>
    );
};

export default ForgotPinModal;