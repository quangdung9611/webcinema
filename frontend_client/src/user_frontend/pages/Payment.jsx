import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

// COMPONENTS
import Modal from '../../admin_frontend/components/Modal';
import BookingSidebar from '../components/BookingSidebar';

// STYLES
import '../styles/Payment.css';

// CONTEXT
import { useAuth } from '../../context/AuthContext';

const Payment = () => {

    const location = useLocation();
    const navigate = useNavigate();

    const { user } = useAuth();

    const {
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
    } = location.state || {};

    // =========================
    // STATES
    // =========================

    const [couponCode, setCouponCode] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [appliedCouponId, setAppliedCouponId] = useState(null);

    const [paymentMethod, setPaymentMethod] = useState('bank');

    const [isTimerActive, setIsTimerActive] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);

    const [userInfo, setUserInfo] = useState({
        user_id: user?.user_id || '',
        full_name: user?.full_name || '',
        email: user?.email || '',
        phone: user?.phone || ''
    });

    const [modal, setModal] = useState({
        show: false,
        type: '',
        title: '',
        message: '',
        onConfirm: null
    });

    // =========================
    // SHOWTIME ID
    // =========================

    const showtimeId =
        selectedShowtime?.showtime_id ||
        selectedShowtime?.id;

    // =========================
    // NOTICE
    // =========================

    const showNotice = (
        type,
        title,
        message,
        onConfirm = null
    ) => {

        setModal({
            show: true,
            type,
            title,
            message,
            onConfirm:
                onConfirm ||
                (() =>
                    setModal(prev => ({
                        ...prev,
                        show: false
                    })))
        });
    };

    // =========================
    // TOTAL
    // =========================

    const subTotal =
        Number(totalTicketPrice || 0) +
        Number(totalFoodPrice || 0);

    const grandTotal =
        subTotal - Number(discountAmount || 0);

    // =========================
    // INIT
    // =========================

    useEffect(() => {

        window.scrollTo(0, 0);

        if (
            !movie ||
            !selectedSeats ||
            selectedSeats.length === 0
        ) {

            navigate('/');
            return;
        }

        if (
            sessionStorage.getItem(
                'holdExpiresAt'
            )
        ) {

            setIsTimerActive(true);
        }

    }, [movie, selectedSeats, navigate]);

    // =========================
    // TIMER EXPIRE
    // =========================

    const handleTimeExpire = async () => {

        try {

            if (
                selectedSeats?.length > 0
            ) {

                await axios.post(
                    'https://api.quangdungcinema.id.vn/api/seats/release',
                    {
                        seatIds:
                            selectedSeats.map(
                                s => s.seat_id
                            ),

                        showtimeId
                    }
                );
            }

        } catch (err) {

            console.error(
                'Lỗi nhả ghế:',
                err
            );
        }

        sessionStorage.clear();

        showNotice(
            'error',
            'HẾT THỜI GIAN',
            'Ghế đã được mở khóa.',
            () => {

                navigate('/');
                window.location.reload();
            }
        );
    };

    // =========================
    // APPLY COUPON
    // =========================

    const handleApplyCoupon =
        async () => {

            const inputCode =
                couponCode
                    .toUpperCase()
                    .trim();

            if (!inputCode) {

                showNotice(
                    'error',
                    'THIẾU THÔNG TIN',
                    'Vui lòng nhập mã giảm giá.'
                );

                return;
            }

            try {

                const res =
                    await axios.post(
                        'https://api.quangdungcinema.id.vn/api/coupons/check',
                        {
                            code: inputCode,
                            userId:
                                userInfo.user_id
                        }
                    );

                if (res.data.success) {

                    const {
                        discount_value,
                        coupon_id
                    } = res.data.data;

                    setDiscountAmount(
                        Number(discount_value)
                    );

                    setAppliedCouponId(
                        coupon_id
                    );

                    showNotice(
                        'success',
                        'THÀNH CÔNG',
                        'Áp dụng mã giảm giá thành công.'
                    );
                }

            } catch (err) {

                showNotice(
                    'error',
                    'THÔNG BÁO',
                    err.response?.data
                        ?.message ||
                        'Mã không hợp lệ.'
                );
            }
        };

    // =========================
    // PAYMENT
    // =========================

    const handleProceed = async () => {

        if (
            !userInfo.full_name ||
            !userInfo.email ||
            !userInfo.phone
        ) {

            showNotice(
                'error',
                'THIẾU THÔNG TIN',
                'Vui lòng nhập đầy đủ thông tin.'
            );

            return;
        }

        setIsProcessing(true);

        try {

            const postData = {

                userId:
                    userInfo.user_id,

                showtimeId,

                totalAmount:
                    Number(grandTotal),

                discountAmount:
                    Number(discountAmount),

                couponId:
                    appliedCouponId,

                selectedSeats,

                selectedFoods,

                customerEmail:
                    userInfo.email,

                customerName:
                    userInfo.full_name,

                movieTitle:
                    movie?.title,

                cinemaName:
                    selectedCinema?.cinema_name,

                startTime:
                    selectedShowtime?.start_time,

                status: 'pending'
            };

            const response =
                await axios.post(
                    'https://api.quangdungcinema.id.vn/api/payment/process',
                    postData
                );

            if (
                response.data.success
            ) {

                const finalState = {
                    orderId: response.data.bookingId,
                    bookingId: response.data.bookingId,

                    totalAmount:
                        Number(grandTotal),

                    customerName:
                        userInfo.full_name,

                    customerEmail:
                        userInfo.email,

                    // booking sidebar data
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
                };
                // SAVE SUCCESS DATA
                sessionStorage.setItem(
                    'lastSuccessTicket',
                    JSON.stringify(
                        finalState
                    )
                );

                // CLEAR TEMP
                sessionStorage.removeItem(
                    'holdExpiresAt'
                );

                sessionStorage.removeItem(
                    'selectedSeats'
                );

                sessionStorage.removeItem(
                    'currentShowtimeId'
                );

                setIsTimerActive(false);

                // NAVIGATE PAYMENT
                if (
                    paymentMethod ===
                    'bank'
                ) {

                    navigate(
                        '/bank-app',
                        {
                            state: finalState
                        }
                    );

                } else {

                    navigate(
                        '/momo-app',
                        {
                            state: finalState
                        }
                    );
                }
            }

        } catch (err) {

            console.error(
                'Lỗi thanh toán:',
                err
            );

            showNotice(
                'error',
                'LỖI',
                'Không thể xử lý thanh toán.'
            );

        } finally {

            setIsProcessing(false);
        }
    };

    return (

        <div className="booking-wrapper">

            {/* MODAL */}
            <Modal
                show={modal.show}
                type={modal.type}
                title={modal.title}
                message={modal.message}
                onConfirm={modal.onConfirm}
                onCancel={() =>
                    setModal({
                        ...modal,
                        show: false
                    })
                }
            />

            <div className="booking-container">

                {/* SIDEBAR */}
                <BookingSidebar
                    movie={movie}

                    showtimeDetail={showtimeDetail}

                    selectedCinema={selectedCinema}

                    selectedDate={selectedDate}

                    selectedShowtime={selectedShowtime}

                    selectedSeats={
                        Array.isArray(selectedSeats)
                            ? selectedSeats
                            : []
                    }

                    foods={
                        Array.isArray(foods)
                            ? foods
                            : []
                    }

                    selectedFoods={
                        Array.isArray(selectedFoods)
                            ? selectedFoods
                            : []
                    }

                    totalTicketPrice={totalTicketPrice}

                    totalFoodPrice={totalFoodPrice}

                    grandTotal={grandTotal}

                    isTimerActive={isTimerActive}

                    onExpire={handleTimeExpire}

                    showFoodSection={true}
                />

                {/* MAIN */}
                <section className="main-booking-area">

                    {/* COUPON */}
                    <div className="payment-card">

                        <h3>
                            MÃ GIẢM GIÁ
                        </h3>

                        <div className="coupon-group">

                            <input
                                type="text"
                                placeholder="Nhập mã giảm giá..."
                                value={
                                    couponCode
                                }
                                onChange={e =>
                                    setCouponCode(
                                        e.target.value
                                    )
                                }
                            />

                            <button
                                onClick={
                                    handleApplyCoupon
                                }
                            >
                                ÁP DỤNG
                            </button>
                        </div>
                    </div>

                    {/* USER INFO */}
                    <div className="payment-card">

                        <h3>
                            THÔNG TIN NHẬN VÉ
                        </h3>

                        <div className="form-grid">

                            <input
                                type="text"
                                placeholder="Họ và tên"
                                value={
                                    userInfo.full_name
                                }
                                onChange={e =>
                                    setUserInfo({
                                        ...userInfo,
                                        full_name:
                                            e.target.value
                                    })
                                }
                            />

                            <input
                                type="text"
                                placeholder="Số điện thoại"
                                value={
                                    userInfo.phone
                                }
                                onChange={e =>
                                    setUserInfo({
                                        ...userInfo,
                                        phone:
                                            e.target.value
                                    })
                                }
                            />
                        </div>

                        <input
                            type="email"
                            placeholder="Email nhận vé"
                            value={
                                userInfo.email
                            }
                            onChange={e =>
                                setUserInfo({
                                    ...userInfo,
                                    email:
                                        e.target.value
                                })
                            }
                        />
                    </div>

                    {/* PAYMENT */}
                    <div className="payment-card">

                        <h3>
                            HÌNH THỨC THANH TOÁN
                        </h3>

                        <div className="payment-methods">

                            {/* BANK */}
                            <label
                                className={`payment-method ${
                                    paymentMethod ===
                                    'bank'
                                        ? 'active'
                                        : ''
                                }`}
                            >

                                <input
                                    type="radio"
                                    checked={
                                        paymentMethod ===
                                        'bank'
                                    }
                                    onChange={() =>
                                        setPaymentMethod(
                                            'bank'
                                        )
                                    }
                                />

                                <span>
                                    VietQR
                                </span>
                            </label>

                            {/* MOMO */}
                            <label
                                className={`payment-method ${
                                    paymentMethod ===
                                    'momo'
                                        ? 'active'
                                        : ''
                                }`}
                            >

                                <input
                                    type="radio"
                                    checked={
                                        paymentMethod ===
                                        'momo'
                                    }
                                    onChange={() =>
                                        setPaymentMethod(
                                            'momo'
                                        )
                                    }
                                />

                                <span>
                                    MoMo
                                </span>
                            </label>
                        </div>

                        {/* BTN */}
                        <button
                            className="btn-next"
                            onClick={
                                handleProceed
                            }
                            disabled={
                                isProcessing
                            }
                        >
                            {isProcessing
                                ? 'ĐANG XỬ LÝ...'
                                : 'XÁC NHẬN THANH TOÁN'}
                        </button>

                        <button
                            className="btn-back"
                            onClick={() =>
                                navigate(-1)
                            }
                        >
                            QuAY LẠI
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Payment;