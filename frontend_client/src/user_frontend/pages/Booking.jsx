// ===================== Booking.js =====================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/api';
import socketService from '../../api/socket';
import Modal from '../components/Modal';
import Seat from '../components/Seat';
import BookingSidebar from '../components/BookingSidebar';
import BookingProgress from '../components/BookingProgress';
import '../styles/Booking.css';

// ============================================================
// CONSTANTS
// ============================================================

const SEAT_LOCK_TTL = 10 * 60;
const MAX_SEATS = 8;
const LOCK_CONFIRM_TIMEOUT = 5000;

// ============================================================
// BOOKING
// ============================================================

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

    const [movie, setMovie] = useState(location.state?.movie || null);
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

    // =========================================================
    // MODAL
    // =========================================================

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
    const pendingLocksRef = useRef(new Map());
    const ownerTokenRef = useRef(null);
    const currentShowtimeIdRef = useRef(null);
    const selectedSeatsRef = useRef([]);
    const seatsRef = useRef([]);
    const isSessionClearedRef = useRef(false);

    // =========================================================
    // SYNC STATE → REF
    // =========================================================

    useEffect(() => { selectedSeatsRef.current = selectedSeats; }, [selectedSeats]);
    useEffect(() => { seatsRef.current = seats; }, [seats]);

    // =========================================================
    // SHOWTIME ID
    // =========================================================

    const showtimeId = selectedShowtime?.showtime_id || selectedShowtime?.id;
    useEffect(() => { currentShowtimeIdRef.current = showtimeId ? String(showtimeId) : null; }, [showtimeId]);

    // =========================================================
    // OWNER TOKEN
    // =========================================================

    const getOwnerToken = useCallback(() => {
        const currentSocket = socketService.getSocket();
        if (!currentSocket?.id) return null;
        ownerTokenRef.current = currentSocket.id;
        return currentSocket.id;
    }, []);

    const clearOwnerToken = useCallback(() => {
        ownerTokenRef.current = null;
        localStorage.removeItem('bookingOwnerToken');
    }, []);

    // =========================================================
    // MODAL
    // =========================================================

    const closeModal = useCallback(() => {
        setModalConfig(prev => ({ ...prev, show: false }));
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
    // CLEAR LOCAL STORAGE
    // =========================================================

    const clearBookingLocalStorage = useCallback(() => {
        const keysToRemove = [
            'selectedSeats', 'holdExpiresAt', 'currentShowtimeId', 'bookingOwnerToken',
            'booking_seats', 'booking_showtime', 'booking_data', 'selected_foods',
            'food_selection', 'booking_cinema', 'booking_date', 'booking_movie', 'booking_showtime'
        ];
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }, []);

    // =========================================================
    // RELEASE ONE SEAT
    // =========================================================

    const releaseSeat = useCallback((seatId, requestedShowtimeId) => {
        const currentSocket = socketService.getSocket();
        if (!currentSocket || !currentSocket.connected) return;
        if (!seatId || !requestedShowtimeId) return;
        socketService.emit('client-huy-chon-ghe', { seatId, showtimeId: requestedShowtimeId });
    }, []);

    // =========================================================
    // RELEASE SELECTED SEATS
    // =========================================================

    const releaseSelectedSeats = useCallback(() => {
        const currentSocket = socketService.getSocket();
        if (!currentSocket || !currentSocket.connected) return;
        const currentShowtimeId = currentShowtimeIdRef.current;
        if (!currentShowtimeId) return;
        const currentSeats = selectedSeatsRef.current;
        if (!Array.isArray(currentSeats) || currentSeats.length === 0) return;
        currentSeats.forEach(seat => {
            if (!seat?.seat_id) return;
            releaseSeat(seat.seat_id, currentShowtimeId);
        });
    }, [releaseSeat]);

    // =========================================================
    // CLEAR BOOKING SESSION
    // =========================================================

    const clearBookingSession = useCallback(() => {
        if (isSessionClearedRef.current) return;
        console.log('🧹 [BOOKING] Clearing booking session...');
        const currentSocket = socketService.getSocket();
        const currentShowtimeId = currentShowtimeIdRef.current;
        if (currentSocket?.connected && currentShowtimeId) {
            selectedSeatsRef.current.forEach(seat => {
                if (!seat?.seat_id) return;
                releaseSeat(seat.seat_id, currentShowtimeId);
            });
            pendingLocksRef.current.forEach((_, seatId) => {
                releaseSeat(seatId, currentShowtimeId);
            });
        }
        pendingLocksRef.current.forEach(pending => {
            if (pending?.timer) clearTimeout(pending.timer);
        });
        pendingLocksRef.current.clear();
        setPendingSeatIds([]);
        clearBookingLocalStorage();
        setSelectedSeats([]);
        setIsTimerActive(false);
        setSeats(prev => prev.map(seat => ({ ...seat, is_locked_by_user: false, held_by_other: false })));
        clearOwnerToken();
        isSessionClearedRef.current = true;
        console.log('✅ [BOOKING] Booking session cleared');
    }, [clearBookingLocalStorage, clearOwnerToken, releaseSeat]);

    // =========================================================
    // SESSION GUARD
    // =========================================================

    useEffect(() => {
        const handleClearBooking = event => {
            console.log('📨 [BOOKING] Received clear booking session:', event?.detail);
            isSessionClearedRef.current = false;
            clearBookingSession();
            setModalConfig({
                show: true,
                type: 'error',
                title: 'Phiên đăng nhập đã hết hạn',
                message: 'Ghế bạn đã chọn đã được giải phóng. Vui lòng đăng nhập lại và chọn ghế mới.',
                onConfirm: () => { closeModal(); navigate('/', { replace: true }); },
                onCancel: () => { closeModal(); navigate('/', { replace: true }); }
            });
            setTimeout(() => { navigate('/', { replace: true }); }, 2000);
        };
        window.addEventListener('clearBookingSession', handleClearBooking);
        return () => { window.removeEventListener('clearBookingSession', handleClearBooking); };
    }, [clearBookingSession, closeModal, navigate]);

    // =========================================================
    // SCROLL
    // =========================================================

    const scrollByAmount = (ref, amount) => {
        if (!ref.current) return;
        ref.current.scrollBy({ left: amount, behavior: 'smooth' });
    };

    const scrollDate = direction => { scrollByAmount(dateRef, direction * 84); };
    const scrollTime = direction => { scrollByAmount(timeRef, direction * 84); };

    // =========================================================
    // COUPLE SEAT
    // =========================================================

    const isCoupleSeat = useCallback(seat => {
        if (!seat) return false;
        return String(seat.seat_type || '').trim().toUpperCase() === 'COUPLE';
    }, []);

    const getCouplePair = useCallback((currentSeat, allSeats) => {
        if (!currentSeat || !isCoupleSeat(currentSeat)) return null;
        const currentNumber = Number(currentSeat.seat_number);
        if (!Number.isFinite(currentNumber)) return null;
        const nextSeat = allSeats.find(s =>
            s.seat_id !== currentSeat.seat_id &&
            isCoupleSeat(s) &&
            s.seat_row === currentSeat.seat_row &&
            Number(s.seat_number) === currentNumber + 1
        );
        if (nextSeat) return nextSeat;
        const previousSeat = allSeats.find(s =>
            s.seat_id !== currentSeat.seat_id &&
            isCoupleSeat(s) &&
            s.seat_row === currentSeat.seat_row &&
            Number(s.seat_number) === currentNumber - 1
        );
        return previousSeat || null;
    }, [isCoupleSeat]);

    // =========================================================
    // COUPLE DISPLAY
    // =========================================================

    const isCoupleDisplaySeat = useCallback((seat) => {
        if (!isCoupleSeat(seat)) return true;
        const currentNumber = Number(seat.seat_number);
        if (!Number.isFinite(currentNumber)) return true;
        if (currentNumber % 2 === 1) return true;
        const previousSeat = seats.find(s =>
            isCoupleSeat(s) &&
            s.seat_row === seat.seat_row &&
            Number(s.seat_number) === currentNumber - 1
        );
        return !previousSeat;
    }, [isCoupleSeat, seats]);

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
            const matchedCinema = cinemas.find(c => c.cinema_name === stateData.cinema.cinema_name);
            if (matchedCinema) setSelectedCinema(matchedCinema);
        }
    }, [cinemas, location.state]);

    // =========================================================
    // MATCH SHOWTIME
    // =========================================================

    useEffect(() => {
        const stateData = location.state;
        if (availableShowtimes.length > 0 && stateData?.showtime) {
            const matchedShowtime = availableShowtimes.find(st => st.showtime_id === stateData.showtime.showtime_id);
            if (matchedShowtime) setSelectedShowtime(matchedShowtime);
        }
    }, [availableShowtimes, location.state]);

    // =========================================================
    // FETCH MOVIE
    // =========================================================

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchMovieBySlug = async () => {
            if (!slug) { navigate('/'); return; }
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
                    params: { cinema_id: selectedCinema.cinema_id, date: selectedDate, movie_id: movie.movie_id || movie.id }
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
            const seatsData = seatsRes.data?.data || [];
            setSelectedSeats([]);
            selectedSeatsRef.current = [];
            setPendingSeatIds([]);
            pendingLocksRef.current.forEach(pending => { if (pending?.timer) clearTimeout(pending.timer); });
            pendingLocksRef.current.clear();
            clearBookingLocalStorage();
            clearOwnerToken();
            setIsTimerActive(false);
            const normalizedSeats = seatsData.map(seat => ({ ...seat, is_locked_by_user: false, held_by_other: false }));
            setSeats(normalizedSeats);
            seatsRef.current = normalizedSeats;
            if (socketService.isConnectedStatus()) {
                socketService.emit('request-holding-seats', { showtimeId });
            }
        } catch (err) {
            console.error('Lỗi tải sơ đồ ghế:', err);
        } finally {
            setLoading(false);
        }
    }, [showtimeId, clearBookingLocalStorage, clearOwnerToken]);

    useEffect(() => {
        if (showtimeId) {
            isSessionClearedRef.current = false;
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

        const handleSeatLocked = (data = {}) => {
            const eventShowtimeId = Number(data.showtimeId);
            if (eventShowtimeId !== Number(showtimeId)) return;
            const seatId = Number(data.seatId);
            if (!seatId) return;
            const eventSocketId = data.socketId ? String(data.socketId) : null;
            const eventOwnerToken = data.ownerToken ? String(data.ownerToken) : null;
            const mySocketId = currentSocket?.id ? String(currentSocket.id) : null;
            const isOwnLock = (eventSocketId && mySocketId && eventSocketId === mySocketId) ||
                (eventOwnerToken && mySocketId && eventOwnerToken === mySocketId);

            if (data.locked === false || data.success === false) {
                const pending = pendingLocksRef.current.get(seatId);
                if (!pending) return;
                clearTimeout(pending.timer);
                pendingLocksRef.current.delete(seatId);
                setPendingSeatIds(prev => prev.filter(id => Number(id) !== seatId));
                setSelectedSeats(prev => prev.filter(seat => Number(seat.seat_id) !== seatId));
                setSeats(prev => prev.map(seat =>
                    Number(seat.seat_id) === seatId
                        ? { ...seat, is_locked_by_user: true, held_by_other: true }
                        : seat
                ));
                showErrorModal('Ghế đã có người chọn', `Ghế ${seatId} vừa được người khác giữ. Vui lòng chọn ghế khác.`);
                return;
            }

            if (isOwnLock) {
                const pending = pendingLocksRef.current.get(seatId);
                if (!pending) return;
                clearTimeout(pending.timer);
                pendingLocksRef.current.delete(seatId);
                setPendingSeatIds(prev => prev.filter(id => Number(id) !== seatId));
                const matchedSeat = seatsRef.current.find(seat => Number(seat.seat_id) === seatId);
                if (!matchedSeat) return;
                setSelectedSeats(prev => {
                    const exists = prev.some(seat => Number(seat.seat_id) === seatId);
                    if (exists) return prev;
                    const updated = [...prev, matchedSeat];
                    localStorage.setItem('selectedSeats', JSON.stringify(updated));
                    localStorage.setItem('currentShowtimeId', String(showtimeId));
                    localStorage.setItem('bookingOwnerToken', String(currentSocket.id));
                    if (!localStorage.getItem('holdExpiresAt')) {
                        localStorage.setItem('holdExpiresAt', String(Date.now() + SEAT_LOCK_TTL * 1000));
                    }
                    return updated;
                });
                ownerTokenRef.current = currentSocket.id;
                setSeats(prev => prev.map(seat =>
                    Number(seat.seat_id) === seatId
                        ? { ...seat, is_locked_by_user: false, held_by_other: false }
                        : seat
                ));
                setIsTimerActive(true);
                return;
            }

            setSeats(prev => prev.map(seat =>
                Number(seat.seat_id) === seatId
                    ? { ...seat, is_locked_by_user: true, held_by_other: true }
                    : seat
            ));
        };

        const handleSeatUnlocked = (data = {}) => {
            if (Number(data.showtimeId) !== Number(showtimeId)) return;
            const seatId = Number(data.seatId);
            if (!seatId) return;
            const pending = pendingLocksRef.current.get(seatId);
            if (pending) {
                clearTimeout(pending.timer);
                pendingLocksRef.current.delete(seatId);
                setPendingSeatIds(prev => prev.filter(id => Number(id) !== seatId));
            }
            setSeats(prev => prev.map(seat =>
                Number(seat.seat_id) === seatId
                    ? { ...seat, is_locked_by_user: false, held_by_other: false }
                    : seat
            ));
        };

        const handleSeatList = (seatList = []) => {
            if (!Array.isArray(seatList)) return;
            const mySocketId = currentSocket?.id ? String(currentSocket.id) : null;
            setSeats(prev => {
                const updated = [...prev];
                seatList.forEach(lock => {
                    if (Number(lock.showtimeId) !== Number(showtimeId)) return;
                    const seatId = Number(lock.seatId);
                    if (!seatId) return;
                    const index = updated.findIndex(seat => Number(seat.seat_id) === seatId);
                    if (index === -1) return;
                    const lockSocketId = lock.socketId ? String(lock.socketId) : null;
                    const lockOwnerToken = lock.ownerToken ? String(lock.ownerToken) : null;
                    const isOwnLock = (lockSocketId && mySocketId && lockSocketId === mySocketId) ||
                        (lockOwnerToken && mySocketId && lockOwnerToken === mySocketId);
                    updated[index] = { ...updated[index], is_locked_by_user: !isOwnLock, held_by_other: !isOwnLock };
                });
                return updated;
            });
        };

        currentSocket.on('server-khoa-ghe', handleSeatLocked);
        currentSocket.on('server-mo-khoa-ghe', handleSeatUnlocked);
        currentSocket.on('server-gui-danh-sach-dang-giu', handleSeatList);

        return () => {
            currentSocket.off('server-khoa-ghe', handleSeatLocked);
            currentSocket.off('server-mo-khoa-ghe', handleSeatUnlocked);
            currentSocket.off('server-gui-danh-sach-dang-giu', handleSeatList);
        };
    }, [showtimeId, showErrorModal]);

    // =========================================================
    // REGISTER PENDING LOCK
    // =========================================================

    const registerPendingLock = useCallback((seatId, requestedShowtimeId) => {
        const numericSeatId = Number(seatId);
        if (!numericSeatId) return;
        const existing = pendingLocksRef.current.get(numericSeatId);
        if (existing) return;
        const timer = setTimeout(() => {
            const pending = pendingLocksRef.current.get(numericSeatId);
            if (!pending) return;
            pendingLocksRef.current.delete(numericSeatId);
            setPendingSeatIds(prev => prev.filter(id => Number(id) !== numericSeatId));
            setSelectedSeats(prev => prev.filter(seat => Number(seat.seat_id) !== numericSeatId));
            setSeats(prev => prev.map(seat =>
                Number(seat.seat_id) === numericSeatId
                    ? { ...seat, is_locked_by_user: true, held_by_other: true }
                    : seat
            ));
            showErrorModal('Không thể giữ ghế', 'Hệ thống chưa xác nhận được ghế này. Vui lòng chọn lại.');
        }, LOCK_CONFIRM_TIMEOUT);
        pendingLocksRef.current.set(numericSeatId, { timer, showtimeId: requestedShowtimeId });
        setPendingSeatIds(prev => {
            if (prev.some(id => Number(id) === numericSeatId)) return prev;
            return [...prev, numericSeatId];
        });
    }, [showErrorModal]);

    // =========================================================
    // HANDLE SEAT CLICK
    // =========================================================

    const handleSeatClick = useCallback((seat) => {
        if (!seat) return;
        const numericSeatId = Number(seat.seat_id);
        if (!numericSeatId) return;
        if (seat.seat_status === 'Booked' || Number(seat.is_active) === 0 || seat.held_by_other || seat.is_locked_by_user) return;
        if (pendingSeatIds.some(id => Number(id) === numericSeatId)) return;
        const currentSocket = socketService.getSocket();
        if (!currentSocket || !currentSocket.connected) {
            showErrorModal('Phiên làm việc hết hạn', 'Socket đã ngắt kết nối. Vui lòng tải lại trang.');
            return;
        }
        const ownerToken = getOwnerToken();
        if (!ownerToken) {
            showErrorModal('Không thể giữ ghế', 'Không xác định được phiên giữ ghế. Vui lòng tải lại trang.');
            return;
        }
        const couple = isCoupleSeat(seat);
        let seatsToToggle = [seat];
        if (couple) {
            const pairSeat = getCouplePair(seat, seatsRef.current);
            if (!pairSeat) {
                showErrorModal('Ghế Couple không hợp lệ', 'Không tìm thấy ghế đôi đi kèm.');
                return;
            }
            if (pairSeat.seat_status === 'Booked' || Number(pairSeat.is_active) === 0 || pairSeat.held_by_other || pairSeat.is_locked_by_user) {
                showErrorModal('Ghế đôi không khả dụng', 'Một ghế trong cặp Couple hiện không thể chọn.');
                return;
            }
            const pairPending = pendingSeatIds.some(id => Number(id) === Number(pairSeat.seat_id));
            if (pairPending) return;
            seatsToToggle = [seat, pairSeat];
        }
        const currentSelected = selectedSeatsRef.current;
        const allSelected = seatsToToggle.every(targetSeat =>
            currentSelected.some(selectedSeat => Number(selectedSeat.seat_id) === Number(targetSeat.seat_id))
        );
        if (allSelected) {
            seatsToToggle.forEach(targetSeat => { releaseSeat(targetSeat.seat_id, showtimeId); });
            const updated = currentSelected.filter(selectedSeat =>
                !seatsToToggle.some(targetSeat => Number(targetSeat.seat_id) === Number(selectedSeat.seat_id))
            );
            setSelectedSeats(updated);
            selectedSeatsRef.current = updated;
            setSeats(prev => prev.map(currentSeat => {
                const wasRemoved = seatsToToggle.some(targetSeat => Number(targetSeat.seat_id) === Number(currentSeat.seat_id));
                if (wasRemoved) return { ...currentSeat, is_locked_by_user: false, held_by_other: false };
                return currentSeat;
            }));
            if (updated.length === 0) {
                localStorage.removeItem('selectedSeats');
                localStorage.removeItem('holdExpiresAt');
                localStorage.removeItem('currentShowtimeId');
                setIsTimerActive(false);
                clearOwnerToken();
            } else {
                localStorage.setItem('selectedSeats', JSON.stringify(updated));
            }
            return;
        }
        const newSeatCount = currentSelected.length + seatsToToggle.length;
        if (newSeatCount > MAX_SEATS) {
            setModalConfig({
                show: true,
                type: 'error',
                title: 'Giới hạn ghế',
                message: 'Bạn chỉ được chọn tối đa 8 ghế!',
                onConfirm: closeModal,
                onCancel: closeModal
            });
            return;
        }
        const hasPending = seatsToToggle.some(targetSeat =>
            pendingSeatIds.some(id => Number(id) === Number(targetSeat.seat_id))
        );
        if (hasPending) return;
        const hasOtherLock = seatsToToggle.some(targetSeat => targetSeat.held_by_other || targetSeat.is_locked_by_user);
        if (hasOtherLock) return;
        seatsToToggle.forEach(targetSeat => { registerPendingLock(targetSeat.seat_id, showtimeId); });
        seatsToToggle.forEach(targetSeat => {
            socketService.emit('client-chon-ghe', { seatId: targetSeat.seat_id, showtimeId, ownerToken });
        });
    }, [pendingSeatIds, showtimeId, getOwnerToken, isCoupleSeat, getCouplePair, registerPendingLock, releaseSeat, showErrorModal, closeModal, clearOwnerToken]);

    // =========================================================
    // SAVE SELECTED SEATS
    // =========================================================

    useEffect(() => {
        if (pendingSeatIds.length === 0 && selectedSeats.length > 0) {
            localStorage.setItem('selectedSeats', JSON.stringify(selectedSeats));
            localStorage.setItem('currentShowtimeId', String(showtimeId));
            const ownerToken = ownerTokenRef.current || localStorage.getItem('bookingOwnerToken');
            if (ownerToken) localStorage.setItem('bookingOwnerToken', ownerToken);
        }
    }, [pendingSeatIds.length, selectedSeats, showtimeId]);

    // =========================================================
    // HANDLE CONTINUE
    // =========================================================

    const handleContinue = useCallback(() => {
        if (pendingSeatIds.length > 0) {
            showErrorModal('Đang xác nhận ghế', 'Hệ thống đang xác nhận ghế bạn chọn. Vui lòng đợi một chút rồi tiếp tục.');
            return;
        }
        if (selectedSeats.length === 0) {
            setModalConfig({
                show: true,
                type: 'warning',
                title: 'THÔNG BÁO',
                message: 'Vui lòng chọn ít nhất một ghế trước khi tiếp tục.',
                onConfirm: closeModal,
                onCancel: closeModal
            });
            return;
        }
        const currentSocket = socketService.getSocket();
        if (!currentSocket || !currentSocket.connected) {
            showErrorModal('Socket đã ngắt kết nối', 'Phiên giữ ghế không còn hoạt động. Vui lòng tải lại trang và chọn ghế lại.');
            return;
        }
        const ownerToken = ownerTokenRef.current || localStorage.getItem('bookingOwnerToken') || currentSocket.id;
        if (!ownerToken) {
            showErrorModal('Không xác định được phiên giữ ghế', 'Vui lòng tải lại trang và chọn ghế lại.');
            return;
        }
        if (String(ownerToken) !== String(currentSocket.id)) {
            showErrorModal('Phiên giữ ghế không hợp lệ', 'Socket giữ ghế đã thay đổi. Vui lòng tải lại trang và chọn ghế lại.');
            return;
        }
        localStorage.setItem('bookingOwnerToken', ownerToken);
        localStorage.setItem('selectedSeats', JSON.stringify(selectedSeats));
        localStorage.setItem('currentShowtimeId', String(showtimeId));
        setIsNavigating(true);
        navigate('/foods', {
            state: { movie, selectedCinema, selectedDate, selectedShowtime, selectedSeats, showtimeDetail, ownerToken }
        });
        setTimeout(() => { setIsNavigating(false); }, 3000);
    }, [pendingSeatIds.length, selectedSeats, showtimeId, movie, selectedCinema, selectedDate, selectedShowtime, showtimeDetail, navigate, showErrorModal, closeModal]);

    // =========================================================
    // CLEANUP PENDING TIMERS
    // =========================================================

    useEffect(() => {
        return () => {
            pendingLocksRef.current.forEach(pending => { if (pending?.timer) clearTimeout(pending.timer); });
            pendingLocksRef.current.clear();
        };
    }, []);

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
        return { ...movie, poster: movie.movie_poster, movie_poster: movie.movie_poster };
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
                    <button className="booking-retry-btn" onClick={() => window.location.reload()}>Thử lại</button>
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
                <div className="booking-progress-wrapper">
                    <BookingProgress currentStep={2} />
                </div>
                <div className="booking-container">
                    <main className="booking-main-column">
                        <section className="booking-section booking-showtime-section">
                            <div className="section-heading">
                                <div className="section-number">01</div>
                                <div className="section-heading-content">
                                    <span className="section-kicker">BOOKING STEP</span>
                                    <h2>THÔNG TIN SUẤT CHIẾU</h2>
                                </div>
                            </div>
                            <div className="section-divider" />
                            <nav className="booking-nav-flex">
                                <div className="nav-col cinema-select">
                                    <label><span>1.</span> CHỌN RẠP</label>
                                    <div className="select-wrapper">
                                        <select
                                            value={selectedCinema?.cinema_id || ''}
                                            onChange={e => {
                                                if (selectedSeats.length > 0 || pendingSeatIds.length > 0) {
                                                    isSessionClearedRef.current = false;
                                                    clearBookingSession();
                                                }
                                                const cinema = cinemas.find(c => c.cinema_id == e.target.value);
                                                setSelectedCinema(cinema);
                                                setSelectedDate(null);
                                                setSelectedShowtime(null);
                                                setAvailableShowtimes([]);
                                            }}
                                        >
                                            <option value="">-- Chọn rạp --</option>
                                            {cinemas.map(cinema => (
                                                <option key={cinema.cinema_id} value={cinema.cinema_id}>{cinema.cinema_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className={`nav-col date-slider ${!selectedCinema ? 'disabled-step' : ''}`}>
                                    <label><span>2.</span> CHỌN NGÀY</label>
                                    <div className="slider-controls">
                                        <button type="button" className="slide-btn" onClick={() => scrollDate(-1)} disabled={!selectedCinema} aria-label="Ngày trước">‹</button>
                                        <div className="scroll-list" ref={dateRef}>
                                            {availableDates.map(date => (
                                                <div
                                                    key={date}
                                                    className={`compact-card ${selectedDate === date ? 'active' : ''}`}
                                                    onClick={() => {
                                                        if (!selectedCinema) return;
                                                        if (selectedSeats.length > 0 || pendingSeatIds.length > 0) {
                                                            isSessionClearedRef.current = false;
                                                            clearBookingSession();
                                                        }
                                                        setSelectedDate(date);
                                                        setSelectedShowtime(null);
                                                    }}
                                                >
                                                    <span className="day-txt">{new Date(date).toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                                                    <span className="date-txt">{new Date(date).getDate()}/{new Date(date).getMonth() + 1}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <button type="button" className="slide-btn" onClick={() => scrollDate(1)} disabled={!selectedCinema} aria-label="Ngày sau">›</button>
                                    </div>
                                </div>
                                <div className={`nav-col time-slider ${!selectedDate ? 'disabled-step' : ''}`}>
                                    <label><span>3.</span> SUẤT CHIẾU</label>
                                    <div className="slider-controls">
                                        <button type="button" className="slide-btn" onClick={() => scrollTime(-1)} disabled={!selectedDate} aria-label="Suất trước">‹</button>
                                        <div className="scroll-list" ref={timeRef}>
                                            {availableShowtimes.length > 0 ? (
                                                availableShowtimes.map(st => {
                                                    const stId = st.showtime_id || st.id;
                                                    const active = Number(selectedShowtime?.showtime_id || selectedShowtime?.id) === Number(stId);
                                                    return (
                                                        <div
                                                            key={stId}
                                                            className={`compact-card time-card ${active ? 'active' : ''}`}
                                                            onClick={() => {
                                                                if (selectedSeats.length > 0 || pendingSeatIds.length > 0) {
                                                                    isSessionClearedRef.current = false;
                                                                    clearBookingSession();
                                                                }
                                                                setSelectedShowtime(st);
                                                            }}
                                                        >
                                                            <span className="time-day">SUẤT</span>
                                                            <span className="time-txt">{st.start_time}</span>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                selectedDate && <span className="no-showtimes">Hết suất</span>
                                            )}
                                        </div>
                                        <button type="button" className="slide-btn" onClick={() => scrollTime(1)} disabled={!selectedDate} aria-label="Suất sau">›</button>
                                    </div>
                                </div>
                            </nav>
                        </section>
                        <section className="booking-section booking-seat-section">
                            <div className="section-heading">
                                <div className="section-number">02</div>
                                <div className="section-heading-content">
                                    <span className="section-kicker">BOOKING STEP</span>
                                    <h2>CHỌN GHẾ</h2>
                                </div>
                                <div className="selected-seat-counter">
                                    <span>ĐANG CHỌN</span>
                                    <strong>{selectedSeats.length}</strong>
                                    <small>/ 8 GHẾ</small>
                                </div>
                            </div>
                            <div className="section-divider" />
                            <div className="seat-selection-content">
                                {selectedShowtime ? (
                                    <div className="seat-map-booking">
                                        <div className="screen-header">
                                            <div className="screen-glow" />
                                            <div className="screen-line" />
                                            <span>MÀN HÌNH</span>
                                        </div>
                                        <div className="seats-layout">
                                            {(() => {
                                                const sortedRowKeys = Object.keys(groupedSeats).sort((a, b) => {
                                                    const aNum = parseInt(a);
                                                    const bNum = parseInt(b);
                                                    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                                                    return a.localeCompare(b);
                                                });
                                                return sortedRowKeys.map(row => {
                                                    const rowSeats = groupedSeats[row] || [];
                                                    const displaySeats = rowSeats.filter(seat => isCoupleDisplaySeat(seat));
                                                    return (
                                                        <div key={row} className="seat-row">
                                                            <span className="row-id">{row}</span>
                                                            <div className="row-items">
                                                                {displaySeats.map(seat => {
                                                                    const couple = isCoupleSeat(seat);
                                                                    const isSelectedByMe = selectedSeats.some(selected => Number(selected.seat_id) === Number(seat.seat_id));
                                                                    const isPending = pendingSeatIds.some(id => Number(id) === Number(seat.seat_id));
                                                                    let displayNumber = seat.seat_number;
                                                                    if (couple) {
                                                                        const pairSeat = getCouplePair(seat, seats);
                                                                        if (pairSeat) displayNumber = `${seat.seat_number}-${pairSeat.seat_number}`;
                                                                    }
                                                                    return (
                                                                        <Seat
                                                                            key={seat.seat_id}
                                                                            type={seat.seat_type}
                                                                            selected={isSelectedByMe}
                                                                            sold={seat.seat_status === 'Booked'}
                                                                            maintenance={Number(seat.is_active) === 0}
                                                                            locked={isPending || (seat.is_locked_by_user && !isSelectedByMe)}
                                                                            heldByOther={Boolean(seat.held_by_other)}
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
                                            <div className="leg-item"><div className="box maintenance" />Bảo trì</div>
                                            <div className="leg-item"><div className="box normal" />Thường</div>
                                            <div className="leg-item"><div className="box vip" />VIP</div>
                                            <div className="leg-item"><div className="box couple" />Đôi</div>
                                            <div className="leg-item"><div className="box selected" />Đang chọn</div>
                                            <div className="leg-item"><div className="box sold" />Đã bán</div>
                                            <div className="leg-item"><div className="box held-by-other" />Đang được chọn</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="placeholder-msg">
                                        <i className="fas fa-info-circle" />
                                        <p>Vui lòng chọn đầy đủ <strong>rạp</strong>, <strong>ngày</strong> và <strong>suất chiếu</strong> để hiển thị sơ đồ ghế.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </main>
                    <aside className="booking-sidebar-column">
                        <div className="sidebar-sticky">
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
                                showContinueButton={true}
                                showBackButton={true}
                                continueText="TIẾP TỤC"
                                onContinue={handleContinue}
                                onBack={() => navigate(-1)}
                                isContinueDisabled={selectedSeats.length === 0 || pendingSeatIds.length > 0}
                                onExpire={() => {
                                    isSessionClearedRef.current = false;
                                    clearBookingSession();
                                    setModalConfig({
                                        show: true,
                                        type: 'error',
                                        title: 'Hết thời gian giữ ghế',
                                        message: 'Ghế bạn chọn đã được mở khóa. Vui lòng chọn lại ghế.',
                                        onConfirm: () => { closeModal(); navigate('/'); },
                                        onCancel: closeModal
                                    });
                                }}
                            />
                        </div>
                    </aside>
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