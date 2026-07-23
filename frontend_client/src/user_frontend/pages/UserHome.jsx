import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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

// =============================================
// HELPER: LẤY URL ẢNH (HỖ TRỢ CLOUDINARY + LOCAL)
// =============================================
const getImageUrl = (url, baseUrl = '') => {
  if (!url) return '';
  // Nếu là URL đầy đủ (http:// hoặc https://) thì dùng trực tiếp
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Ngược lại, ghép với baseUrl (cho dữ liệu cũ)
  return baseUrl + url;
};

const UserHome = () => {

  const navigate = useNavigate();

  const bannerImages = [
    "banner1.png",
    "banner2.png",
    "banner3.png",
    "banner4.png"
  ];

  const bannerBaseUrl = "https://api.quangdungcinema.id.vn/uploads/banners/";
  const bannerDocUrl = "https://api.quangdungcinema.id.vn/uploads/banner_doc/";

  const [swiperInstance, setSwiperInstance] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const [groupedMovies, setGroupedMovies] = useState({
    "Đang chiếu": [],
    "Sắp chiếu": []
  });

  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState([]);
  const [cinemaNews, setCinemaNews] = useState([]);

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
          axios.get('https://api.quangdungcinema.id.vn/api/movies/status-group'),
          axios.get('https://api.quangdungcinema.id.vn/api/showtimes/quick-booking'),
          axios.get('https://api.quangdungcinema.id.vn/api/promotions/all'),
          axios.get('https://api.quangdungcinema.id.vn/api/blog-cinema/all')
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

  // ===== Quick Booking logic =====
  useEffect(() => {
    if (!selectedQuick.movie) {
      setQuickData(prev => ({ ...prev, cinemas: [] }));
      setAvailableDates([]);
      setAvailableShowtimes([]);
      return;
    }

    const fetchCinemas = async () => {
      try {
        const res = await axios.get(
          "https://api.quangdungcinema.id.vn/api/showtimes/quick-booking",
          { params: { movie_id: selectedQuick.movie } }
        );
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
        const res = await axios.get(
          "https://api.quangdungcinema.id.vn/api/showtimes/quick-booking",
          { params: { movie_id: selectedQuick.movie, cinema_id: selectedQuick.cinema } }
        );
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
        const res = await axios.get(
          "https://api.quangdungcinema.id.vn/api/showtimes/quick-booking",
          { params: { movie_id: selectedQuick.movie, cinema_id: selectedQuick.cinema, date: selectedQuick.date } }
        );
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
      const res = await axios.get(`https://api.quangdungcinema.id.vn/api/showtimes/detail/${selectedQuick.showtime}`);
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

        {/* ===== BANNER ===== */}
        <div className="carousel-full-wrapper banner-premium">
          <Swiper
            modules={[Autoplay, EffectFade, Navigation, Pagination]}
            effect="fade"
            speed={1200}
            autoplay={{ delay: 4500, disableOnInteraction: false }}
            loop={true}
            onSwiper={setSwiperInstance}
            onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
            className="premiumSwiper"
          >
            {bannerImages.map((img, index) => (
              <SwiperSlide
                key={index}
                className={`banner-slide ${activeIndex === index ? "slide-active" : ""}`}
              >
                <div className="banner-media">
                  <picture>
                    <source
                      media="(max-width: 767px)"
                      srcSet={`${bannerDocUrl}${img}`}
                    />
                    <img
                      src={`${bannerBaseUrl}${img}`}
                      className="banner-img"
                      alt="Cinema Banner"
                    />
                  </picture>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* ===== QUICK BOOKING ===== */}
        <ScrollReveal
          direction="up"
          duration={0.9}
          delay={0.05}
          amount={0.2}
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

        {/* ===== CONTENT ===== */}
        <div className="home-container">

          {/* FEATURES */}
          <ScrollReveal
            direction="up"
            duration={0.9}
            delay={0.1}
            amount={0.2}
          >
            <section className="home-features-section">
              <div className="features-grid">
                <div className="feature-item">
                  <div className="feature-icon-wrapper"><Ticket size={32} /></div>
                  <div className="feature-text">
                    <h4>ĐẶT VÉ NHANH CHÓNG</h4>
                    <p>Tiết kiệm thời gian tối đa</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon-wrapper"><Star size={32} /></div>
                  <div className="feature-text">
                    <h4>NHIỀU ƯU ĐÃI HẤP DẪN</h4>
                    <p>Săn deal hời mỗi ngày</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon-wrapper"><CreditCard size={32} /></div>
                  <div className="feature-text">
                    <h4>THANH TOÁN ĐA DẠNG</h4>
                    <p>Hỗ trợ mọi loại ví điện tử</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon-wrapper"><Monitor size={32} /></div>
                  <div className="feature-text">
                    <h4>TRẢI NGHIỆM ĐỈNH CAO</h4>
                    <p>Âm thanh, hình ảnh sống động</p>
                  </div>
                </div>
              </div>
            </section>
          </ScrollReveal>

          {/* FILM GENRE */}
          <ScrollReveal
            direction="up"
            duration={0.9}
            delay={0.15}
            amount={0.2}
          >
            <div className="movie-container">
              <FilmGenre />
            </div>
          </ScrollReveal>

          {/* PROMOTIONS – CÓ NÚT "XEM TẤT CẢ" */}
          <ScrollReveal
            direction="up"
            duration={0.9}
            delay={0.2}
            amount={0.2}
          >
            <section className="promotions-section">
              <div className="section-header">
                <div className="section-header-left">
                  <h3 className="section-title">ƯU ĐÃI HẤP DẪN</h3>
                  <div className="title-underline"></div>
                </div>
                <button
                  className="btn-view-all"
                  onClick={() => navigate('/promotion')}
                >
                  Xem tất cả
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="cinema-grid">
                {promotions?.slice(0, 4).map((promo) => {
                  // ✅ Hỗ trợ cả 2 tên trường: promotion_image (mới) và image_url (cũ)
                  const imageField = promo.promotion_image || promo.image_url;
                  const imageUrl = getImageUrl(imageField, 'https://api.quangdungcinema.id.vn/uploads/promotions/');
                  return (
                    <CinemaCard
                      key={promo.promotion_id}
                      type="promotion"
                      image={imageUrl}
                      title={promo.title}
                      buttonText="Xem chi tiết"
                      link={`/promotion/${promo.slug}`}
                    />
                  );
                })}
              </div>
            </section>
          </ScrollReveal>

          {/* CINEMA CORNER – CÓ NÚT "XEM TẤT CẢ" */}
          <ScrollReveal
            direction="up"
            duration={0.9}
            delay={0.25}
            amount={0.2}
          >
            <section className="cinema-corner-section">
              <div className="section-header">
                <div className="section-header-left">
                  <h3 className="section-title">GÓC ĐIỆN ẢNH</h3>
                  <div className="title-underline"></div>
                </div>
                <button
                  className="btn-view-all"
                  onClick={() => navigate('/blog-cinema')}
                >
                  Xem tất cả
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="cinema-grid">
                {cinemaNews?.slice(0, 4).map((news) => {
                  // ✅ Hỗ trợ cả 2 tên trường: blog_image (mới) và image_url (cũ)
                  const imageField = news.blog_image || news.image_url;
                  const imageUrl = getImageUrl(imageField, 'https://api.quangdungcinema.id.vn/uploads/blog_cinema/');
                  return (
                    <CinemaCard
                      key={news.blog_id}
                      type="news"
                      image={imageUrl}
                      title={news.title}
                      buttonText="Đọc thêm"
                      link={`/blog-cinema/${news.slug}`}
                    />
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