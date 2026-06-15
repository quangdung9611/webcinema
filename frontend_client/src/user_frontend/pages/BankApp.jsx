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

    const hasSentOtp =
        useRef(false);

    const [timeLeft, setTimeLeft] =
        useState(300);

    const [otp, setOtp] =
        useState('');

    const [loading, setLoading] =
        useState(false);

    const [modalConfig,
        setModalConfig] =
        useState({
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

        if (
            !bookingId ||
            !customerEmail
        ) {
            navigate('/');
        }

    }, [
        bookingId,
        customerEmail,
        navigate
    ]);

    // =========================
    // SEND OTP
    // =========================

    useEffect(() => {

        const sendOtpInitial =
            async () => {

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
                            email:
                                customerEmail,
                            bookingId
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

    }, [
        bookingId,
        customerEmail
    ]);

    // =========================
    // TIMER 5 MINUTES
    // =========================

    useEffect(() => {

        if (timeLeft <= 0) {

            const handleTimeout =
                async () => {

                    try {

                        await axios.post(
                            'https://api.quangdungcinema.id.vn/api/bank/cancel-timeout',
                            {
                                bookingId,
                                email:
                                    customerEmail
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

        const timer =
            setInterval(() => {

                setTimeLeft(prev =>
                    prev - 1
                );

            }, 1000);

        return () =>
            clearInterval(timer);

    }, [
        timeLeft,
        bookingId,
        customerEmail,
        navigate
    ]);

    // =========================
    // VERIFY OTP
    // =========================

    const handleVerifyPayment =
        async () => {

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

                const res =
                    await axios.post(
                        'https://api.quangdungcinema.id.vn/api/bank/verify-otp',
                        {
                            email:
                                customerEmail,
                            otp,
                            bookingId
                        }
                    );

                if (
                    res.data.success
                ) {

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
                                    state:
                                        bookingData
                                }
                            );
                        }
                    );
                }

            } catch (err) {

                openModal(
                    'error',
                    'THẤT BẠI',
                    err.response?.data
                        ?.message ||
                    'Mã OTP không đúng hoặc đã hết hạn!'
                );

            } finally {

                setLoading(false);
            }
        };

    // =========================
    // TIME FORMAT
    // =========================

    const mins =
        Math.floor(
            timeLeft / 60
        );

    const secs =
        timeLeft % 60;

    return (

        <div className="bank-checkout-page">

            <main className="bank-checkout-container">

                {/* LEFT SIDEBAR */}
                <div className="bank-sidebar-wrapper">

                    <BookingSidebar
                        movie={movie}

                        showtimeDetail={
                            showtimeDetail
                        }

                        selectedCinema={
                            selectedCinema
                        }

                        selectedDate={
                            selectedDate
                        }

                        selectedShowtime={
                            selectedShowtime
                        }

                        selectedSeats={
                            Array.isArray(
                                selectedSeats
                            )
                                ? selectedSeats
                                : []
                        }

                        foods={
                            Array.isArray(
                                foods
                            )
                                ? foods
                                : []
                        }

                        selectedFoods={
                            Array.isArray(
                                selectedFoods
                            )
                                ? selectedFoods
                                : []
                        }

                        totalTicketPrice={
                            totalTicketPrice
                        }

                        totalFoodPrice={
                            totalFoodPrice
                        }

                        grandTotal={
                            totalAmount
                        }

                        isTimerActive={true}

                        remainingTime={
                            timeLeft
                        }

                        showFoodSection={
                            true
                        }
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

                        <div className="bank-timer-box">

                            OTP hết hạn sau:

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

                        <button
                            className="btn-confirm-payment"
                            onClick={
                                handleVerifyPayment
                            }
                            disabled={
                                loading
                            }
                        >
                            {loading
                                ? 'ĐANG XỬ LÝ...'
                                : 'XÁC NHẬN THANH TOÁN'}
                        </button>

                    </div>

                </div>

            </main>

            <Modal
                show={
                    modalConfig.show
                }
                type={
                    modalConfig.type
                }
                title={
                    modalConfig.title
                }
                message={
                    modalConfig.message
                }
                onConfirm={
                    modalConfig.onConfirm
                }
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