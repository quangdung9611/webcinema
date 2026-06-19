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

  const banners = [
  {
    img: 'banner1.png',
    title: 'PHÒNG VIP',
    subtitle: 'RIÊNG TƯ • ĐẲNG CẤP • KHÁC BIỆT',
    button: 'KHÁM PHÁ NGAY'
  },

  {
    img: 'banner2.png',
    title: 'ƯU ĐÃI HOT',
    subtitle: 'ĐẶT VÉ NHANH • DEAL MỖI NGÀY',
    button: 'XEM ƯU ĐÃI'
  },

  {
    img: 'banner3.png',
    title: 'COMBO VIP',
    subtitle: 'BẮP GIÒN • NƯỚC MÁT • TRỌN VẸN',
    button: 'THƯỞNG THỨC NGAY'
  },

  {
    img: 'banner4.png',
    title: 'BOM TẤN',
    subtitle: 'ÂM THANH • HÌNH ẢNH • CẢM XÚC',
    button: 'ĐẶT VÉ NGAY'
  }
];
  const bannerBaseUrl = "https://api.quangdungcinema.id.vn/uploads/banners/";
  const bannerDocUrl = "https://api.quangdungcinema.id.vn/uploads/banner_doc/";
  const promotionImageUrl =
  "https://api.quangdungcinema.id.vn/uploads/promotions/";

  const blogCinemaImageUrl =
  "https://api.quangdungcinema.id.vn/uploads/blog_cinema/";
 
  // =========================
  // STATE
  // =========================

  const [swiperInstance, setSwiperInstance] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const [groupedMovies, setGroupedMovies] = useState({
    "Đang chiếu": [],
    "Sắp chiếu": []
  });

  const [loading, setLoading] = useState(true);
  const [promotions,setPromotions] = useState([]);
  const [cinemaNews,setCinemaNews] = useState([]);

  // QUICK BOOKING
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

  // =========================
  // MODAL
  // =========================

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
  // LOAD DATA
  // =========================

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
        axios.get(
          'https://api.quangdungcinema.id.vn/api/movies/status-group'
        ),

        axios.get(
          'https://api.quangdungcinema.id.vn/api/showtimes/quick-booking'
        ),

        axios.get(
          'https://api.quangdungcinema.id.vn/api/promotions/all'
        ),

        axios.get(
          'https://api.quangdungcinema.id.vn/api/blog-cinema/all'
        )
      ]);

        setGroupedMovies(statusRes.data);

        setQuickData({
          movies: movieRes.data,
          cinemas: []
        });
        setPromotions(
          promotionRes.data || []
        );
        setCinemaNews(
          blogRes.data || []
        );

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
  // CHỌN PHIM → LOAD RẠP
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
            params: {
              movie_id: selectedQuick.movie
            }
          }
        );

        setQuickData(prev => ({
          ...prev,
          cinemas: res.data
        }));

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

  // =========================
  // CHỌN RẠP → LOAD NGÀY
  // =========================

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

        setAvailableDates(
          res.data.map(d => d.show_date)
        );

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

  // =========================
  // CHỌN NGÀY → LOAD SUẤT
  // =========================

  useEffect(() => {

    if (
      !selectedQuick.movie ||
      !selectedQuick.cinema ||
      !selectedQuick.date
    ) {
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

  }, [
    selectedQuick.movie,
    selectedQuick.cinema,
    selectedQuick.date
  ]);

  // =========================
  // HANDLE QUICK BOOK
  // =========================

  const handleQuickBook = async () => {

    if (!selectedQuick.movie) {

      setModal({
        show: true,
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng chọn phim!'
      });

      return;
    }

    if (!selectedQuick.cinema) {

      setModal({
        show: true,
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng chọn rạp!'
      });

      return;
    }

    if (!selectedQuick.date) {

      setModal({
        show: true,
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng chọn ngày chiếu!'
      });

      return;
    }

    if (!selectedQuick.showtime) {

      setModal({
        show: true,
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng chọn suất chiếu!'
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

      console.error("Lỗi khi lấy showtime detail:", err);

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
    {/* MODAL */}
    <Modal
      show={modal.show}
      type={modal.type}
      title={modal.title}
      message={modal.message}
      onConfirm={closeModal}
      onCancel={closeModal}
    />

    <div className="user-home">

      {/* BANNER */}
    <div className="carousel-full-wrapper banner-premium">
      <Swiper
        modules={[Autoplay, EffectFade, Navigation, Pagination]}
        effect="fade"
        speed={1200}
        autoplay={{
          delay: 4500,
          disableOnInteraction: false
        }}
        loop={true}
        onSwiper={setSwiperInstance}
        onSlideChange={(swiper) =>
          setActiveIndex(swiper.realIndex)
        }
        className="premiumSwiper"
      >
        {banners.map((item, index) => (
      <SwiperSlide
        key={index}
        className={`banner-slide ${
          activeIndex === index ? "slide-active" : ""
        }`}
      >
        
        <div className="banner-media">
          
          <picture>
            <source
              media="(max-width: 767px)"
              srcSet={`${bannerDocUrl}${item.img}`}
            />

            <img
              src={`${bannerBaseUrl}${item.img}`}
              className="banner-img"
              alt={item.title}
            />
          </picture>

          {/* overlay */}
          <div className="banner-overlay"></div>

          {/* TEXT PREMIUM */}
          <div className="banner-text">
           <h1 className="banner-title">
              {item.title}
            </h1>
            <p className="banner-subtitle">
              {item.subtitle}
            </p>
            <button className="banner-btn">
                {item.button}
            </button>
            </div>
          {/* particle */}
          <div className="banner-particles"></div>
          {/* light effect */}
          <div className="banner-light"></div>

        </div>

      </SwiperSlide>
    ))}
      </Swiper>
    </div>

      {/* QUICK BOOKING */}
      <ScrollReveal>
        <section className="quick-booking-container">

          <div className="quick-booking-content">

            <div className="quick-booking-selects">

              {/* PHIM */}
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
                <option value="">
                  Chọn phim
                </option>

                {quickData.movies.map(m => (
                  <option
                    key={m.movie_id}
                    value={m.movie_id}
                  >
                    {m.title}
                  </option>
                ))}
              </select>

              {/* RẠP */}
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
                <option value="">
                  Chọn rạp
                </option>

                {quickData.cinemas.map(c => (
                  <option
                    key={c.cinema_id}
                    value={c.cinema_id}
                  >
                    {c.cinema_name}
                  </option>
                ))}
              </select>

              {/* NGÀY */}
              <select
                disabled={
                  !selectedQuick.cinema ||
                  !availableDates.length
                }
                value={selectedQuick.date}
                onChange={(e) =>
                  setSelectedQuick({
                    ...selectedQuick,
                    date: e.target.value,
                    showtime: ''
                  })
                }
              >
                <option value="">
                  Chọn ngày
                </option>

                {availableDates.map(date => (
                  <option
                    key={date}
                    value={date}
                  >
                    {date}
                  </option>
                ))}
              </select>

              {/* SUẤT */}
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
                <option value="">
                  Chọn suất
                </option>

                {availableShowtimes.map(s => (
                  <option
                    key={s.showtime_id}
                    value={s.showtime_id}
                  >
                    {s.start_time} - {s.room_name}
                  </option>
                ))}
              </select>

            </div>

            <button
              className="btn-quick-booking"
              onClick={handleQuickBook}
            >
              ĐẶT VÉ NGAY
            </button>

          </div>

        </section>
      </ScrollReveal>

      {/* CONTENT */}
      <div className="home-container">

        {/* FEATURES */}
        <ScrollReveal delay={0.1}>
          <section className="home-features-section">

            <div className="features-grid">

              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <Ticket size={32} />
                </div>

                <div className="feature-text">
                  <h4>ĐẶT VÉ NHANH CHÓNG</h4>
                  <p>Tiết kiệm thời gian tối đa</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <Star size={32} />
                </div>

                <div className="feature-text">
                  <h4>NHIỀU ƯU ĐÃI HẤP DẪN</h4>
                  <p>Săn deal hời mỗi ngày</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <CreditCard size={32} />
                </div>

                <div className="feature-text">
                  <h4>THANH TOÁN ĐA DẠNG</h4>
                  <p>Hỗ trợ mọi loại ví điện tử</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <Monitor size={32} />
                </div>

                <div className="feature-text">
                  <h4>TRẢI NGHIỆM ĐỈNH CAO</h4>
                  <p>Âm thanh, hình ảnh sống động</p>
                </div>
              </div>

            </div>

          </section>
        </ScrollReveal>

        {/* FILM */}
        <ScrollReveal delay={0.2}>
          <div className="movie-container">
            <FilmGenre />
          </div>
        </ScrollReveal>

        {/* PROMOTIONS */}
        <ScrollReveal delay={0.3}>
          <section className="promotions-section">

            <div className="section-header">
              <h2 className="section-title">
                ƯU ĐÃI HẤP DẪN
              </h2>

              <div className="title-underline"></div>
            </div>

            <div className="promotions-grid">

              {promotions.map((promo) => (

                <div
                  className="promo-card"
                  key={promo.promotion_id}
                >

                  <div className="promo-image">

                    <img
                      src={`${promotionImageUrl}${promo.image_url}`}
                      alt={promo.title}
                    />

                  </div>

                  <div className="promo-info">

                    <h3>
                      {promo.title}
                    </h3>

                    <p>
                      {promo.description}
                    </p>

                    <button
                      className="premium-card-btn"
                      onClick={() =>
                        navigate(
                          `/promotion/${promo.slug}`
                        )
                      }
                    >
                      Xem chi tiết
                    </button>

                  </div>

                </div>
              ))}

            </div>

          </section>
        </ScrollReveal>

        {/* CINEMA CORNER */}
        <ScrollReveal
          direction="zoom"
          delay={0.4}
        >
          <section className="cinema-corner-section">

            <div className="section-header">

              <h2 className="section-title">
                GÓC ĐIỆN ẢNH
              </h2>

              <div className="title-underline"></div>

            </div>

            <div className="cinema-news-grid">

            {cinemaNews.map((news) => (

                  <div
                    className="cinema-news-card"
                    key={news.blog_id}
                  >

                    <div className="cinema-news-image">

                      <img
                        src={`${blogCinemaImageUrl}${news.image_url}`}
                        alt={news.title}
                      />

                      {/* <span className="cinema-news-category">
                        ĐIỆN ẢNH
                      </span> */}

                    </div>

                    <div className="cinema-news-content">

                      <h3>
                        {news.title}
                      </h3>

                      <button
                        className="premium-card-btn"
                        onClick={() =>
                          navigate(
                            `/blog-cinema/${news.slug}`
                          )
                        }
                      >
                        Đọc thêm
                      </button>

                    </div>

                  </div>
                ))}

            </div>

          </section>
        </ScrollReveal>

      </div>

    </div>
  </>
);
};

export default UserHome;