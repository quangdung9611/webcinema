import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Modal from '../../admin_frontend/components/Modal'; 
import '../styles/BankApp.css';

const BankApp = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Dùng useRef để đánh dấu đã gửi OTP chưa (ref không bị mất giá trị khi re-render)
    const hasSentOtp = useRef(false);

    const { bookingId, customerEmail, totalAmount } = location.state || {}; 
    
    const [timeLeft, setTimeLeft] = useState(300);
    const [otp, setOtp] = useState(''); 
    const [loading, setLoading] = useState(false);

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

    // 1. LOGIC GỬI OTP DUY NHẤT 1 LẦN
        useEffect(() => {
        const sendOtpInitial = async () => {
            if (!customerEmail || !bookingId || hasSentOtp.current) return;

            hasSentOtp.current = true; // Khóa ngay lập tức trước khi gọi axios

            try {
                await axios.post('https://api.quangdungcinema.id.vn/api/bank/send-otp', {
                    email: customerEmail,
                    bookingId: bookingId
                });
            } catch (err) {
                console.error("Lỗi gửi OTP:", err);
                // hasSentOtp.current = false; // Chỉ mở khóa nếu ông muốn cho user gửi lại khi lỗi
            }
        };
        sendOtpInitial();
    }, [bookingId, customerEmail]);

    // 2. ĐẾM NGƯỢC & TỰ ĐỘNG HỦY ĐƠN KHI HẾT HẠN
    useEffect(() => {
        if (timeLeft <= 0) {
            // Khi hết 5 phút, gọi API hủy đơn bên Backend để giải phóng ghế
            const handleTimeout = async () => {
                try {
                    await axios.post('https://api.quangdungcinema.id.vn/api/bank/cancel-timeout', {
                        bookingId: bookingId,
                        email: customerEmail
                    });
                } catch (err) {
                    console.error("Lỗi khi tự động hủy đơn:", err);
                }
                openModal('error', 'Hết hạn', 'Phiên giao dịch đã hết hạn, đơn hàng đã bị hủy!', () => navigate('/'));
            };
            
            handleTimeout();
            return;
        }

        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, bookingId, customerEmail, navigate]);

    // 3. XÁC THỰC OTP
    const handleVerifyPayment = async () => {
        if (otp.length < 6) {
            openModal('confirm', 'Thông báo', 'Vui lòng nhập đủ 6 số mã OTP');
            return;
        }

        setLoading(true);
        try {
            // Xác thực mã OTP và chốt đơn luôn ở Backend
            const res = await axios.post('https://api.quangdungcinema.id.vn/api/bank/verify-otp', {
                email: customerEmail,
                otp: otp,
                bookingId: bookingId
            });

            if (res.data.success) {
                // Dọn dẹp session sau khi thanh toán xong
                sessionStorage.removeItem('holdExpiresAt');
                sessionStorage.removeItem('selectedSeats');
                
                openModal('success', 'Thanh toán thành công', 'Cảm ơn bạn đã đặt vé!', () => {
                    navigate('/confirm-success', { state: { bookingId: bookingId } });
                });
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Mã OTP không đúng hoặc đã hết hạn!";
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
                            <img src="https://api.quangdungcinema.id.vn/uploads/Bank/galaxy_logo.jpg" alt="Galaxy" />
                            <span>Dũng Cinema</span>
                        </div>
                    </div>
                    <div className="info-group">
                        <label>Mã đơn</label>
                        <p className="order-value">#{bookingId}</p>
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
                        <div className="bank-qr-mini-wrapper">
                            <img 
                                src={`https://api.quangdungcinema.id.vn/uploads/Bank/Qr_nganhang.jpg`} 
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
                            {loading ? "ĐANG XỬ LÝ..." : "XÁC NHẬN THANH TOÁN"}
                        </button>
                    </div>
                </div>
            </main>

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