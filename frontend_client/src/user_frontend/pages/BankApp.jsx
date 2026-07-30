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

    const bookingData =
        location.state ||
        JSON.parse(
            sessionStorage.getItem('lastSuccessTicket')
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

    // Refs
    const hasSentOtp = useRef(false);
    const isResending = useRef(false);
    const redirectTimeoutRef = useRef(null);
    const infoModalShownRef = useRef(false);
    const autoNavigateRef = useRef(null);
    const isModalOpenRef = useRef(false);
    
    // 👇 Thêm 2 ref mới
    const hasShownOtpReminder = useRef(false);
    const isFirstLoad = useRef(true);

    // States
    const [timeLeft, setTimeLeft] = useState(300);
    const [otp, setOtp] = useState('');
    const [loadingVerify, setLoadingVerify] = useState(false);
    const [loadingSendOtp, setLoadingSendOtp] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: () => {}
    });

    // Modal handlers
    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, show: false }));
    };

    const openModal = (type, title, message, onConfirmCustom = null, onCancelCustom = null) => {
        setModalConfig({
            show: true,
            type,
            title,
            message,
            onConfirm: onConfirmCustom || (() => closeModal()),
            onCancel: onCancelCustom || (() => closeModal())
        });
    };

    // =========================
    // CẢNH BÁO KHI RỜI TRANG
    // =========================
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (timeLeft > 0 && otp.length > 0) {
                e.preventDefault();
                e.returnValue = 'Bạn đang nhập OTP. Nếu rời trang, bạn sẽ mất tiến trình thanh toán!';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [timeLeft, otp]);

    // =========================
    // CHECK DATA
    // =========================
    useEffect(() => {
        if (!bookingId || !customerEmail) {
            openModal(
                'error',
                'THIẾU THÔNG TIN',
                'Không tìm thấy thông tin đặt vé. Vui lòng đặt lại.',
                () => {
                    closeModal();
                    navigate('/');
                }
            );
        }
    }, [bookingId, customerEmail, navigate]);

    // =========================
    // THEO DÕI TRẠNG THÁI MODAL
    // =========================
    useEffect(() => {
        isModalOpenRef.current = modalConfig.show;
    }, [modalConfig.show]);

    // =========================
    // CLEANUP TIMEOUT
    // =========================
    useEffect(() => {
        return () => {
            if (autoNavigateRef.current) {
                clearTimeout(autoNavigateRef.current);
                autoNavigateRef.current = null;
            }
        };
    }, []);

    // =========================
    // GỬI OTP API
    // =========================
    const sendOtpApi = async () => {
        setLoadingSendOtp(true);
        try {
            await axios.post(
                'https://api.quangdungcinema.id.vn/api/bank/send-otp',
                {
                    email: customerEmail,
                    bookingId
                }
            );
            hasSentOtp.current = true;
            hasShownOtpReminder.current = false; // 👈 reset để có thể nhắc lại
            infoModalShownRef.current = false;
            return true;
        } catch (err) {
            console.error('❌ Lỗi gửi OTP:', err);
            const errorMsg = err.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại.';
            openModal('error', 'LỖI GỬI OTP', errorMsg);
            return false;
        } finally {
            setLoadingSendOtp(false);
        }
    };

    // =========================
    // LOGIC GỬI OTP LẦN ĐẦU / QUAY LẠI
    // =========================
    useEffect(() => {
        const triggerSendOtp = async () => {
            if (!customerEmail || !bookingId) return;

            if (hasSentOtp.current === false) {
                await sendOtpApi();
                return;
            }

            if (timeLeft === 0 && hasSentOtp.current === true) {
                await sendOtpApi();
                return;
            }

            // Nếu đã gửi và còn thời gian → KHÔNG gửi lại (im lặng)
            if (timeLeft > 0 && hasSentOtp.current === true) {
                return;
            }
        };

        triggerSendOtp();
    }, [customerEmail, bookingId, timeLeft]);

    // =========================
    // NHẮC NHỞ OTP ĐÃ GỬI KHI QUAY LẠI TRANG
    // =========================
    useEffect(() => {
        // Bỏ qua lần mount đầu tiên
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            return;
        }

        // Nếu đã gửi OTP, còn thời gian, chưa hiển thị nhắc nhở và có đủ thông tin
        if (hasSentOtp.current && timeLeft > 0 && !hasShownOtpReminder.current && customerEmail && bookingId) {
            openModal(
                'info',
                'THÔNG BÁO',
                'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra và nhập mã.'
            );
            hasShownOtpReminder.current = true;
        }
    }, [location.key]);

    // =========================
    // TIMER + AUTO REDIRECT
    // =========================
    useEffect(() => {
        if (timeLeft <= 0) {
            const handleTimeout = async () => {
                try {
                    await axios.post(
                        'https://api.quangdungcinema.id.vn/api/bank/cancel-timeout',
                        { bookingId, email: customerEmail }
                    );
                } catch (err) {
                    console.error('❌ Lỗi hủy đơn:', err);
                }

                openModal(
                    'error',
                    'HẾT HẠN',
                    'Phiên giao dịch đã hết hạn! Hệ thống sẽ tự động quay về trang chủ sau 5 giây.',
                    () => {
                        if (redirectTimeoutRef.current) {
                            clearTimeout(redirectTimeoutRef.current);
                            redirectTimeoutRef.current = null;
                        }
                        closeModal();
                        navigate('/');
                    }
                );

                if (redirectTimeoutRef.current) {
                    clearTimeout(redirectTimeoutRef.current);
                }
                redirectTimeoutRef.current = setTimeout(() => {
                    closeModal();
                    navigate('/');
                }, 5000);
            };

            handleTimeout();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => {
            clearInterval(timer);
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
                redirectTimeoutRef.current = null;
            }
        };
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
                { email: customerEmail, otp, bookingId }
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
                        if (autoNavigateRef.current) {
                            clearTimeout(autoNavigateRef.current);
                            autoNavigateRef.current = null;
                        }
                        closeModal();
                        navigate('/confirm-success', { state: bookingData });
                    }
                );

                if (autoNavigateRef.current) {
                    clearTimeout(autoNavigateRef.current);
                }
                autoNavigateRef.current = setTimeout(() => {
                    if (isModalOpenRef.current) {
                        closeModal();
                        navigate('/confirm-success', { state: bookingData });
                    }
                    autoNavigateRef.current = null;
                }, 3000);

            } else {
                openModal('error', 'THẤT BẠI', 'Mã OTP không đúng hoặc đã hết hạn!');
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

        setTimeLeft(300);
        isResending.current = true;
        hasSentOtp.current = false;
        const success = await sendOtpApi();
        if (success) {
            openModal('success', 'THÀNH CÔNG', 'Mã OTP mới đã được gửi đến email của bạn.');
        } else {
            isResending.current = false;
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
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
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

            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={closeModal}
                onConfirm={modalConfig.onConfirm}
                onCancel={modalConfig.onCancel}
            />
        </div>
    );
};

export default BankApp;