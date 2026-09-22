import React, {
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    useParams,
    useNavigate
} from 'react-router-dom';

import api from '../../api/api';

import {
    MapPin,
    Film,
    Clock3,
    Check,
    Loader2,
    AlertCircle,
    Ticket,
    CalendarDays,
    Building2,
    RotateCcw,
    DoorOpen,
    Sofa,
    Wallet,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';

import BookingSidebar from '../components/BookingSidebar';

import '../styles/RescheduleBooking.css';

/* ===========================================================
   RESCHEDULE BOOKING PAGE
   FLOW:
   1. HIỆN INFO VÉ CŨ
   2. CHỌN SUẤT MỚI (cùng phim + cùng rạp)
   3. CHỌN GHẾ MỚI (cùng hạng ghế cũ)
   4. XÁC NHẬN ĐỔI
============================================================ */

const RescheduleBookingPage = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();

    /* ========================================================
       DATA
    ======================================================== */

    const [info, setInfo] = useState(null);
    const [options, setOptions] = useState([]);
    const [currentSeats, setCurrentSeats] = useState([]);

    /* ========================================================
       SELECTED
    ======================================================== */

    const [selectedShowtime, setSelectedShowtime] = useState(null);
    const [selectedSeatType, setSelectedSeatType] = useState(null);
    const [availableSeats, setAvailableSeats] = useState([]);
    const [selectedSeats, setSelectedSeats] = useState([]);

    /* ========================================================
       UI STATE
    ======================================================== */

    const [loading, setLoading] = useState(true);
    const [loadingSeats, setLoadingSeats] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const [showConfirm, setShowConfirm] = useState(false);

    const [alert, setAlert] = useState({
        show: false,
        type: 'info',
        title: '',
        message: ''
    });

    /* ========================================================
       SHOW ALERT
    ======================================================== */

    const showAlert = (type, title, message) => {
        setAlert({ show: true, type, title, message });
    };

    /* ========================================================
       LOAD DATA
    ======================================================== */

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [infoRes, optionsRes] = await Promise.all([
                    api.get(`/api/bookings/${bookingId}/reschedule-info`),
                    api.get(`/api/bookings/${bookingId}/reschedule-options`)
                ]);

                if (!mounted) return;

                const infoData = infoRes?.data?.data || null;
                const optionsData = optionsRes?.data?.data || {};

                setInfo(infoData);
                setOptions(optionsData.options || []);
                setCurrentSeats(optionsData.currentSeats || []);

                // Auto set seat type nếu chỉ có 1 hạng
                const uniqueTypes = [
                    ...new Set((optionsData.currentSeats || []).map(s => s.seat_type))
                ];

                if (uniqueTypes.length === 1) {
                    setSelectedSeatType(uniqueTypes[0]);
                }

            } catch (err) {
                console.error('Reschedule load error:', err);

                if (!mounted) return;

                setError(
                    err?.response?.data?.message ||
                    'Không thể tải dữ liệu đổi suất chiếu.'
                );
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        if (bookingId) {
            loadData();
        }

        return () => {
            mounted = false;
        };
    }, [bookingId]);

    /* ========================================================
       LOAD SEATS WHEN SHOWTIME OR SEAT TYPE CHANGES
    ======================================================== */

    useEffect(() => {
        if (!selectedShowtime) {
            setAvailableSeats([]);
            return;
        }

        const seatType = selectedSeatType || currentSeats[0]?.seat_type;
        if (!seatType) return;

        let mounted = true;

        const loadSeats = async () => {
            try {
                setLoadingSeats(true);

                const res = await api.get(
                    `/api/bookings/showtime/${selectedShowtime.showtime_id}/available-seats`,
                    { params: { seat_type: seatType } }
                );

                if (!mounted) return;

                setAvailableSeats(res?.data?.data || []);
                setSelectedSeats([]);

            } catch (err) {
                console.error('Load seats error:', err);

                if (!mounted) return;

                setAvailableSeats([]);
                showAlert('error', 'Lỗi', 'Không thể tải danh sách ghế.');

            } finally {
                if (mounted) {
                    setLoadingSeats(false);
                }
            }
        };

        loadSeats();

        return () => {
            mounted = false;
        };
    }, [selectedShowtime, selectedSeatType, currentSeats]);

    /* ========================================================
       GROUP OPTIONS BY DATE
    ======================================================== */

    const groupedOptions = useMemo(() => {
        const groups = {};

        options.forEach(opt => {
            const dateStr = String(opt.start_time).split(' ')[0];

            if (!groups[dateStr]) {
                groups[dateStr] = [];
            }

            groups[dateStr].push(opt);
        });

        return groups;
    }, [options]);

    const sortedDates = useMemo(() => {
        return Object.keys(groupedOptions).sort();
    }, [groupedOptions]);

    /* ========================================================
       UNIQUE SEAT TYPES
    ======================================================== */

    const uniqueSeatTypes = useMemo(() => {
        return [...new Set(currentSeats.map(s => s.seat_type))];
    }, [currentSeats]);

    /* ========================================================
       REQUIRED SEATS
    ======================================================== */

    const requiredSeats = currentSeats.length;

    /* ========================================================
       TOGGLE SEAT
    ======================================================== */

    const toggleSeat = (seat) => {
        setSelectedSeats(prev => {
            const exists = prev.find(s => s.seat_id === seat.seat_id);

            if (exists) {
                return prev.filter(s => s.seat_id !== seat.seat_id);
            }

            if (prev.length >= requiredSeats) {
                showAlert(
                    'warning',
                    'Đã đủ số ghế',
                    `Bạn chỉ cần chọn ${requiredSeats} ghế (bằng số ghế cũ).`
                );
                return prev;
            }

            return [...prev, seat];
        });
    };

    /* ========================================================
       FORMAT DATE TIME
    ======================================================== */

    const formatDateTime = (dateStr) => {
        if (!dateStr) {
            return { date: '---', time: '---' };
        }

        const str = String(dateStr).replace('T', ' ');
        const [datePart, timePart] = str.split(' ');

        if (!datePart || !timePart) {
            return { date: '---', time: '---' };
        }

        const [year, month, day] = datePart.split('-');
        const [hour, minute] = timePart.split(':');

        return {
            date: `${day}/${month}/${year}`,
            time: `${hour}:${minute}`
        };
    };

    /* ========================================================
       FORMAT MONEY
    ======================================================== */

    const formatMoney = (n) => Number(n || 0).toLocaleString('vi-VN');

    /* ========================================================
       CALCULATE PRICE DIFF
    ======================================================== */

    const newTotal = useMemo(() => {
        return selectedSeats.reduce(
            (sum, s) => sum + Number(s.price || 0),
            0
        );
    }, [selectedSeats]);

    const priceDiff = useMemo(() => {
        if (!info?.booking) return 0;
        return newTotal - Number(info.booking.total_amount || 0);
    }, [newTotal, info]);

    /* ========================================================
       CAN CONTINUE
    ======================================================== */

    const canContinue = Boolean(
        selectedShowtime &&
        selectedSeats.length === requiredSeats
    );

    /* ========================================================
       HANDLE CONFIRM
    ======================================================== */

    const handleConfirm = async () => {
        if (!selectedShowtime) {
            showAlert('warning', 'Thiếu thông tin', 'Vui lòng chọn suất chiếu mới.');
            return;
        }

        if (selectedSeats.length !== requiredSeats) {
            showAlert(
                'warning',
                'Chưa đủ ghế',
                `Vui lòng chọn đúng ${requiredSeats} ghế.`
            );
            return;
        }

        try {
            setSubmitting(true);

            const res = await api.post(
                `/api/bookings/${bookingId}/reschedule`,
                {
                    new_showtime_id: selectedShowtime.showtime_id,
                    new_seat_ids: selectedSeats.map(s => s.seat_id)
                }
            );

            setShowConfirm(false);

            const data = res?.data?.data || {};
            const diff = data.priceDifference || 0;

            let msg = 'Đổi suất chiếu thành công!\n\n';

            if (diff > 0) {
                msg += `💰 Bạn đã trả thêm: ${formatMoney(diff)} điểm\n`;
            } else if (diff < 0) {
                msg += `💰 Bạn được hoàn: ${formatMoney(Math.abs(diff))} điểm\n`;
            } else {
                msg += `💰 Không thay đổi giá vé\n`;
            }

            msg += `\n📧 Email xác nhận đã được gửi đến hộp thư của bạn.`;

            showAlert('success', 'Đổi suất thành công!', msg);

            setTimeout(() => {
                navigate('/my-bookings');
            }, 3000);

        } catch (err) {
            console.error('Reschedule error:', err);
            setShowConfirm(false);
            showAlert(
                'error',
                'Không thể đổi suất',
                err?.response?.data?.message || 'Vui lòng thử lại sau.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    /* ========================================================
       LOADING
    ======================================================== */

    if (loading) {
        return (
            <div className="booking-select-page">
                <div className="booking-state">
                    <Loader2 size={42} className="booking-state__spinner" />
                    <h2>Đang tải thông tin đổi suất</h2>
                    <p>Vui lòng chờ một chút...</p>
                </div>
            </div>
        );
    }

    /* ========================================================
       ERROR
    ======================================================== */

    if (error || !info?.booking) {
        return (
            <div className="booking-select-page">
                <div className="booking-state booking-state--error">
                    <AlertCircle size={44} />
                    <h2>Không thể tải dữ liệu</h2>
                    <p>{error || 'Không tìm thấy booking'}</p>
                    <button
                        type="button"
                        className="booking-state__retry"
                        onClick={() => navigate('/my-bookings')}
                    >
                        Quay lại "Vé của tôi"
                    </button>
                </div>
            </div>
        );
    }

    /* ========================================================
       DATA READY
    ======================================================== */

    const booking = info.booking;
    const oldDT = formatDateTime(booking.start_time);

    /* ========================================================
       RENDER
    ======================================================== */

    return (
        <div className="booking-select-page">

            {/* HEADER */}
            <header className="booking-page-header">
                <div className="booking-container">
                    <div className="booking-page-header__eyebrow">
                        QUANG DŨNG CINEMA
                    </div>
                    <h1>ĐỔI SUẤT CHIẾU</h1>
                    <p>
                        Chọn suất chiếu mới và ghế mới cho vé của bạn.
                    </p>
                </div>
            </header>

            {/* STEP BAR */}
            <div className="booking-stepbar">
                <div className="booking-container">
                    <div className="booking-stepbar__inner">

                        <div className={`booking-step active ${selectedShowtime ? 'completed' : ''}`}>
                            <div className="booking-step__number">
                                {selectedShowtime ? <Check size={16} /> : '01'}
                            </div>
                            <div className="booking-step__content">
                                <span>Bước 01</span>
                                <strong>Chọn suất mới</strong>
                            </div>
                        </div>

                        <div className={`booking-step__line ${selectedShowtime ? 'active' : ''}`} />

                        <div className={`booking-step ${selectedShowtime ? 'active' : ''} ${selectedSeats.length === requiredSeats ? 'completed' : ''}`}>
                            <div className="booking-step__number">
                                {selectedSeats.length === requiredSeats ? <Check size={16} /> : '02'}
                            </div>
                            <div className="booking-step__content">
                                <span>Bước 02</span>
                                <strong>Chọn ghế mới</strong>
                            </div>
                        </div>

                        <div className={`booking-step__line ${selectedSeats.length === requiredSeats ? 'active' : ''}`} />

                        <div className={`booking-step ${canContinue ? 'active' : ''}`}>
                            <div className="booking-step__number">03</div>
                            <div className="booking-step__content">
                                <span>Bước 03</span>
                                <strong>Xác nhận</strong>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* MAIN */}
            <main className="booking-container booking-main">
                <div className="booking-layout">

                    {/* LEFT */}
                    <section className="booking-selection">

                        {/* INFO VÉ CŨ */}
                        <section className="booking-panel booking-panel--active">
                            <div className="booking-panel__header">
                                <div className="booking-panel__heading">
                                    <div className="booking-panel__icon">
                                        <Ticket size={21} />
                                    </div>
                                    <div>
                                        <span className="booking-panel__eyebrow">
                                            VÉ HIỆN TẠI
                                        </span>
                                        <h2>Thông tin vé</h2>
                                        <p>
                                            Đã đổi {info.rescheduleCount}/{info.maxReschedule} lần
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rsvp-current-grid">
                                <div className="rsvp-info-item">
                                    <Film size={16} />
                                    <div>
                                        <span>Phim</span>
                                        <strong>{booking.movie_title}</strong>
                                    </div>
                                </div>
                                <div className="rsvp-info-item">
                                    <MapPin size={16} />
                                    <div>
                                        <span>Rạp</span>
                                        <strong>{booking.cinema_name}</strong>
                                    </div>
                                </div>
                                <div className="rsvp-info-item">
                                    <Clock3 size={16} />
                                    <div>
                                        <span>Suất chiếu</span>
                                        <strong>{oldDT.time} - {oldDT.date}</strong>
                                    </div>
                                </div>
                                <div className="rsvp-info-item">
                                    <DoorOpen size={16} />
                                    <div>
                                        <span>Phòng</span>
                                        <strong>{booking.room_name} ({booking.room_type})</strong>
                                    </div>
                                </div>
                                <div className="rsvp-info-item">
                                    <Sofa size={16} />
                                    <div>
                                        <span>Ghế ({requiredSeats} ghế)</span>
                                        <strong>
                                            {currentSeats.map(s => `${s.seat_row}${s.seat_number}`).join(', ')}
                                        </strong>
                                    </div>
                                </div>
                                <div className="rsvp-info-item">
                                    <Wallet size={16} />
                                    <div>
                                        <span>Giá vé</span>
                                        <strong>{formatMoney(booking.total_amount)} điểm</strong>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* CHỌN HẠNG GHẾ (nếu nhiều hạng) */}
                        {uniqueSeatTypes.length > 1 && (
                            <section className="booking-panel booking-panel--active">
                                <div className="booking-panel__header">
                                    <div className="booking-panel__heading">
                                        <div className="booking-panel__icon">
                                            <Sofa size={21} />
                                        </div>
                                        <div>
                                            <span className="booking-panel__eyebrow">
                                                BƯỚC 01A
                                            </span>
                                            <h2>Chọn hạng ghế</h2>
                                            <p>Bạn có nhiều hạng ghế, chọn 1 để đổi</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="booking-city__list">
                                    {uniqueSeatTypes.map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            className={`booking-city__item ${selectedSeatType === type ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedSeatType(type);
                                                setSelectedSeats([]);
                                            }}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* CHỌN SUẤT MỚI */}
                        <section className="booking-panel booking-panel--active">
                            <div className="booking-panel__header">
                                <div className="booking-panel__heading">
                                    <div className="booking-panel__icon">
                                        <CalendarDays size={21} />
                                    </div>
                                    <div>
                                        <span className="booking-panel__eyebrow">
                                            BƯỚC 01
                                        </span>
                                        <h2>Chọn suất chiếu mới</h2>
                                        <p>Cùng phim, cùng rạp, chỉ đổi giờ</p>
                                    </div>
                                </div>

                                {selectedShowtime && (
                                    <div className="booking-panel__selected">
                                        <Check size={15} />
                                        <span>
                                            {formatDateTime(selectedShowtime.start_time).time}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {sortedDates.length === 0 ? (
                                <div className="booking-empty">
                                    <AlertTriangle size={30} />
                                    <strong>Không có suất chiếu nào khác</strong>
                                    <span>Phim này chưa có suất chiếu nào khác để đổi.</span>
                                </div>
                            ) : (
                                <div className="booking-showtime-list">
                                    {sortedDates.map(dateStr => {
                                        const dt = formatDateTime(`${dateStr} 00:00`);
                                        const dayName = new Date(`${dateStr}T00:00:00`)
                                            .toLocaleDateString('vi-VN', { weekday: 'long' });

                                        return (
                                            <div key={dateStr} className="booking-showtime-group">
                                                <div className="booking-showtime-group__header">
                                                    <div>
                                                        <strong>{dayName}</strong>
                                                        <span>{dt.date}</span>
                                                    </div>
                                                    <span>
                                                        {groupedOptions[dateStr].length} suất
                                                    </span>
                                                </div>

                                                <div className="booking-time-list">
                                                    {groupedOptions[dateStr].map(opt => {
                                                        const optDT = formatDateTime(opt.start_time);
                                                        const isSelected =
                                                            selectedShowtime?.showtime_id === opt.showtime_id;

                                                        return (
                                                            <button
                                                                key={opt.showtime_id}
                                                                type="button"
                                                                className={`booking-time ${isSelected ? 'active' : ''}`}
                                                                onClick={() => {
                                                                    setSelectedShowtime(opt);
                                                                    setSelectedSeats([]);
                                                                }}
                                                            >
                                                                <span className="booking-time__clock">
                                                                    <Clock3 size={15} />
                                                                </span>
                                                                <strong>{optDT.time}</strong>
                                                                <small style={{ marginLeft: 6, color: '#999', fontSize: 11 }}>
                                                                    {opt.room_name}
                                                                </small>
                                                                {isSelected && <Check size={16} />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {/* CHỌN GHẾ MỚI */}
                        {selectedShowtime && (
                            <section className="booking-panel booking-panel--active">
                                <div className="booking-panel__header">
                                    <div className="booking-panel__heading">
                                        <div className="booking-panel__icon">
                                            <Sofa size={21} />
                                        </div>
                                        <div>
                                            <span className="booking-panel__eyebrow">
                                                BƯỚC 02
                                            </span>
                                            <h2>Chọn ghế mới</h2>
                                            <p>
                                                Chọn đúng <b>{requiredSeats}</b> ghế
                                                {selectedSeatType && ` hạng ${selectedSeatType}`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="booking-panel__selected">
                                        <Sofa size={15} />
                                        <span>
                                            {selectedSeats.length}/{requiredSeats}
                                        </span>
                                    </div>
                                </div>

                                {loadingSeats ? (
                                    <div className="booking-state" style={{ minHeight: 200 }}>
                                        <Loader2 size={32} className="booking-state__spinner" />
                                        <p>Đang tải ghế...</p>
                                    </div>
                                ) : availableSeats.length === 0 ? (
                                    <div className="booking-empty">
                                        <AlertTriangle size={30} />
                                        <strong>Không còn ghế trống</strong>
                                        <span>Suất chiếu này đã hết ghế hạng {selectedSeatType}.</span>
                                    </div>
                                ) : (
                                    <div className="rsvp-seat-grid">
                                        {availableSeats.map(seat => {
                                            const isSelected = selectedSeats.some(
                                                s => s.seat_id === seat.seat_id
                                            );

                                            return (
                                                <button
                                                    key={seat.seat_id}
                                                    type="button"
                                                    className={`rsvp-seat-btn ${isSelected ? 'active' : ''}`}
                                                    onClick={() => toggleSeat(seat)}
                                                >
                                                    <span className="rsvp-seat-name">
                                                        {seat.seat_row}{seat.seat_number}
                                                    </span>
                                                    <span className="rsvp-seat-price">
                                                        {formatMoney(seat.price)}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        )}

                    </section>

                    {/* RIGHT — SIDEBAR */}
                    <aside className="booking-sidebar-column">
                        <div className="sidebar-sticky">
                            <BookingSidebar
                                movie={{
                                    movie_id: booking.movie_id,
                                    title: booking.movie_title,
                                    movie_poster: booking.movie_poster,
                                    duration: booking.movie_duration,
                                }}
                                showtimeDetail={null}
                                selectedCinema={{
                                    cinema_name: booking.cinema_name,
                                }}
                                selectedDate={selectedShowtime
                                    ? formatDateTime(selectedShowtime.start_time).date
                                    : oldDT.date
                                }
                                selectedShowtime={selectedShowtime || {
                                    time: oldDT.time,
                                    start_time: booking.start_time,
                                    room_name: booking.room_name,
                                    room_type: booking.room_type,
                                }}
                                selectedSeats={selectedSeats}
                                selectedFoods={[]}
                                totalTicketPrice={newTotal}
                                totalFoodPrice={0}
                                grandTotal={newTotal}
                                isTimerActive={false}
                                onExpire={() => {}}
                                showContinueButton={true}
                                showBackButton={false}
                                continueText="XÁC NHẬN ĐỔI SUẤT"
                                onContinue={() => setShowConfirm(true)}
                                isContinueDisabled={!canContinue}
                            />
                        </div>
                    </aside>

                </div>
            </main>

            {/* CONFIRM MODAL */}
            {showConfirm && (
                <div className="rsvp-modal-overlay" onClick={() => !submitting && setShowConfirm(false)}>
                    <div className="rsvp-modal" onClick={e => e.stopPropagation()}>
                        <div className="rsvp-modal-header">
                            <RotateCcw size={24} />
                            <h3>Xác nhận đổi suất chiếu?</h3>
                        </div>

                        <div className="rsvp-modal-body">
                            <div className="rsvp-modal-row">
                                <span>Suất cũ:</span>
                                <strong>{oldDT.time} - {oldDT.date}</strong>
                            </div>
                            <div className="rsvp-modal-row">
                                <span>Suất mới:</span>
                                <strong>
                                    {formatDateTime(selectedShowtime?.start_time).time} -{' '}
                                    {formatDateTime(selectedShowtime?.start_time).date}
                                </strong>
                            </div>
                            <div className="rsvp-modal-row">
                                <span>Ghế mới:</span>
                                <strong>
                                    {selectedSeats.map(s => `${s.seat_row}${s.seat_number}`).join(', ')}
                                </strong>
                            </div>
                            <div className="rsvp-modal-row rsvp-modal-price">
                                <span>Chênh lệch:</span>
                                <strong className={
                                    priceDiff > 0 ? 'rsvp-diff-positive'
                                        : priceDiff < 0 ? 'rsvp-diff-negative' : ''
                                }>
                                    {priceDiff > 0 ? '+' : ''}
                                    {formatMoney(priceDiff)} điểm
                                </strong>
                            </div>
                        </div>

                        <div className="rsvp-modal-actions">
                            <button
                                className="rsvp-btn rsvp-btn-cancel"
                                onClick={() => setShowConfirm(false)}
                                disabled={submitting}
                            >
                                Hủy
                            </button>
                            <button
                                className="rsvp-btn rsvp-btn-confirm"
                                onClick={handleConfirm}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={16} className="rsvp-spin" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={16} />
                                        Xác nhận đổi
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ALERT MODAL */}
            {alert.show && (
                <div
                    className="rsvp-modal-overlay"
                    onClick={() => {
                        if (alert.type !== 'success') {
                            setAlert({ ...alert, show: false });
                        }
                    }}
                >
                    <div
                        className={`rsvp-alert rsvp-alert-${alert.type}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="rsvp-alert-icon">
                            {alert.type === 'success' && <CheckCircle2 size={32} />}
                            {alert.type === 'error' && <AlertTriangle size={32} />}
                            {alert.type === 'warning' && <AlertTriangle size={32} />}
                            {alert.type === 'info' && <Ticket size={32} />}
                        </div>
                        <h3>{alert.title}</h3>
                        <p style={{ whiteSpace: 'pre-line' }}>{alert.message}</p>
                        <button
                            className="rsvp-btn rsvp-btn-confirm"
                            onClick={() => setAlert({ ...alert, show: false })}
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default RescheduleBookingPage;