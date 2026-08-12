import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';

import Modal from '../components/Modal';
import MovieSlider from '../components/MovieSlider';
import MoviePreviewModal from '../components/MoviePreviewModal';
import ScrollReveal from '../components/ScrollReveal';
import CinemaCard from '../components/CinemaCard';
import HeroBanner from '../components/HeroBanner';

import {
  Ticket,
  Star,
  CreditCard,
  Monitor,
  ChevronRight,
  Gift,
  Newspaper,
  Film,
  Building2,
  CalendarDays,
  Clock,
  ChevronDown
} from 'lucide-react';

import '../styles/user_home.css';

// ==========================================================
// Helper Functions
// ==========================================================

const getImageUrl = (url, baseUrl = '') => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return baseUrl + url;
};

const unwrapArray = (data) => {
  if (!data) return [];
  let result = [];
  if (Array.isArray(data)) result = data;
  else if (data?.data && Array.isArray(data.data)) result = data.data;
  else if (data?.movies && Array.isArray(data.movies)) result = data.movies;
  else if (data?.result && Array.isArray(data.result)) result = data.result;
  else if (data?.content && Array.isArray(data.content)) result = data.content;
  return result.filter(item => item !== null && item !== undefined && typeof item === 'object');
};

// ===== Custom Dropdown Component =====
const QuickSelect = ({
  options = [],
  value,
  onChange,
  placeholder,
  icon: Icon,
  disabled = false,
  labelKey = 'title',
  valueKey = 'id'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validOptions = options.filter(opt => opt && typeof opt === 'object' && opt[valueKey] !== undefined);
  const selectedOption = validOptions.find(opt => opt[valueKey] === value);

  return (
    <div className="quick-select-item" ref={dropdownRef}>
      <div
        className={`quick-select-trigger ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="quick-select-left">
          <Icon size={20} className="quick-select-icon" />
          <span className="quick-select-value">
            {selectedOption ? selectedOption[labelKey] : placeholder}
          </span>
        </div>
        <ChevronDown size={16} className="quick-select-arrow" />
      </div>

      {isOpen && validOptions.length > 0 && (
        <div className="quick-dropdown-list">
          {validOptions.map((option) => (
            <div
              key={option[valueKey]}
              className={`quick-option-item ${option[valueKey] === value ? 'active' : ''}`}
              onClick={() => {
                onChange(option[valueKey]);
                setIsOpen(false);
              }}
            >
              {option[labelKey]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================================
// UserHome Component
// ==========================================================

const UserHome = () => {
  const navigate = useNavigate();

  // State cho phim
  const [groupedMovies, setGroupedMovies] = useState({
    "Đang chiếu": [],
    "Sắp chiếu": []
  });
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState([]);
  const [cinemaNews, setCinemaNews] = useState([]);

  // Quick booking
  const [quickData, setQuickData] = useState({
    movies: [],
    cinemas: []
  });
  const [selectedQuick, setSelectedQuick] = useState({
    movie: '',
    cinema: '',
    date: '',
    showtime: ''
  });
  const [availableDates, setAvailableDates] = useState([]);
  const [availableShowtimes, setAvailableShowtimes] = useState([]);

  // Modal thông báo lỗi
  const [modal, setModal] = useState({
    show: false,
    type: 'error',
    title: '',
    message: ''
  });

  // Modal preview phim
  const [previewModal, setPreviewModal] = useState({
    open: false,
    selectedMovie: null
  });

  const closeModal = () => {
    setModal({ show: false, type: 'error', title: '', message: '' });
  };

  const handlePreview = (movie) => {
    setPreviewModal({ open: true, selectedMovie: movie });
  };

  const closePreviewModal = () => {
    setPreviewModal({ open: false, selectedMovie: null });
  };

  // ===== FETCH DỮ LIỆU CHÍNH =====
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [
          statusRes,
          movieRes,
          promotionRes,
          blogRes
        ] = await Promise.all([
          api.get('/api/movies/status-group'),
          api.get('/api/showtimes/quick-booking'),
          api.get('/api/promotions'),
          api.get('/api/blog-cinema')
        ]);

        // ✅ Xử lý dữ liệu từ status-group
        const statusData = statusRes?.data?.data || statusRes?.data || {};
        // Đảm bảo lấy đúng mảng, fallback là []
        const showing = Array.isArray(statusData["Đang chiếu"]) ? statusData["Đang chiếu"] : [];
        const coming = Array.isArray(statusData["Sắp chiếu"]) ? statusData["Sắp chiếu"] : [];

        setGroupedMovies({
          "Đang chiếu": showing,
          "Sắp chiếu": coming
        });

        // Quick booking movies
        const movieList = unwrapArray(movieRes.data);
        setQuickData({
          movies: movieList,
          cinemas: []
        });

        // Promotions & news
        setPromotions(unwrapArray(promotionRes.data));
        setCinemaNews(unwrapArray(blogRes.data));
      } catch (error) {
        console.error("Lỗi khi load data:", error);
        setModal({
          show: true,
          type: 'error',
          title: 'Lỗi tải dữ liệu',
          message: 'Không thể tải dữ liệu trang chủ. Vui lòng thử lại!'
        });
        // Đặt mảng rỗng để không bị lỗi
        setGroupedMovies({ "Đang chiếu": [], "Sắp chiếu": [] });
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // ===== QUICK BOOKING EFFECTS =====
  useEffect(() => {
    if (!selectedQuick.movie) {
      setQuickData(prev => ({ ...prev, cinemas: [] }));
      setAvailableDates([]);
      setAvailableShowtimes([]);
      return;
    }

    const fetchCinemas = async () => {
      try {
        const res = await api.get('/api/showtimes/quick-booking', {
          params: { movie_id: selectedQuick.movie }
        });
        setQuickData(prev => ({ ...prev, cinemas: unwrapArray(res.data) }));
      } catch (error) {
        console.error("Lỗi load rạp:", error);
        setModal({
          show: true,
          type: 'error',
          title: 'Lỗi tải rạp',
          message: 'Không thể tải danh sách rạp!'
        });
      }
    };

    fetchCinemas();
  }, [selectedQuick.movie]);

  useEffect(() => {
    if (!selectedQuick.movie || !selectedQuick.cinema) {
      setAvailableDates([]);
      setAvailableShowtimes([]);
      return;
    }

    const fetchDates = async () => {
      try {
        const res = await api.get('/api/showtimes/quick-booking', {
          params: { movie_id: selectedQuick.movie, cinema_id: selectedQuick.cinema }
        });
        const datesData = unwrapArray(res.data);
        setAvailableDates(datesData.map(d => d.show_date));
      } catch (error) {
        console.error("Lỗi load ngày:", error);
        setModal({
          show: true,
          type: 'error',
          title: 'Lỗi tải ngày chiếu',
          message: 'Không thể tải danh sách ngày chiếu!'
        });
      }
    };

    fetchDates();
  }, [selectedQuick.movie, selectedQuick.cinema]);

  useEffect(() => {
    if (!selectedQuick.movie || !selectedQuick.cinema || !selectedQuick.date) {
      setAvailableShowtimes([]);
      return;
    }

    const fetchShowtimes = async () => {
      try {
        const res = await api.get('/api/showtimes/quick-booking', {
          params: { movie_id: selectedQuick.movie, cinema_id: selectedQuick.cinema, date: selectedQuick.date }
        });
        setAvailableShowtimes(unwrapArray(res.data));
      } catch (error) {
        console.error("Lỗi load suất:", error);
        setModal({
          show: true,
          type: 'error',
          title: 'Lỗi tải suất chiếu',
          message: 'Không thể tải danh sách suất chiếu!'
        });
      }
    };

    fetchShowtimes();
  }, [selectedQuick.movie, selectedQuick.cinema, selectedQuick.date]);

  const handleQuickBook = async () => {
    if (!selectedQuick.movie) {
      setModal({ show: true, type: 'error', title: 'Thiếu thông tin', message: 'Vui lòng chọn phim!' });
      return;
    }
    if (!selectedQuick.cinema) {
      setModal({ show: true, type: 'error', title: 'Thiếu thông tin', message: 'Vui lòng chọn rạp!' });
      return;
    }
    if (!selectedQuick.date) {
      setModal({ show: true, type: 'error', title: 'Thiếu thông tin', message: 'Vui lòng chọn ngày chiếu!' });
      return;
    }
    if (!selectedQuick.showtime) {
      setModal({ show: true, type: 'error', title: 'Thiếu thông tin', message: 'Vui lòng chọn suất chiếu!' });
      return;
    }

    try {
      const res = await api.get(`/api/showtimes/detail/${selectedQuick.showtime}`);
      const showtimeData = res.data?.data;

      navigate(`/booking/${showtimeData.slug}`, {
        state: {
          movie: {
            title: showtimeData.title,
            poster_url: showtimeData.poster_url,
            age_rating: showtimeData.age_rating
          },
          cinema: { cinema_name: showtimeData.cinema_name },
          room: { room_name: showtimeData.room_name, room_type: showtimeData.room_type },
          showtime: { showtime_id: showtimeData.showtime_id, start_time: showtimeData.start_time },
          date: showtimeData.start_time.split(' ')[0]
        }
      });
    } catch (err) {
      console.error("Lỗi khi lấy showtime detail:", err);
      setModal({
        show: true,
        type: 'error',
        title: 'Đặt vé thất bại',
        message: 'Không thể lấy thông tin suất chiếu!'
      });
    }
  };

  // ✅ Gộp phim với kiểm tra an toàn
  const showingMovies = Array.isArray(groupedMovies["Đang chiếu"]) ? groupedMovies["Đang chiếu"] : [];
  const comingMovies = Array.isArray(groupedMovies["Sắp chiếu"]) ? groupedMovies["Sắp chiếu"] : [];
  const allMovies = [...showingMovies, ...comingMovies];

  return (
    <>
      {/* Modal thông báo lỗi */}
      <Modal
        show={modal.show}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={closeModal}
        onCancel={closeModal}
      />

      {/* Modal preview phim */}
      <MoviePreviewModal
        open={previewModal.open}
        onClose={closePreviewModal}
        movies={allMovies}
        selectedMovie={previewModal.selectedMovie}
      />

      <div className="user-home">
        {/* ===== HERO BANNER ===== */}
        <HeroBanner videoSrc="/vutru_video.mp4" />

        {/* ===== QUICK BOOKING ===== */}
        <ScrollReveal
          direction="up"
          duration={0.5}
          delay={0.2}
          amount={0.15}
          curtain={false}
        >
          <section className="quick-booking-container">
            <div className="quick-booking-content">
              <div className="quick-booking-selects">
                <QuickSelect
                  options={quickData.movies}
                  value={selectedQuick.movie}
                  onChange={(val) => setSelectedQuick({ movie: val, cinema: '', date: '', showtime: '' })}
                  placeholder="Chọn phim"
                  icon={Film}
                  labelKey="title"
                  valueKey="movie_id"
                />
                <QuickSelect
                  options={quickData.cinemas}
                  value={selectedQuick.cinema}
                  onChange={(val) => setSelectedQuick({ ...selectedQuick, cinema: val, date: '', showtime: '' })}
                  placeholder="Chọn rạp"
                  disabled={!selectedQuick.movie}
                  icon={Building2}
                  labelKey="cinema_name"
                  valueKey="cinema_id"
                />
                <QuickSelect
                  options={availableDates.map(d => ({ date: d }))}
                  value={selectedQuick.date}
                  onChange={(val) => setSelectedQuick({ ...selectedQuick, date: val, showtime: '' })}
                  placeholder="Chọn ngày"
                  disabled={!selectedQuick.cinema || availableDates.length === 0}
                  icon={CalendarDays}
                  labelKey="date"
                  valueKey="date"
                />
                <QuickSelect
                  options={availableShowtimes}
                  value={selectedQuick.showtime}
                  onChange={(val) => setSelectedQuick({ ...selectedQuick, showtime: val })}
                  placeholder="Chọn suất"
                  disabled={!selectedQuick.date}
                  icon={Clock}
                  labelKey="start_time"
                  valueKey="showtime_id"
                />
              </div>
              <button className="btn-quick-booking" onClick={handleQuickBook}>
                ĐẶT VÉ NGAY
              </button>
            </div>
          </section>
        </ScrollReveal>

        {/* ===== CÁC PHẦN CÒN LẠI ===== */}
        <div className="home-container">
          {/* Features */}
          <section className="home-features-section">
            <div className="features-grid">
              {[
                { icon: Ticket, title: 'ĐẶT VÉ NHANH CHÓNG', desc: 'Tiết kiệm thời gian tối đa' },
                { icon: Star, title: 'NHIỀU ƯU ĐÃI HẤP DẪN', desc: 'Săn deal hời mỗi ngày' },
                { icon: CreditCard, title: 'THANH TOÁN ĐA DẠNG', desc: 'Hỗ trợ mọi loại ví điện tử' },
                { icon: Monitor, title: 'TRẢI NGHIỆM ĐỈNH CAO', desc: 'Âm thanh, hình ảnh sống động' }
              ].map((item, index) => (
                <ScrollReveal
                  key={index}
                  direction="up"
                  duration={0.4}
                  delay={0.4 + index * 0.08}
                  amount={0.15}
                  curtain={false}
                >
                  <div className="feature-item">
                    <div className="feature-icon-wrapper"><item.icon size={32} /></div>
                    <div className="feature-text">
                      <h4>{item.title}</h4>
                      <p>{item.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </section>

          {/* ===== MOVIE SLIDER ===== */}
          <ScrollReveal
            direction="up"
            duration={0.6}
            delay={0.6}
            amount={0.15}
            curtain={false}
          >
            <div className="movie-container">
              {allMovies.length > 0 ? (
                <MovieSlider
                  movies={allMovies}
                  onCardClick={handlePreview}
                />
              ) : (
                !loading && <div className="empty-movies">Hiện chưa có phim nào</div>
              )}
            </div>
          </ScrollReveal>

          {/* Promotions */}
          <ScrollReveal
            direction="up"
            duration={0.6}
            delay={0.8}
            amount={0.15}
            curtain={false}
          >
            <section className="promotions-section">
              <div className="section-header">
                <div className="section-header-left">
                  <h3 className="section-title">
                    <Gift size={40} className="section-icon" />
                    ƯU ĐÃI HẤP DẪN
                  </h3>
                  <div className="title-underline"></div>
                </div>
                <button className="btn-view-all" onClick={() => navigate('/promotion')}>
                  Xem tất cả <ChevronRight size={18} />
                </button>
              </div>
              <div className="cinema-grid">
                {promotions?.slice(0, 4).map((promo, index) => {
                  const imageField = promo.promotion_image || promo.image_url;
                  const imageUrl = getImageUrl(imageField, 'https://api.quangdungcinema.id.vn/uploads/promotions/');
                  return (
                    <ScrollReveal
                      key={promo.promotion_id}
                      direction="up"
                      duration={0.4}
                      delay={1.0 + index * 0.08}
                      amount={0.15}
                      curtain={false}
                    >
                      <CinemaCard
                        type="promotion"
                        image={imageUrl}
                        title={promo.title}
                        buttonText="Xem chi tiết"
                        link={`/promotion/${promo.slug}`}
                      />
                    </ScrollReveal>
                  );
                })}
              </div>
            </section>
          </ScrollReveal>

          {/* Cinema corner */}
          <ScrollReveal
            direction="up"
            duration={0.6}
            delay={1.2}
            amount={0.15}
            curtain={false}
          >
            <section className="cinema-corner-section">
              <div className="section-header">
                <div className="section-header-left">
                  <h3 className="section-title">
                    <Newspaper size={40} className="section-icon" />
                    GÓC ĐIỆN ẢNH
                  </h3>
                  <div className="title-underline"></div>
                </div>
                <button className="btn-view-all" onClick={() => navigate('/blog-cinema')}>
                  Xem tất cả <ChevronRight size={18} />
                </button>
              </div>
              <div className="cinema-grid">
                {cinemaNews?.slice(0, 4).map((news, index) => {
                  const imageField = news.blog_image || news.image_url;
                  const imageUrl = getImageUrl(imageField, 'https://api.quangdungcinema.id.vn/uploads/blog_cinema/');
                  return (
                    <ScrollReveal
                      key={news.blog_id}
                      direction="up"
                      duration={0.4}
                      delay={1.4 + index * 0.08}
                      amount={0.15}
                      curtain={false}
                    >
                      <CinemaCard
                        type="news"
                        image={imageUrl}
                        title={news.title}
                        buttonText="Đọc thêm"
                        link={`/blog-cinema/${news.slug}`}
                      />
                    </ScrollReveal>
                  );
                })}
              </div>
            </section>
          </ScrollReveal>
        </div>
      </div>
    </>
  );
};

export default UserHome;