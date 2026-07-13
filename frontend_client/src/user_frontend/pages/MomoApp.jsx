import React, {
    useState,
    useEffect
} from 'react';

import {
    useLocation,
    useNavigate
} from 'react-router-dom';

import axios from 'axios';

// COMPONENT
import BookingSidebar from '../components/BookingSidebar';
import LoadingSpinner from '../components/LoadingSpinner'; // ✅ Import LoadingSpinner

// CSS
import '../styles/MomoApp.css';

const MomoApp = () => {

    const location = useLocation();
    const navigate = useNavigate();

    // =============================
    // DATA FROM PAYMENT
    // =============================

    const ticketData =
        location.state || {};

    const {
        bookingId,
        totalAmount,
        movieTitle,

        movie,
        selectedCinema,
        selectedDate,
        selectedShowtime,
        selectedSeats,
        selectedFoods,

        totalTicketPrice,
        totalFoodPrice,
        grandTotal,

        showtimeDetail
    } = ticketData;

    const [isConfirming,
        setIsConfirming] =
        useState(false);

    // =============================
    // MOMO INFO
    // =============================

    const myMomoPhone =
        '0909489611';

    const myName =
        'NGUYEN PHAM QUANG DUNG';

    // =============================
    // QR URL
    // =============================

    const qrImageUrl =
        `https://img.vietqr.io/image/momo-${myMomoPhone}-compact.jpg?amount=${
            totalAmount ||
            grandTotal ||
            85000
        }&addInfo=DungCinema%20${
            bookingId ||
            '2F5B7196'
        }&accountName=${encodeURIComponent(
            myName
        )}`;

    // =============================
    // AUTO CONFIRM
    // =============================

    useEffect(() => {

        const autoConfirm =
            setTimeout(() => {

                setIsConfirming(true);

                axios.post(
                    'https://api.quangdungcinema.id.vn/api/momo/confirm-fast',
                    {
                        bookingId
                    }
                )
                .then(() => {

                    console.log(
                        'Thanh toán thành công'
                    );

                })
                .catch(error => {

                    console.error(
                        'Lỗi backend:',
                        error
                    );

                });

                setTimeout(() => {

                    navigate(
                        '/confirm-success',
                        {
                            state: {
                                ...ticketData
                            },
                            replace: true
                        }
                    );

                }, 1500);

            }, 5000);

        return () =>
            clearTimeout(
                autoConfirm
            );

    }, [
        bookingId,
        navigate,
        ticketData
    ]);

    // =============================
    // RENDER
    // =============================

    return (

        <div className="booking-wrapper">

            <div className="booking-container">

                {/* ================= SIDEBAR ================= */}

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

                    selectedFoods={
                        Array.isArray(
                            selectedFoods
                        )
                            ? selectedFoods
                            : []
                    }

                    totalTicketPrice={
                        totalTicketPrice || 0
                    }

                    totalFoodPrice={
                        totalFoodPrice || 0
                    }

                    grandTotal={
                        grandTotal ||
                        totalAmount ||
                        0
                    }

                    showFoodSection={
                        true
                    }

                    showContinueButton={
                        false
                    }

                    showBackButton={
                        true
                    }

                    onBack={() =>
                        navigate(-1)
                    }
                />

                {/* ================= QR PAYMENT ================= */}

                <section className="main-booking-area">

                    <div className="momo-payment-wrapper">

                        {/* TITLE */}

                        <div className="momo-title-box">

                            <h2>
                                QUÉT QR
                                THANH TOÁN
                            </h2>

                            <p>
                                Mở ứng dụng
                                <strong>
                                    {' '}
                                    MoMo
                                </strong>{' '}
                                để quét mã
                            </p>

                        </div>

                        {/* QR */}

                        <div className="qr-card">

                            <div className="qr-wrapper">

                                <img
                                    src={
                                        qrImageUrl
                                    }
                                    alt="QR Payment"
                                    style={{
                                        opacity:
                                            isConfirming
                                                ? 0.3
                                                : 1
                                    }}
                                />

                                {!isConfirming && (

                                    <div className="scan-line"></div>

                                )}

                                {isConfirming && (

                                    <div className="confirm-overlay">

                                        {/* ✅ SỬ DỤNG LOADINGSPINNER CHUYÊN NGHIỆP */}
                                        <LoadingSpinner
                                            size={48}
                                            color="#dc2626"
                                            message="Đang kiểm tra giao dịch..."
                                            blur={false}
                                            overlay={false}
                                        />

                                    </div>

                                )}

                            </div>

                        </div>

                        {/* HELP */}

                        <div className="help-text">

                            Hệ thống sẽ tự động
                            xác nhận sau 5 giây...

                        </div>

                    </div>

                </section>

            </div>

        </div>
    );
};

export default MomoApp;