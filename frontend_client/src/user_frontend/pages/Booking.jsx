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

// 🔥 THAY ĐỔI: Import socketService thay vì io
import socketService from '../../api/socket';

import Modal from '../components/Modal';
import CountdownTimer from './CountdownTimer';
import LoadingButton from '../components/LoadingButton';
import Seat from '../components/Seat';
import BookingSidebar from '../components/BookingSidebar';

import '../styles/Booking.css';

const Booking = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { slug } = useParams();

    // =========================================================
    // STATE
    // =========================================================

    const [movie, setMovie] = useState(location.state?.movie || null);
    const [cinemas, setCinemas] = useState([]);
    const [availableDates, setAvailableDates] = useState([]);
    const [availableShowtimes, setAvailableShowtimes] = useState([]);

    const [selectedCinema, setSelectedCinema] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedShowtime, setSelectedShowtime] = useState(null);

    /*
     * selectedSeats:
     *
     * Ghế đơn:
     * [ seat A1 ]
     *
     * Ghế Couple:
     * [ seat A9, seat A10 ]
     *
     * => Sidebar sẽ nhận đúng số ghế vật lý.
     */
    const [selectedSeats, setSelectedSeats] = useState([]);

    const [seats, setSeats] = useState([]);
    const [showtimeDetail, setShowtimeDetail] = useState(null);

    const [loading, setLoading] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [isTimerActive, setIsTimerActive] = useState(false);

    const [fetchError, setFetchError] = useState(null);

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
    // 🔥 LẤY SOCKET TỪ socketService (dùng chung với App)
    // =========================================================

    const socket = socketService.getSocket();
    const isSocketConnected = socketService.isConnectedStatus();

    const showtimeId = selectedShowtime?.showtime_id || selectedShowtime?.id;

    // =========================================================
    // SCROLL
    // =========================================================

    const scroll = (ref, offset) => {
        if (ref.current) {
            ref.current.scrollLeft += offset;
        }
    };

    // =========================================================
    // HELPER: CHUẨN HÓA SEAT TYPE
    // =========================================================
    /*
     * DB có thể trả:
     * Couple
     * COUPLE
     * couple
     *
     * => luôn chuẩn hóa về COUPLE.
     */

    const isCoupleSeat = useCallback((seat) => {
        if (!seat) return false;

        return String(seat.seat_type || '')
            .trim()
            .toUpperCase() === 'COUPLE';
    }, []);

    // =========================================================
    // TÌM GHẾ ĐÔI ĐI KÈM
    // =========================================================
    /*
     * Couple luôn gồm 2 seat vật lý.
     *
     * Ví dụ:
     * A9 + A10
     *
     * Cả 2 seat trong DB đều có seat_type = Couple.
     *
     * Khi user click A9:
     * => chọn A9 + A10
     *
     * Khi user click A10:
     * => vẫn chọn A9 + A10
     */

    const getCouplePair = useCallback(
        (currentSeat, allSeats) => {
            if (!currentSeat || !isCoupleSeat(currentSeat)) {
                return null;
            }

            const currentNumber = Number(currentSeat.seat_number);

            if (!Number.isFinite(currentNumber)) {
                return null;
            }

            /*
             * Ưu tiên tìm seat kế tiếp.
             */
            const nextSeat = allSeats.find(
                (s) =>
                    s.seat_id !== currentSeat.seat_id &&
                    isCoupleSeat(s) &&
                    s.seat_row === currentSeat.seat_row &&
                    Number(s.seat_number) === currentNumber + 1
            );

            if (nextSeat) {
                return nextSeat;
            }

            /*
             * Nếu current là ghế số chẵn,
             * thử tìm ghế số trước đó.
             */
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
    // TÌM GHẾ ĐẠI DIỆN CỦA COUPLE
    // =========================================================
    /*
     * Sơ đồ chỉ hiển thị 1 ô cho Couple.
     *
     * Ví dụ DB:
     *
     * A9  Couple
     * A10 Couple
     *
     * UI:
     *
     * [ A9-A10 ]
     *
     * Không hiển thị thêm A10 thành một ô riêng.
     */

    const isCoupleDisplaySeat = useCallback(
        (seat) => {
            if (!isCoupleSeat(seat)) {
                return true;
            }

            const currentNumber = Number(seat.seat_number);

            if (!Number.isFinite(currentNumber)) {
                return true;
            }

            /*
             * Quy ước:
             * số lẻ là seat đại diện.
             *
             * A9  -> hiển thị
             * A10 -> ẩn
             *
             * Tuy nhiên nếu DB có cấu trúc ngược,
             * vẫn kiểm tra seat trước đó.
             */

            if (currentNumber % 2 === 1) {
                return true;
            }

            const previousSeat = seats.find(
                (s) =>
                    isCoupleSeat(s) &&
                    s.seat_row === seat.seat_row &&
                    Number(s.seat_number) === currentNumber - 1
            );

            if (previousSeat) {
                return false;
            }

            return true;
        },
        [isCoupleSeat, seats]
    );

    // =========================================================
    // ĐỒNG BỘ DỮ LIỆU TỪ QUICK BOOKING
    // =========================================================

    useEffect(() => {
        const stateData = location.state;

        if (!stateData) return;

        if (stateData.movie) {
            setMovie(stateData.movie);
        }

        if (stateData.date) {
            setSelectedDate(stateData.date);
        }

        if (stateData.cinema) {
            setSelectedCinema(stateData.cinema);
        }

        if (stateData.showtime) {
            setSelectedShowtime(stateData.showtime);
        }
    }, [location.state]);

    // =========================================================
    // MATCH CINEMA SAU KHI LOAD
    // =========================================================

    useEffect(() => {
        const stateData = location.state;

        if (cinemas.length > 0 && stateData?.cinema) {
            const matchedCinema = cinemas.find(
                (c) =>
                    c.cinema_name ===
                    stateData.cinema.cinema_name
            );

            if (matchedCinema) {
                setSelectedCinema(matchedCinema);
            }
        }
    }, [cinemas, location.state]);

    // =========================================================
    // MATCH SHOWTIME SAU KHI LOAD
    // =========================================================

    useEffect(() => {
        const stateData = location.state;

        if (
            availableShowtimes.length > 0 &&
            stateData?.showtime
        ) {
            const matchedShowtime = availableShowtimes.find(
                (st) =>
                    st.showtime_id ===
                    stateData.showtime.showtime_id
            );

            if (matchedShowtime) {
                setSelectedShowtime(matchedShowtime);
            }
        }
    }, [availableShowtimes, location.state]);

    // =========================================================
    // LOAD MOVIE FROM SLUG
    // =========================================================

    useEffect(() => {
        window.scrollTo(0, 0);

        const fetchMovieBySlug = async () => {
            if (!slug) {
                navigate('/');
                return;
            }

            if (movie && movie.movie_poster) {
                return;
            }

            try {
                setLoading(true);
                setFetchError(null);

                const res = await api.get(
                    `/api/movies/detail/${slug}`
                );

                const movieData = res.data?.data;

                console.log('===== MOVIE API =====');
                console.log(
                    'movie_poster:',
                    movieData?.movie_poster
                );
                console.log('=====================');

                setMovie(movieData);
            } catch (error) {
                console.error(
                    'Lỗi load movie theo slug:',
                    error
                );

                setFetchError(
                    'Không thể tải thông tin phim. Vui lòng thử lại.'
                );
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

                const res = await api.get('/api/cinemas');

                const cinemaData = res.data?.data || [];

                setCinemas(cinemaData);

                const dates = [];

                for (let i = 0; i < 7; i++) {
                    const d = new Date();

                    d.setDate(
                        d.getDate() + i
                    );

                    dates.push(
                        d.toISOString().split('T')[0]
                    );
                }

                setAvailableDates(dates);
            } catch (err) {
                console.error(
                    'Lỗi tải dữ liệu ban đầu:',
                    err
                );
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
                const res = await api.get(
                    '/api/showtimes/filter-booking',
                    {
                        params: {
                            cinema_id:
                                selectedCinema.cinema_id,

                            date: selectedDate,

                            movie_id:
                                movie.movie_id ||
                                movie.id
                        }
                    }
                );

                const showtimeData =
                    res.data?.data || [];

                setAvailableShowtimes(
                    showtimeData
                );
            } catch (err) {
                console.error(
                    'Lỗi tải suất chiếu:',
                    err
                );

                setAvailableShowtimes([]);
            }
        };

        fetchShowtimes();
    }, [
        selectedCinema,
        selectedDate,
        movie
    ]);

    // =========================================================
    // FETCH SEATS - SỬA LẠI
    // =========================================================

    const fetchSeats = useCallback(async () => {
        if (!showtimeId) return;

        try {
            setLoading(true);

            const [
                detailRes,
                seatsRes
            ] = await Promise.all([
                api.get(
                    `/api/showtimes/detail/${showtimeId}`
                ),

                api.get(
                    `/api/seats/showtime/${showtimeId}`
                )
            ]);

            setShowtimeDetail(
                detailRes.data?.data
            );

            let seatsData =
                seatsRes.data?.data || [];

            // =================================================
            // RESTORE SESSION
            // =================================================

            const savedSeats =
                sessionStorage.getItem(
                    'selectedSeats'
                );

            const savedShowtime =
                sessionStorage.getItem(
                    'currentShowtimeId'
                );

            if (
                savedSeats &&
                savedShowtime ===
                    showtimeId.toString()
            ) {
                const parsed =
                    JSON.parse(savedSeats);

                // 🔥 ĐÁNH DẤU GHẾ ĐÃ CHỌN TRONG seatsData
                seatsData = seatsData.map((s) => {
                    const isSelected = parsed.some(
                        (p) => Number(p.seat_id) === Number(s.seat_id)
                    );
                    if (isSelected) {
                        return {
                            ...s,
                            is_locked_by_user: true,
                            held_by_other: false // Ghế của chính mình
                        };
                    }
                    return s;
                });

                setSelectedSeats(parsed);

                if (
                    sessionStorage.getItem(
                        'holdExpiresAt'
                    )
                ) {
                    setIsTimerActive(true);
                }
            }

            setSeats(seatsData);

            // 🔥 YÊU CẦU DANH SÁCH GHẾ ĐANG GIỮ TỪ SERVER
            if (isSocketConnected) {
                socketService.emit('request-holding-seats');
            }

        } catch (err) {
            console.error(
                'Lỗi tải sơ đồ ghế:',
                err
            );
        } finally {
            setLoading(false);
        }
    }, [showtimeId, isSocketConnected]);

    useEffect(() => {
        if (showtimeId) {
            fetchSeats();
        }
    }, [
        showtimeId,
        fetchSeats
    ]);

    // =========================================================
    // SOCKET REALTIME - SỬA LẠI HOÀN CHỈNH
    // =========================================================

    useEffect(() => {
        if (!showtimeId) return;

        // 🔥 LẤY SOCKET HIỆN TẠI
        const currentSocket = socketService.getSocket();
        if (!currentSocket) return;

        const handleSeatLocked = (data) => {
            if (
                Number(data.showtimeId) !==
                Number(showtimeId)
            ) {
                return;
            }

            setSeats((prev) =>
                prev.map((s) =>
                    Number(s.seat_id) ===
                    Number(data.seatId)
                        ? {
                              ...s,
                              is_locked_by_user: true,
                              held_by_other: true // 🔥 Đánh dấu ghế của người khác
                          }
                        : s
                )
            );
        };

        const handleSeatUnlocked = (data) => {
            if (
                Number(data.showtimeId) !==
                Number(showtimeId)
            ) {
                return;
            }

            setSeats((prev) =>
                prev.map((s) =>
                    Number(s.seat_id) ===
                    Number(data.seatId)
                        ? {
                              ...s,
                              is_locked_by_user: false,
                              held_by_other: false
                          }
                        : s
                )
            );
        };

        // 🔥 THÊM: Nhận danh sách ghế đang giữ khi vào trang
        const handleSeatList = (seatList) => {
            if (!Array.isArray(seatList)) return;

            setSeats((prev) => {
                const updated = [...prev];
                seatList.forEach((data) => {
                    if (Number(data.showtimeId) === Number(showtimeId)) {
                        const index = updated.findIndex(
                            s => Number(s.seat_id) === Number(data.seatId)
                        );
                        if (index !== -1) {
                            // Kiểm tra nếu ghế này không phải do user hiện tại chọn
                            const savedSeats = sessionStorage.getItem('selectedSeats');
                            let isOwnSeat = false;
                            if (savedSeats) {
                                const parsed = JSON.parse(savedSeats);
                                isOwnSeat = parsed.some(
                                    p => Number(p.seat_id) === Number(data.seatId)
                                );
                            }

                            updated[index] = {
                                ...updated[index],
                                is_locked_by_user: true,
                                held_by_other: !isOwnSeat
                            };
                        }
                    }
                });
                return updated;
            });
        };

        socket.on('server-gui-danh-sach-dang-giu', handleSeatList);
        socket.on('server-khoa-ghe', handleSeatLocked);
        socket.on('server-mo-khoa-ghe', handleSeatUnlocked);

        return () => {
            socket.off('server-gui-danh-sach-dang-giu', handleSeatList);
            socket.off('server-khoa-ghe', handleSeatLocked);
            socket.off('server-mo-khoa-ghe', handleSeatUnlocked);
        };
    }, [showtimeId]);

    // =========================================================
    // CLEAR BOOKING SESSION
    // =========================================================

    const clearBookingSession = useCallback(() => {
        selectedSeats.forEach((s) => {
            // Chỉ emit nếu socket vẫn đang kết nối
            if (isSocketConnected) {
                socketService.emit(
                    'client-huy-chon-ghe',
                    {
                        seatId: s.seat_id,
                        showtimeId
                    }
                );
            }
        });

        sessionStorage.removeItem(
            'selectedSeats'
        );

        sessionStorage.removeItem(
            'holdExpiresAt'
        );

        sessionStorage.removeItem(
            'currentShowtimeId'
        );

        setIsTimerActive(false);
        setSelectedSeats([]);
    }, [
        selectedSeats,
        isSocketConnected,
        showtimeId
    ]);

    // =========================================================
    // HANDLE SEAT CLICK - SỬA LẠI
    // =========================================================
    /*
     * LOGIC MỚI:
     *
     * STANDARD  -> 1 seat
     * VIP       -> 1 seat
     * RECLINER  -> 1 seat
     * PREMIUM   -> 1 seat
     * COUPLE    -> 2 seat
     */

    const handleSeatClick = (seat) => {
        if (!seat) return;

        // =====================================================
        // GHẾ KHÔNG THỂ CHỌN
        // =====================================================

        if (
            seat.seat_status === 'Booked' ||
            Number(seat.is_active) === 0 ||
            seat.is_locked_by_user ||
            seat.held_by_other // 🔥 KHÔNG CHO CHỌN GHẾ BỊ NGƯỜI KHÁC GIỮ
        ) {
            return;
        }

        // =====================================================
        // KIỂM TRA SOCKET CÒN KẾT NỐI KHÔNG
        // =====================================================
        if (!isSocketConnected) {
            setModalConfig({
                show: true,
                type: 'error',
                title: 'Phiên làm việc hết hạn',
                message: 'Socket đã ngắt kết nối. Vui lòng tải lại trang để bắt đầu lại.',
                onConfirm: () => window.location.reload()
            });
            return;
        }

        const couple =
            isCoupleSeat(seat);

        // =====================================================
        // LẤY GROUP GHẾ CẦN CHỌN
        // =====================================================

        let seatsToToggle = [seat];

        if (couple) {
            const pairSeat =
                getCouplePair(
                    seat,
                    seats
                );

            if (!pairSeat) {
                setModalConfig({
                    show: true,
                    type: 'error',
                    title: 'Ghế Couple không hợp lệ',
                    message:
                        'Không tìm thấy ghế đôi đi kèm. Vui lòng liên hệ nhân viên rạp.',
                    onConfirm: () =>
                        setModalConfig(
                            (prev) => ({
                                ...prev,
                                show: false
                            })
                        )
                });

                return;
            }

            // =================================================
            // KIỂM TRA GHẾ ĐI KÈM
            // =================================================

            if (
                pairSeat.seat_status ===
                    'Booked' ||
                Number(
                    pairSeat.is_active
                ) === 0 ||
                pairSeat.is_locked_by_user ||
                pairSeat.held_by_other
            ) {
                setModalConfig({
                    show: true,
                    type: 'error',
                    title: 'Ghế đôi không khả dụng',
                    message:
                        'Một ghế trong cặp Couple hiện không thể chọn.',
                    onConfirm: () =>
                        setModalConfig(
                            (prev) => ({
                                ...prev,
                                show: false
                            })
                        )
                });

                return;
            }

            seatsToToggle = [
                seat,
                pairSeat
            ];
        }

        // =====================================================
        // KIỂM TRA ĐÃ CHỌN CHƯA
        // =====================================================

        const allSelected =
            seatsToToggle.every(
                (targetSeat) =>
                    selectedSeats.some(
                        (s) =>
                            Number(
                                s.seat_id
                            ) ===
                            Number(
                                targetSeat.seat_id
                            )
                    )
            );

        // =====================================================
        // HỦY CHỌN - SỬA LẠI
        // =====================================================

        if (allSelected) {
            const updated =
                selectedSeats.filter(
                    (selectedSeat) =>
                        !seatsToToggle.some(
                            (targetSeat) =>
                                Number(
                                    targetSeat.seat_id
                                ) ===
                                Number(
                                    selectedSeat.seat_id
                                )
                        )
                );

            seatsToToggle.forEach(
                (targetSeat) => {
                    if (isSocketConnected) {
                        socketService.emit(
                            'client-huy-chon-ghe',
                            {
                                seatId:
                                    targetSeat.seat_id,
                                showtimeId
                            }
                        );
                    }
                }
            );

            // 🔥 Cập nhật state ngay lập tức
            setSelectedSeats(updated);

            // =================================================
            // KHÔNG CÒN GHẾ
            // =================================================

            if (updated.length === 0) {
                sessionStorage.removeItem(
                    'selectedSeats'
                );
                sessionStorage.removeItem(
                    'holdExpiresAt'
                );
                sessionStorage.removeItem(
                    'currentShowtimeId'
                );
                setIsTimerActive(false);
            } else {
                sessionStorage.setItem(
                    'selectedSeats',
                    JSON.stringify(updated)
                );
            }

            // 🔥 Cập nhật seats để đồng bộ UI
            setSeats((prev) =>
                prev.map((s) => {
                    const isInUpdated = updated.some(
                        (u) => Number(u.seat_id) === Number(s.seat_id)
                    );
                    const wasSelected = selectedSeats.some(
                        (old) => Number(old.seat_id) === Number(s.seat_id)
                    );
                    if (wasSelected && !isInUpdated) {
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

        // =====================================================
        // KIỂM TRA GIỚI HẠN 8 GHẾ VẬT LÝ
        // =====================================================

        const newSeatCount =
            selectedSeats.length +
            seatsToToggle.length;

        if (newSeatCount > 8) {
            setModalConfig({
                show: true,
                type: 'error',
                title: 'Giới hạn ghế',
                message:
                    'Bạn chỉ được chọn tối đa 8 ghế!',
                onConfirm: () =>
                    setModalConfig(
                        (prev) => ({
                            ...prev,
                            show: false
                        })
                    )
            });

            return;
        }

        // =====================================================
        // THÊM GHẾ
        // =====================================================

        const updated = [
            ...selectedSeats
        ];

        seatsToToggle.forEach(
            (targetSeat) => {
                const alreadyExists =
                    updated.some(
                        (s) =>
                            Number(
                                s.seat_id
                            ) ===
                            Number(
                                targetSeat.seat_id
                            )
                    );

                if (!alreadyExists) {
                    updated.push(
                        targetSeat
                    );

                    if (isSocketConnected) {
                        socketService.emit(
                            'client-chon-ghe',
                            {
                                seatId:
                                    targetSeat.seat_id,
                                showtimeId
                            }
                        );
                    }
                }
            }
        );

        // =====================================================
        // BẮT ĐẦU TIMER
        // =====================================================

        if (
            selectedSeats.length === 0
        ) {
            sessionStorage.setItem(
                'holdExpiresAt',
                (
                    Date.now() +
                    10 * 60 * 1000
                ).toString()
            );

            sessionStorage.setItem(
                'currentShowtimeId',
                showtimeId.toString()
            );

            setIsTimerActive(true);
        }

        // =====================================================
        // SAVE SESSION
        // =====================================================

        setSelectedSeats(updated);

        sessionStorage.setItem(
            'selectedSeats',
            JSON.stringify(updated)
        );
    };

    // =========================================================
    // CONTINUE TO FOODS
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
        return seats.reduce(
            (acc, seat) => {
                const row =
                    seat.seat_row;

                if (!acc[row]) {
                    acc[row] = [];
                }

                acc[row].push(seat);

                acc[row].sort(
                    (a, b) =>
                        Number(
                            a.seat_number
                        ) -
                        Number(
                            b.seat_number
                        )
                );

                return acc;
            },
            {}
        );
    }, [seats]);

    // =========================================================
    // MOVIE WITH POSTER
    // =========================================================

    const movieWithPoster =
        useMemo(() => {
            if (!movie) return null;

            return {
                ...movie,
                poster:
                    movie.movie_poster,
                movie_poster:
                    movie.movie_poster
            };
        }, [movie]);

    // =========================================================
    // TÍNH GIÁ VÉ
    // =========================================================

    const totalTicketPrice =
        useMemo(() => {
            return selectedSeats.reduce(
                (sum, seat) =>
                    sum +
                    Number(
                        seat.price || 0
                    ),
                0
            );
        }, [selectedSeats]);

    // =========================================================
    // HIỂN THỊ LỖI
    // =========================================================

    if (fetchError) {
        return (
            <div className="booking-error-container">
                <div className="booking-error-box">
                    <p>
                        {fetchError}
                    </p>

                    <button
                        className="booking-retry-btn"
                        onClick={() =>
                            window.location.reload()
                        }
                    >
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

                    {/* =================================================
                        BOOKING SIDEBAR
                    ================================================= */}

                    <BookingSidebar
                        movie={movieWithPoster}

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

                        /*
                         * QUAN TRỌNG:
                         *
                         * selectedSeats chứa:
                         *
                         * Ghế đơn:
                         * A1
                         *
                         * Couple:
                         * A9 + A10
                         *
                         * => Sidebar sẽ hiện đúng
                         * số ghế vật lý.
                         */
                        selectedSeats={
                            Array.isArray(
                                selectedSeats
                            )
                                ? selectedSeats
                                : []
                        }

                        foods={[]}
                        selectedFoods={[]}

                        totalTicketPrice={
                            totalTicketPrice
                        }

                        totalFoodPrice={0}

                        grandTotal={
                            totalTicketPrice
                        }

                        isTimerActive={
                            isTimerActive
                        }

                        onExpire={() => {
                            clearBookingSession();

                            setModalConfig({
                                show: true,
                                type: 'error',
                                title:
                                    'Hết thời gian giữ ghế',
                                message:
                                    'Ghế bạn chọn đã được mở khóa. Vui lòng chọn lại ghế.',
                                onConfirm:
                                    () =>
                                        setModalConfig(
                                            (
                                                prev
                                            ) => ({
                                                ...prev,
                                                show: false
                                            })
                                        )
                            });
                        }}
                    />

                    {/* =================================================
                        MAIN BOOKING AREA
                    ================================================= */}

                    <section className="main-booking-area">

                        {/* =================================================
                            NAV
                        ================================================= */}

                        <nav className="booking-nav-flex">

                            {/* ================= CINEMA ================= */}

                            <div className="nav-col cinema-select">
                                <label>
                                    1. CHỌN RẠP
                                </label>

                                <select
                                    value={
                                        selectedCinema?.cinema_id ||
                                        ''
                                    }
                                    onChange={(
                                        e
                                    ) => {
                                        const cinema =
                                            cinemas.find(
                                                (
                                                    c
                                                ) =>
                                                    c.cinema_id ==
                                                    e.target
                                                        .value
                                            );

                                        setSelectedCinema(
                                            cinema
                                        );

                                        setSelectedDate(
                                            null
                                        );

                                        setSelectedShowtime(
                                            null
                                        );

                                        setAvailableShowtimes(
                                            []
                                        );
                                    }}
                                >
                                    <option value="">
                                        -- Chọn rạp --
                                    </option>

                                    {cinemas.map(
                                        (
                                            c
                                        ) => (
                                            <option
                                                key={
                                                    c.cinema_id
                                                }
                                                value={
                                                    c.cinema_id
                                                }
                                            >
                                                {
                                                    c.cinema_name
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            {/* ================= DATE ================= */}

                            <div
                                className={`nav-col date-slider ${
                                    !selectedCinema
                                        ? 'disabled-step'
                                        : ''
                                }`}
                            >
                                <label>
                                    2. CHỌN NGÀY
                                </label>

                                <div className="slider-controls">

                                    <button
                                        className="slide-btn"
                                        onClick={() =>
                                            scroll(
                                                dateRef,
                                                -150
                                            )
                                        }
                                        disabled={
                                            !selectedCinema
                                        }
                                    >
                                        ‹
                                    </button>

                                    <div
                                        className="scroll-list"
                                        ref={
                                            dateRef
                                        }
                                    >
                                        {availableDates.map(
                                            (
                                                d
                                            ) => (
                                                <div
                                                    key={
                                                        d
                                                    }
                                                    className={`compact-card ${
                                                        selectedDate ===
                                                        d
                                                            ? 'active'
                                                            : ''
                                                    }`}
                                                    onClick={() => {
                                                        if (
                                                            selectedCinema
                                                        ) {
                                                            setSelectedDate(
                                                                d
                                                            );

                                                            setSelectedShowtime(
                                                                null
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <span className="day-txt">
                                                        {new Date(
                                                            d
                                                        ).toLocaleDateString(
                                                            'vi-VN',
                                                            {
                                                                weekday:
                                                                    'short'
                                                            }
                                                        )}
                                                    </span>

                                                    <span className="date-txt">
                                                        {new Date(
                                                            d
                                                        ).getDate()}
                                                        /
                                                        {new Date(
                                                            d
                                                        ).getMonth() +
                                                            1}
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    <button
                                        className="slide-btn"
                                        onClick={() =>
                                            scroll(
                                                dateRef,
                                                150
                                            )
                                        }
                                        disabled={
                                            !selectedCinema
                                        }
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>

                            {/* ================= SHOWTIME ================= */}

                            <div
                                className={`nav-col time-slider ${
                                    !selectedDate
                                        ? 'disabled-step'
                                        : ''
                                }`}
                            >
                                <label>
                                    3. SUẤT CHIẾU
                                </label>

                                <div className="slider-controls">

                                    <button
                                        className="slide-btn"
                                        onClick={() =>
                                            scroll(
                                                timeRef,
                                                -120
                                            )
                                        }
                                        disabled={
                                            !selectedDate
                                        }
                                    >
                                        ‹
                                    </button>

                                    <div
                                        className="scroll-list"
                                        ref={
                                            timeRef
                                        }
                                    >
                                        {availableShowtimes.length >
                                        0 ? (
                                            availableShowtimes.map(
                                                (
                                                    st
                                                ) => (
                                                    <div
                                                        key={
                                                            st.showtime_id ||
                                                            st.id
                                                        }
                                                        className={`compact-card time-card ${
                                                            selectedShowtime?.showtime_id ===
                                                                st.showtime_id ||
                                                            selectedShowtime?.id ===
                                                                st.id
                                                                ? 'active'
                                                                : ''
                                                        }`}
                                                        onClick={() =>
                                                            setSelectedShowtime(
                                                                st
                                                            )
                                                        }
                                                    >
                                                        <span className="time-txt">
                                                            {
                                                                st.start_time
                                                            }
                                                        </span>
                                                    </div>
                                                )
                                            )
                                        ) : (
                                            selectedDate && (
                                                <span className="no-showtimes">
                                                    Hết suất
                                                </span>
                                            )
                                        )}
                                    </div>

                                    <button
                                        className="slide-btn"
                                        onClick={() =>
                                            scroll(
                                                timeRef,
                                                120
                                            )
                                        }
                                        disabled={
                                            !selectedDate
                                        }
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>
                        </nav>

                        {/* =================================================
                            SEAT SELECTION
                        ================================================= */}

                        <div className="seat-selection-content">

                            {selectedShowtime ? (
                                <div className="seat-map-booking">

                                    {/* ================= SCREEN ================= */}

                                    <div className="screen-header">
                                        <div className="screen-line"></div>

                                        <span>
                                            MÀN HÌNH
                                        </span>
                                    </div>

                                    {/* ================= SEAT MAP ================= */}

                                    <div className="seats-layout">

                                        {(() => {
                                            const sortedRowKeys =
                                                Object.keys(
                                                    groupedSeats
                                                ).sort(
                                                    (
                                                        a,
                                                        b
                                                    ) => {
                                                        const aNum =
                                                            parseInt(
                                                                a
                                                            );

                                                        const bNum =
                                                            parseInt(
                                                                b
                                                            );

                                                        if (
                                                            !isNaN(
                                                                aNum
                                                            ) &&
                                                            !isNaN(
                                                                bNum
                                                            )
                                                        ) {
                                                            return (
                                                                aNum -
                                                                bNum
                                                            );
                                                        }

                                                        return a.localeCompare(
                                                            b
                                                        );
                                                    }
                                                );

                                            return sortedRowKeys.map(
                                                (
                                                    row
                                                ) => {
                                                    const rowSeats =
                                                        groupedSeats[
                                                            row
                                                        ] ||
                                                        [];

                                                    /*
                                                     * KHÔNG CÒN:
                                                     *
                                                     * "hàng cuối = Couple"
                                                     *
                                                     * Chỉ Couple mới được
                                                     * xử lý đặc biệt.
                                                     */

                                                    const displaySeats =
                                                        rowSeats.filter(
                                                            (
                                                                seat
                                                            ) =>
                                                                isCoupleDisplaySeat(
                                                                    seat                                                                )
                                                        );

                                                    return (
                                                        <div
                                                            key={
                                                                row
                                                            }
                                                            className="seat-row"
                                                        >
                                                            <span className="row-id">
                                                                {
                                                                    row
                                                                }
                                                            </span>

                                                            <div className="row-items">

                                                                {displaySeats.map(
                                                                    (
                                                                        seat
                                                                    ) => {
                                                                        const couple =
                                                                            isCoupleSeat(
                                                                                seat
                                                                            );

                                                                        let displayNumber =
                                                                            seat.seat_number;

                                                                        /*
                                                                         * Couple:
                                                                         *
                                                                         * A9 + A10
                                                                         * =>
                                                                         * A9-A10
                                                                         *
                                                                         * Ghế đơn:
                                                                         *
                                                                         * A1
                                                                         * =>
                                                                         * A1
                                                                         */

                                                                        if (
                                                                            couple
                                                                        ) {
                                                                            const pairSeat =
                                                                                getCouplePair(
                                                                                    seat,
                                                                                    seats
                                                                                );

                                                                            if (
                                                                                pairSeat
                                                                            ) {
                                                                                displayNumber = `${seat.seat_number}-${pairSeat.seat_number}`;
                                                                            }
                                                                        }

                                                                        return (
                                                                            <Seat
                                                                                key={
                                                                                    seat.seat_id
                                                                                }

                                                                                type={
                                                                                    seat.seat_type
                                                                                }

                                                                                selected={selectedSeats.some(
                                                                                    (
                                                                                        s
                                                                                    ) =>
                                                                                        Number(
                                                                                            s.seat_id
                                                                                        ) ===
                                                                                        Number(
                                                                                            seat.seat_id
                                                                                        )
                                                                                )}

                                                                                sold={
                                                                                    seat.seat_status ===
                                                                                    'Booked'
                                                                                }

                                                                                maintenance={
                                                                                    Number(
                                                                                        seat.is_active
                                                                                    ) ===
                                                                                    0
                                                                                }

                                                                                locked={
                                                                                    seat.is_locked_by_user
                                                                                }

                                                                                heldByOther={
                                                                                    seat.held_by_other
                                                                                }

                                                                                number={
                                                                                    displayNumber
                                                                                }

                                                                                onClick={() =>
                                                                                    handleSeatClick(
                                                                                        seat
                                                                                    )
                                                                                }
                                                                            />
                                                                        );
                                                                    }
                                                                )}

                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            );
                                        })()}

                                    </div>

                                    {/* =================================================
                                        LEGEND
                                    ================================================= */}

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

                                        <div className="leg-item">
                                            <div className="box held-by-other"></div>
                                            Đang được chọn
                                        </div>

                                    </div>

                                    {/* =================================================
                                        ACTION
                                    ================================================= */}

                                    <div className="booking-actions">

                                        <LoadingButton
                                            type="button"
                                            loading={
                                                isNavigating
                                            }
                                            loadingText="Đang chuyển..."
                                            disabled={
                                                selectedSeats.length ===
                                                    0 ||
                                                isNavigating
                                            }
                                            className="btn-next"
                                            spinnerColor="#ffffff"
                                            onClick={
                                                handleContinue
                                            }
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

                            {/* =================================================
                                MODAL
                            ================================================= */}

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
                                onCancel={
                                    modalConfig.onCancel
                                }
                            />

                        </div>
                    </section>
                </div>
            </div>
        </>
    );
};

export default Booking;