import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import Modal from '../components/Modal';
import FilmGenre from '../components/FilmGenre';
import ScrollReveal from '../components/ScrollReveal';

// SWIPER
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules';

import {
  Ticket,
  Star,
  CreditCard,
  Monitor
} from 'lucide-react';

import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import '../styles/user_home.css';

const UserHome = () => {

  const navigate = useNavigate();

  // =========================
  // STATE API DATA
  // =========================

  const [promotions, setPromotions] = useState([]);
  const [cinemaNews, setCinemaNews] = useState([]);

  // =========================
  // BANNER
  // =========================

  const banners = [
    'banner1.png',
    'banner2.png',
    'banner3.png',
    'banner4.png'
  ];

  const bannerBaseUrl = "https://api.quangdungcinema.id.vn/uploads/banners/";
  const bannerDocUrl = "https://api.quangdungcinema.id.vn/uploads/banner_doc/";

  // =========================
  // STATE OTHER
  // =========================

  const [swiperInstance, setSwiperInstance] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const [groupedMovies, setGroupedMovies] = useState({
    "Đang chiếu": [],
    "Sắp chiếu": []
  });

  const [loading, setLoading] = useState(true);

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

  // =========================
  // LOAD INITIAL DATA
  // =========================

  useEffect(() => {

    const fetchInitialData = async () => {

      setLoading(true);

      try {

        const [statusRes, movieRes, promoRes, newsRes] = await Promise.all([
          axios.get('https://api.quangdungcinema.id.vn/api/movies/status-group'),
          axios.get('https://api.quangdungcinema.id.vn/api/showtimes/quick-booking'),
          axios.get('/api/promotion/all'),
          axios.get('/api/blog-cinema/all')
        ]);

        setGroupedMovies(statusRes.data);

        setQuickData({
          movies: movieRes.data,
          cinemas: []
        });

        setPromotions(promoRes.data?.data || promoRes.data || []);
        setCinemaNews(newsRes.data?.data || newsRes.data || []);

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

  // =========================
  // QUICK BOOKING (GIỮ NGUYÊN)
  // =========================

  useEffect(() => {

    if (!selectedQuick.movie) {

      setQuickData(prev => ({
        ...prev,
        cinemas: []
      }));

      setAvailableDates([]);
      setAvailableShowtimes([]);

      return;
    }

    const fetchCinemas = async () => {

      try {

        const res = await axios.get(
          "https://api.quangdungcinema.id.vn/api/showtimes/quick-booking",
          {
            params: { movie_id: selectedQuick.movie }
          }
        );

        setQuickData(prev => ({
          ...prev,
          cinemas: res.data
        }));

      } catch (error) {

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
          {
            params: {
              movie_id: selectedQuick.movie,
              cinema_id: selectedQuick.cinema
            }
          }
        );

        setAvailableDates(res.data.map(d => d.show_date));

      } catch (error) {

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
          {
            params: {
              movie_id: selectedQuick.movie,
              cinema_id: selectedQuick.cinema,
              date: selectedQuick.date
            }
          }
        );

        setAvailableShowtimes(res.data);

      } catch (error) {

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

  // =========================
  // HANDLE BOOKING
  // =========================

  const handleQuickBook = async () => {

    if (!selectedQuick.movie || !selectedQuick.cinema || !selectedQuick.date || !selectedQuick.showtime) {

      setModal({
        show: true,
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng chọn đầy đủ thông tin!'
      });

      return;
    }

    try {

      const res = await axios.get(
        `https://api.quangdungcinema.id.vn/api/showtimes/detail/${selectedQuick.showtime}`
      );

      const showtimeData = res.data;

      navigate(`/booking/${showtimeData.slug}`, {
        state: {
          movie: {
            title: showtimeData.title,
            poster_url: showtimeData.poster_url,
            age_rating: showtimeData.age_rating
          },
          cinema: {
            cinema_name: showtimeData.cinema_name
          },
          room: {
            room_name: showtimeData.room_name,
            room_type: showtimeData.room_type
          },
          showtime: {
            showtime_id: showtimeData.showtime_id,
            start_time: showtimeData.start_time
          },
          date: showtimeData.start_time.split(' ')[0]
        }
      });

    } catch (err) {

      setModal({
        show: true,
        type: 'error',
        title: 'Đặt vé thất bại',
        message: 'Không thể lấy thông tin suất chiếu!'
      });
    }
  };

  // =========================
  // RENDER
  // =========================

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
        <div className="carousel-full-wrapper">

          <Swiper
            modules={[Autoplay, EffectFade, Navigation, Pagination]}
            effect="fade"
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            loop
            onSwiper={setSwiperInstance}
            onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
          >

            {banners.map((imgName, index) => (
              <SwiperSlide key={index}>
                <picture>
                  <source
                    media="(max-width: 767px)"
                    srcSet={`${bannerDocUrl}${imgName}`}
                  />
                  <img
                    src={`${bannerBaseUrl}${imgName}`}
                    alt={`banner ${index + 1}`}
                  />
                </picture>
                <div className="banner-full-overlay"></div>
              </SwiperSlide>
            ))}

          </Swiper>

        </div>

        {/* ===== QUICK BOOKING (GIỮ NGUYÊN UI) ===== */}
        <ScrollReveal>
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
                    <option key={m.movie_id} value={m.movie_id}>
                      {m.title}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedQuick.cinema}
                  disabled={!selectedQuick.movie}
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
                    <option key={c.cinema_id} value={c.cinema_id}>
                      {c.cinema_name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedQuick.date}
                  disabled={!selectedQuick.cinema}
                  onChange={(e) =>
                    setSelectedQuick({
                      ...selectedQuick,
                      date: e.target.value,
                      showtime: ''
                    })
                  }
                >
                  <option value="">Chọn ngày</option>
                  {availableDates.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedQuick.showtime}
                  disabled={!selectedQuick.date}
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

        {/* ===== FEATURES (GIỮ NGUYÊN) ===== */}
        <ScrollReveal delay={0.1}>
          <section className="home-features-section">
            <div className="features-grid">
              <div className="feature-item"><Ticket size={32} /><h4>ĐẶT VÉ NHANH</h4></div>
              <div className="feature-item"><Star size={32} /><h4>ƯU ĐÃI</h4></div>
              <div className="feature-item"><CreditCard size={32} /><h4>THANH TOÁN</h4></div>
              <div className="feature-item"><Monitor size={32} /><h4>TRẢI NGHIỆM</h4></div>
            </div>
          </section>
        </ScrollReveal>

        {/* ===== PROMOTIONS (API) ===== */}
        <ScrollReveal delay={0.3}>
          <section className="promotions-section">
            <h2>ƯU ĐÃI HẤP DẪN</h2>

            <div className="promotions-grid">
              {promotions.map((promo) => (
                <div className="promo-card" key={promo.id}>
                  <img src={promo.image} alt={promo.title} />
                  <h3>{promo.title}</h3>
                  <p>{promo.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* ===== CINEMA NEWS (API) ===== */}
        <ScrollReveal delay={0.4}>
          <section className="cinema-corner-section">
            <h2>GÓC ĐIỆN ẢNH</h2>

            <div className="cinema-news-grid">
              {cinemaNews.map((news) => (
                <div className="cinema-news-card" key={news.id}>
                  <img src={news.image} alt={news.title} />
                  <h3>{news.title}</h3>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

      </div>
    </>
  );
};

export default UserHome;