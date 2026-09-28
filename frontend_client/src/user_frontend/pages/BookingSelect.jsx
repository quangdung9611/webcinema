import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
    useCallback
} from 'react';

import {
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
    CalendarDays,
    Building2
} from 'lucide-react';

import BookingSidebar from '../components/BookingSidebar';
import BookingProgress from '../components/BookingProgress';

import '../styles/BookingSelect.css';

/* ============================================================
   HOOKS — POINTER TRACKING
============================================================ */

const usePagePointer = () => {
    useEffect(() => {
        let rafId = null;

        const handleMove = e => {
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                const root = document.documentElement;
                root.style.setProperty('--page-mx', `${e.clientX}px`);
                root.style.setProperty('--page-my', `${e.clientY}px`);
                rafId = null;
            });
        };

        window.addEventListener('mousemove', handleMove, { passive: true });
        return () => {
            window.removeEventListener('mousemove', handleMove);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);
};

const usePointerTracking = (options = {}) => {
    const { tilt = false, maxTilt = 8 } = options;
    const ref = useRef(null);

    const handleMove = useCallback(
        e => {
            const el = ref.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const px = (x / rect.width) * 100;
            const py = (y / rect.height) * 100;

            el.style.setProperty('--mx', `${px}%`);
            el.style.setProperty('--my', `${py}%`);

            if (tilt) {
                const rx = ((px - 50) / 50) * maxTilt;
                const ry = ((py - 50) / 50) * maxTilt;
                el.style.setProperty('--rx', `${rx}`);
                el.style.setProperty('--ry', `${ry}`);
            }
        },
        [tilt, maxTilt]
    );

    const handleLeave = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        el.style.removeProperty('--mx');
        el.style.removeProperty('--my');
        el.style.removeProperty('--rx');
        el.style.removeProperty('--ry');
    }, []);

    return { ref, onMouseMove: handleMove, onMouseLeave: handleLeave };
};

/* ============================================================
   MAGNETIC WRAPPER — cho arrow
============================================================ */

const MagneticWrap = ({ children, strength = 4, className = '' }) => {
    const ref = useRef(null);

    const handleMove = useCallback(
        e => {
            const el = ref.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
            const dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
            el.style.setProperty('--dx', dx.toFixed(3));
            el.style.setProperty('--dy', dy.toFixed(3));
        },
        []
    );

    const handleLeave = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty('--dx', '0');
        el.style.setProperty('--dy', '0');
    }, []);

    return (
        <span
            ref={ref}
            className={className}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            style={{
                display: 'inline-flex',
                transform: `translate(calc(var(--dx,0) * ${strength}px), calc(var(--dy,0) * ${strength}px))`
            }}
        >
            {children}
        </span>
    );
};

/* ============================================================
   BOOKING SELECT
============================================================ */

const BookingSelect = () => {
    const navigate = useNavigate();

    usePagePointer();

    /* ========================================================
       DATA
    ======================================================== */

    const [cinemas, setCinemas] = useState([]);
    const [cities, setCities] = useState([]);

    /* ========================================================
       SELECTED
    ======================================================== */

    const [selectedCity, setSelectedCity] = useState(null);
    const [selectedCinema, setSelectedCinema] = useState(null);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedShowtime, setSelectedShowtime] = useState(null);

    /* ========================================================
       UI STATE — dùng cho logic nội bộ (không render stepbar)
    ======================================================== */

    const [currentStep, setCurrentStep] = useState(1);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const movieScrollRef = useRef(null);
    const dateScrollRef = useRef(null);

    const panel1 = usePointerTracking();
    const panel2 = usePointerTracking();
    const panel3 = usePointerTracking();

    /* ========================================================
       LOAD BOOKING DATA
    ======================================================== */

    useEffect(() => {
        let mounted = true;

        const loadBookingData = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await api.get('/api/showtimes/booking');

                const data = response?.data?.data || response?.data || {};

                const cinemaList = Array.isArray(data.cinemas) ? data.cinemas : [];
                const cityList = Array.isArray(data.cities) ? data.cities : [];

                if (!mounted) return;

                setCinemas(cinemaList);
                setCities(cityList);

                setSelectedCity(cityList.length > 0 ? cityList[0] : null);
            } catch (err) {
                console.error('BookingSelect load error:', err);
                if (!mounted) return;
                setError(
                    err?.response?.data?.message ||
                    'Không thể tải dữ liệu đặt vé. Vui lòng thử lại.'
                );
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadBookingData();

        return () => {
            mounted = false;
        };
    }, []);

    /* ========================================================
       MEMO
    ======================================================== */

    const cinemasOfCity = useMemo(() => {
        if (!selectedCity) return cinemas;
        return cinemas.filter(cinema => cinema.city === selectedCity);
    }, [cinemas, selectedCity]);

    const moviesOfCinema = useMemo(() => {
        if (!selectedCinema) return [];
        return Array.isArray(selectedCinema.movies) ? selectedCinema.movies : [];
    }, [selectedCinema]);

    const datesOfMovie = useMemo(() => {
        if (!selectedMovie) return [];
        return Array.isArray(selectedMovie.dates) ? selectedMovie.dates : [];
    }, [selectedMovie]);

    const showtimesOfDate = useMemo(() => {
        if (!selectedDate) return [];
        return Array.isArray(selectedDate.showtimes) ? selectedDate.showtimes : [];
    }, [selectedDate]);

    const groupedShowtimes = useMemo(() => {
        const groups = {};

        showtimesOfDate.forEach(showtime => {
            const roomName = showtime.room_name || 'Phòng chiếu';
            const roomType = showtime.room_type || '';
            const key = `${roomName}__${roomType}`;

            if (!groups[key]) {
                groups[key] = {
                    room_name: roomName,
                    room_type: roomType,
                    showtimes: []
                };
            }

            groups[key].showtimes.push(showtime);
        });

        return Object.values(groups);
    }, [showtimesOfDate]);

    /* ========================================================
       HANDLERS
    ======================================================== */

    const handleSelectCity = city => {
        setSelectedCity(city);
        setSelectedCinema(null);
        setSelectedMovie(null);
        setSelectedDate(null);
        setSelectedShowtime(null);
        setCurrentStep(1);
    };

    const handleSelectCinema = cinema => {
        setSelectedCinema(cinema);
        setSelectedMovie(null);
        setSelectedDate(null);
        setSelectedShowtime(null);
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSelectMovie = movie => {
        setSelectedMovie(movie);
        setSelectedShowtime(null);

        const firstDate =
            Array.isArray(movie.dates) && movie.dates.length > 0
                ? movie.dates[0]
                : null;

        setSelectedDate(firstDate);
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSelectDate = date => {
        setSelectedDate(date);
        setSelectedShowtime(null);
    };

    const handleSelectShowtime = showtime => {
        setSelectedShowtime(showtime);
    };

    const scrollMovies = direction => {
        if (!movieScrollRef.current) return;
        movieScrollRef.current.scrollBy({
            left: direction * 480,
            behavior: 'smooth'
        });
    };

    const scrollDates = direction => {
        if (!dateScrollRef.current) return;
        dateScrollRef.current.scrollBy({
            left: direction * 240,
            behavior: 'smooth'
        });
    };

    const canContinue = Boolean(
        selectedCinema && selectedMovie && selectedDate && selectedShowtime
    );

    const handleContinue = () => {
        if (!canContinue) return;

        navigate(`/booking/${selectedMovie.slug}`, {
            state: {
                movie: {
                    movie_id: selectedMovie.movie_id,
                    title: selectedMovie.title,
                    slug: selectedMovie.slug,
                    movie_poster: selectedMovie.movie_poster,
                    duration: selectedMovie.duration,
                    age_rating: selectedMovie.age_rating
                },
                cinema: {
                    cinema_id: selectedCinema.cinema_id,
                    cinema_name: selectedCinema.cinema_name,
                    slug: selectedCinema.slug,
                    address: selectedCinema.address,
                    city: selectedCinema.city
                },
                date: selectedDate.date,
                showtime: {
                    showtime_id: selectedShowtime.showtime_id,
                    start_time: selectedShowtime.start_time,
                    time: selectedShowtime.time,
                    room_id: selectedShowtime.room_id,
                    room_name: selectedShowtime.room_name,
                    room_type: selectedShowtime.room_type
                }
            }
        });
    };

    const getImageUrl = image => image || '';

    /* ========================================================
       LOADING
    ======================================================== */

    if (loading) {
        return (
            <div className="booking-select-page">
                <div className="booking-state">
                    <Loader2 size={42} className="booking-state__spinner" />
                    <h2>Đang tải dữ liệu đặt vé</h2>
                    <p>Vui lòng chờ một chút...</p>
                </div>
            </div>
        );
    }

    /* ========================================================
       ERROR
    ======================================================== */

    if (error) {
        return (
            <div className="booking-select-page">
                <div className="booking-state booking-state--error">
                    <AlertCircle size={44} />
                    <h2>Không thể tải dữ liệu</h2>
                    <p>{error}</p>
                    <button
                        type="button"
                        className="booking-state__retry"
                        onClick={() => window.location.reload()}
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    /* ========================================================
       RENDER
    ======================================================== */

    return (
        <div className="booking-select-page">

            {/* ==================================================
                HEADER
            ================================================== */}
            <header className="booking-page-header">
                <div className="booking-container">
                    <div className="booking-page-header__eyebrow">
                        QUANG DŨNG CINEMA
                    </div>
                    <h1>ĐẶT VÉ XEM PHIM</h1>
                    <p>
                        Chọn rạp, phim và suất chiếu
                        để bắt đầu hành trình điện ảnh.
                    </p>
                </div>
            </header>

            {/* ==================================================
                ✅ BOOKING PROGRESS — 4 BƯỚC
            ================================================== */}
            <div className="booking-container booking-progress-block">
                <BookingProgress currentStep={1} />
            </div>

            {/* ==================================================
                MAIN
            ================================================== */}
            <main className="booking-container booking-main">
                <div className="booking-layout">

                    <section className="booking-selection">

                        {/* ================= STEP 1 — CHỌN RẠP ================= */}
                        <section
                            className={`booking-panel ${currentStep === 1 ? 'booking-panel--active' : ''}`}
                            ref={panel1.ref}
                            onMouseMove={panel1.onMouseMove}
                            onMouseLeave={panel1.onMouseLeave}
                        >
                            <div className="booking-panel__header">
                                <div className="booking-panel__heading">
                                    <div className="booking-panel__icon">
                                        <MapPin size={21} />
                                    </div>
                                    <div>
                                        <span className="booking-panel__eyebrow">BƯỚC 01</span>
                                        <h2>Chọn rạp</h2>
                                        <p>Chọn rạp bạn muốn xem phim.</p>
                                    </div>
                                </div>

                                {selectedCinema && (
                                    <div className="booking-panel__selected">
                                        <Check size={15} />
                                        <span>{selectedCinema.cinema_name}</span>
                                    </div>
                                )}
                            </div>

                            {cities.length > 0 && (
                                <div className="booking-city">
                                    <div className="booking-section-label">KHU VỰC</div>
                                    <div className="booking-city__list">
                                        {cities.map(city => (
                                            <button
                                                key={city}
                                                type="button"
                                                className={`booking-city__item ${selectedCity === city ? 'active' : ''}`}
                                                onClick={() => handleSelectCity(city)}
                                            >
                                                {city}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="booking-cinema-list">
                                {cinemasOfCity.length > 0 ? (
                                    cinemasOfCity.map(cinema => {
                                        const isSelected =
                                            selectedCinema?.cinema_id === cinema.cinema_id;

                                        return (
                                            <CinemaCard
                                                key={cinema.cinema_id}
                                                cinema={cinema}
                                                isSelected={isSelected}
                                                onSelect={() => handleSelectCinema(cinema)}
                                            />
                                        );
                                    })
                                ) : (
                                    <div className="booking-empty">
                                        <MapPin size={30} />
                                        <strong>Chưa có rạp</strong>
                                        <span>Hiện chưa có rạp tại khu vực này.</span>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ================= STEP 2 — CHỌN PHIM ================= */}
                        {selectedCinema && (
                            <section
                                className={`booking-panel ${currentStep === 2 ? 'booking-panel--active' : ''}`}
                                ref={panel2.ref}
                                onMouseMove={panel2.onMouseMove}
                                onMouseLeave={panel2.onMouseLeave}
                            >
                                <div className="booking-panel__header">
                                    <div className="booking-panel__heading">
                                        <div className="booking-panel__icon">
                                            <Film size={21} />
                                        </div>
                                        <div>
                                            <span className="booking-panel__eyebrow">BƯỚC 02</span>
                                            <h2>Chọn phim</h2>
                                            <p>Các phim đang có suất tại rạp đã chọn.</p>
                                        </div>
                                    </div>

                                    {selectedMovie && (
                                        <div className="booking-panel__selected">
                                            <Check size={15} />
                                            <span>{selectedMovie.title}</span>
                                        </div>
                                    )}
                                </div>

                                {moviesOfCinema.length > 0 ? (
                                    <div className="booking-movie-wrapper">
                                        <MagneticWrap className="booking-slider-arrow booking-slider-arrow--left">
                                            <button
                                                type="button"
                                                onClick={() => scrollMovies(-1)}
                                                aria-label="Phim trước"
                                            >
                                                <ChevronLeft size={22} />
                                            </button>
                                        </MagneticWrap>

                                        <div className="booking-movie-list" ref={movieScrollRef}>
                                            {moviesOfCinema.map(movie => (
                                                <MovieCard
                                                    key={movie.movie_id}
                                                    movie={movie}
                                                    isSelected={
                                                        selectedMovie?.movie_id === movie.movie_id
                                                    }
                                                    onSelect={() => handleSelectMovie(movie)}
                                                    getImageUrl={getImageUrl}
                                                />
                                            ))}
                                        </div>

                                        <MagneticWrap className="booking-slider-arrow booking-slider-arrow--right">
                                            <button
                                                type="button"
                                                onClick={() => scrollMovies(1)}
                                                aria-label="Phim tiếp theo"
                                            >
                                                <ChevronRight size={22} />
                                            </button>
                                        </MagneticWrap>
                                    </div>
                                ) : (
                                    <div className="booking-empty">
                                        <Film size={30} />
                                        <strong>Rạp này chưa có phim</strong>
                                        <span>Hiện chưa có phim nào được xếp lịch tại rạp.</span>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* ================= STEP 3 — CHỌN SUẤT CHIẾU ================= */}
                        {selectedMovie && (
                            <section
                                className={`booking-panel ${currentStep === 3 ? 'booking-panel--active' : ''}`}
                                ref={panel3.ref}
                                onMouseMove={panel3.onMouseMove}
                                onMouseLeave={panel3.onMouseLeave}
                            >
                                <div className="booking-panel__header">
                                    <div className="booking-panel__heading">
                                        <div className="booking-panel__icon">
                                            <Clock3 size={21} />
                                        </div>
                                        <div>
                                            <span className="booking-panel__eyebrow">BƯỚC 03</span>
                                            <h2>Chọn suất chiếu</h2>
                                            <p>Chọn ngày và giờ chiếu phù hợp với bạn.</p>
                                        </div>
                                    </div>

                                    {selectedShowtime && (
                                        <div className="booking-panel__selected">
                                            <Check size={15} />
                                            <span>{selectedShowtime.time}</span>
                                        </div>
                                    )}
                                </div>

                                {datesOfMovie.length > 0 && (
                                    <div className="booking-date-section">
                                        <div className="booking-section-label">NGÀY CHIẾU</div>

                                        <div className="booking-date-wrapper">
                                            <MagneticWrap className="booking-date-arrow">
                                                <button
                                                    type="button"
                                                    onClick={() => scrollDates(-1)}
                                                    aria-label="Ngày trước"
                                                >
                                                    <ChevronLeft size={20} />
                                                </button>
                                            </MagneticWrap>

                                            <div className="booking-date-list" ref={dateScrollRef}>
                                                {datesOfMovie.map(dateEntry => (
                                                    <DateCard
                                                        key={dateEntry.date}
                                                        date={dateEntry}
                                                        isSelected={
                                                            selectedDate?.date === dateEntry.date
                                                        }
                                                        onSelect={() => handleSelectDate(dateEntry)}
                                                    />
                                                ))}
                                            </div>

                                            <MagneticWrap className="booking-date-arrow">
                                                <button
                                                    type="button"
                                                    onClick={() => scrollDates(1)}
                                                    aria-label="Ngày tiếp theo"
                                                >
                                                    <ChevronRight size={20} />
                                                </button>
                                            </MagneticWrap>
                                        </div>
                                    </div>
                                )}

                                <div className="booking-showtime-context">
                                    <div>
                                        <span>RẠP</span>
                                        <strong>{selectedCinema?.cinema_name}</strong>
                                    </div>
                                    <div>
                                        <span>PHIM</span>
                                        <strong>{selectedMovie?.title}</strong>
                                    </div>
                                </div>

                                {groupedShowtimes.length > 0 ? (
                                    <div className="booking-showtime-list">
                                        {groupedShowtimes.map(group => (
                                            <div
                                                key={`${group.room_name}-${group.room_type}`}
                                                className="booking-showtime-group"
                                            >
                                                <div className="booking-showtime-group__header">
                                                    <div>
                                                        <strong>{group.room_name}</strong>
                                                        {group.room_type && (
                                                            <span>{group.room_type}</span>
                                                        )}
                                                    </div>
                                                    <span>{group.showtimes.length} suất</span>
                                                </div>

                                                <div className="booking-time-list">
                                                    {group.showtimes.map(showtime => (
                                                        <TimeChip
                                                            key={showtime.showtime_id}
                                                            showtime={showtime}
                                                            isSelected={
                                                                selectedShowtime?.showtime_id ===
                                                                showtime.showtime_id
                                                            }
                                                            onSelect={() =>
                                                                handleSelectShowtime(showtime)
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="booking-empty">
                                        <CalendarDays size={30} />
                                        <strong>Không có suất chiếu</strong>
                                        <span>Ngày này hiện chưa có suất chiếu phù hợp.</span>
                                    </div>
                                )}
                            </section>
                        )}

                    </section>

                    {/* ================= SIDEBAR ================= */}
                    <aside className="booking-sidebar-column">
                        <div className="sidebar-sticky">
                            <BookingSidebar
                                movie={selectedMovie}
                                showtimeDetail={null}
                                selectedCinema={selectedCinema}
                                selectedDate={selectedDate?.date || null}
                                selectedShowtime={selectedShowtime}
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

/* ============================================================
   SUB-COMPONENTS
============================================================ */

const CinemaCard = ({ cinema, isSelected, onSelect }) => {
    const tracker = usePointerTracking();

    return (
        <button
            type="button"
            ref={tracker.ref}
            onMouseMove={tracker.onMouseMove}
            onMouseLeave={tracker.onMouseLeave}
            className={`booking-cinema-card ${isSelected ? 'active' : ''}`}
            onClick={onSelect}
        >
            <div className="booking-cinema-card__left">
                <div className="booking-cinema-card__icon">
                    <Building2 size={22} />
                </div>

                <div className="booking-cinema-card__info">
                    <strong>{cinema.cinema_name}</strong>
                    <span>{cinema.address}</span>
                    {cinema.city && <small>{cinema.city}</small>}
                </div>
            </div>

            <div className="booking-cinema-card__check">
                {isSelected && <Check size={18} />}
            </div>
        </button>
    );
};

const MovieCard = ({ movie, isSelected, onSelect, getImageUrl }) => {
    const tracker = usePointerTracking({ tilt: true, maxTilt: 8 });

    return (
        <button
            type="button"
            ref={tracker.ref}
            onMouseMove={tracker.onMouseMove}
            onMouseLeave={tracker.onMouseLeave}
            className={`booking-movie-card ${isSelected ? 'active' : ''}`}
            onClick={onSelect}
        >
            <div className="booking-movie-card__poster">
                <img
                    src={getImageUrl(movie.movie_poster)}
                    alt={movie.title}
                    loading="lazy"
                />

                {movie.age_rating && (
                    <span className="booking-movie-card__age">T{movie.age_rating}</span>
                )}

                {isSelected && (
                    <div className="booking-movie-card__selected">
                        <Check size={20} />
                    </div>
                )}
            </div>

            <div className="booking-movie-card__body">
                <h3>{movie.title}</h3>

                <div className="booking-movie-card__meta">
                    {movie.duration && (
                        <span>
                            <Clock3 size={13} />
                            {movie.duration} phút
                        </span>
                    )}
                    {movie.nation && <span>{movie.nation}</span>}
                </div>
            </div>
        </button>
    );
};

const DateCard = ({ date, isSelected, onSelect }) => {
    const tracker = usePointerTracking();

    return (
        <button
            type="button"
            ref={tracker.ref}
            onMouseMove={tracker.onMouseMove}
            onMouseLeave={tracker.onMouseLeave}
            className={`booking-date-card ${isSelected ? 'active' : ''}`}
            onClick={onSelect}
        >
            <span className="booking-date-card__label">{date.label}</span>
            <strong>
                {date.day}/{date.month}
            </strong>

            {isSelected && (
                <span className="booking-date-card__check">
                    <Check size={13} />
                </span>
            )}
        </button>
    );
};

const TimeChip = ({ showtime, isSelected, onSelect }) => {
    const tracker = usePointerTracking();

    return (
        <button
            type="button"
            ref={tracker.ref}
            onMouseMove={tracker.onMouseMove}
            onMouseLeave={tracker.onMouseLeave}
            className={`booking-time ${isSelected ? 'active' : ''}`}
            onClick={onSelect}
        >
            <span className="booking-time__clock">
                <Clock3 size={15} />
            </span>
            <strong>{showtime.time}</strong>
            {isSelected && <Check size={16} />}
        </button>
    );
};

export default BookingSelect;