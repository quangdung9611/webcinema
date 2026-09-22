// ============================================================
// RESCHEDULE SELECT
// Flow:
// 1. Load info vé cũ + danh sách suất mới
// 2. Chọn suất mới (cùng phim + rạp)
// 3. Chuyển sang chọn ghế (Booking.js mode=reschedule)
// ============================================================

import React, {
    useEffect,
    useMemo,
    useRef,
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
    ChevronLeft,
    ChevronRight,
    Check,
    Loader2,
    AlertCircle,
    Ticket,
    CalendarDays,
    RotateCcw,
    DoorOpen,
    Sofa,
    Wallet,
    AlertTriangle
} from 'lucide-react';

import BookingSidebar from '../components/BookingSidebar';

import '../styles/BookingSelect.css';
import '../styles/RecheduleSelect.css';

const RescheduleSelect = () => {

    const { bookingId } = useParams();
    const navigate = useNavigate();

    // ========================================================
    // DATA
    // ========================================================
    const [info, setInfo] = useState(null);
    const [options, setOptions] = useState([]);
    const [currentSeats, setCurrentSeats] = useState([]);

    // ========================================================
    // SELECTED
    // ========================================================
    const [selectedShowtime, setSelectedShowtime] = useState(null);

    // ========================================================
    // UI STATE
    // ========================================================
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const dateScrollRef = useRef(null);

    // ========================================================
    // LOAD DATA
    // ========================================================
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

    // ========================================================
    // GROUP OPTIONS BY DATE
    // ========================================================
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

    // ========================================================
    // FORMAT DATE TIME
    // ========================================================
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

    // ========================================================
    // FORMAT MONEY
    // ========================================================
    const formatMoney = (n) => Number(n || 0).toLocaleString('vi-VN');

    // ========================================================
    // SCROLL DATES
    // ========================================================
    const scrollDates = (direction) => {
        if (!dateScrollRef.current) return;
        dateScrollRef.current.scrollBy({
            left: direction * 240,
            behavior: 'smooth'
        });
    };

    // ========================================================
    // CAN CONTINUE
    // ========================================================
    const canContinue = Boolean(selectedShowtime);

    // ========================================================
    // ✅ CONTINUE TO SEAT
    // ========================================================
    const handleContinue = () => {
        if (!canContinue || !info?.booking) return;

        const booking = info.booking;
        const oldStart = String(booking.start_time).replace('T', ' ');
        const oldTime = oldStart.split(' ')[1]?.substring(0, 5) || '---';
        const oldDate = oldStart.split(' ')[0]?.split('-').reverse().join('/') || '---';

        navigate(
            `/booking/${booking.movie_slug || booking.movie_id}`,
            {
                state: {
                    mode: 'reschedule',
                    rescheduleBookingId: Number(bookingId),

                    // Movie cũ
                    movie: {
                        movie_id: booking.movie_id,
                        title: booking.movie_title,
                        slug: booking.movie_slug,
                        movie_poster: booking.movie_poster,
                        duration: booking.movie_duration,
                        age_rating: booking.movie_age_rating
                    },

                    // Cinema cũ
                    cinema: {
                        cinema_id: booking.cinema_id,
                        cinema_name: booking.cinema_name
                    },

                    // Suất mới đã chọn
                    date: formatDateTime(selectedShowtime.start_time).date.split('/').reverse().join('-'),
                    showtime: {
                        showtime_id: selectedShowtime.showtime_id,
                        start_time: selectedShowtime.start_time,
                        time: formatDateTime(selectedShowtime.start_time).time,
                        room_id: selectedShowtime.room_id,
                        room_name: selectedShowtime.room_name,
                        room_type: selectedShowtime.room_type
                    },

                    // Info vé cũ
                    oldBooking: {
                        booking_id: booking.booking_id,
                        old_start_time: booking.start_time,
                        old_time: oldTime,
                        old_date: oldDate,
                        old_room_name: booking.room_name,
                        old_room_type: booking.room_type,
                        old_seats: currentSeats.map(s => `${s.seat_row}${s.seat_number}`).join(', '),
                        old_total: Number(booking.total_amount || 0)
                    }
                }
            }
        );
    };

    // ========================================================
    // LOADING
    // ========================================================
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

    // ========================================================
    // ERROR
    // ========================================================
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
                        onClick={() => navigate('/profile')}
                    >
                        Quay lại "Vé của tôi"
                    </button>
                </div>
            </div>
        );
    }

    // ========================================================
    // DATA READY
    // ========================================================
    const booking = info.booking;
    const oldDT = formatDateTime(booking.start_time);

    // ========================================================
    // RENDER
    // ========================================================
    return (
        <div className="booking-select-page">

            {/* HEADER */}
            <header className="booking-page-header">
                <div className="booking-container">
                    <div className="booking-page-header__eyebrow">
                        QUANG DŨNG CINEMA
                    </div>
                    <h1>ĐỔI SUẤT CHIẾU</h1>
                    <p>Chọn suất chiếu mới cho vé của bạn.</p>
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

                        <div className={`booking-step ${selectedShowtime ? 'active' : ''}`}>
                            <div className="booking-step__number">02</div>
                            <div className="booking-step__content">
                                <span>Bước 02</span>
                                <strong>Chọn ghế mới</strong>
                            </div>
                        </div>

                        <div className="booking-step__line" />

                        <div className="booking-step">
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
                                            Đã đổi {info.rescheduleCount || 0}/{info.maxReschedule || 2} lần
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
                                        <span>Ghế ({currentSeats.length} ghế)</span>
                                        <strong>
                                            {currentSeats.map(s => `${s.seat_row}${s.seat_number}`).join(', ')}
                                        </strong>
                                    </div>
                                </div>
                                <div className="rsvp-info-item">
                                    <Wallet size={16} />
                                    <div>
                                        <span>Giá vé cũ</span>
                                        <strong>{formatMoney(booking.total_amount)} điểm</strong>
                                    </div>
                                </div>
                            </div>
                        </section>

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
                                        <p>Cùng phim, cùng rạp, chỉ đổi giờ và ghế</p>
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
                                                                onClick={() => setSelectedShowtime(opt)}
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

                    </section>

                    {/* SIDEBAR */}
                    <aside className="booking-sidebar-column">
                        <div className="sidebar-sticky">
                            <BookingSidebar
                                movie={{
                                    movie_id: booking.movie_id,
                                    title: booking.movie_title,
                                    movie_poster: booking.movie_poster,
                                    duration: booking.movie_duration
                                }}
                                showtimeDetail={null}
                                selectedCinema={{
                                    cinema_name: booking.cinema_name
                                }}
                                selectedDate={selectedShowtime
                                    ? formatDateTime(selectedShowtime.start_time).date
                                    : oldDT.date
                                }
                                selectedShowtime={selectedShowtime || {
                                    time: oldDT.time,
                                    start_time: booking.start_time,
                                    room_name: booking.room_name,
                                    room_type: booking.room_type
                                }}
                                selectedSeats={[]}
                                selectedFoods={[]}
                                totalTicketPrice={0}
                                totalFoodPrice={0}
                                grandTotal={0}
                                isTimerActive={false}
                                onExpire={() => {}}
                                showContinueButton={true}
                                showBackButton={false}
                                continueText="CHỌN GHẾ"
                                onContinue={handleContinue}
                                isContinueDisabled={!canContinue}
                            />
                        </div>
                    </aside>

                </div>
            </main>
        </div>
    );
};

export default RescheduleSelect;