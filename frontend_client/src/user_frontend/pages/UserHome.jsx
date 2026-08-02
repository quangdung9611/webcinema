import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';

import Modal from '../components/Modal';
import FilmGenre from '../components/FilmGenre';
import ScrollReveal from '../components/ScrollReveal';
import CinemaCard from '../components/CinemaCard';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules';

import {
  Ticket,
  Star,
  CreditCard,
  Monitor,
  ChevronRight
} from 'lucide-react';

import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import '../styles/user_home.css';

// Helper lấy URL ảnh
const getImageUrl = (url, baseUrl = '') => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return baseUrl + url;
};

const UserHome = () => {
  const navigate = useNavigate();

  // State cho banner
  const [banners, setBanners] = useState([]);
  const [bannerLoading, setBannerLoading] = useState(true);

  const [swiperInstance, setSwiperInstance] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const spotlightRef = useRef(null);
  const bannerRef = useRef(null);
  const [sparkleKey, setSparkleKey] = useState(0);

  // State cho phim, khuyến mãi, tin tức
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

  // Modal
  const [modal, setModal] = useState({
    show: false,
    type: 'error',
    title: '',
    message: ''
  });

  const closeModal = () => {
    setModal({
      show: false,
      type: 'error',
      title: '',
      message: ''
    });
  };

  // ===== FETCH BANNER =====
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setBannerLoading(true);
        const res = await api.get('/api/banners?page=HOME');
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

        setGroupedMovies(statusRes.data);
        setQuickData({
          movies: movieRes.data,
          cinemas: []
        });
        setPromotions(promotionRes.data || []);
        setCinemaNews(blogRes.data || []);
      } catch (error) {
        console.error("Lỗi khi load data:", error);
        setModal({
          show: true,
          type: 'error',
          title: 'Lỗi tải dữ liệu',
          message: 'Không thể tải dữ liệu trang chủ. Vui lòng thử lại!'
        });
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
        setQuickData(prev => ({ ...prev, cinemas: res.data }));
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
        setAvailableDates(res.data.map(d => d.show_date));
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
        setAvailableShowtimes(res.data);
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
      const showtimeData = res.data;

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

  // ===== SPOTLIGHT EFFECT =====
  useEffect(() => {
    const banner = bannerRef.current;
    const spotlight = spotlightRef.current;
    if (!banner || !spotlight) return;

    const move = (e) => {
      const rect = banner.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spotlight.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    };

    const enter = () => { spotlight.style.opacity = ".12"; };
    const leave = () => { spotlight.style.opacity = "0"; };

    banner.addEventListener("mousemove", move);
    banner.addEventListener("mouseenter", enter);
    banner.addEventListener("mouseleave", leave);

    return () => {
      banner.removeEventListener("mousemove", move);
      banner.removeEventListener("mouseenter", enter);
      banner.removeEventListener("mouseleave", leave);
    };
  }, []);

  // ===== PROGRESS BAR =====
  useEffect(() => {
    if (!swiperInstance) return;
    const onAutoplayTimeLeft = (s, timeLeft, progress) => {
      setProgress(1 - progress);
    };
    swiperInstance.on('autoplayTimeLeft', onAutoplayTimeLeft);
    return () => {
      swiperInstance.off('autoplayTimeLeft', onAutoplayTimeLeft);
    };
  }, [swiperInstance]);

  useEffect(() => {
    setProgress(0);
  }, [activeIndex]);

  // ===== RESET SPARKLE =====
  useEffect(() => {
    if (!swiperInstance) return;
    const onSlideChange = () => {
      setSparkleKey(prev => prev + 1);
    };
    swiperInstance.on('slideChange', onSlideChange);
    return () => swiperInstance.off('slideChange', onSlideChange);
  }, [swiperInstance]);

  const hasBanners = banners.length > 0;

  return (
    <>
      <Modal
        show={modal.show}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={closeModal}
        onCancel={closeModal}
      />

      <div className="user-home">
        {/* ===== BANNER – GIỮ CURTAIN ===== */}
        <ScrollReveal
          direction="fade"
          duration={0.8}
          delay={0.1}
          amount={0.1}
          curtain={true}
          curtainTexture="velvet"
          curtainSpeed={1.0}
          curtainFolds={5}
          once={true}
        >
          <div className="carousel-full-wrapper banner-premium">
            <div className="banner-track" ref={bannerRef}>
              <Swiper
                modules={[Autoplay, EffectFade, Navigation, Pagination]}
                effect="fade"
                fadeEffect={{ crossFade: true }}
                speed={1400}
                autoplay={{ delay: 4500, disableOnInteraction: false }}
                loop={hasBanners && banners.length > 1}
                onSwiper={setSwiperInstance}
                onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
                className="premiumSwiper"
              >
                {hasBanners ? (
                  banners.map((banner, index) => (
                    <SwiperSlide
                      key={banner.banner_id || index}
                      className={`banner-slide ${activeIndex === index ? "slide-active" : ""}`}
                    >
                      <div className="banner-media">
                        <img
                          src={banner.image_url}
                          className="banner-img"
                          alt={`Banner ${index + 1}`}
                        />
                        <div className="sparkle-container" key={sparkleKey}>
                          {Array.from({ length: 30 }).map((_, i) => (
                            <span className="sparkle" key={i}></span>
                          ))}
                        </div>
                        <div className="light-sweep-hover">
                          <div className="sweep-beam"></div>
                        </div>
                        <div className="banner-particles"></div>
                        <div ref={spotlightRef} className="banner-spotlight" />
                      </div>
                      <div className="banner-slide-number">
                        <span className="current">{String(index + 1).padStart(2, '0')}</span>
                        <span className="separator">/</span>
                        <span className="total">{String(banners.length).padStart(2, '0')}</span>
                      </div>
                    </SwiperSlide>
                  ))
                ) : (
                  <SwiperSlide className="banner-slide">
                    <div className="banner-media">
                      <div className="banner-fallback" style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#888',
                        fontSize: '1.5rem',
                        fontWeight: 'bold'
                      }}>
                        🎬 Cinema Banner
                      </div>
                      <div className="banner-particles"></div>
                      <div ref={spotlightRef} className="banner-spotlight" />
                    </div>
                  </SwiperSlide>
                )}
              </Swiper>

              <div className="banner-progress-bar">
                <div className="banner-progress-fill" style={{ transform: `scaleX(${progress})` }} />
              </div>

              <button className="banner-nav banner-prev" onClick={() => swiperInstance?.slidePrev()}>
                <ChevronRight size={24} />
              </button>
              <button className="banner-nav banner-next" onClick={() => swiperInstance?.slideNext()}>
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* ===== QUICK BOOKING – BỎ CURTAIN ===== */}
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
                <select
                  value={selectedQuick.movie}
                  onChange={(e) =>
                    setSelectedQuick({
                      movie: e.target.value,
                      cinema: '',
                      date: '',
                      showtime: ''
                    })
                  }
                >
                  <option value="">Chọn phim</option>
                  {quickData.movies.map(m => (
                    <option key={m.movie_id} value={m.movie_id}>{m.title}</option>
                  ))}
                </select>

                <select
                  disabled={!selectedQuick.movie}
                  value={selectedQuick.cinema}
                  onChange={(e) =>
                    setSelectedQuick({
                      ...selectedQuick,
                      cinema: e.target.value,
                      date: '',
                      showtime: ''
                    })
                  }
                >
                  <option value="">Chọn rạp</option>
                  {quickData.cinemas.map(c => (
                    <option key={c.cinema_id} value={c.cinema_id}>{c.cinema_name}</option>
                  ))}
                </select>

                <select
                  disabled={!selectedQuick.cinema || !availableDates.length}
                  value={selectedQuick.date}
                  onChange={(e) =>
                    setSelectedQuick({
                      ...selectedQuick,
                      date: e.target.value,
                      showtime: ''
                    })
                  }
                >
                  <option value="">Chọn ngày</option>
                  {availableDates.map(date => (
                    <option key={date} value={date}>{date}</option>
                  ))}
                </select>

                <select
                  disabled={!selectedQuick.date}
                  value={selectedQuick.showtime}
                  onChange={(e) =>
                    setSelectedQuick({
                      ...selectedQuick,
                      showtime: e.target.value
                    })
                  }
                >
                  <option value="">Chọn suất</option>
                  {availableShowtimes.map(s => (
                    <option key={s.showtime_id} value={s.showtime_id}>
                      {s.start_time} - {s.room_name}
                    </option>
                  ))}
                </select>
              </div>

              <button className="btn-quick-booking" onClick={handleQuickBook}>
                ĐẶT VÉ NGAY
              </button>
            </div>
          </section>
        </ScrollReveal>

        {/* ===== CÁC PHẦN CÒN LẠI (BỎ CURTAIN) ===== */}
        <div className="home-container">
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

          {/* FilmGenre – bỏ curtain */}
          <ScrollReveal
            direction="up"
            duration={0.6}
            delay={0.6}
            amount={0.15}
            curtain={false}
          >
            <div className="movie-container">
              <FilmGenre />
            </div>
          </ScrollReveal>

          {/* Promotions – bỏ curtain */}
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
                  <h3 className="section-title">ƯU ĐÃI HẤP DẪN</h3>
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

          {/* Cinema corner – bỏ curtain */}
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
                  <h3 className="section-title">GÓC ĐIỆN ẢNH</h3>
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