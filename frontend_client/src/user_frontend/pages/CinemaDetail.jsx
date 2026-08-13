import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/api';

import {
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Film,
  CalendarDays,
  Clock3
} from 'lucide-react';

// SWIPER
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/effect-fade';

// 👇 Import MovieCard
import MovieCard from '../components/MovieCard';

import '../styles/CinemaDetail.css';

// ============================================================
//  HELPER: Lấy URL poster từ nhiều trường
// ============================================================
const getPosterUrl = (movie) => {
  if (!movie) return '';
  // Ưu tiên poster_url (từ API cinema detail)
  const url = movie.poster_url || movie.movie_poster || '';
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `https://api.quangdungcinema.id.vn/uploads/posters/${url}`;
};

// ============================================================
//  MAIN COMPONENT
// ============================================================
const CinemaDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [banners, setBanners] = useState([]);
  const [bannerLoading, setBannerLoading] = useState(true);

  // ===== FETCH BANNER =====
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setBannerLoading(true);
        const res = await api.get('/api/banners?page=CINEMA');
        const bannerData = res.data?.data || [];
        setBanners(Array.isArray(bannerData) ? bannerData : []);
      } catch (error) {
        console.error('Lỗi tải banner:', error);
        setBanners([]);
      } finally {
        setBannerLoading(false);
      }
    };
    fetchBanners();
  }, []);

  // ===== DATE LIST =====
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

  // ===== FETCH CINEMA DATA =====
  useEffect(() => {
    const fetchCinema = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/cinemas/detail/${slug}`);
        let cinemaData = null;
        let moviesData = [];
        if (res.data.cinema_name) {
          cinemaData = res.data;
          moviesData = res.data.movies || [];
        } else if (res.data.cinema) {
          cinemaData = res.data.cinema;
          moviesData = res.data.movies || [];
        } else {
          const nested = res.data.data;
          if (nested && nested.cinema_name) {
            cinemaData = nested;
            moviesData = nested.movies || [];
          } else if (nested && nested.cinema) {
            cinemaData = nested.cinema;
            moviesData = nested.movies || [];
          } else {
            console.warn('Không tìm thấy dữ liệu cinema', res.data);
          }
        }

        // Chuẩn hóa movies: thêm trường movie_poster để MovieCard nhận
        const normalizedMovies = moviesData.map(movie => ({
          ...movie,
          movie_poster: getPosterUrl(movie),
          // Các trường khác có thể thiếu, set default để MovieCard không bị lỗi
          average_rating: movie.avg_rating || movie.average_rating || 0,
          total_reviews: movie.total_reviews || 0,
          age_rating: movie.age_rating || 'T18',
          language: movie.language || 'Phụ đề',
          is_hot: movie.is_hot || false,
          is_new: movie.is_new || false,
        }));

        setData({ cinema: cinemaData, movies: normalizedMovies });
      } catch (err) {
        console.error(err);
        setData({ cinema: null, movies: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchCinema();
    window.scrollTo(0, 0);
  }, [slug]);

  // ============================================================
  //  LOADING / ERROR
  // ============================================================
  if (loading) {
    return (
      <div className="cinema-loading">
        <Loader2 size={45} className="spin-icon" />
      </div>
    );
  }

  const cinema = data?.cinema;
  const movies = data?.movies || [];

  if (!cinema) {
    return (
      <div className="cinema-error">
        <Film size={60} />
        <h2>Không tìm thấy rạp</h2>
        <p>Rạp chiếu phim không tồn tại hoặc đã bị xóa.</p>
        <button className="btn-back-home" onClick={() => navigate('/')}>
          Về trang chủ
        </button>
      </div>
    );
  }

  // ===== FILTER MOVIES =====
  const filteredMovies = movies.filter(movie =>
    movie.showtimes?.some(st => st.start_time.startsWith(selectedDate))
  );

  const hasBanners = banners.length > 0;

  // ===== HANDLE CLICK CARD =====
  const handleMovieClick = (movie) => {
    // Ví dụ: chuyển đến trang chi tiết phim
    navigate(`/movie/${movie.movie_id}`);
    // Hoặc mở preview modal nếu bạn có
  };

  // ============================================================
  //  RENDER
  // ============================================================
  return (
    <div className="cinema-detail-page">

      {/* BANNER */}
      <div className="cinema-hero">
        <div className="cinema-overlay"></div>
        <div className="hero-light"></div>
        <div className="cinema-particles"></div>

        <Swiper
          modules={[Autoplay, EffectFade]}
          effect="fade"
          speed={1200}
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          loop={hasBanners && banners.length > 1}
          className="hero-swiper"
        >
          {hasBanners ? (
            banners.map((banner, idx) => (
              <SwiperSlide key={banner.banner_id || idx}>
                <img
                  src={banner.image_url}
                  alt={`Banner ${idx + 1}`}
                  className="hero-bg"
                />
              </SwiperSlide>
            ))
          ) : (
            <SwiperSlide>
              <div className="hero-bg" style={{
                background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888',
                fontSize: '2rem',
                fontWeight: 'bold'
              }}>
                🎬 Cinema Banner
              </div>
            </SwiperSlide>
          )}
        </Swiper>
      </div>

      {/* CONTENT */}
      <div className="cinema-content">

        {/* INFO RẠP */}
        <div className="cinema-info-block">
          <span className="cinema-label">HỆ THỐNG RẠP</span>
          <h1 className="cinema-name">{cinema.cinema_name || 'Rạp chiếu phim'}</h1>
          <div className="cinema-divider"></div>
          <div className="cinema-info-list">
            <div className="info-item">
              <MapPin size={18} />
              <span>{cinema.address || 'Địa chỉ chưa cập nhật'}{cinema.city ? `, ${cinema.city}` : ''}</span>
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

        {/* PHIM ĐANG CHIẾU */}
        <div className="section-title">
          <Film size={24} />
          <h2>PHIM ĐANG CHIẾU</h2>
        </div>

        {/* DATE LIST */}
        <div className="date-wrapper">
          <button className="date-nav" onClick={() => {
            const container = document.querySelector('.date-list');
            if (container) container.scrollBy({ left: -200, behavior: 'smooth' });
          }}>
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
          <button className="date-nav" onClick={() => {
            const container = document.querySelector('.date-list');
            if (container) container.scrollBy({ left: 200, behavior: 'smooth' });
          }}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* MOVIE GRID - SỬ DỤNG MOVIECARD */}
        {filteredMovies.length > 0 ? (
          <div className="movie-grid">
            {filteredMovies.map((movie, index) => {
              const movieShowtimes = movie.showtimes.filter(st =>
                st.start_time.startsWith(selectedDate)
              );

              return (
                <div key={movie.movie_id} className="movie-card-wrapper">
                  {/* MovieCard */}
                  <MovieCard
                    movie={movie}
                    onClick={() => handleMovieClick(movie)}
                    index={index}
                  />

                  {/* Showtimes - hiển thị bên dưới card */}
                  {/* <div className="showtime-list">
                    {movieShowtimes.slice(0, 4).map((st, idx) => (
                      <button
                        key={idx}
                        className="showtime-btn"
                        onClick={(e) => {
                          e.stopPropagation(); // tránh kích hoạt click card
                          navigate(`/booking/${st.showtime_id}`);
                        }}
                      >
                        <Clock3 size={14} />
                        {new Date(st.start_time).toLocaleTimeString(
                          [],
                          { hour: '2-digit', minute: '2-digit', hour12: false }
                        )}
                      </button>
                    ))}
                    {movieShowtimes.length > 4 && (
                      <span className="showtime-more">+{movieShowtimes.length - 4} suất</span>
                    )}
                  </div> */}
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

        {/* MAP */}
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