import React, {
    useState,
    useEffect,
    useRef
} from 'react';

import {
    useLocation,
    useNavigate
} from 'react-router-dom';

import axios from 'axios';

import Modal from '../components/Modal';
import BookingSidebar from '../components/BookingSidebar';
import LoadingButton from '../components/LoadingButton';

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
            sessionStorage.getItem(
                'lastSuccessTicket'
            )
        ) || {};

    const {
        bookingId,
        customerEmail,
        totalAmount,

        movie,
        selectedCinema,
        selectedDate,
        selectedShowtime,
        selectedSeats,
        selectedFoods,
        foods,
        totalTicketPrice,
        totalFoodPrice,
        showtimeDetail
    } = bookingData;

    // =========================
    // STATES
    // =========================

    const hasSentOtp = useRef(false);
    const [timeLeft, setTimeLeft] = useState(300);
    const [otp, setOtp] = useState('');
    const [loadingVerify, setLoadingVerify] = useState(false);
    const [loadingSendOtp, setLoadingSendOtp] = useState(false);
    const [sendOtpError, setSendOtpError] = useState(null);

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
            onConfirm: onConfirmCustom || (() =>
                setModalConfig(prev => ({
                    ...prev,
                    show: false
                }))
            )
        });
    };

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, show: false }));
    };

    // =========================
    // CHECK DATA
    // =========================

    useEffect(() => {
        if (!bookingId || !customerEmail) {
            openModal('error', 'THIẾU THÔNG TIN', 'Không tìm thấy thông tin đặt vé. Vui lòng đặt lại.', () => {
                closeModal();
                navigate('/');
            });
        }
    }, [bookingId, customerEmail, navigate]);

    // =========================
    // SEND OTP
    // =========================

    useEffect(() => {
        const sendOtpInitial = async () => {
            if (!customerEmail || !bookingId || hasSentOtp.current) {
                return;
            }

            hasSentOtp.current = true;
            setLoadingSendOtp(true);
            setSendOtpError(null);

            try {
                await axios.post(
                    'https://api.quangdungcinema.id.vn/api/bank/send-otp',
                    {
                        email: customerEmail,
                        bookingId
                    }
                );
            } catch (err) {
                console.error('❌ Lỗi gửi OTP:', err);
                const errorMsg = err.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại.';
                setSendOtpError(errorMsg);
                openModal('error', 'LỖI GỬI OTP', errorMsg);
            } finally {
                setLoadingSendOtp(false);
            }
        };

        sendOtpInitial();
    }, [bookingId, customerEmail]);

    // =========================
    // TIMER 5 MINUTES
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
                    console.error('❌ Lỗi hủy đơn:', err);
                }

                openModal(
                    'error',
                    'HẾT HẠN',
                    'Phiên giao dịch đã hết hạn! Vui lòng đặt lại vé.',
                    () => {
                        closeModal();
                        navigate('/');
                    }
                );
            };

            handleTimeout();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, bookingId, customerEmail, navigate]);

    // =========================
    // VERIFY OTP
    // =========================

    const handleVerifyPayment = async () => {
        if (otp.length < 6) {
            openModal('error', 'THÔNG BÁO', 'Vui lòng nhập đủ 6 số OTP');
            return;
        }

        setLoadingVerify(true);

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
                sessionStorage.removeItem('holdExpiresAt');
                sessionStorage.removeItem('selectedSeats');
                sessionStorage.removeItem('currentShowtimeId');

                openModal(
                    'success',
                    'THANH TOÁN THÀNH CÔNG',
                    'Cảm ơn bạn đã đặt vé! Vui lòng kiểm tra email để nhận vé.',
                    () => {
                        closeModal();
                        navigate('/confirm-success', {
                            state: bookingData
                        });
                    }
                );
            }
        } catch (err) {
            console.error('❌ Lỗi verify OTP:', err);
            const errorMsg = err.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn!';
            openModal('error', 'THẤT BẠI', errorMsg);
        } finally {
            setLoadingVerify(false);
        }
    };

    // =========================
    // RESEND OTP
    // =========================

    const handleResendOTP = async () => {
        if (loadingSendOtp) return;

        setLoadingSendOtp(true);
        setSendOtpError(null);

        try {
            await axios.post(
                'https://api.quangdungcinema.id.vn/api/bank/send-otp',
                {
                    email: customerEmail,
                    bookingId
                }
            );
            setTimeLeft(300);
            openModal('success', 'THÀNH CÔNG', 'Mã OTP mới đã được gửi đến email của bạn.');
        } catch (err) {
            console.error('❌ Lỗi gửi lại OTP:', err);
            const errorMsg = err.response?.data?.message || 'Không thể gửi lại OTP. Vui lòng thử lại.';
            setSendOtpError(errorMsg);
            openModal('error', 'LỖI GỬI OTP', errorMsg);
        } finally {
            setLoadingSendOtp(false);
        }
    };

    // =========================
    // TIME FORMAT
    // =========================

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    // =========================
    // RENDER
    // =========================

    return (
        <div className="bank-checkout-page">
            <main className="bank-checkout-container">

                {/* LEFT SIDEBAR */}
                <div className="bank-sidebar-wrapper">
                    <BookingSidebar
                        movie={movie}
                        showtimeDetail={showtimeDetail}
                        selectedCinema={selectedCinema}
                        selectedDate={selectedDate}
                        selectedShowtime={selectedShowtime}
                        selectedSeats={Array.isArray(selectedSeats) ? selectedSeats : []}
                        foods={Array.isArray(foods) ? foods : []}
                        selectedFoods={Array.isArray(selectedFoods) ? selectedFoods : []}
                        totalTicketPrice={totalTicketPrice}
                        totalFoodPrice={totalFoodPrice}
                        grandTotal={totalAmount}
                        isTimerActive={true}
                        remainingTime={timeLeft}
                        showFoodSection={true}
                    />
                </div>

                {/* RIGHT OTP */}
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

                        <h3 className="otp-title">NHẬP MÃ OTP</h3>
                        <p className="otp-sub">
                            Gửi đến: <strong>{customerEmail}</strong>
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
                                    setOtp(e.target.value.replace(/\D/g, ''))
                                }
                            />
                        </div>

                        <div className="bank-timer-box">
                            OTP hết hạn sau:
                            <span>
                                {mins < 10 ? `0${mins}` : mins}:
                                {secs < 10 ? `0${secs}` : secs}
                            </span>
                        </div>

                        <LoadingButton
                            type="button"
                            loading={loadingVerify}
                            loadingText="Đang xác nhận..."
                            onClick={handleVerifyPayment}
                            disabled={loadingVerify || loadingSendOtp}
                            className="btn-confirm-payment"
                            spinnerColor="#ffffff"
                        >
                            XÁC NHẬN THANH TOÁN
                        </LoadingButton>

                        {timeLeft < 60 && (
                            <button
                                className="btn-resend-otp"
                                onClick={handleResendOTP}
                                disabled={loadingSendOtp}
                            >
                                {loadingSendOtp ? 'Đang gửi...' : 'Gửi lại mã OTP'}
                            </button>
                        )}
                    </div>
                </div>
            </main>

            {/* ✅ Modal đã sửa: chỉ dùng onClose, xử lý onConfirm bên trong */}
            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={() => {
                    if (modalConfig.onConfirm) {
                        modalConfig.onConfirm();
                    } else {
                        closeModal();
                    }
                }}
            />
        </div>
    );
};

export default BankApp;