import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Modal from '../../admin_frontend/components/Modal';
import '../styles/BankApp.css';

const BankApp = () => {

    const location = useLocation();
    const navigate = useNavigate();

    // =========================
    // DATA
    // =========================

    const bookingData =
        location.state ||
        JSON.parse(
            sessionStorage.getItem('lastSuccessTicket')
        ) || {};

    const {
        bookingId,
        customerEmail,
        totalAmount
    } = bookingData;

    // =========================
    // STATES
    // =========================

    const hasSentOtp = useRef(false);

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

    // =========================
    // MODAL
    // =========================

    const openModal = (
        type,
        title,
        message,
        onConfirmCustom = null
    ) => {

        setModalConfig({
            show: true,
            type,
            title,
            message,
            onConfirm:
                onConfirmCustom ||
                (() =>
                    setModalConfig(prev => ({
                        ...prev,
                        show: false
                    })))
        });
    };

    // =========================
    // CHECK DATA
    // =========================

    useEffect(() => {

        if (!bookingId || !customerEmail) {
            navigate('/');
        }

    }, [bookingId, customerEmail, navigate]);

    // =========================
    // SEND OTP
    // =========================

    useEffect(() => {

        const sendOtpInitial = async () => {

            if (
                !customerEmail ||
                !bookingId ||
                hasSentOtp.current
            ) {
                return;
            }

            hasSentOtp.current = true;

            try {

                await axios.post(
                    'https://api.quangdungcinema.id.vn/api/bank/send-otp',
                    {
                        email: customerEmail,
                        bookingId: bookingId
                    }
                );

            } catch (err) {

                console.error(
                    'Lỗi gửi OTP:',
                    err
                );
            }
        };

        sendOtpInitial();

    }, [bookingId, customerEmail]);

    // =========================
    // COUNTDOWN
    // =========================

    useEffect(() => {

        if (timeLeft <= 0) {

            const handleTimeout = async () => {

                try {

                    await axios.post(
                        'https://api.quangdungcinema.id.vn/api/bank/cancel-timeout',
                        {
                            bookingId,
                            email: customerEmail
                        }
                    );

                } catch (err) {

                    console.error(
                        'Lỗi hủy đơn:',
                        err
                    );
                }

                openModal(
                    'error',
                    'HẾT HẠN',
                    'Phiên giao dịch đã hết hạn!',
                    () => navigate('/')
                );
            };

            handleTimeout();

            return;
        }

        const timer = setInterval(() => {

            setTimeLeft(prev => prev - 1);

        }, 1000);

        return () => clearInterval(timer);

    }, [
        timeLeft,
        bookingId,
        customerEmail,
        navigate
    ]);

    // =========================
    // VERIFY OTP
    // =========================

    const handleVerifyPayment = async () => {

        if (otp.length < 6) {

            openModal(
                'error',
                'THÔNG BÁO',
                'Vui lòng nhập đủ 6 số OTP'
            );

            return;
        }

        setLoading(true);

        try {

            const res = await axios.post(
                'https://api.quangdungcinema.id.vn/api/bank/verify-otp',
                {
                    email: customerEmail,
                    otp,
                    bookingId
                }
            );

            if (res.data.success) {

                sessionStorage.removeItem(
                    'holdExpiresAt'
                );

                sessionStorage.removeItem(
                    'selectedSeats'
                );

                openModal(
                    'success',
                    'THANH TOÁN THÀNH CÔNG',
                    'Cảm ơn bạn đã đặt vé!',
                    () => {

                        navigate(
                            '/confirm-success',
                            {
                                state: bookingData
                            }
                        );
                    }
                );
            }

        } catch (err) {

            const errorMsg =
                err.response?.data?.message ||
                'Mã OTP không đúng hoặc đã hết hạn!';

            openModal(
                'error',
                'THẤT BẠI',
                errorMsg
            );

        } finally {

            setLoading(false);
        }
    };

    // =========================
    // TIME FORMAT
    // =========================

    const mins =
        Math.floor(timeLeft / 60);

    const secs =
        timeLeft % 60;

    // =========================
    // RENDER
    // =========================

    return (

        <div className="bank-checkout-page">

            {/* NAVBAR */}
            {/* <nav className="bank-nav-bar">

                <div className="nav-content">

                    <img
                        src="https://vietqr.net/portal-v2/images/img/vietqr-logo-bin.png"
                        alt="Bank Logo"
                    />

                    <span>
                        Hệ thống xác thực giao dịch nội địa
                    </span>

                </div>

            </nav> */}

            {/* MAIN */}
            <main className="bank-checkout-container">

                {/* LEFT */}
                <div className="bank-order-details">

                    <h2 className="section-title">
                        Chi tiết đơn hàng
                    </h2>

                    <div className="info-group">

                        <label>
                            Đơn vị
                        </label>

                        <div className="vendor-info">

                            <img
                                src="https://api.quangdungcinema.id.vn/uploads/logo/logocinema.png"
                                alt="Cinema"
                            />

                            <span>
                                 CINEMASTAR
                            </span>

                        </div>
                    </div>

                    <div className="info-group">

                        <label>
                            Mã đơn
                        </label>

                        <p className="order-value">
                            #{bookingId}
                        </p>

                    </div>

                    <div className="info-group">

                        <label>
                            Số tiền
                        </label>

                        <p className="order-value amount">

                            {(Number(totalAmount) || 0)
                                .toLocaleString('vi-VN')} đ

                        </p>

                    </div>

                    <div className="bank-expiry-box">

                        <p>
                            OTP hết hạn sau:
                        </p>

                        <div className="expiry-timer">

                            <span>

                                {mins < 10
                                    ? `0${mins}`
                                    : mins}

                                :

                                {secs < 10
                                    ? `0${secs}`
                                    : secs}

                            </span>

                        </div>

                    </div>
                </div>

                {/* RIGHT */}
                <div className="bank-otp-section">

                    <div className="otp-card">

                        <div className="bank-qr-mini-wrapper">

                            <img
                                src="https://api.quangdungcinema.id.vn/uploads/Bank/Qr_nganhang.jpg"
                                alt="QR"
                                className="bank-qr-mini"
                            />

                            <div className="qr-scan-line"></div>

                        </div>

                        <h3 className="otp-title">
                            NHẬP MÃ OTP
                        </h3>

                        <p className="otp-sub">

                            Gửi đến:
                            <strong>
                                {' '}
                                {customerEmail}
                            </strong>

                        </p>

                        <div className="otp-input-wrapper">

                            <input
                                type="text"
                                className="otp-field"
                                placeholder="●●●●●●"
                                maxLength="6"
                                autoFocus
                                value={otp}
                                onChange={(e) =>
                                    setOtp(
                                        e.target.value.replace(
                                            /\D/g,
                                            ''
                                        )
                                    )
                                }
                            />

                        </div>

                        <button
                            className="btn-confirm-payment"
                            onClick={handleVerifyPayment}
                            disabled={loading}
                        >

                            {loading
                                ? 'ĐANG XỬ LÝ...'
                                : 'XÁC NHẬN THANH TOÁN'}

                        </button>

                    </div>
                </div>
            </main>

            {/* MODAL */}
            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
                onCancel={() =>
                    setModalConfig(prev => ({
                        ...prev,
                        show: false
                    }))
                }
            />
        </div>
    );
};

export default BankApp;