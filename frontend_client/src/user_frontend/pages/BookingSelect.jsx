import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';

import {
  MapPin,
  Film,
  Calendar,
  Clock,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  Building2
} from 'lucide-react';

import BookingSidebar from '../components/BookingSidebar';

import '../styles/BookingSelect.css';

// ============================================================
// MAIN COMPONENT
// ============================================================
const BookingSelect = () => {
  const navigate = useNavigate();

  // ===== STATE =====
  const [cinemas, setCinemas] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedShowtime, setSelectedShowtime] = useState(null);

  const [openSection, setOpenSection] = useState('cinema');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchCinema, setSearchCinema] = useState('');

  // ==================================================
  // LOAD DATA — 1 API DUY NHẤT
  // ==================================================
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get('/api/showtimes/booking');
        const data = res.data?.data || res.data;

        setCinemas(data.cinemas || []);
        setCities(data.cities || []);
      } catch (err) {
        console.error('Lỗi load booking:', err);
        setError(
          err.response?.data?.message ||
          'Không thể tải dữ liệu. Vui lòng thử lại!'
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ==================================================
  // FILTER RẠP
  // ==================================================
  const filteredCinemas = useMemo(() => {
    let list = cinemas;

    if (selectedCity) {
      list = list.filter(c => c.city === selectedCity);
    }

    if (searchCinema.trim()) {
      const keyword = searchCinema.toLowerCase();
      list = list.filter(c =>
        c.cinema_name?.toLowerCase().includes(keyword) ||
        c.address?.toLowerCase().includes(keyword)
      );
    }

    return list;
  }, [cinemas, selectedCity, searchCinema]);

  // ==================================================
  // HANDLERS
  // ==================================================
  const handleSelectCinema = (cinema) => {
    setSelectedCinema(cinema);
    setSelectedMovie(null);
    setSelectedDate(null);
    setSelectedShowtime(null);
    setOpenSection('movie');
  };

  const handleSelectMovie = (movie) => {
    setSelectedMovie(movie);
    setSelectedDate(null);
    setSelectedShowtime(null);

    if (movie.dates?.length > 0) {
      setSelectedDate(movie.dates[0]);
      setOpenSection('showtime');
    }
  };

  const handleSelectDate = (dateEntry) => {
    setSelectedDate(dateEntry);
    setSelectedShowtime(null);
    setOpenSection('showtime');
  };

  const handleSelectShowtime = (showtime) => {
    setSelectedShowtime(showtime);
  };

  // ==================================================
  // HANDLE CONTINUE — Navigate sang /booking/:slug với state
  // ==================================================
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

  const toggleSection = (section) => {
    setOpenSection(prev => prev === section ? null : section);
  };

  // ==================================================
  // COMPUTED
  // ==================================================
  const moviesOfCinema = selectedCinema?.movies || [];
  const datesOfMovie = selectedMovie?.dates || [];
  const showtimesOfDate = selectedDate?.showtimes || [];

  const showtimesByType = useMemo(() => {
    const grouped = {};
    showtimesOfDate.forEach(st => {
      const type = st.room_type || 'OTHER';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(st);
    });
    return grouped;
  }, [showtimesOfDate]);

  const canContinue = Boolean(
    selectedCinema &&
    selectedMovie &&
    selectedDate &&
    selectedShowtime
  );

  // ==================================================
  // LOADING
  // ==================================================
  if (loading) {
    return (
      <div className="booking-select-page">
        <div className="booking-loading-full">
          <Loader2 size={50} className="spin-icon" />
          <span>Đang tải dữ liệu đặt vé...</span>
        </div>
      </div>
    );
  }

  // ==================================================
  // ERROR
  // ==================================================
  if (error) {
    return (
      <div className="booking-select-page">
        <div className="booking-error-full">
          <AlertCircle size={50} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // ==================================================
  // RENDER
  // ==================================================
  return (
    <div className="booking-select-page">

      {/* HEADER */}
      <div className="booking-page-header">
        <div className="booking-page-header__inner">
          <h1>Đặt vé xem phim</h1>
          <p>Chọn rạp, phim và suất chiếu để bắt đầu</p>
        </div>
      </div>

      {/* STEP INDICATOR */}
      <div className="booking-steps-bar">
        <div className="booking-steps-bar__inner">
          <div className="booking-step-item active">
            <span className="booking-step-item__num">1</span>
            <span className="booking-step-item__label">Chọn phim / Rạp / Suất</span>
          </div>
          <div className="booking-step-item__line" />
          <div className="booking-step-item">
            <span className="booking-step-item__num">2</span>
            <span className="booking-step-item__label">Chọn ghế</span>
          </div>
          <div className="booking-step-item__line" />
          <div className="booking-step-item">
            <span className="booking-step-item__num">3</span>
            <span className="booking-step-item__label">Thanh toán</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="booking-select-content">

        {/* ===== LEFT: ACCORDIONS ===== */}
        <div className="booking-select-main">

          {/* SECTION 1: CHỌN RẠP */}
          <div className={`booking-accordion ${openSection === 'cinema' ? 'open' : ''}`}>
            <button
              type="button"
              className="booking-accordion__header"
              onClick={() => toggleSection('cinema')}
            >
              <div className="booking-accordion__title">
                <Building2 size={20} />
                <span>Chọn vị trí / Rạp</span>
                {selectedCinema && (
                  <span className="booking-accordion__selected">
                    {selectedCinema.cinema_name}
                  </span>
                )}
              </div>
              <ChevronDown size={20} className="booking-accordion__icon" />
            </button>

            {openSection === 'cinema' && (
              <div className="booking-accordion__body">
                <div className="booking-search">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Tìm rạp theo tên hoặc địa chỉ..."
                    value={searchCinema}
                    onChange={(e) => setSearchCinema(e.target.value)}
                  />
                </div>

                {cities.length > 0 && (
                  <div className="booking-city-filter">
                    <button
                      type="button"
                      className={`booking-city-chip ${!selectedCity ? 'active' : ''}`}
                      onClick={() => setSelectedCity(null)}
                    >
                      Tất cả
                    </button>
                    {cities.map(city => (
                      <button
                        key={city}
                        type="button"
                        className={`booking-city-chip ${selectedCity === city ? 'active' : ''}`}
                        onClick={() => setSelectedCity(city)}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}

                {filteredCinemas.length > 0 ? (
                  <div className="booking-cinemas-grid">
                    {filteredCinemas.map(cinema => (
                      <button
                        key={cinema.cinema_id}
                        type="button"
                        className={`booking-cinema-card ${selectedCinema?.cinema_id === cinema.cinema_id ? 'active' : ''}`}
                        onClick={() => handleSelectCinema(cinema)}
                      >
                        <div className="booking-cinema-card__icon">
                          <MapPin size={20} />
                        </div>
                        <div className="booking-cinema-card__info">
                          <strong>{cinema.cinema_name}</strong>
                          <span>{cinema.address}</span>
                          {cinema.city && (
                            <span className="booking-cinema-card__city">
                              {cinema.city}
                            </span>
                          )}
                        </div>
                        {selectedCinema?.cinema_id === cinema.cinema_id && (
                          <CheckCircle2 size={20} className="booking-cinema-card__check" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="booking-empty">
                    <AlertCircle size={32} />
                    <span>Không tìm thấy rạp nào</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: CHỌN PHIM */}
          {selectedCinema && (
            <div className={`booking-accordion ${openSection === 'movie' ? 'open' : ''}`}>
              <button
                type="button"
                className="booking-accordion__header"
                onClick={() => toggleSection('movie')}
              >
                <div className="booking-accordion__title">
                  <Film size={20} />
                  <span>Chọn phim</span>
                  {selectedMovie && (
                    <span className="booking-accordion__selected">
                      {selectedMovie.title}
                    </span>
                  )}
                </div>
                <ChevronDown size={20} className="booking-accordion__icon" />
              </button>

              {openSection === 'movie' && (
                <div className="booking-accordion__body">
                  {moviesOfCinema.length > 0 ? (
                    <div className="booking-movies-grid">
                      {moviesOfCinema.map(movie => (
                        <button
                          key={movie.movie_id}
                          type="button"
                          className={`booking-movie-card ${selectedMovie?.movie_id === movie.movie_id ? 'active' : ''}`}
                          onClick={() => handleSelectMovie(movie)}
                        >
                          <div className="booking-movie-card__poster">
                            <img
                              src={movie.movie_poster}
                              alt={movie.title}
                              loading="lazy"
                            />
                            {movie.age_rating > 0 && (
                              <span className="booking-movie-card__rating">
                                T{movie.age_rating}
                              </span>
                            )}
                          </div>
                          <div className="booking-movie-card__info">
                            <h4>{movie.title}</h4>
                            <span>{movie.duration} phút</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="booking-empty">
                      <AlertCircle size={32} />
                      <span>Rạp này chưa có phim nào</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: CHỌN NGÀY */}
          {selectedMovie && datesOfMovie.length > 0 && (
            <div className={`booking-accordion ${openSection === 'date' ? 'open' : ''}`}>
              <button
                type="button"
                className="booking-accordion__header"
                onClick={() => toggleSection('date')}
              >
                <div className="booking-accordion__title">
                  <Calendar size={20} />
                  <span>Chọn ngày</span>
                  {selectedDate && (
                    <span className="booking-accordion__selected">
                      {selectedDate.full_label}
                    </span>
                  )}
                </div>
                <ChevronDown size={20} className="booking-accordion__icon" />
              </button>

              {openSection === 'date' && (
                <div className="booking-accordion__body">
                  <div className="booking-dates-scroll">
                    {datesOfMovie.map(dateEntry => (
                      <button
                        key={dateEntry.date}
                        type="button"
                        className={`booking-date-btn ${selectedDate?.date === dateEntry.date ? 'active' : ''} ${dateEntry.is_weekend ? 'weekend' : ''}`}
                        onClick={() => handleSelectDate(dateEntry)}
                      >
                        <span className="booking-date-btn__day">
                          {dateEntry.label}
                        </span>
                        <span className="booking-date-btn__num">
                          {dateEntry.day}/{dateEntry.month}
                        </span>
                        {dateEntry.is_weekend && (
                          <span className="booking-date-btn__dot" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: CHỌN SUẤT */}
          {selectedDate && (
            <div className={`booking-accordion ${openSection === 'showtime' ? 'open' : ''}`}>
              <button
                type="button"
                className="booking-accordion__header"
                onClick={() => toggleSection('showtime')}
              >
                <div className="booking-accordion__title">
                  <Clock size={20} />
                  <span>Chọn suất chiếu</span>
                  {selectedShowtime ? (
                    <span className="booking-accordion__selected">
                      {selectedShowtime.time} · {selectedShowtime.room_type}
                    </span>
                  ) : (
                    <span className="booking-accordion__selected">
                      {showtimesOfDate.length} suất
                    </span>
                  )}
                </div>
                <ChevronDown size={20} className="booking-accordion__icon" />
              </button>

              {openSection === 'showtime' && (
                <div className="booking-accordion__body">
                  {Object.keys(showtimesByType).length > 0 ? (
                    <div className="booking-showtimes-container">
                      {Object.entries(showtimesByType).map(([roomType, list]) => (
                        <div key={roomType} className="booking-showtime-group">
                          <div className="booking-showtime-group__header">
                            <span className="booking-showtime-group__type">
                              {roomType}
                            </span>
                            <span className="booking-showtime-group__count">
                              {list.length} suất
                            </span>
                          </div>
                          <div className="booking-showtime-group__grid">
                            {list.map(st => (
                              <button
                                key={st.showtime_id}
                                type="button"
                                className={`booking-showtime-btn ${selectedShowtime?.showtime_id === st.showtime_id ? 'active' : ''}`}
                                onClick={() => handleSelectShowtime(st)}
                              >
                                <span className="booking-showtime-btn__time">
                                  {st.time}
                                </span>
                                <span className="booking-showtime-btn__room">
                                  {st.room_name}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="booking-empty">
                      <AlertCircle size={32} />
                      <span>Ngày này chưa có suất chiếu</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ===== RIGHT: BOOKING SIDEBAR ===== */}
        <aside className="booking-select-sidebar">
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
              continueText="TIẾP TỤC CHỌN GHẾ"
              onContinue={handleContinue}
              isContinueDisabled={!canContinue}
            />
          </div>
        </aside>

      </div>
    </div>
  );
};

export default BookingSelect;