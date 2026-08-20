// pages/CinemaDetail.js
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
  //  HELPER: Kiểm tra map_link có phải iframe không
  // ============================================================
  const isIframeLink = (link) => {
    if (!link) return false;
    return link.includes('<iframe') && link.includes('</iframe>');
  };

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
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    // Nếu là iframe, mở popup hiển thị
                    if (isIframeLink(cinema.map_link)) {
                      const win = window.open('', '_blank', 'width=900,height=650,scrollbars=yes');
                      if (win) {
                        win.document.write(`
                          <html>
                            <head>
                              <title>Google Map - ${cinema.cinema_name}</title>
                              <style>
                                * { margin: 0; padding: 0; box-sizing: border-box; }
                                body { 
                                  display: flex; 
                                  justify-content: center; 
                                  align-items: center; 
                                  min-height: 100vh; 
                                  background: #0f0f1a; 
                                  font-family: Arial, sans-serif;
                                  padding: 12px;
                                }
                                .map-container {
                                  width: 100%;
                                  max-width: 100%;
                                  height: 100vh;
                                  max-height: 600px;
                                  border-radius: 12px;
                                  overflow: hidden;
                                  box-shadow: 0 20px 60px rgba(0,0,0,0.8);
                                }
                                .map-container iframe {
                                  width: 100%;
                                  height: 100%;
                                  border: none;
                                  display: block;
                                }
                                .close-btn {
                                  position: fixed;
                                  top: 20px;
                                  right: 20px;
                                  background: rgba(255,255,255,0.15);
                                  backdrop-filter: blur(10px);
                                  color: white;
                                  border: 1px solid rgba(255,255,255,0.2);
                                  border-radius: 50%;
                                  width: 44px;
                                  height: 44px;
                                  font-size: 24px;
                                  cursor: pointer;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  transition: all 0.3s ease;
                                  z-index: 100;
                                  font-weight: 300;
                                }
                                .close-btn:hover {
                                  background: rgba(255,255,255,0.3);
                                  transform: rotate(90deg);
                                }
                                .title-bar {
                                  position: fixed;
                                  top: 0;
                                  left: 0;
                                  right: 0;
                                  padding: 16px 80px 16px 24px;
                                  background: rgba(15,15,26,0.92);
                                  backdrop-filter: blur(12px);
                                  border-bottom: 1px solid rgba(255,255,255,0.08);
                                  z-index: 99;
                                  color: white;
                                  font-size: 16px;
                                  font-weight: 600;
                                  letter-spacing: 0.5px;
                                }
                                .title-bar span {
                                  color: #c9a84c;
                                }
                                @media (max-width: 640px) {
                                  .title-bar { font-size: 13px; padding: 12px 70px 12px 16px; }
                                  .close-btn { width: 36px; height: 36px; font-size: 20px; top: 10px; right: 10px; }
                                  .map-container { max-height: 80vh; }
                                }
                              </style>
                            </head>
                            <body>
                              <div class="title-bar">
                                📍 <span>${cinema.cinema_name}</span> - Google Maps
                              </div>
                              <button class="close-btn" onclick="window.close()">✕</button>
                              <div class="map-container">
                                ${cinema.map_link}
                              </div>
                            </body>
                          </html>
                        `);
                        win.document.close();
                      }
                    } else {
                      // Nếu là link thường, mở trực tiếp
                      window.open(cinema.map_link, '_blank');
                    }
                  }}
                  className="cinema-map-link"
                  style={{ cursor: 'pointer' }}
                >
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

        {/* ============================================================
            MAP SECTION - HIỂN THỊ IFRAME TRỰC TIẾP
        ============================================================ */}
        {cinema.map_link && isIframeLink(cinema.map_link) && (
          <div className="map-section">
            <div className="section-title">
              <MapPin size={24} />
              <h2>VỊ TRÍ RẠP</h2>
            </div>
            <div className="map-wrapper">
              <div 
                className="cinema-iframe-container"
                dangerouslySetInnerHTML={{ __html: cinema.map_link }}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CinemaDetail;