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
import BookingProgress from '../components/BookingProgress';

import '../styles/Booking.css';


const SEAT_LOCK_TTL = 10 * 60;
const MAX_SEATS = 8;
const LOCK_CONFIRM_TIMEOUT = 5000;

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
    const [pendingSeatIds, setPendingSeatIds] = useState([]);

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

    // Những ghế đang chờ Redis xác nhận
    const pendingLocksRef = useRef(new Map());

    // ownerToken hiện tại của phiên booking
    const ownerTokenRef = useRef(null);

    // Tránh xử lý event socket cũ sau khi đổi suất chiếu
    const currentShowtimeIdRef = useRef(null);


    // =========================================================
    // SOCKET
    // =========================================================

    const socket = socketService.getSocket();
    const isSocketConnected = socketService.isConnectedStatus();

    const showtimeId =
        selectedShowtime?.showtime_id ||
        selectedShowtime?.id;

    useEffect(() => {
        currentShowtimeIdRef.current = showtimeId
            ? String(showtimeId)
            : null;
    }, [showtimeId]);


    // =========================================================
    // LẤY OWNER TOKEN
    // =========================================================

    const getOwnerToken = useCallback(() => {
        const currentSocket = socketService.getSocket();

        if (!currentSocket?.id) {
            return null;
        }

        ownerTokenRef.current = currentSocket.id;

        return currentSocket.id;
    }, []);


    // =========================================================
    // XÓA OWNER TOKEN
    // =========================================================

    const clearOwnerToken = useCallback(() => {
        ownerTokenRef.current = null;
        localStorage.removeItem('bookingOwnerToken');
    }, []);


    // =========================================================
    // MODAL
    // =========================================================

    const closeModal = useCallback(() => {
        setModalConfig(prev => ({
            ...prev,
            show: false
        }));
    }, []);


    const showErrorModal = useCallback((title, message) => {
        setModalConfig({
            show: true,
            type: 'error',
            title,
            message,
            onConfirm: closeModal,
            onCancel: closeModal
        });
    }, [closeModal]);


    // =========================================================
    // XÓA SẠCH LOCALSTORAGE BOOKING
    // =========================================================

    const clearBookingLocalStorage = useCallback(() => {

        const keysToRemove = [
            'selectedSeats',
            'holdExpiresAt',
            'currentShowtimeId',
            'bookingOwnerToken',

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
            localStorage.removeItem(key);
        });
    }, []);


    // =========================================================
    // GIẢI PHÓNG GHẾ HIỆN TẠI
    // =========================================================

    const releaseSelectedSeats = useCallback(() => {

        const currentSocket = socketService.getSocket();

        if (!currentSocket?.connected) {
            return;
        }

        const currentShowtimeId =
            currentShowtimeIdRef.current;

        if (!currentShowtimeId) {
            return;
        }

        const currentSeats = selectedSeats;

        if (!Array.isArray(currentSeats) || currentSeats.length === 0) {
            return;
        }

        currentSeats.forEach(seat => {

            if (!seat?.seat_id) return;

            socketService.emit('client-huy-chon-ghe', {
                seatId: seat.seat_id,
                showtimeId: currentShowtimeId
            });
        });
    }, [selectedSeats]);


    // =========================================================
    // XÓA BOOKING SESSION
    // =========================================================

    const clearBookingSession = useCallback(() => {

        console.log(
            '🧹 [BOOKING] Clearing booking session...'
        );

        const currentSocket = socketService.getSocket();

        const currentShowtimeId =
            currentShowtimeIdRef.current;

        // -----------------------------------------------------
        // HỦY CÁC LOCK ĐANG THUỘC SOCKET HIỆN TẠI
        // -----------------------------------------------------

        if (
            currentSocket?.connected &&
            currentShowtimeId
        ) {
            selectedSeats.forEach(seat => {

                if (!seat?.seat_id) return;

                socketService.emit(
                    'client-huy-chon-ghe',
                    {
                        seatId: seat.seat_id,
                        showtimeId: currentShowtimeId
                    }
                );
            });

            // Hủy luôn các ghế đang pending
            pendingLocksRef.current.forEach(
                (_, seatId) => {

                    socketService.emit(
                        'client-huy-chon-ghe',
                        {
                            seatId,
                            showtimeId: currentShowtimeId
                        }
                    );
                }
            );
        }

        // -----------------------------------------------------
        // CLEAR PENDING
        // -----------------------------------------------------

        pendingLocksRef.current.forEach(
            timer => clearTimeout(timer)
        );

        pendingLocksRef.current.clear();

        setPendingSeatIds([]);

        // -----------------------------------------------------
        // CLEAR LOCAL STORAGE
        // -----------------------------------------------------

        clearBookingLocalStorage();

        // -----------------------------------------------------
        // CLEAR STATE
        // -----------------------------------------------------

        setIsTimerActive(false);
        setSelectedSeats([]);

        setSeats(prev =>
            prev.map(seat => ({
                ...seat,
                is_locked_by_user: false,
                held_by_other: false
            }))
        );

        clearOwnerToken();

        isSessionClearedRef.current = true;

        console.log(
            '✅ [BOOKING] Booking session cleared'
        );

    }, [
        selectedSeats,
        clearBookingLocalStorage,
        clearOwnerToken
    ]);


    // =========================================================
    // SESSION GUARD EVENT
    // =========================================================

    useEffect(() => {

        const handleClearBooking = (event) => {

            console.log(
                '📨 [BOOKING] Received clear booking session:',
                event?.detail
            );

            clearBookingSession();

            setModalConfig({
                show: true,
                type: 'error',
                title: 'Phiên đăng nhập đã hết hạn',
                message:
                    'Ghế bạn đã chọn đã được giải phóng. Vui lòng đăng nhập lại và chọn ghế mới.',
                onConfirm: () => {
                    closeModal();
                    navigate('/', {
                        replace: true
                    });
                },
                onCancel: () => {
                    closeModal();
                    navigate('/', {
                        replace: true
                    });
                }
            });

            setTimeout(() => {
                navigate('/', {
                    replace: true
                });
            }, 2000);
        };

        window.addEventListener(
            'clearBookingSession',
            handleClearBooking
        );

        return () => {
            window.removeEventListener(
                'clearBookingSession',
                handleClearBooking
            );
        };

    }, [
        clearBookingSession,
        closeModal,
        navigate
    ]);


    // =========================================================
    // SCROLL
    // =========================================================

    const scrollByAmount = (ref, amount) => {

        if (ref.current) {
            ref.current.scrollBy({
                left: amount,
                behavior: 'smooth'
            });
        }
    };


    const scrollDate = direction => {
        scrollByAmount(
            dateRef,
            direction * 84
        );
    };


    const scrollTime = direction => {
        scrollByAmount(
            timeRef,
            direction * 84
        );
    };


    // =========================================================
    // COUPLE SEAT
    // =========================================================

    const isCoupleSeat = useCallback((seat) => {

        if (!seat) return false;

        return String(
            seat.seat_type || ''
        )
            .trim()
            .toUpperCase() === 'COUPLE';

    }, []);


    const getCouplePair = useCallback(
        (currentSeat, allSeats) => {

            if (
                !currentSeat ||
                !isCoupleSeat(currentSeat)
            ) {
                return null;
            }

            const currentNumber =
                Number(currentSeat.seat_number);

            if (!Number.isFinite(currentNumber)) {
                return null;
            }

            const nextSeat = allSeats.find(
                s =>
                    s.seat_id !== currentSeat.seat_id &&
                    isCoupleSeat(s) &&
                    s.seat_row === currentSeat.seat_row &&
                    Number(s.seat_number) ===
                        currentNumber + 1
            );

            if (nextSeat) {
                return nextSeat;
            }

            const previousSeat = allSeats.find(
                s =>
                    s.seat_id !== currentSeat.seat_id &&
                    isCoupleSeat(s) &&
                    s.seat_row === currentSeat.seat_row &&
                    Number(s.seat_number) ===
                        currentNumber - 1
            );

            return previousSeat || null;

        },
        [isCoupleSeat]
    );


    // =========================================================
    // COUPLE DISPLAY
    // =========================================================

    const isCoupleDisplaySeat = useCallback(
        (seat) => {

            if (!isCoupleSeat(seat)) {
                return true;
            }

            const currentNumber =
                Number(seat.seat_number);

            if (!Number.isFinite(currentNumber)) {
                return true;
            }

            if (currentNumber % 2 === 1) {
                return true;
            }

            const previousSeat = seats.find(
                s =>
                    isCoupleSeat(s) &&
                    s.seat_row === seat.seat_row &&
                    Number(s.seat_number) ===
                        currentNumber - 1
            );

            if (previousSeat) {
                return false;
            }

            return true;

        },
        [isCoupleSeat, seats]
    );


    // =========================================================
    // LOCATION STATE
    // =========================================================

    useEffect(() => {

        const stateData = location.state;

        if (!stateData) {
            return;
        }

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
    // MATCH CINEMA
    // =========================================================

    useEffect(() => {

        const stateData = location.state;

        if (
            cinemas.length > 0 &&
            stateData?.cinema
        ) {

            const matchedCinema =
                cinemas.find(
                    c =>
                        c.cinema_name ===
                        stateData.cinema.cinema_name
                );

            if (matchedCinema) {
                setSelectedCinema(matchedCinema);
            }
        }

    }, [cinemas, location.state]);


    // =========================================================
    // MATCH SHOWTIME
    // =========================================================

    useEffect(() => {

        const stateData = location.state;

        if (
            availableShowtimes.length > 0 &&
            stateData?.showtime
        ) {

            const matchedShowtime =
                availableShowtimes.find(
                    st =>
                        st.showtime_id ===
                        stateData.showtime.showtime_id
                );

            if (matchedShowtime) {
                setSelectedShowtime(matchedShowtime);
            }
        }

    }, [
        availableShowtimes,
        location.state
    ]);


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

            if (
                movie &&
                movie.movie_poster
            ) {
                return;
            }

            try {

                setLoading(true);
                setFetchError(null);

                const res =
                    await api.get(
                        `/api/movies/detail/${slug}`
                    );

                const movieData =
                    res.data?.data;

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

    }, [
        slug,
        movie,
        navigate
    ]);


    // =========================================================
    // FETCH INITIAL DATA
    // =========================================================

    useEffect(() => {

        const fetchInitialData = async () => {

            try {

                setLoading(true);

                const res =
                    await api.get('/api/cinemas');

                const cinemaData =
                    res.data?.data || [];

                setCinemas(cinemaData);

                const dates = [];

                for (let i = 0; i < 7; i++) {

                    const d = new Date();

                    d.setDate(
                        d.getDate() + i
                    );

                    dates.push(
                        d.toISOString()
                            .split('T')[0]
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
    // FETCH SHOWTIMES
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

                const res =
                    await api.get(
                        '/api/showtimes/filter-booking',
                        {
                            params: {
                                cinema_id:
                                    selectedCinema.cinema_id,

                                date:
                                    selectedDate,

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
    // FETCH SEATS
    // =========================================================

    const fetchSeats = useCallback(async () => {

        if (!showtimeId) {
            return;
        }

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

            const seatsData =
                seatsRes.data?.data || [];

            /*
             * QUAN TRỌNG:
             *
             * Không còn khôi phục selectedSeats
             * từ localStorage một cách mù quáng.
             *
             * Redis mới là nguồn xác nhận lock.
             *
             * Nếu F5:
             * socket cũ disconnect
             * → backend release lock
             * → user chọn lại.
             */

            setSelectedSeats([]);
            setPendingSeatIds([]);

            clearBookingLocalStorage();

            setIsTimerActive(false);

            setSeats(
                seatsData.map(seat => ({
                    ...seat,
                    is_locked_by_user: false,
                    held_by_other: false
                }))
            );

            if (
                socketService.isConnectedStatus()
            ) {
                socketService.emit(
                    'request-holding-seats',
                    {
                        showtimeId
                    }
                );
            }

        } catch (err) {

            console.error(
                'Lỗi tải sơ đồ ghế:',
                err
            );

        } finally {

            setLoading(false);

        }

    }, [
        showtimeId,
        clearBookingLocalStorage
    ]);


    useEffect(() => {

        if (showtimeId) {
            fetchSeats();
        }

    }, [
        showtimeId,
        fetchSeats
    ]);


    // =========================================================
    // SOCKET REALTIME
    // =========================================================

    useEffect(() => {

        if (!showtimeId) {
            return;
        }

        const currentSocket =
            socketService.getSocket();

        if (!currentSocket) {
            return;
        }

        // -----------------------------------------------------
        // GHẾ ĐƯỢC KHÓA
        // -----------------------------------------------------

        const handleSeatLocked = (data = {}) => {

            if (
                Number(data.showtimeId) !==
                Number(showtimeId)
            ) {
                return;
            }

            const seatId =
                Number(data.seatId);

            if (!seatId) {
                return;
            }

            const isOwnSeat =
                data.socketId ===
                currentSocket.id;

            // -------------------------------------------------
            // REDIS LOCK THÀNH CÔNG CHO CHÍNH MÌNH
            // -------------------------------------------------

            if (isOwnSeat) {

                const pendingData =
                    pendingLocksRef.current.get(
                        seatId
                    );

                if (pendingData) {

                    clearTimeout(
                        pendingData.timer
                    );

                    pendingLocksRef.current.delete(
                        seatId
                    );

                    setPendingSeatIds(prev =>
                        prev.filter(
                            id => Number(id) !== seatId
                        )
                    );
                }

                setSeats(prev =>
                    prev.map(s =>
                        Number(s.seat_id) === seatId
                            ? {
                                ...s,
                                is_locked_by_user: false,
                                held_by_other: false
                            }
                            : s
                    )
                );

                return;
            }

            // -------------------------------------------------
            // LOCK CỦA USER KHÁC
            // -------------------------------------------------

            setSeats(prev =>
                prev.map(s =>
                    Number(s.seat_id) === seatId
                        ? {
                            ...s,
                            is_locked_by_user: true,
                            held_by_other: true
                        }
                        : s
                )
            );

        };


        // -----------------------------------------------------
        // GHẾ ĐƯỢC MỞ KHÓA
        // -----------------------------------------------------

        const handleSeatUnlocked = (data = {}) => {

            if (
                Number(data.showtimeId) !==
                Number(showtimeId)
            ) {
                return;
            }

            const seatId =
                Number(data.seatId);

            if (!seatId) {
                return;
            }

            setSeats(prev =>
                prev.map(s =>
                    Number(s.seat_id) === seatId
                        ? {
                            ...s,
                            is_locked_by_user: false,
                            held_by_other: false
                        }
                        : s
                )
            );

        };


        // -----------------------------------------------------
        // DANH SÁCH GHẾ ĐANG GIỮ
        // -----------------------------------------------------

        const handleSeatList = (seatList) => {

            if (!Array.isArray(seatList)) {
                return;
            }

            setSeats(prev => {

                const updated = [...prev];

                seatList.forEach(data => {

                    if (
                        Number(data.showtimeId) !==
                        Number(showtimeId)
                    ) {
                        return;
                    }

                    const index =
                        updated.findIndex(
                            s =>
                                Number(s.seat_id) ===
                                Number(data.seatId)
                        );

                    if (index === -1) {
                        return;
                    }

                    /*
                     * Backend hiện tại trả ownerToken
                     * và socketId trong danh sách lock.
                     *
                     * Chỉ coi là ghế của mình khi
                     * socketId trùng socket hiện tại.
                     */

                    const isOwnSeat =
                        data.socketId ===
                        currentSocket.id;

                    updated[index] = {
                        ...updated[index],

                        is_locked_by_user:
                            !isOwnSeat,

                        held_by_other:
                            !isOwnSeat
                    };

                });

                return updated;
            });

        };


        currentSocket.on(
            'server-gui-danh-sach-dang-giu',
            handleSeatList
        );

        currentSocket.on(
            'server-khoa-ghe',
            handleSeatLocked
        );

        currentSocket.on(
            'server-mo-khoa-ghe',
            handleSeatUnlocked
        );


        return () => {

            currentSocket.off(
                'server-gui-danh-sach-dang-giu',
                handleSeatList
            );

            currentSocket.off(
                'server-khoa-ghe',
                handleSeatLocked
            );

            currentSocket.off(
                'server-mo-khoa-ghe',
                handleSeatUnlocked
            );

        };

    }, [showtimeId]);


    // =========================================================
    // TIMEOUT LOCK CHỜ REDIS
    // =========================================================

    const registerPendingLock = useCallback(
        (seatId, requestedShowtimeId) => {

            const numericSeatId =
                Number(seatId);

            const timer =
                setTimeout(() => {

                    const pending =
                        pendingLocksRef.current.get(
                            numericSeatId
                        );

                    if (!pending) {
                        return;
                    }

                    pendingLocksRef.current.delete(
                        numericSeatId
                    );

                    setPendingSeatIds(prev =>
                        prev.filter(
                            id =>
                                Number(id) !==
                                numericSeatId
                        )
                    );

                    /*
                     * Server không xác nhận lock
                     * trong thời gian cho phép.
                     *
                     * Không được xem ghế là đã giữ.
                     */

                    setSelectedSeats(prev =>
                        prev.filter(
                            s =>
                                Number(s.seat_id) !==
                                numericSeatId
                        )
                    );

                    setSeats(prev =>
                        prev.map(s =>
                            Number(s.seat_id) ===
                            numericSeatId
                                ? {
                                    ...s,
                                    is_locked_by_user: false,
                                    held_by_other: true
                                }
                                : s
                        )
                    );

                    showErrorModal(
                        'Không thể giữ ghế',
                        'Hệ thống chưa xác nhận được ghế này. Vui lòng chọn lại.'
                    );

                }, LOCK_CONFIRM_TIMEOUT);

            pendingLocksRef.current.set(
                numericSeatId,
                {
                    timer,
                    showtimeId:
                        requestedShowtimeId
                }
            );

            setPendingSeatIds(prev => {

                if (
                    prev.some(
                        id =>
                            Number(id) ===
                            numericSeatId
                    )
                ) {
                    return prev;
                }

                return [
                    ...prev,
                    numericSeatId
                ];
            });

        },
        [showErrorModal]
    );


    // =========================================================
    // HANDLE SEAT CLICK
    // =========================================================

    const handleSeatClick = (seat) => {

        if (!seat) {
            return;
        }

        const numericSeatId =
            Number(seat.seat_id);

        // -----------------------------------------------------
        // GHẾ KHÔNG KHẢ DỤNG
        // -----------------------------------------------------

        if (
            seat.seat_status === 'Booked' ||
            Number(seat.is_active) === 0 ||
            seat.held_by_other
        ) {
            return;
        }

        // -----------------------------------------------------
        // GHẾ ĐANG CHỜ REDIS
        // -----------------------------------------------------

        if (
            pendingSeatIds.some(
                id =>
                    Number(id) ===
                    numericSeatId
            )
        ) {
            return;
        }

        // -----------------------------------------------------
        // SOCKET
        // -----------------------------------------------------

        const currentSocket =
            socketService.getSocket();

        if (
            !currentSocket ||
            !currentSocket.connected
        ) {

            showErrorModal(
                'Phiên làm việc hết hạn',
                'Socket đã ngắt kết nối. Vui lòng tải lại trang.'
            );

            return;
        }

        // -----------------------------------------------------
        // OWNER TOKEN
        // -----------------------------------------------------

        const ownerToken =
            getOwnerToken();

        if (!ownerToken) {

            showErrorModal(
                'Không thể giữ ghế',
                'Không xác định được phiên giữ ghế. Vui lòng tải lại trang.'
            );

            return;
        }

        // -----------------------------------------------------
        // COUPLE
        // -----------------------------------------------------

        const couple =
            isCoupleSeat(seat);

        let seatsToToggle = [seat];

        if (couple) {

            const pairSeat =
                getCouplePair(
                    seat,
                    seats
                );

            if (!pairSeat) {

                showErrorModal(
                    'Ghế Couple không hợp lệ',
                    'Không tìm thấy ghế đôi đi kèm.'
                );

                return;
            }

            if (
                pairSeat.seat_status === 'Booked' ||
                Number(pairSeat.is_active) === 0 ||
                pairSeat.held_by_other
            ) {

                showErrorModal(
                    'Ghế đôi không khả dụng',
                    'Một ghế trong cặp Couple hiện không thể chọn.'
                );

                return;
            }

            const pairPending =
                pendingSeatIds.some(
                    id =>
                        Number(id) ===
                        Number(pairSeat.seat_id)
                );

            if (pairPending) {
                return;
            }

            seatsToToggle = [
                seat,
                pairSeat
            ];
        }

        // -----------------------------------------------------
        // CHECK CURRENT SELECTED
        // -----------------------------------------------------

        const currentSelected =
            selectedSeats;

        const allSelected =
            seatsToToggle.every(
                targetSeat =>
                    currentSelected.some(
                        s =>
                            Number(s.seat_id) ===
                            Number(targetSeat.seat_id)
                    )
            );


        // =====================================================
        // HỦY CHỌN GHẾ
        // =====================================================

        if (allSelected) {

            seatsToToggle.forEach(
                targetSeat => {

                    socketService.emit(
                        'client-huy-chon-ghe',
                        {
                            seatId:
                                targetSeat.seat_id,

                            showtimeId
                        }
                    );

                }
            );

            const updated =
                currentSelected.filter(
                    selectedSeat =>
                        !seatsToToggle.some(
                            targetSeat =>
                                Number(
                                    targetSeat.seat_id
                                ) ===
                                Number(
                                    selectedSeat.seat_id
                                )
                        )
                );

            setSelectedSeats(updated);

            setSeats(prev =>
                prev.map(s => {

                    const wasRemoved =
                        seatsToToggle.some(
                            targetSeat =>
                                Number(
                                    targetSeat.seat_id
                                ) ===
                                Number(s.seat_id)
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

            if (updated.length === 0) {

                localStorage.removeItem(
                    'selectedSeats'
                );

                localStorage.removeItem(
                    'holdExpiresAt'
                );

                localStorage.removeItem(
                    'currentShowtimeId'
                );

                setIsTimerActive(false);

                clearOwnerToken();

            } else {

                localStorage.setItem(
                    'selectedSeats',
                    JSON.stringify(updated)
                );

            }

            return;
        }


        // =====================================================
        // GIỚI HẠN 8 GHẾ
        // =====================================================

        const newSeatCount =
            currentSelected.length +
            seatsToToggle.length;

        if (newSeatCount > MAX_SEATS) {

            setModalConfig({
                show: true,
                type: 'error',
                title: 'Giới hạn ghế',
                message:
                    'Bạn chỉ được chọn tối đa 8 ghế!',
                onConfirm: closeModal,
                onCancel: closeModal
            });

            return;
        }


        // =====================================================
        // KIỂM TRA TRÙNG PENDING
        // =====================================================

        const hasPending =
            seatsToToggle.some(
                targetSeat =>
                    pendingSeatIds.some(
                        id =>
                            Number(id) ===
                            Number(targetSeat.seat_id)
                    )
            );

        if (hasPending) {
            return;
        }


        // =====================================================
        // ĐĂNG KÝ PENDING TRƯỚC KHI EMIT
        // =====================================================

        seatsToToggle.forEach(
            targetSeat => {

                registerPendingLock(
                    targetSeat.seat_id,
                    showtimeId
                );

            }
        );


        // =====================================================
        // GỬI REQUEST REDIS
        // =====================================================

        seatsToToggle.forEach(
            targetSeat => {

                socketService.emit(
                    'client-chon-ghe',
                    {
                        seatId:
                            targetSeat.seat_id,

                        showtimeId,

                        /*
                         * Backend hiện tại sử dụng socket.id
                         * làm ownerToken.
                         *
                         * Gửi ownerToken để flow booking
                         * được thống nhất.
                         */
                        ownerToken
                    }
                );

            }
        );


        // =====================================================
        // TIMER LOCAL
        // =====================================================

        if (currentSelected.length === 0) {

            localStorage.setItem(
                'holdExpiresAt',
                String(
                    Date.now() +
                    SEAT_LOCK_TTL * 1000
                )
            );

            localStorage.setItem(
                'currentShowtimeId',
                String(showtimeId)
            );

            localStorage.setItem(
                'bookingOwnerToken',
                ownerToken
            );

            setIsTimerActive(true);
        }

    };


    // =========================================================
    // XỬ LÝ KHI SOCKET CONFIRM LOCK
    // =========================================================
    //
    // Event server-khoa-ghe được xử lý ở effect phía trên.
    //
    // Tuy nhiên việc thêm selectedSeats cần làm ở đây
    // bằng một listener riêng để không optimistic update.
    // =========================================================

    useEffect(() => {

        if (!showtimeId) {
            return;
        }

        const currentSocket =
            socketService.getSocket();

        if (!currentSocket) {
            return;
        }

        const handleOwnSeatConfirmed = (
            data = {}
        ) => {

            if (
                Number(data.showtimeId) !==
                Number(showtimeId)
            ) {
                return;
            }

            if (
                data.socketId !==
                currentSocket.id
            ) {
                return;
            }

            const seatId =
                Number(data.seatId);

            if (!seatId) {
                return;
            }

            /*
             * Nếu không còn pending,
             * event này có thể là event cũ.
             */
            const pending =
                pendingLocksRef.current.get(
                    seatId
                );

            if (!pending) {
                return;
            }

            clearTimeout(
                pending.timer
            );

            pendingLocksRef.current.delete(
                seatId
            );

            setPendingSeatIds(prev =>
                prev.filter(
                    id =>
                        Number(id) !==
                        seatId
                )
            );

            // -------------------------------------------------
            // LẤY SEAT OBJECT MỚI NHẤT
            // -------------------------------------------------

            setSeats(prev => {

                const matchedSeat =
                    prev.find(
                        s =>
                            Number(s.seat_id) ===
                            seatId
                    );

                if (!matchedSeat) {
                    return prev;
                }

                setSelectedSeats(
                    currentSelected => {

                        const alreadySelected =
                            currentSelected.some(
                                s =>
                                    Number(
                                        s.seat_id
                                    ) ===
                                    seatId
                            );

                        if (
                            alreadySelected
                        ) {
                            return currentSelected;
                        }

                        const updated = [
                            ...currentSelected,
                            matchedSeat
                        ];

                        localStorage.setItem(
                            'selectedSeats',
                            JSON.stringify(updated)
                        );

                        localStorage.setItem(
                            'currentShowtimeId',
                            String(showtimeId)
                        );

                        localStorage.setItem(
                            'bookingOwnerToken',
                            currentSocket.id
                        );

                        localStorage.setItem(
                            'holdExpiresAt',
                            String(
                                Date.now() +
                                SEAT_LOCK_TTL *
                                1000
                            )
                        );

                        return updated;
                    }
                );

                return prev.map(s =>
                    Number(s.seat_id) ===
                    seatId
                        ? {
                            ...s,
                            is_locked_by_user: false,
                            held_by_other: false
                        }
                        : s
                );

            });

            setIsTimerActive(true);

        };


        /*
         * Chỉ listener này chịu trách nhiệm
         * đưa ghế vào selectedSeats.
         */
        currentSocket.on(
            'server-khoa-ghe',
            handleOwnSeatConfirmed
        );

        return () => {

            currentSocket.off(
                'server-khoa-ghe',
                handleOwnSeatConfirmed
            );

        };

    }, [showtimeId]);


    // =========================================================
    // XỬ LÝ REDIS LOCK FAILED
    // =========================================================

    useEffect(() => {

        if (!showtimeId) {
            return;
        }

        const currentSocket =
            socketService.getSocket();

        if (!currentSocket) {
            return;
        }

        const handleLockFailed = (
            data = {}
        ) => {

            if (
                Number(data.showtimeId) !==
                Number(showtimeId)
            ) {
                return;
            }

            /*
             * Backend lock fail hiện tại:
             *
             * {
             *   success: false,
             *   locked: false,
             *   key,
             *   ownerToken,
             *   ttl
             * }
             *
             * Không có socketId.
             *
             * Vì vậy đây chính là response
             * dành cho socket đang request.
             */

            if (data.socketId) {
                return;
            }

            const seatId =
                Number(data.seatId);

            if (!seatId) {
                return;
            }

            const pending =
                pendingLocksRef.current.get(
                    seatId
                );

            if (!pending) {
                return;
            }

            clearTimeout(
                pending.timer
            );

            pendingLocksRef.current.delete(
                seatId
            );

            setPendingSeatIds(prev =>
                prev.filter(
                    id =>
                        Number(id) !==
                        seatId
                )
            );

            setSeats(prev =>
                prev.map(s =>
                    Number(s.seat_id) ===
                    seatId
                        ? {
                            ...s,
                            is_locked_by_user: false,
                            held_by_other: true
                        }
                        : s
                )
            );

            showErrorModal(
                'Ghế đã có người chọn',
                `Ghế ${seatId} vừa được người khác giữ. Vui lòng chọn ghế khác.`
            );

        };


        currentSocket.on(
            'server-khoa-ghe',
            handleLockFailed
        );

        return () => {

            currentSocket.off(
                'server-khoa-ghe',
                handleLockFailed
            );

        };

    }, [
        showtimeId,
        showErrorModal
    ]);


    // =========================================================
    // KIỂM TRA PENDING COUPLE
    // =========================================================

    useEffect(() => {

        /*
         * Khi tất cả pending đã hoàn thành,
         * selectedSeats mới là nguồn chính.
         */

        if (
            pendingSeatIds.length === 0 &&
            selectedSeats.length > 0
        ) {

            localStorage.setItem(
                'selectedSeats',
                JSON.stringify(
                    selectedSeats
                )
            );

        }

    }, [
        pendingSeatIds.length,
        selectedSeats
    ]);


    // =========================================================
    // HANDLE CONTINUE
    // =========================================================

    const handleContinue = () => {

        // -----------------------------------------------------
        // KHÔNG CHO ĐI TIẾP KHI ĐANG CHỜ REDIS
        // -----------------------------------------------------

        if (pendingSeatIds.length > 0) {

            showErrorModal(
                'Đang xác nhận ghế',
                'Hệ thống đang xác nhận ghế bạn chọn. Vui lòng đợi một chút rồi tiếp tục.'
            );

            return;
        }

        // -----------------------------------------------------
        // KHÔNG CÓ GHẾ
        // -----------------------------------------------------

        if (selectedSeats.length === 0) {

            setModalConfig({
                show: true,
                type: 'warning',
                title: 'THÔNG BÁO',
                message:
                    'Vui lòng chọn ít nhất một ghế trước khi tiếp tục.',
                onConfirm: closeModal,
                onCancel: closeModal
            });

            return;
        }

        // -----------------------------------------------------
        // SOCKET PHẢI CÒN KẾT NỐI
        // -----------------------------------------------------

        const currentSocket =
            socketService.getSocket();

        if (
            !currentSocket ||
            !currentSocket.connected
        ) {

            showErrorModal(
                'Socket đã ngắt kết nối',
                'Phiên giữ ghế không còn hoạt động. Vui lòng tải lại trang và chọn ghế lại.'
            );

            return;
        }

        // -----------------------------------------------------
        // OWNER TOKEN
        // -----------------------------------------------------

        const ownerToken =
            ownerTokenRef.current ||
            currentSocket.id;

        if (!ownerToken) {

            showErrorModal(
                'Không xác định được phiên giữ ghế',
                'Vui lòng tải lại trang và chọn ghế lại.'
            );

            return;
        }

        // -----------------------------------------------------
        // SAVE OWNER TOKEN
        // -----------------------------------------------------

        localStorage.setItem(
            'bookingOwnerToken',
            ownerToken
        );

        localStorage.setItem(
            'selectedSeats',
            JSON.stringify(selectedSeats)
        );

        localStorage.setItem(
            'currentShowtimeId',
            String(showtimeId)
        );

        setIsNavigating(true);

        // -----------------------------------------------------
        // NAVIGATE FOOD
        // -----------------------------------------------------

        navigate('/foods', {
            state: {
                movie,
                selectedCinema,
                selectedDate,
                selectedShowtime,
                selectedSeats,
                showtimeDetail,

                // 🔥 OWNER TOKEN XUYÊN SUỐT BOOKING
                ownerToken
            }
        });

        setTimeout(() => {
            setIsNavigating(false);
        }, 3000);

    };


    // =========================================================
    // CLEANUP PENDING LOCK
    // =========================================================

    useEffect(() => {

        return () => {

            pendingLocksRef.current.forEach(
                pending => {
                    if (pending?.timer) {
                        clearTimeout(
                            pending.timer
                        );
                    }
                }
            );

            pendingLocksRef.current.clear();

        };

    }, []);


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
    // MOVIE POSTER
    // =========================================================

    const movieWithPoster =
        useMemo(() => {

            if (!movie) {
                return null;
            }

            return {
                ...movie,
                poster:
                    movie.movie_poster,

                movie_poster:
                    movie.movie_poster
            };

        }, [movie]);


    // =========================================================
    // TOTAL PRICE
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
    // ERROR
    // =========================================================

    if (fetchError) {

        return (
            <div className="booking-error-container">
                <div className="booking-error-box">

                    <p>{fetchError}</p>

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

                {/* =================================================
                    BOOKING PROGRESS
                ================================================= */}

                <div className="booking-progress-wrapper">
                    <BookingProgress currentStep={2} />
                </div>


                <div className="booking-container">

                    {/* =================================================
                        LEFT COLUMN
                    ================================================= */}

                    <main className="booking-main-column">

                        {/* =================================================
                            STEP 01
                        ================================================= */}

                        <section className="booking-section booking-showtime-section">

                            <div className="section-heading">

                                <div className="section-number">
                                    01
                                </div>

                                <div className="section-heading-content">

                                    <span className="section-kicker">
                                        BOOKING STEP
                                    </span>

                                    <h2>
                                        THÔNG TIN SUẤT CHIẾU
                                    </h2>

                                </div>

                            </div>

                            <div className="section-divider" />


                            <nav className="booking-nav-flex">

                                {/* =================================================
                                    CINEMA
                                ================================================= */}

                                <div className="nav-col cinema-select">

                                    <label>
                                        <span>1.</span>{' '}
                                        CHỌN RẠP
                                    </label>

                                    <div className="select-wrapper">

                                        <select
                                            value={
                                                selectedCinema?.cinema_id ||
                                                ''
                                            }
                                            onChange={e => {

                                                /*
                                                 * Nếu user đổi rạp
                                                 * thì giải phóng booking hiện tại.
                                                 */

                                                if (
                                                    selectedSeats.length >
                                                    0
                                                ) {
                                                    clearBookingSession();
                                                }

                                                const cinema =
                                                    cinemas.find(
                                                        c =>
                                                            c.cinema_id ==
                                                            e.target.value
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

                                            {cinemas.map(c => (
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
                                            ))}

                                        </select>

                                    </div>

                                </div>


                                {/* =================================================
                                    DATE
                                ================================================= */}

                                <div
                                    className={`nav-col date-slider ${
                                        !selectedCinema
                                            ? 'disabled-step'
                                            : ''
                                    }`}
                                >

                                    <label>
                                        <span>2.</span>{' '}
                                        CHỌN NGÀY
                                    </label>

                                    <div className="slider-controls">

                                        <button
                                            type="button"
                                            className="slide-btn"
                                            onClick={() =>
                                                scrollDate(-1)
                                            }
                                            disabled={
                                                !selectedCinema
                                            }
                                            aria-label="Ngày trước"
                                        >
                                            ‹
                                        </button>

                                        <div
                                            className="scroll-list"
                                            ref={dateRef}
                                        >

                                            {availableDates.map(
                                                d => (

                                                    <div
                                                        key={d}
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

                                                                if (
                                                                    selectedSeats.length >
                                                                    0
                                                                ) {
                                                                    clearBookingSession();
                                                                }

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
                                            type="button"
                                            className="slide-btn"
                                            onClick={() =>
                                                scrollDate(1)
                                            }
                                            disabled={
                                                !selectedCinema
                                            }
                                            aria-label="Ngày sau"
                                        >
                                            ›
                                        </button>

                                    </div>

                                </div>


                                {/* =================================================
                                    SHOWTIME
                                ================================================= */}

                                <div
                                    className={`nav-col time-slider ${
                                        !selectedDate
                                            ? 'disabled-step'
                                            : ''
                                    }`}
                                >

                                    <label>
                                        <span>3.</span>{' '}
                                        SUẤT CHIẾU
                                    </label>

                                    <div className="slider-controls">

                                        <button
                                            type="button"
                                            className="slide-btn"
                                            onClick={() =>
                                                scrollTime(-1)
                                            }
                                            disabled={
                                                !selectedDate
                                            }
                                            aria-label="Suất trước"
                                        >
                                            ‹
                                        </button>

                                        <div
                                            className="scroll-list"
                                            ref={timeRef}
                                        >

                                            {availableShowtimes.length >
                                            0 ? (

                                                availableShowtimes.map(
                                                    st => (

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
                                                            onClick={() => {

                                                                if (
                                                                    selectedSeats.length >
                                                                    0
                                                                ) {
                                                                    clearBookingSession();
                                                                }

                                                                setSelectedShowtime(
                                                                    st
                                                                );

                                                            }}
                                                        >

                                                            <span className="time-day">
                                                                SUẤT
                                                            </span>

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
                                            type="button"
                                            className="slide-btn"
                                            onClick={() =>
                                                scrollTime(1)
                                            }
                                            disabled={
                                                !selectedDate
                                            }
                                            aria-label="Suất sau"
                                        >
                                            ›
                                        </button>

                                    </div>

                                </div>

                            </nav>

                        </section>


                        {/* =================================================
                            STEP 02 - CHỌN GHẾ
                        ================================================= */}

                        <section className="booking-section booking-seat-section">

                            <div className="section-heading">

                                <div className="section-number">
                                    02
                                </div>

                                <div className="section-heading-content">

                                    <span className="section-kicker">
                                        BOOKING STEP
                                    </span>

                                    <h2>
                                        CHỌN GHẾ
                                    </h2>

                                </div>

                                <div className="selected-seat-counter">

                                    <span>
                                        ĐANG CHỌN
                                    </span>

                                    <strong>
                                        {selectedSeats.length}
                                    </strong>

                                    <small>
                                        / 8 GHẾ
                                    </small>

                                </div>

                            </div>

                            <div className="section-divider" />


                            <div className="seat-selection-content">

                                {selectedShowtime ? (

                                    <div className="seat-map-booking">

                                        <div className="screen-header">

                                            <div className="screen-glow" />

                                            <div className="screen-line" />

                                            <span>
                                                MÀN HÌNH
                                            </span>

                                        </div>


                                        <div className="seats-layout">

                                            {(() => {

                                                const sortedRowKeys =
                                                    Object.keys(
                                                        groupedSeats
                                                    ).sort(
                                                        (a, b) => {

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
                                                    row => {

                                                        const rowSeats =
                                                            groupedSeats[
                                                                row
                                                            ] ||
                                                            [];

                                                        const displaySeats =
                                                            rowSeats.filter(
                                                                seat =>
                                                                    isCoupleDisplaySeat(
                                                                        seat
                                                                    )
                                                            );

                                                        return (
                                                            <div
                                                                key={row}
                                                                className="seat-row"
                                                            >

                                                                <span className="row-id">
                                                                    {row}
                                                                </span>

                                                                <div className="row-items">

                                                                    {displaySeats.map(
                                                                        seat => {

                                                                            const couple =
                                                                                isCoupleSeat(
                                                                                    seat
                                                                                );

                                                                            const isSelectedByMe =
                                                                                selectedSeats.some(
                                                                                    s =>
                                                                                        Number(
                                                                                            s.seat_id
                                                                                        ) ===
                                                                                        Number(
                                                                                            seat.seat_id
                                                                                        )
                                                                                );

                                                                            const isPending =
                                                                                pendingSeatIds.some(
                                                                                    id =>
                                                                                        Number(
                                                                                            id
                                                                                        ) ===
                                                                                        Number(
                                                                                            seat.seat_id
                                                                                        )
                                                                                );

                                                                            let displayNumber =
                                                                                seat.seat_number;

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

                                                                                    displayNumber =
                                                                                        `${seat.seat_number}-${pairSeat.seat_number}`;

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
                                                                                    selected={
                                                                                        isSelectedByMe
                                                                                    }
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
                                                                                        isPending ||
                                                                                        (
                                                                                            seat.is_locked_by_user &&
                                                                                            !isSelectedByMe
                                                                                        )
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
                                                <div className="box maintenance" />
                                                Bảo trì
                                            </div>

                                            <div className="leg-item">
                                                <div className="box normal" />
                                                Thường
                                            </div>

                                            <div className="leg-item">
                                                <div className="box vip" />
                                                VIP
                                            </div>

                                            <div className="leg-item">
                                                <div className="box couple" />
                                                Đôi
                                            </div>

                                            <div className="leg-item">
                                                <div className="box selected" />
                                                Đang chọn
                                            </div>

                                            <div className="leg-item">
                                                <div className="box sold" />
                                                Đã bán
                                            </div>

                                            <div className="leg-item">
                                                <div className="box held-by-other" />
                                                Đang được chọn
                                            </div>

                                        </div>

                                    </div>

                                ) : (

                                    <div className="placeholder-msg">

                                        <i className="fas fa-info-circle" />

                                        <p>
                                            Vui lòng chọn đầy đủ{' '}
                                            <strong>
                                                rạp
                                            </strong>
                                            ,{' '}
                                            <strong>
                                                ngày
                                            </strong>{' '}
                                            và{' '}
                                            <strong>
                                                suất chiếu
                                            </strong>{' '}
                                            để hiển thị sơ đồ ghế.
                                        </p>

                                    </div>

                                )}

                            </div>

                        </section>

                    </main>


                    {/* =================================================
                        RIGHT SIDEBAR
                    ================================================= */}

                    <aside className="booking-sidebar-column">

                        <div className="sidebar-sticky">

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
                                showContinueButton={
                                    true
                                }
                                showBackButton={
                                    true
                                }
                                continueText="TIẾP TỤC"
                                onContinue={
                                    handleContinue
                                }
                                onBack={() =>
                                    navigate(-1)
                                }
                                isContinueDisabled={
                                    selectedSeats.length ===
                                        0 ||
                                    pendingSeatIds.length >
                                        0
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
                                        onConfirm: () => {

                                            closeModal();

                                            navigate(
                                                '/'
                                            );

                                        },
                                        onCancel:
                                            closeModal
                                    });

                                }}
                            />

                        </div>

                    </aside>

                </div>

            </div>


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

        </>
    );
};


export default Booking;