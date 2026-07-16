import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

import {
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
  Building2,
  ExternalLink,
  Loader2,
  Film,
  CalendarDays,
  Clock3,
  Star
} from 'lucide-react';

// SWIPER
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/effect-fade';

import '../styles/CinemaDetail.css';

const CinemaDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // ✅ Mảng ảnh cinema (giống UserHome)
  const cinemaImages = [
    "cinema1.png",
    "cinema2.png",
    "cinema3.png",
    "cinema4.png"
  ];

  const cinemaBaseUrl = "https://api.quangdungcinema.id.vn/uploads/cinema_map/";

  // =====================================================
  // DATE LIST
  // =====================================================
  const dateList = useMemo(() => {
    const weekdays = ['CN', 'THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7'];
    const arr = [];
    for (let i = 0; i < 8; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      arr.push({
        fullDate: date.toISOString().split('T')[0],
        dayText: i === 0 ? 'HÔM NAY' : weekdays[date.getDay()],
        dateDisplay: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      });
    }
    return arr;
  }, []);

  // =====================================================
  // FETCH
  // =====================================================
  useEffect(() => {
    const fetchCinema = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`https://api.quangdungcinema.id.vn/api/cinemas/${slug}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCinema();
    window.scrollTo(0, 0);
  }, [slug]);

  // =====================================================
  // LOADING / ERROR
  // =====================================================
  if (loading) {
    return (
      <div className="cinema-loading">
        <Loader2 size={45} className="spin-icon" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="cinema-error">
        <Film size={60} />
        <h2>Không tìm thấy rạp</h2>
      </div>
    );
  }

  const { cinema, movies } = data;

  // =====================================================
  // FILTER MOVIES
  // =====================================================
  const filteredMovies = movies.filter(movie =>
    movie.showtimes?.some(st => st.start_time.startsWith(selectedDate))
  );

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="cinema-detail-page">

      {/* =====================================================
          BANNER - SWIPER 4 ẢNH CINEMA (KHÔNG CHỮ)
      ===================================================== */}
      <div className="cinema-hero">
        <div className="cinema-overlay"></div>
        <div className="hero-light"></div>
        <div className="cinema-particles"></div>

        <Swiper
          modules={[Autoplay, EffectFade]}
          effect="fade"
          speed={1200}
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          loop={true}
          className="hero-swiper"
        >
          {cinemaImages.map((img, idx) => (
            <SwiperSlide key={idx}>
              <img
                src={`${cinemaBaseUrl}${img}`}
                alt={`Cinema ${idx + 1}`}
                className="hero-bg"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}
      <div className="cinema-content">

        {/* =====================================================
            THÔNG TIN RẠP (ĐÃ CHUYỂN XUỐNG ĐÂY)
        ===================================================== */}
        <div className="cinema-info-block">
          <span className="cinema-label">HỆ THỐNG RẠP</span>
          <h1 className="cinema-name">{cinema.cinema_name}</h1>
          <div className="cinema-divider"></div>
          <div className="cinema-info-list">
            <div className="info-item">
              <MapPin size={18} />
              <span>{cinema.address}, {cinema.city}</span>
            </div>
            <div className="info-item">
              <Phone size={18} />
              <span>{cinema.hotline || '1900 2224'}</span>
            </div>
            {cinema.map_link && (
              <a href={cinema.map_link} target="_blank" rel="noreferrer" className="cinema-map-link">
                <ExternalLink size={18} />
                Xem Google Maps
              </a>
            )}
          </div>
        </div>

        {/* =====================================================
            MOVIE SECTION
        ===================================================== */}
        <div className="section-title">
          <Film size={24} />
          <h2>PHIM ĐANG CHIẾU</h2>
        </div>

        {/* DATE LIST */}
        <div className="date-wrapper">
          <button className="date-nav">
            <ChevronLeft size={20} />
          </button>
          <div className="date-list">
            {dateList.map((item, index) => (
              <button
                key={index}
                className={`date-card ${selectedDate === item.fullDate ? 'active' : ''}`}
                onClick={() => setSelectedDate(item.fullDate)}
              >
                <span className="date-day">{item.dayText}</span>
                <span className="date-number">{item.dateDisplay}</span>
              </button>
            ))}
          </div>
          <button className="date-nav">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* MOVIE GRID */}
        {filteredMovies.length > 0 ? (
          <div className="movie-grid">
            {filteredMovies.map(movie => {
              const movieShowtimes = movie.showtimes.filter(st =>
                st.start_time.startsWith(selectedDate)
              );
              return (
                <div key={movie.movie_id} className="movie-card">
                  <div className="movie-poster">
                    <img
                      src={`https://api.quangdungcinema.id.vn/uploads/posters/${movie.poster_url}`}
                      alt={movie.title}
                    />
                    <div className="movie-overlay">
                      <button
                        className="booking-btn"
                        onClick={() => {
                          if (movieShowtimes.length > 0) {
                            navigate(`/booking/${movieShowtimes[0].showtime_id}`);
                          }
                        }}
                      >
                        ĐẶT VÉ
                      </button>
                    </div>
                  </div>
                  <div className="movie-info">
                    <h3>{movie.title}</h3>
                    <div className="movie-meta">
                      <div>
                        <Star size={14} />
                        <span>{movie.avg_rating || '0.0'}</span>
                      </div>
                      <div>
                        <CalendarDays size={14} />
                        <span>2D Phụ Đề</span>
                      </div>
                    </div>
                    <div className="showtime-list">
                      {movieShowtimes.slice(0, 4).map((st, idx) => (
                        <button
                          key={idx}
                          className="showtime-btn"
                          onClick={() => navigate(`/booking/${st.showtime_id}`)}
                        >
                          <Clock3 size={14} />
                          {new Date(st.start_time).toLocaleTimeString(
                            [],
                            { hour: '2-digit', minute: '2-digit', hour12: false }
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-box">
            <Film size={60} />
            <h3>Không có suất chiếu</h3>
            <p>Hiện chưa có lịch chiếu cho ngày này.</p>
          </div>
        )}

        {/* =====================================================
            MAP SECTION
        ===================================================== */}
        {cinema.map_link && (
          <div className="map-section">
            <div className="section-title">
              <MapPin size={24} />
              <h2>VỊ TRÍ RẠP</h2>
            </div>
            <div className="map-wrapper">
              <iframe
                src={cinema.map_link}
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Cinema Map"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CinemaDetail;