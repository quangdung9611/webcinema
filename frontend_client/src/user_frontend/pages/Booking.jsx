import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef
} from 'react';

import {
    useLocation,
    useNavigate,
    useParams
} from 'react-router-dom';

import axios from 'axios';

import { io } from "socket.io-client";

// COMPONENTS
import Modal from '../components/Modal';
import CountdownTimer from './CountdownTimer';
import LoadingButton from '../components/LoadingButton'; // ✅ Import LoadingButton

import {
    SeatNormal,
    SeatVIP,
    SeatCouple
} from "../components/SeatIcon";

import Seat from "../components/Seat";
import BookingSidebar from '../components/BookingSidebar';

// STYLES
import '../styles/Booking.css';

const Booking = () => {

    const location = useLocation();
    const navigate = useNavigate();
    const { slug } = useParams();

    // =========================================================
    // STATE
    // =========================================================

    const [movie, setMovie] = useState(
        location.state?.movie || null
    );

    const [cinemas, setCinemas] = useState([]);
    const [availableDates, setAvailableDates] = useState([]);
    const [availableShowtimes, setAvailableShowtimes] = useState([]);
    const [selectedCinema, setSelectedCinema] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedShowtime, setSelectedShowtime] = useState(null);
    const [selectedSeats, setSelectedSeats] = useState([]);
    const [seats, setSeats] = useState([]);
    const [showtimeDetail, setShowtimeDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false); // ✅ State cho nút chuyển trang
    const [isTimerActive, setIsTimerActive] = useState(false);

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: null
    });

    const dateRef = useRef(null);
    const timeRef = useRef(null);

    // =========================================================
    // SOCKET
    // =========================================================

    const socket = useMemo(() =>
        io("https://api.quangdungcinema.id.vn", {
            withCredentials: true,
            transports: ["websocket", "polling"]
        }),
    []);

    // =========================================================
    // SHOWTIME ID
    // =========================================================

    const showtimeId =
        selectedShowtime?.showtime_id ||
        selectedShowtime?.id;

    // =========================================================
    // SCROLL
    // =========================================================

    const scroll = (ref, offset) => {
        if (ref.current) {
            ref.current.scrollLeft += offset;
        }
    };

    // =========================================================
    // LOAD MOVIE FROM SLUG
    // =========================================================

    useEffect(() => {
        window.scrollTo(0, 0);

        const fetchMovieBySlug = async () => {
            if (movie) return;
            if (!slug) {
                navigate('/');
                return;
            }

            try {
                setLoading(true);
                const res = await axios.get(
                    `https://api.quangdungcinema.id.vn/api/movies/${slug}`
                );
                setMovie(res.data);
            } catch (error) {
                console.error("Lỗi load movie theo slug:", error);
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        fetchMovieBySlug();
    }, [slug, movie, navigate]);

    // =========================================================
    // LOAD CINEMAS + DATES
    // =========================================================

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const res = await axios.get(
                    'https://api.quangdungcinema.id.vn/api/cinemas'
                );
                setCinemas(res.data);

                const dates = [];
                for (let i = 0; i < 7; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    dates.push(d.toISOString().split('T')[0]);
                }
                setAvailableDates(dates);
            } catch (err) {
                console.error("Lỗi tải dữ liệu ban đầu:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    // =========================================================
    // LOAD SHOWTIMES
    // =========================================================

    useEffect(() => {
        if (
            !selectedCinema ||
            !selectedDate ||
            !(movie?.movie_id || movie?.id)
        ) {
            setAvailableShowtimes([]);
            return;
        }

        const fetchShowtimes = async () => {
            try {
                const res = await axios.get(
                    `https://api.quangdungcinema.id.vn/api/showtimes/filter-booking`,
                    {
                        params: {
                            cinema_id: selectedCinema.cinema_id,
                            date: selectedDate,
                            movie_id: movie.movie_id || movie.id
                        }
                    }
                );
                setAvailableShowtimes(res.data);
            } catch (err) {
                console.error("Lỗi tải suất chiếu:", err);
                setAvailableShowtimes([]);
            }
        };

        fetchShowtimes();
    }, [selectedCinema, selectedDate, movie]);

    // =========================================================
    // FETCH SEATS
    // =========================================================

    const fetchSeats = useCallback(async () => {
        if (!showtimeId) return;

        try {
            setLoading(true);

            const [detailRes, seatsRes] = await Promise.all([
                axios.get(
                    `https://api.quangdungcinema.id.vn/api/showtimes/detail/${showtimeId}`
                ),
                axios.get(
                    `https://api.quangdungcinema.id.vn/api/seats/showtime/${showtimeId}`
                )
            ]);

            setShowtimeDetail(detailRes.data);
            setSeats(seatsRes.data);

            const savedSeats = sessionStorage.getItem('selectedSeats');
            const savedShowtime = sessionStorage.getItem('currentShowtimeId');

            if (savedSeats && savedShowtime === showtimeId.toString()) {
                const parsed = JSON.parse(savedSeats);
                setSelectedSeats(parsed);

                if (sessionStorage.getItem('holdExpiresAt')) {
                    setIsTimerActive(true);
                }

                parsed.forEach(s => {
                    socket.emit('client-chon-ghe', {
                        seatId: s.seat_id,
                        showtimeId
                    });
                });
            }
        } catch (err) {
            console.error("Lỗi tải sơ đồ ghế:", err);
        } finally {
            setLoading(false);
        }
    }, [showtimeId, socket]);

    // =========================================================
    // LOAD SEATS
    // =========================================================

    useEffect(() => {
        if (showtimeId) {
            fetchSeats();
        }
    }, [showtimeId, fetchSeats]);

    // =========================================================
    // SOCKET REALTIME
    // =========================================================

    useEffect(() => {
        if (!showtimeId) return;

        socket.on('server-khoa-ghe', (data) => {
            if (Number(data.showtimeId) === Number(showtimeId)) {
                setSeats(prev =>
                    prev.map(s =>
                        Number(s.seat_id) === Number(data.seatId)
                            ? { ...s, is_locked_by_user: true }
                            : s
                    )
                );
            }
        });

        socket.on('server-mo-khoa-ghe', (data) => {
            if (Number(data.showtimeId) === Number(showtimeId)) {
                setSeats(prev =>
                    prev.map(s =>
                        Number(s.seat_id) === Number(data.seatId)
                            ? { ...s, is_locked_by_user: false }
                            : s
                    )
                );
            }
        });

        return () => {
            socket.off('server-khoa-ghe');
            socket.off('server-mo-khoa-ghe');
        };
    }, [showtimeId, socket]);

    // =========================================================
    // CLEAR SESSION
    // =========================================================

    const clearBookingSession = useCallback(() => {
        selectedSeats.forEach(s => {
            socket.emit('client-huy-chon-ghe', {
                seatId: s.seat_id,
                showtimeId
            });
        });

        sessionStorage.removeItem('selectedSeats');
        sessionStorage.removeItem('holdExpiresAt');
        sessionStorage.removeItem('currentShowtimeId');
        setIsTimerActive(false);
        setSelectedSeats([]);
    }, [selectedSeats, socket, showtimeId]);

    // =========================================================
    // HANDLE SEAT CLICK
    // =========================================================

    const handleSeatClick = (seat) => {
        if (
            seat.seat_status === 'Booked' ||
            Number(seat.is_active) === 0 ||
            seat.is_locked_by_user
        ) {
            return;
        }

        const isSelected = selectedSeats.find(
            s => s.seat_id === seat.seat_id
        );

        let updated = [];

        if (isSelected) {
            updated = selectedSeats.filter(
                s => s.seat_id !== seat.seat_id
            );

            socket.emit('client-huy-chon-ghe', {
                seatId: seat.seat_id,
                showtimeId
            });

            if (updated.length === 0) {
                clearBookingSession();
            }
        } else {
            if (selectedSeats.length >= 8) {
                setModalConfig({
                    show: true,
                    type: 'error',
                    title: 'Giới hạn ghế',
                    message: 'Bạn chỉ được chọn tối đa 8 ghế!',
                    onConfirm: () =>
                        setModalConfig(prev => ({ ...prev, show: false }))
                });
                return;
            }

            updated = [...selectedSeats, seat];

            socket.emit('client-chon-ghe', {
                seatId: seat.seat_id,
                showtimeId
            });

            if (selectedSeats.length === 0) {
                sessionStorage.setItem(
                    'holdExpiresAt',
                    (Date.now() + 10 * 60 * 1000).toString()
                );
                sessionStorage.setItem(
                    'currentShowtimeId',
                    showtimeId.toString()
                );
                setIsTimerActive(true);
            }
        }

        setSelectedSeats(updated);
        sessionStorage.setItem('selectedSeats', JSON.stringify(updated));
    };

    // =========================================================
    // HANDLE CONTINUE - chuyển sang Foods
    // =========================================================

    const handleContinue = () => {
        setIsNavigating(true);
        navigate('/foods', {
            state: {
                movie,
                selectedCinema,
                selectedDate,
                selectedShowtime,
                selectedSeats,
                showtimeDetail
            }
        });
        // Tự động tắt loading sau khi navigate (nếu trang chưa kịp load)
        // Đảm bảo không bị treo nếu navigate chậm
        setTimeout(() => {
            setIsNavigating(false);
        }, 3000);
    };

    // =========================================================
    // GROUP SEATS
    // =========================================================

    const groupedSeats = useMemo(() => {
        return seats.reduce((acc, seat) => {
            const row = seat.seat_row;
            if (!acc[row]) {
                acc[row] = [];
            }
            acc[row].push(seat);
            acc[row].sort(
                (a, b) => Number(a.seat_number) - Number(b.seat_number)
            );
            return acc;
        }, {});
    }, [seats]);

    // =========================================================
    // RENDER
    // =========================================================

    return (
        <>
            {/* ✅ ĐÃ BỎ LOADING SPINNER OVERLAY */}

            <div className="booking-wrapper">
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
                        foods={[]}
                        selectedFoods={[]}
                        totalTicketPrice={
                            selectedSeats.reduce(
                                (sum, s) => sum + Number(s.price),
                                0
                            )
                        }
                        totalFoodPrice={0}
                        grandTotal={
                            selectedSeats.reduce(
                                (sum, s) => sum + Number(s.price),
                                0
                            )
                        }
                        isTimerActive={isTimerActive}
                        onExpire={() => {
                            clearBookingSession();
                            setModalConfig({
                                show: true,
                                type: 'error',
                                title: 'Hết thời gian giữ ghế',
                                message: 'Ghế bạn chọn đã được mở khóa. Vui lòng chọn lại ghế.',
                                onConfirm: () =>
                                    setModalConfig(prev => ({ ...prev, show: false }))
                            });
                        }}
                    />

                    {/* MAIN */}
                    <section className="main-booking-area">

                        {/* NAV */}
                        <nav className="booking-nav-flex">

                            {/* CINEMA */}
                            <div className="nav-col cinema-select">
                                <label>1. CHỌN RẠP</label>
                                <select
                                    value={selectedCinema?.cinema_id || ''}
                                    onChange={(e) => {
                                        const cinema = cinemas.find(
                                            c => c.cinema_id == e.target.value
                                        );
                                        setSelectedCinema(cinema);
                                        setSelectedDate(null);
                                        setSelectedShowtime(null);
                                        setAvailableShowtimes([]);
                                    }}
                                >
                                    <option value="">-- Chọn rạp --</option>
                                    {cinemas.map(c => (
                                        <option key={c.cinema_id} value={c.cinema_id}>
                                            {c.cinema_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* DATE */}
                            <div
                                className={`nav-col date-slider ${
                                    !selectedCinema ? 'disabled-step' : ''
                                }`}
                            >
                                <label>2. CHỌN NGÀY</label>
                                <div className="slider-controls">
                                    <button
                                        className="slide-btn"
                                        onClick={() => scroll(dateRef, -150)}
                                        disabled={!selectedCinema}
                                    >
                                        ‹
                                    </button>
                                    <div className="scroll-list" ref={dateRef}>
                                        {availableDates.map(d => (
                                            <div
                                                key={d}
                                                className={`compact-card ${
                                                    selectedDate === d ? 'active' : ''
                                                }`}
                                                onClick={() => {
                                                    if (selectedCinema) {
                                                        setSelectedDate(d);
                                                        setSelectedShowtime(null);
                                                    }
                                                }}
                                            >
                                                <span className="day-txt">
                                                    {new Date(d).toLocaleDateString(
                                                        'vi-VN',
                                                        { weekday: 'short' }
                                                    )}
                                                </span>
                                                <span className="date-txt">
                                                    {new Date(d).getDate()}/
                                                    {new Date(d).getMonth() + 1}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        className="slide-btn"
                                        onClick={() => scroll(dateRef, 150)}
                                        disabled={!selectedCinema}
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>

                            {/* SHOWTIME */}
                            <div
                                className={`nav-col time-slider ${
                                    !selectedDate ? 'disabled-step' : ''
                                }`}
                            >
                                <label>3. SUẤT CHIẾU</label>
                                <div className="slider-controls">
                                    <button
                                        className="slide-btn"
                                        onClick={() => scroll(timeRef, -120)}
                                        disabled={!selectedDate}
                                    >
                                        ‹
                                    </button>
                                    <div className="scroll-list" ref={timeRef}>
                                        {availableShowtimes.length > 0
                                            ? availableShowtimes.map(st => (
                                                <div
                                                    key={st.showtime_id || st.id}
                                                    className={`compact-card time-card ${
                                                        selectedShowtime?.showtime_id ===
                                                            st.showtime_id ||
                                                        selectedShowtime?.id === st.id
                                                            ? 'active'
                                                            : ''
                                                    }`}
                                                    onClick={() =>
                                                        setSelectedShowtime(st)
                                                    }
                                                >
                                                    <span className="time-txt">
                                                        {st.start_time}
                                                    </span>
                                                </div>
                                            ))
                                            : selectedDate && (
                                                <span className="no-showtimes">
                                                    Hết suất
                                                </span>
                                            )}
                                    </div>
                                    <button
                                        className="slide-btn"
                                        onClick={() => scroll(timeRef, 120)}
                                        disabled={!selectedDate}
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>

                        </nav>

                        {/* SEAT */}
                        <div className="seat-selection-content">

                            {selectedShowtime ? (

                                <div className="seat-map-booking">

                                    {/* SCREEN */}
                                    <div className="screen-header">
                                        <div className="screen-line"></div>
                                        <span>MÀN HÌNH</span>
                                    </div>

                                    {/* SEATS */}
                                    <div className="seats-layout">
                                        {Object.keys(groupedSeats)
                                            .sort()
                                            .reverse()
                                            .map(row => (
                                                <div key={row} className="seat-row">
                                                    <span className="row-id">{row}</span>
                                                    <div className="row-items">
                                                        {groupedSeats[row].map(seat => (
                                                            <Seat
                                                                key={seat.seat_id}
                                                                type={seat.seat_type}
                                                                selected={selectedSeats.some(
                                                                    s => s.seat_id === seat.seat_id
                                                                )}
                                                                sold={seat.seat_status === 'Booked'}
                                                                maintenance={Number(seat.is_active) === 0}
                                                                locked={seat.is_locked_by_user}
                                                                number={seat.seat_number}
                                                                onClick={() =>
                                                                    handleSeatClick(seat)
                                                                }
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>

                                    {/* LEGEND */}
                                    <div className="seat-legend">
                                        <div className="leg-item">
                                            <div className="box maintenance"></div>
                                            Bảo trì
                                        </div>
                                        <div className="leg-item">
                                            <div className="box normal"></div>
                                            Thường
                                        </div>
                                        <div className="leg-item">
                                            <div className="box vip"></div>
                                            VIP
                                        </div>
                                        <div className="leg-item">
                                            <div className="box couple"></div>
                                            Đôi
                                        </div>
                                        <div className="leg-item">
                                            <div className="box selected"></div>
                                            Đang chọn
                                        </div>
                                        <div className="leg-item">
                                            <div className="box sold"></div>
                                            Đã bán
                                        </div>
                                    </div>

                                    {/* ACTION - ✅ DÙNG LOADINGBUTTON */}
                                    <div className="booking-actions">
                                        <LoadingButton
                                            type="button"
                                            loading={isNavigating}
                                            loadingText="Đang chuyển..."
                                            disabled={selectedSeats.length === 0 || isNavigating}
                                            className="btn-next"
                                            spinnerColor="#ffffff"
                                            onClick={handleContinue}
                                        >
                                            TIẾP TỤC CHỌN ĐỒ ĂN
                                        </LoadingButton>
                                    </div>

                                </div>

                            ) : (

                                <div className="placeholder-msg">
                                    <i className="fas fa-info-circle"></i>
                                    <p>
                                        Vui lòng chọn đầy đủ thông tin ở trên để hiển thị sơ đồ ghế
                                    </p>
                                </div>
                            )}

                            {/* MODAL */}
                            <Modal
                                show={modalConfig.show}
                                type={modalConfig.type}
                                title={modalConfig.title}
                                message={modalConfig.message}
                                onConfirm={modalConfig.onConfirm}
                                onCancel={modalConfig.onCancel}
                            />

                        </div>

                    </section>

                </div>
            </div>
        </>
    );
};

export default Booking;