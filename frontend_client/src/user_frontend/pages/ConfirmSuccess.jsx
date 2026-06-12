import React, {
    useEffect,
    useState,
    useRef
} from 'react';

import {
    useLocation,
    useNavigate
} from 'react-router-dom';

import { QRCodeCanvas } from 'qrcode.react';

import axios from 'axios';

import {
    CheckCircle2,
    MapPin,
    Monitor,
    CalendarDays,
    Clock3,
    Armchair,
    Mail,
    Download,
    House
} from 'lucide-react';

import '../styles/ConfirmSuccess.css';

const ConfirmSuccess = () => {

    const location =
        useLocation();

    const navigate =
        useNavigate();

    const [printTime,
        setPrintTime] =
        useState('');

    const hasConfirmed =
        useRef(false);

    // =========================
    // INIT DATA
    // =========================

    const [ticketData,
        setTicketData] =
        useState(() => {

            const navState =
                location.state;

            const incomingData =
                navState?.data ||
                navState;

            if (
                incomingData &&
                (
                    incomingData.orderId ||
                    incomingData.bookingId
                )
            ) {

                sessionStorage.setItem(
                    'lastSuccessTicket',
                    JSON.stringify(
                        incomingData
                    )
                );

                return incomingData;
            }

            const savedData =
                sessionStorage.getItem(
                    'lastSuccessTicket'
                );

            return savedData
                ? JSON.parse(savedData)
                : null;
        });

    // =========================
    // FETCH BOOKING DETAIL
    // =========================

    useEffect(() => {

        const confirmBookingOnServer =
            async () => {

                const bID =
                    ticketData?.orderId ||
                    ticketData?.bookingId;

                if (
                    bID &&
                    !hasConfirmed.current
                ) {

                    hasConfirmed.current =
                        true;

                    try {

                        await new Promise(
                            resolve =>
                                setTimeout(
                                    resolve,
                                    1500
                                )
                        );

                        const response =
                            await axios.get(
                                `https://api.quangdungcinema.id.vn/api/bookings/detail/${bID}`,
                                {
                                    withCredentials: true
                                }
                            );

                        if (
                            response.data.success
                        ) {

                            const b =
                                response.data.booking;

                            const d =
                                response.data.details;

                            const seats =
                                d
                                    ?.filter(
                                        i =>
                                            i.seat_id ||
                                            (
                                                i.item_name &&
                                                i.item_name.includes(
                                                    'Ghế'
                                                )
                                            )
                                    )
                                    .map(
                                        i =>
                                            i.item_name
                                                .replace(
                                                    'Ghế ',
                                                    ''
                                                )
                                                .trim()
                                    )
                                    .join(
                                        ', '
                                    );

                            setTicketData(
                                prev => ({
                                    ...prev,

                                    movieTitle:
                                        b.movie_name ||
                                        b.movieTitle ||
                                        prev.movieTitle,

                                    moviePoster:
                                        b.movie_poster ||
                                        b.moviePoster ||
                                        prev.moviePoster,

                                    cinemaName:
                                        b.cinema_name ||
                                        b.cinemaName ||
                                        prev.cinemaName,

                                    roomName:
                                        b.room_name ||
                                        b.roomName ||
                                        prev.roomName,

                                    startTime:
                                        b.start_time
                                            ? b.start_time
                                                .split(' ')[1]
                                                ?.substring(0, 5)
                                            : (
                                                b.show_time
                                                    ?.split(' - ')[0] ||
                                                prev.startTime
                                            ),

                                    selectedDate:
                                        b.start_time
                                            ? b.start_time
                                                .split(' ')[0]
                                                .split('-')
                                                .reverse()
                                                .join('/')
                                            : (
                                                b.show_time
                                                    ?.split(' - ')[1] ||
                                                prev.selectedDate
                                            ),

                                    seatDisplay:
                                        b.seat_label ||
                                        b.seatLabel ||
                                        seats ||
                                        prev.seatDisplay,

                                    ticketPIN:
                                        b.pin ||
                                        b.memo?.slice(-6) ||
                                        prev.ticketPIN,

                                    customerName:
                                        b.full_name ||
                                        prev.customerName,

                                    customerEmail:
                                        b.email ||
                                        prev.customerEmail,

                                    selectedFoods:
                                        d?.filter(
                                            i =>
                                                !i.seat_id &&
                                                !i.item_name.includes(
                                                    'Ghế'
                                                )
                                        )
                                })
                            );

                            const userRes =
                                await axios.get(
                                    'https://api.quangdungcinema.id.vn/api/auth/me',
                                    {
                                        withCredentials: true
                                    }
                                );

                            if (
                                userRes.data.success
                            ) {

                                localStorage.setItem(
                                    'user',
                                    JSON.stringify(
                                        userRes.data.user
                                    )
                                );

                                window.dispatchEvent(
                                    new Event(
                                        'storage'
                                    )
                                );
                            }
                        }

                    } catch (err) {

                        console.error(
                            '❌ Lỗi:',
                            err.message
                        );
                    }
                }
            };

        confirmBookingOnServer();

    }, [
        ticketData?.orderId,
        ticketData?.bookingId
    ]);

    // =========================
    // INIT PAGE
    // =========================

    useEffect(() => {

        const now =
            new Date();

        setPrintTime(
            now.toLocaleString(
                'vi-VN'
            )
        );

        window.scrollTo(
            0,
            0
        );

    }, []);

    if (!ticketData)
        return null;

    // =========================
    // DATA
    // =========================

    const {
        movieTitle,
        moviePoster,
        movie,
        cinemaName,
        roomName,
        startTime,
        selectedDate,
        ticketPIN,
        customerName,
        customerEmail,
        seatDisplay,
        orderId,
        bookingId
    } = ticketData;

    const finalOrderId =
        orderId ||
        bookingId;

    // =========================
    // FIX POSTER
    // =========================

    const rawPoster =
        moviePoster ||
        movie?.poster_url ||
        movie?.poster ||
        movie?.image ||
        '';

    const posterUrl =
        rawPoster
            ? rawPoster.startsWith(
                'http'
            )
                ? rawPoster
                : `https://api.quangdungcinema.id.vn/uploads/posters/${rawPoster}`
            : null;

    const displayRoom =
        roomName
            ?.replace(
                'Phòng ',
                ''
            )
            .trim() || '1';

    return (

        <div className="confirm-success-page">

            <div className="success-overlay"></div>

            <div className="success-container">

                <div className="success-top">

                    <div className="success-icon">
                        <CheckCircle2 size={70} />
                    </div>

                    <h1>
                        THANH TOÁN THÀNH CÔNG!
                    </h1>

                    <p>
                        Cảm ơn
                        <span>
                            {' '}
                            {customerName}
                        </span>,
                        giao dịch của bạn đã hoàn tất.
                    </p>

                    <div className="order-badge">
                        Mã đơn hàng:
                        <span>
                            #{finalOrderId}
                        </span>
                    </div>

                </div>

                <div className="cinema-ticket">

                    <div className="ticket-left">

                        <div className="poster-box">

                            {posterUrl ? (

                                <img
                                    src={
                                        posterUrl
                                    }
                                    alt={
                                        movieTitle
                                    }
                                />

                            ) : (

                                <div className="no-poster">
                                    NO IMAGE
                                </div>
                            )}

                        </div>

                        <div className="ticket-info">

                            <h2>
                                {movieTitle}
                            </h2>

                            <div className="ticket-detail">

                                <div className="detail-row">
                                    <MapPin size={18} />
                                    <span className="label">
                                        Rạp
                                    </span>
                                    <span className="value">
                                        {cinemaName}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <Monitor size={18} />
                                    <span className="label">
                                        Phòng
                                    </span>
                                    <span className="value">
                                        {displayRoom}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <CalendarDays size={18} />
                                    <span className="label">
                                        Ngày chiếu
                                    </span>
                                    <span className="value">
                                        {selectedDate}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <Clock3 size={18} />
                                    <span className="label">
                                        Suất chiếu
                                    </span>
                                    <span className="value">
                                        {startTime}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <Armchair size={18} />
                                    <span className="label">
                                        Ghế ngồi
                                    </span>
                                    <span className="seat-value">
                                        {seatDisplay}
                                    </span>
                                </div>

                            </div>

                        </div>

                    </div>

                    <div className="ticket-divider">
                        <div className="circle-top"></div>
                        <div className="dash-line"></div>
                        <div className="circle-bottom"></div>
                    </div>

                    <div className="ticket-right">

                        <p className="pin-title">
                            MÃ NHẬN VÉ
                        </p>

                        <h2 className="pin-code">
                            {ticketPIN}
                        </h2>

                        <div className="qr-wrapper">

                            <QRCodeCanvas
                                value={`TICKET-${finalOrderId}-${ticketPIN}`}
                                size={150}
                                level={'H'}
                            />

                        </div>

                        <p className="qr-note">
                            Quét mã QR tại rạp
                            để nhận vé
                        </p>

                    </div>

                </div>

                <div className="email-box">

                    <div className="email-left">

                        <Mail size={24} />

                        <div>

                            <p>
                                Vé đã được gửi đến email:
                            </p>

                            <h4>
                                {customerEmail}
                            </h4>

                        </div>

                    </div>

                    <CheckCircle2
                        className="email-check"
                        size={28}
                    />

                </div>

                <div className="success-actions">

                    <button
                        className="home-btn"
                        onClick={() =>
                            navigate('/')
                        }
                    >

                        <House size={20} />

                        VỀ TRANG CHỦ

                    </button>

                    <button
                        className="download-btn"
                        onClick={() =>
                            window.print()
                        }
                    >

                        <Download size={20} />

                        TẢI VÉ VỀ MÁY

                    </button>

                </div>

                <p className="print-time">
                    {printTime}
                </p>

            </div>

        </div>
    );
};

export default ConfirmSuccess;