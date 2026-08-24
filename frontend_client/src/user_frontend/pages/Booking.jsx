// ===================== Booking.js =====================

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

import api from '../../api/api';
import socketService from '../../api/socket';

import Modal from '../components/Modal';
import LoadingButton from '../components/LoadingButton';
import Seat from '../components/Seat';
import BookingSidebar from '../components/BookingSidebar';

import '../styles/Booking.css';


const Booking = () => {

    // =========================================================
    // ROUTER
    // =========================================================

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
    const [isNavigating, setIsNavigating] = useState(false);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const isSessionClearedRef = useRef(false);

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: 'info',
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: null
    });


    // =========================================================
    // REFS
    // =========================================================

    const dateRef = useRef(null);
    const timeRef = useRef(null);


    // =========================================================
    // SOCKET
    // =========================================================

    const socket = socketService.getSocket();
    const isSocketConnected = socketService.isConnectedStatus();
    const showtimeId = selectedShowtime?.showtime_id || selectedShowtime?.id;


    // =========================================================
    // XÓA SẠCH SESSION BOOKING
    // =========================================================

    const clearBookingSession = useCallback(() => {
        console.log('🧹 [BOOKING] Clearing booking session...');

        const keysToRemove = [
            'selectedSeats',
            'holdExpiresAt',
            'currentShowtimeId',
            'booking_seats',
            'booking_showtime',
            'booking_data',
            'selected_foods',
            'food_selection',
            'booking_cinema',
            'booking_date',
            'booking_movie',
            'booking_showtime'
        ];

        keysToRemove.forEach(key => {
            sessionStorage.removeItem(key);
            localStorage.removeItem(key);
        });

        if (isSocketConnected && selectedSeats.length > 0) {
            selectedSeats.forEach((s) => {
                socketService.emit('client-huy-chon-ghe', {
                    seatId: s.seat_id,
                    showtimeId
                });
            });
        }

        setIsTimerActive(false);
        setSelectedSeats([]);
        isSessionClearedRef.current = true;

        console.log('✅ [BOOKING] Booking session cleared');
    }, [isSocketConnected, selectedSeats, showtimeId]);


    // =========================================================
    // LẮNG NGHE EVENT CLEAR BOOKING SESSION TỪ SESSION GUARD
    // =========================================================

    useEffect(() => {
        const handleClearBooking = (event) => {
            console.log('📨 [BOOKING] Received clear booking session event:', event?.detail);

            clearBookingSession();

            setModalConfig({
                show: true,
                type: 'error',
                title: 'Phiên đăng nhập đã hết hạn',
                message: 'Ghế bạn đã chọn đã được giải phóng. Vui lòng đăng nhập lại và chọn ghế mới.',
                onConfirm: () => {
                    setModalConfig(prev => ({ ...prev, show: false }));
                    navigate('/', { replace: true });
                },
                onCancel: () => {
                    setModalConfig(prev => ({ ...prev, show: false }));
                    navigate('/', { replace: true });
                }
            });

            setTimeout(() => {
                navigate('/', { replace: true });
            }, 2000);
        };

        window.addEventListener('clearBookingSession', handleClearBooking);

        return () => {
            window.removeEventListener('clearBookingSession', handleClearBooking);
        };
    }, [clearBookingSession, navigate]);


    // =========================================================
    // SCROLL
    // =========================================================

    const scroll = (ref, offset) => {
        if (ref.current) {
            ref.current.scrollLeft += offset;
        }
    };


    // =========================================================
    // HELPER - COUPLE SEAT
    // =========================================================

    const isCoupleSeat = useCallback((seat) => {
        if (!seat) return false;
        return String(seat.seat_type || '').trim().toUpperCase() === 'COUPLE';
    }, []);


    const getCouplePair = useCallback(
        (currentSeat, allSeats) => {
            if (!currentSeat || !isCoupleSeat(currentSeat)) return null;

            const currentNumber = Number(currentSeat.seat_number);
            if (!Number.isFinite(currentNumber)) return null;

            const nextSeat = allSeats.find(
                (s) =>
                    s.seat_id !== currentSeat.seat_id &&
                    isCoupleSeat(s) &&
                    s.seat_row === currentSeat.seat_row &&
                    Number(s.seat_number) === currentNumber + 1
            );

            if (nextSeat) return nextSeat;

            const previousSeat = allSeats.find(
                (s) =>
                    s.seat_id !== currentSeat.seat_id &&
                    isCoupleSeat(s) &&
                    s.seat_row === currentSeat.seat_row &&
                    Number(s.seat_number) === currentNumber - 1
            );

            return previousSeat || null;
        },
        [isCoupleSeat]
    );


    // =========================================================
    // KIỂM TRA GHẾ COUPLE HIỂN THỊ
    // =========================================================

    const isCoupleDisplaySeat = useCallback(
        (seat) => {
            if (!isCoupleSeat(seat)) return true;

            const currentNumber = Number(seat.seat_number);
            if (!Number.isFinite(currentNumber)) return true;

            if (currentNumber % 2 === 1) return true;

            const previousSeat = seats.find(
                (s) =>
                    isCoupleSeat(s) &&
                    s.seat_row === seat.seat_row &&
                    Number(s.seat_number) === currentNumber - 1
            );

            if (previousSeat) return false;
            return true;
        },
        [isCoupleSeat, seats]
    );


    // =========================================================
    // LOCATION STATE
    // =========================================================

    useEffect(() => {
        const stateData = location.state;
        if (!stateData) return;

        if (stateData.movie) setMovie(stateData.movie);
        if (stateData.date) setSelectedDate(stateData.date);
        if (stateData.cinema) setSelectedCinema(stateData.cinema);
        if (stateData.showtime) setSelectedShowtime(stateData.showtime);
    }, [location.state]);


    // =========================================================
    // MATCH CINEMA
    // =========================================================

    useEffect(() => {
        const stateData = location.state;
        if (cinemas.length > 0 && stateData?.cinema) {
            const matchedCinema = cinemas.find(
                (c) => c.cinema_name === stateData.cinema.cinema_name
            );
            if (matchedCinema) setSelectedCinema(matchedCinema);
        }
    }, [cinemas, location.state]);


    // =========================================================
    // MATCH SHOWTIME
    // =========================================================

    useEffect(() => {
        const stateData = location.state;
        if (availableShowtimes.length > 0 && stateData?.showtime) {
            const matchedShowtime = availableShowtimes.find(
                (st) => st.showtime_id === stateData.showtime.showtime_id
            );
            if (matchedShowtime) setSelectedShowtime(matchedShowtime);
        }
    }, [availableShowtimes, location.state]);


    // =========================================================
    // FETCH MOVIE
    // =========================================================

    useEffect(() => {
        window.scrollTo(0, 0);

        const fetchMovieBySlug = async () => {
            if (!slug) {
                navigate('/');
                return;
            }

            if (movie && movie.movie_poster) return;

            try {
                setLoading(true);
                setFetchError(null);

                const res = await api.get(`/api/movies/detail/${slug}`);
                const movieData = res.data?.data;
                setMovie(movieData);
            } catch (error) {
                console.error('Lỗi load movie theo slug:', error);
                setFetchError('Không thể tải thông tin phim. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };

        fetchMovieBySlug();
    }, [slug, movie, navigate]);


    // =========================================================
    // FETCH INITIAL DATA
    // =========================================================

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);

                const res = await api.get('/api/cinemas');
                const cinemaData = res.data?.data || [];
                setCinemas(cinemaData);

                const dates = [];
                for (let i = 0; i < 7; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    dates.push(d.toISOString().split('T')[0]);
                }
                setAvailableDates(dates);
            } catch (err) {
                console.error('Lỗi tải dữ liệu ban đầu:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);


    // =========================================================
    // FETCH SHOWTIMES
    // =========================================================

    useEffect(() => {
        if (!selectedCinema || !selectedDate || !(movie?.movie_id || movie?.id)) {
            setAvailableShowtimes([]);
            return;
        }

        const fetchShowtimes = async () => {
            try {
                const res = await api.get('/api/showtimes/filter-booking', {
                    params: {
                        cinema_id: selectedCinema.cinema_id,
                        date: selectedDate,
                        movie_id: movie.movie_id || movie.id
                    }
                });
                const showtimeData = res.data?.data || [];
                setAvailableShowtimes(showtimeData);
            } catch (err) {
                console.error('Lỗi tải suất chiếu:', err);
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
                api.get(`/api/showtimes/detail/${showtimeId}`),
                api.get(`/api/seats/showtime/${showtimeId}`)
            ]);

            setShowtimeDetail(detailRes.data?.data);

            let seatsData = seatsRes.data?.data || [];

            const savedSeats = sessionStorage.getItem('selectedSeats');
            const savedShowtime = sessionStorage.getItem('currentShowtimeId');

            if (savedSeats && savedShowtime === showtimeId.toString()) {
                const parsed = JSON.parse(savedSeats);
                seatsData = seatsData.map((s) => {
                    const isSelected = parsed.some(
                        (p) => Number(p.seat_id) === Number(s.seat_id)
                    );
                    if (isSelected) {
                        return {
                            ...s,
                            is_locked_by_user: false,
                            held_by_other: false
                        };
                    }
                    return s;
                });
                setSelectedSeats(parsed);
                if (sessionStorage.getItem('holdExpiresAt')) {
                    setIsTimerActive(true);
                }
            }

            setSeats(seatsData);

            if (isSocketConnected) {
                socketService.emit('request-holding-seats');
            }
        } catch (err) {
            console.error('Lỗi tải sơ đồ ghế:', err);
        } finally {
            setLoading(false);
        }
    }, [showtimeId, isSocketConnected]);


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

        const currentSocket = socketService.getSocket();
        if (!currentSocket) return;

        const handleSeatLocked = (data) => {
            if (Number(data.showtimeId) !== Number(showtimeId)) return;

            const isOwnSeat = data.socketId === currentSocket.id;

            setSeats((prev) =>
                prev.map((s) =>
                    Number(s.seat_id) === Number(data.seatId)
                        ? {
                            ...s,
                            is_locked_by_user: !isOwnSeat,
                            held_by_other: !isOwnSeat
                        }
                        : s
                )
            );
        };

        const handleSeatUnlocked = (data) => {
            if (Number(data.showtimeId) !== Number(showtimeId)) return;

            setSeats((prev) =>
                prev.map((s) =>
                    Number(s.seat_id) === Number(data.seatId)
                        ? {
                            ...s,
                            is_locked_by_user: false,
                            held_by_other: false
                        }
                        : s
                )
            );
        };

        const handleSeatList = (seatList) => {
            if (!Array.isArray(seatList)) return;

            setSeats((prev) => {
                const updated = [...prev];

                seatList.forEach((data) => {
                    if (Number(data.showtimeId) === Number(showtimeId)) {
                        const index = updated.findIndex(
                            (s) => Number(s.seat_id) === Number(data.seatId)
                        );
                        if (index !== -1) {
                            const isOwnSeat = data.socketId === currentSocket.id;
                            updated[index] = {
                                ...updated[index],
                                is_locked_by_user: !isOwnSeat,
                                held_by_other: !isOwnSeat
                            };
                        }
                    }
                });

                return updated;
            });
        };

        currentSocket.on('server-gui-danh-sach-dang-giu', handleSeatList);
        currentSocket.on('server-khoa-ghe', handleSeatLocked);
        currentSocket.on('server-mo-khoa-ghe', handleSeatUnlocked);

        return () => {
            currentSocket.off('server-gui-danh-sach-dang-giu', handleSeatList);
            currentSocket.off('server-khoa-ghe', handleSeatLocked);
            currentSocket.off('server-mo-khoa-ghe', handleSeatUnlocked);
        };
    }, [showtimeId]);


    // =========================================================
    // HANDLE SEAT CLICK
    // =========================================================

    const handleSeatClick = (seat) => {
        if (!seat) return;

        if (seat.seat_status === 'Booked' || Number(seat.is_active) === 0 || seat.held_by_other) {
            return;
        }

        if (!isSocketConnected) {
            setModalConfig({
                show: true,
                type: 'error',
                title: 'Phiên làm việc hết hạn',
                message: 'Socket đã ngắt kết nối. Vui lòng tải lại trang.',
                onConfirm: () => window.location.reload()
            });
            return;
        }

        const couple = isCoupleSeat(seat);
        let seatsToToggle = [seat];

        if (couple) {
            const pairSeat = getCouplePair(seat, seats);
            if (!pairSeat) {
                setModalConfig({
                    show: true,
                    type: 'error',
                    title: 'Ghế Couple không hợp lệ',
                    message: 'Không tìm thấy ghế đôi đi kèm.',
                    onConfirm: () => setModalConfig((prev) => ({ ...prev, show: false }))
                });
                return;
            }

            if (pairSeat.seat_status === 'Booked' || Number(pairSeat.is_active) === 0 || pairSeat.held_by_other) {
                setModalConfig({
                    show: true,
                    type: 'error',
                    title: 'Ghế đôi không khả dụng',
                    message: 'Một ghế trong cặp Couple hiện không thể chọn.',
                    onConfirm: () => setModalConfig((prev) => ({ ...prev, show: false }))
                });
                return;
            }

            seatsToToggle = [seat, pairSeat];
        }

        const currentSelected = selectedSeats;
        const allSelected = seatsToToggle.every(
            (targetSeat) =>
                currentSelected.some((s) => Number(s.seat_id) === Number(targetSeat.seat_id))
        );

        // HỦY CHỌN GHẾ
        if (allSelected) {
            const updated = currentSelected.filter(
                (selectedSeat) =>
                    !seatsToToggle.some(
                        (targetSeat) => Number(targetSeat.seat_id) === Number(selectedSeat.seat_id)
                    )
            );

            seatsToToggle.forEach((targetSeat) => {
                socketService.emit('client-huy-chon-ghe', {
                    seatId: targetSeat.seat_id,
                    showtimeId
                });
            });

            setSelectedSeats(updated);

            if (updated.length === 0) {
                sessionStorage.removeItem('selectedSeats');
                sessionStorage.removeItem('holdExpiresAt');
                sessionStorage.removeItem('currentShowtimeId');
                setIsTimerActive(false);
            } else {
                sessionStorage.setItem('selectedSeats', JSON.stringify(updated));
            }

            setSeats((prev) =>
                prev.map((s) => {
                    const wasRemoved = seatsToToggle.some(
                        (targetSeat) => Number(targetSeat.seat_id) === Number(s.seat_id)
                    );
                    if (wasRemoved) {
                        return {
                            ...s,
                            is_locked_by_user: false,
                            held_by_other: false
                        };
                    }
                    return s;
                })
            );

            return;
        }

        // GIỚI HẠN 8 GHẾ
        const newSeatCount = currentSelected.length + seatsToToggle.length;
        if (newSeatCount > 8) {
            setModalConfig({
                show: true,
                type: 'error',
                title: 'Giới hạn ghế',
                message: 'Bạn chỉ được chọn tối đa 8 ghế!',
                onConfirm: () => setModalConfig((prev) => ({ ...prev, show: false }))
            });
            return;
        }

        // THÊM GHẾ
        const updated = [...currentSelected];

        seatsToToggle.forEach((targetSeat) => {
            const alreadyExists = updated.some(
                (s) => Number(s.seat_id) === Number(targetSeat.seat_id)
            );
            if (!alreadyExists) {
                updated.push(targetSeat);
                socketService.emit('client-chon-ghe', {
                    seatId: targetSeat.seat_id,
                    showtimeId
                });
            }
        });

        // BẮT ĐẦU TIMER
        if (currentSelected.length === 0) {
            sessionStorage.setItem('holdExpiresAt', (Date.now() + 10 * 60 * 1000).toString());
            sessionStorage.setItem('currentShowtimeId', showtimeId.toString());
            setIsTimerActive(true);
        }

        setSeats((prev) =>
            prev.map((s) => {
                const isNewSelected = seatsToToggle.some(
                    (targetSeat) => Number(targetSeat.seat_id) === Number(s.seat_id)
                );
                if (isNewSelected) {
                    return {
                        ...s,
                        is_locked_by_user: false,
                        held_by_other: false
                    };
                }
                return s;
            })
        );

        setSelectedSeats(updated);
        sessionStorage.setItem('selectedSeats', JSON.stringify(updated));
    };


    // =========================================================
    // CONTINUE
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
            if (!acc[row]) acc[row] = [];
            acc[row].push(seat);
            acc[row].sort((a, b) => Number(a.seat_number) - Number(b.seat_number));
            return acc;
        }, {});
    }, [seats]);


    // =========================================================
    // MOVIE POSTER
    // =========================================================

    const movieWithPoster = useMemo(() => {
        if (!movie) return null;
        return {
            ...movie,
            poster: movie.movie_poster,
            movie_poster: movie.movie_poster
        };
    }, [movie]);


    // =========================================================
    // TOTAL PRICE
    // =========================================================

    const totalTicketPrice = useMemo(() => {
        return selectedSeats.reduce((sum, seat) => sum + Number(seat.price || 0), 0);
    }, [selectedSeats]);


    // =========================================================
    // ERROR
    // =========================================================

    if (fetchError) {
        return (
            <div className="booking-error-container">
                <div className="booking-error-box">
                    <p>{fetchError}</p>
                    <button className="booking-retry-btn" onClick={() => window.location.reload()}>
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }


    // =========================================================
    // RENDER
    // =========================================================

    return (
        <>
            <div className="booking-wrapper">
                <div className="booking-container">

                    <BookingSidebar
                        movie={movieWithPoster}
                        showtimeDetail={showtimeDetail}
                        selectedCinema={selectedCinema}
                        selectedDate={selectedDate}
                        selectedShowtime={selectedShowtime}
                        selectedSeats={Array.isArray(selectedSeats) ? selectedSeats : []}
                        foods={[]}
                        selectedFoods={[]}
                        totalTicketPrice={totalTicketPrice}
                        totalFoodPrice={0}
                        grandTotal={totalTicketPrice}
                        isTimerActive={isTimerActive}
                        onExpire={() => {
                            clearBookingSession();
                            setModalConfig({
                                show: true,
                                type: 'error',
                                title: 'Hết thời gian giữ ghế',
                                message: 'Ghế bạn chọn đã được mở khóa. Vui lòng chọn lại ghế.',
                                onConfirm: () => setModalConfig((prev) => ({ ...prev, show: false }))
                            });
                        }}
                    />

                    <section className="main-booking-area">

                        <nav className="booking-nav-flex">

                            <div className="nav-col cinema-select">
                                <label>1. CHỌN RẠP</label>
                                <select
                                    value={selectedCinema?.cinema_id || ''}
                                    onChange={(e) => {
                                        const cinema = cinemas.find(
                                            (c) => c.cinema_id == e.target.value
                                        );
                                        setSelectedCinema(cinema);
                                        setSelectedDate(null);
                                        setSelectedShowtime(null);
                                        setAvailableShowtimes([]);
                                    }}
                                >
                                    <option value="">-- Chọn rạp --</option>
                                    {cinemas.map((c) => (
                                        <option key={c.cinema_id} value={c.cinema_id}>
                                            {c.cinema_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={`nav-col date-slider ${!selectedCinema ? 'disabled-step' : ''}`}>
                                <label>2. CHỌN NGÀY</label>
                                <div className="slider-controls">
                                    <button className="slide-btn" onClick={() => scroll(dateRef, -150)} disabled={!selectedCinema}>‹</button>
                                    <div className="scroll-list" ref={dateRef}>
                                        {availableDates.map((d) => (
                                            <div
                                                key={d}
                                                className={`compact-card ${selectedDate === d ? 'active' : ''}`}
                                                onClick={() => {
                                                    if (selectedCinema) {
                                                        setSelectedDate(d);
                                                        setSelectedShowtime(null);
                                                    }
                                                }}
                                            >
                                                <span className="day-txt">
                                                    {new Date(d).toLocaleDateString('vi-VN', { weekday: 'short' })}
                                                </span>
                                                <span className="date-txt">
                                                    {new Date(d).getDate()}/{new Date(d).getMonth() + 1}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="slide-btn" onClick={() => scroll(dateRef, 150)} disabled={!selectedCinema}>›</button>
                                </div>
                            </div>

                            <div className={`nav-col time-slider ${!selectedDate ? 'disabled-step' : ''}`}>
                                <label>3. SUẤT CHIẾU</label>
                                <div className="slider-controls">
                                    <button className="slide-btn" onClick={() => scroll(timeRef, -120)} disabled={!selectedDate}>‹</button>
                                    <div className="scroll-list" ref={timeRef}>
                                        {availableShowtimes.length > 0
                                            ? availableShowtimes.map((st) => (
                                                <div
                                                    key={st.showtime_id || st.id}
                                                    className={`compact-card time-card ${selectedShowtime?.showtime_id === st.showtime_id || selectedShowtime?.id === st.id ? 'active' : ''}`}
                                                    onClick={() => setSelectedShowtime(st)}
                                                >
                                                    <span className="time-txt">{st.start_time}</span>
                                                </div>
                                            ))
                                            : selectedDate && <span className="no-showtimes">Hết suất</span>
                                        }
                                    </div>
                                    <button className="slide-btn" onClick={() => scroll(timeRef, 120)} disabled={!selectedDate}>›</button>
                                </div>
                            </div>

                        </nav>

                        <div className="seat-selection-content">
                            {selectedShowtime ? (
                                <div className="seat-map-booking">

                                    <div className="screen-header">
                                        <div className="screen-line"></div>
                                        <span>MÀN HÌNH</span>
                                    </div>

                                    <div className="seats-layout">
                                        {(() => {
                                            const sortedRowKeys = Object.keys(groupedSeats).sort((a, b) => {
                                                const aNum = parseInt(a);
                                                const bNum = parseInt(b);
                                                if (!isNaN(aNum) && !isNaN(bNum)) {
                                                    return aNum - bNum;
                                                }
                                                return a.localeCompare(b);
                                            });

                                            return sortedRowKeys.map((row) => {
                                                const rowSeats = groupedSeats[row] || [];
                                                const displaySeats = rowSeats.filter(
                                                    (seat) => isCoupleDisplaySeat(seat)
                                                );

                                                return (
                                                    <div key={row} className="seat-row">
                                                        <span className="row-id">{row}</span>
                                                        <div className="row-items">
                                                            {displaySeats.map((seat) => {
                                                                const couple = isCoupleSeat(seat);
                                                                const isSelectedByMe = selectedSeats.some(
                                                                    (s) => Number(s.seat_id) === Number(seat.seat_id)
                                                                );

                                                                let displayNumber = seat.seat_number;
                                                                if (couple) {
                                                                    const pairSeat = getCouplePair(seat, seats);
                                                                    if (pairSeat) {
                                                                        displayNumber = `${seat.seat_number}-${pairSeat.seat_number}`;
                                                                    }
                                                                }

                                                                return (
                                                                    <Seat
                                                                        key={seat.seat_id}
                                                                        type={seat.seat_type}
                                                                        selected={isSelectedByMe}
                                                                        sold={seat.seat_status === 'Booked'}
                                                                        maintenance={Number(seat.is_active) === 0}
                                                                        locked={seat.is_locked_by_user && !isSelectedByMe}
                                                                        heldByOther={seat.held_by_other}
                                                                        number={displayNumber}
                                                                        onClick={() => handleSeatClick(seat)}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>

                                    <div className="seat-legend">
                                        <div className="leg-item"><div className="box maintenance"></div>Bảo trì</div>
                                        <div className="leg-item"><div className="box normal"></div>Thường</div>
                                        <div className="leg-item"><div className="box vip"></div>VIP</div>
                                        <div className="leg-item"><div className="box couple"></div>Đôi</div>
                                        <div className="leg-item"><div className="box selected"></div>Đang chọn</div>
                                        <div className="leg-item"><div className="box sold"></div>Đã bán</div>
                                        <div className="leg-item"><div className="box held-by-other"></div>Đang được chọn</div>
                                    </div>

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
                                    <p>Vui lòng chọn đầy đủ thông tin ở trên để hiển thị sơ đồ ghế</p>
                                </div>
                            )}
                        </div>

                    </section>

                </div>
            </div>

            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
                onCancel={modalConfig.onCancel}
            />

        </>
    );
};

export default Booking;