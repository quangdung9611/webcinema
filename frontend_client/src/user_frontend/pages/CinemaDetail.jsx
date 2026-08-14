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
  Clock3,
  Clock
} from 'lucide-react';

// 👇 Import MovieCard
import MovieCard from '../components/MovieCard';

import '../styles/CinemaDetail.css';

// ============================================================
//  HELPER: Lấy URL poster
// ============================================================
const getPosterUrl = (movie) => {
  if (!movie) return '';
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

        // Chuẩn hóa movies
        const normalizedMovies = moviesData.map(movie => ({
          ...movie,
          movie_poster: getPosterUrl(movie),
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

  // ===== HANDLE CLICK CARD =====
  const handleMovieClick = (movie) => {
    navigate(`/movie/${movie.movie_id}`);
  };

  // ============================================================
  //  HELPER: Lấy backdrop URL
  // ============================================================
  const getBackdropUrl = (backdrop) => {
    if (!backdrop) return '';
    if (backdrop.startsWith('http')) return backdrop;
    return `https://api.quangdungcinema.id.vn/uploads/backdrops/${backdrop}`;
  };

  const backdropImage = cinema.cinema_backdrop ? getBackdropUrl(cinema.cinema_backdrop) : null;

  // ============================================================
  //  RENDER
  // ============================================================
  return (
    <div className="cinema-detail-page">
      <div className="cinema-content">

        {/* ============================================================
            BỐ CỤC 2 CỘT 50-50: BACKDROP + THÔNG TIN RẠP
        ============================================================ */}
        <div className="cinema-hero-split">
          {/* Cột trái: Backdrop (aspect-ratio 3/2) */}
          <div className="cinema-hero-backdrop">
            {backdropImage ? (
              <img
                src={backdropImage}
                alt={`${cinema.cinema_name} backdrop`}
                className="cinema-backdrop-img"
              />
            ) : (
              <div className="cinema-backdrop-placeholder">
                <Film size={60} />
                <span>Cinema Backdrop</span>
              </div>
            )}
            <div className="cinema-hero-overlay"></div>
          </div>

          {/* Cột phải: Thông tin rạp */}
          <div className="cinema-hero-info">
            <span className="cinema-label">HỆ THỐNG RẠP</span>
            <h1 className="cinema-name">{cinema.cinema_name || 'Rạp chiếu phim'}</h1>
            <div className="cinema-divider"></div>
            
            <div className="cinema-info-grid">
              <div className="info-item">
                <MapPin size={18} />
                <span>{cinema.address || 'Địa chỉ chưa cập nhật'}{cinema.city ? `, ${cinema.city}` : ''}</span>
              </div>
              <div className="info-item">
                <Phone size={18} />
                <span>{cinema.hotline || '1900 2224'}</span>
              </div>
              <div className="info-item">
                <Clock size={18} />
                <span>08:00 - 23:30 (Hằng ngày)</span>
              </div>
              {cinema.map_link && (
                <a href={cinema.map_link} target="_blank" rel="noreferrer" className="cinema-map-link">
                  <ExternalLink size={18} />
                  Xem Google Maps
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================
            PHIM ĐANG CHIẾU
        ============================================================ */}
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

        {/* MOVIE GRID */}
        {filteredMovies.length > 0 ? (
          <div className="movie-grid">
            {filteredMovies.map((movie, index) => {
              const movieShowtimes = movie.showtimes.filter(st =>
                st.start_time.startsWith(selectedDate)
              );
              return (
                <div key={movie.movie_id} className="movie-card-wrapper">
                  <MovieCard
                    movie={movie}
                    onClick={() => handleMovieClick(movie)}
                    index={index}
                  />
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

        {/* MAP (nếu có) */}
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