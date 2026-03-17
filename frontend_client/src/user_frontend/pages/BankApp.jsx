import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Modal from '../../admin_frontend/components/Modal'; // Dũng nhớ kiểm tra đúng đường dẫn file Modal.jsx nhé
import '../styles/BankApp.css';

const BankApp = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const hasSentOtp = useRef(false);

    const { bookingId, customerEmail, totalAmount, movieTitle } = location.state || {}; 
    
    const [timeLeft, setTimeLeft] = useState(300);
    const [otp, setOtp] = useState(''); 
    const [loading, setLoading] = useState(false);

    // --- LOGIC MODAL ---
    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'confirm',
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const openModal = (type, title, message, onConfirmCustom = null) => {
        setModalConfig({
            show: true,
            type: type,
            title: title,
            message: message,
            onConfirm: onConfirmCustom || (() => setModalConfig(prev => ({ ...prev, show: false })))
        });
    };

    // 1. Tự động gửi OTP
    useEffect(() => {
        const sendOtpInitial = async () => {
            if (!customerEmail || !bookingId) {
                openModal('error', 'Thiếu thông tin', 'Không tìm thấy thông tin thanh toán!', () => navigate('/'));
                return;
            };

            if (hasSentOtp.current) return;
            hasSentOtp.current = true;

            try {
                await axios.post('https://webcinema-zb8z.onrender.com/api/bank/send-otp', {
                    email: customerEmail,
                    bookingId: bookingId
                });
            } catch (err) {
                console.error("Lỗi gửi OTP:", err);
                openModal('error', 'Lỗi hệ thống', 'Không thể gửi mã OTP lúc này. Vui lòng thử lại.');
                hasSentOtp.current = false;
            }
        };

        sendOtpInitial();
    }, [bookingId, customerEmail, navigate]);

    // 2. Đếm ngược & Xử lý hết hạn
    useEffect(() => {
        if (timeLeft <= 0) {
            openModal('error', 'Hết hạn', 'Phiên giao dịch đã hết hạn!', () => navigate(-1));
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, navigate]);

    // 3. Xác thực OTP
    const handleVerifyPayment = async () => {
        if (otp.length < 6) {
            openModal('confirm', 'Thông báo', 'Vui lòng nhập đủ 6 số mã OTP');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post('https://webcinema-zb8z.onrender.com/api/bank/verify-otp', {
                email: customerEmail,
                otp: otp,
                bookingId: bookingId
            });

            if (res.data.success) {
                sessionStorage.setItem('last_booking_id', bookingId);
                // Mở modal thông báo thành công trước khi chuyển trang
                openModal('success', 'Thanh toán thành công', 'Cảm ơn bạn đã đặt vé!', () => {
                    navigate('/confirm-success', { state: res.data.data });
                });
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Mã OTP không chính xác!";
            openModal('error', 'Thất bại', errorMsg);
            setLoading(false);
        }
    };

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    return (
        <div className="bank-checkout-page">
            <nav className="bank-nav-bar">
                <div className="nav-content">
                    <img src="https://vietqr.net/portal-v2/images/img/vietqr-logo-bin.png" alt="Bank Logo" />
                    <span>Hệ thống xác thực giao dịch nội địa</span>
                </div>
            </nav>

            <main className="bank-checkout-container">
                <div className="bank-order-details">
                    <h2 className="section-title">Chi tiết đơn hàng</h2>
                    <div className="info-group">
                        <label>Đơn vị</label>
                        <div className="vendor-info">
                            <img src="https://webcinema-zb8z.onrender.com/uploads/Bank/galaxy_logo.jpg" alt="Galaxy" />
                            <span>Galaxy Cinema</span>
                        </div>
                    </div>
                    <div className="info-group">
                        <label>Mã đơn</label>
                        <p className="order-value">{bookingId}</p>
                    </div>
                    <div className="info-group">
                        <label>Số tiền</label>
                        <p className="order-value amount">{(totalAmount || 0).toLocaleString()} đ</p>
                    </div>

                    <div className="bank-expiry-box">
                        <p>OTP hết hạn sau:</p>
                        <div className="expiry-timer">
                            <span>{mins < 10 ? `0${mins}` : mins}:{secs < 10 ? `0${secs}` : secs}</span>
                        </div>
                    </div>
                </div>

                <div className="bank-otp-section">
                    <div className="otp-card">
                        {/* THÊM PHẦN QR VÀO ĐÂY */}
                    <div className="bank-qr-mini-wrapper">
                        <img 
                            src={`https://webcinema-zb8z.onrender.com/uploads/Bank/Qr_nganhang.jpg`} 
                            alt="Bank QR" 
                            className="bank-qr-mini"
                        />
                        <div className="qr-scan-line"></div>
                    </div>
                        <h3 className="otp-title">NHẬP MÃ OTP</h3>
                        <p className="otp-sub">Gửi đến: <strong>{customerEmail}</strong></p>
                        <div className="otp-input-wrapper">
                            <input 
                                type="text" className="otp-field" placeholder="●●●●●●" maxLength="6"
                                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} autoFocus
                            />
                        </div>
                        <button className="btn-confirm-payment" onClick={handleVerifyPayment} disabled={loading}>
                            {loading ? "ĐANG XỬ LÝ..." : "XÁC NHẬN"}
                        </button>
                    </div>
                </div>
            </main>

            {/* RENDER MODAL TẠI ĐÂY */}
            <Modal 
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
                onCancel={() => setModalConfig(prev => ({ ...prev, show: false }))}
            />
        </div>
    );
};

export default BankApp;