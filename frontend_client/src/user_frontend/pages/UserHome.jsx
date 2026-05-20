import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import Modal from '../../admin_frontend/components/Modal';
import FilmGenre from '../components/FilmGenre';

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
  // STATE
  // =========================

  const [swiperInstance, setSwiperInstance] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const [groupedMovies, setGroupedMovies] = useState({
    "Đang chiếu": [],
    "Sắp chiếu": []
  });

  const [loading, setLoading] = useState(true);

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

        const [statusRes, movieRes] = await Promise.all([
          axios.get('https://api.quangdungcinema.id.vn/api/movies/status-group'),
          axios.get('https://api.quangdungcinema.id.vn/api/showtimes/quick-booking')
        ]);

        setGroupedMovies(statusRes.data);

        setQuickData({
          movies: movieRes.data,
          cinemas: []
        });

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

      navigate('/booking', {
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
        <div className="carousel-full-wrapper">

          <Swiper
            modules={[
              Autoplay,
              EffectFade,
              Navigation,
              Pagination
            ]}
            effect={'fade'}
            speed={1500}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false
            }}
            loop={true}
            onSwiper={setSwiperInstance}
            onSlideChange={(swiper) =>
              setActiveIndex(swiper.realIndex)
            }
            className="mySwiper"
          >

            {banners.map((imgName, index) => (

              <SwiperSlide
                key={index}
                className="banner-full-item"
              >

                <picture>
                  <source
                    media="(max-width: 767px)"
                    srcSet={`${bannerDocUrl}${imgName}`}
                  />

                  <img
                    src={`${bannerBaseUrl}${imgName}`}
                    alt={`Promotion ${index + 1}`}
                    className="banner-img-fade-zoom"
                  />
                </picture>

                <div className="banner-full-overlay"></div>

              </SwiperSlide>
            ))}

          </Swiper>

          {/* THUMB */}
          <div className="mini-thumbnail-nav">

            {banners.map((imgName, index) => (

              <div
                key={index}
                className={`mini-nav-item ${
                  index === activeIndex
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  swiperInstance?.slideToLoop(index)
                }
              >

                <img
                  src={`${bannerBaseUrl}${imgName}`}
                  alt={`Thumb ${index}`}
                />

              </div>
            ))}

          </div>

        </div>

        {/* QUICK BOOKING */}
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

        {/* CONTENT */}
        <div className="home-container">

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

          {/* FILM */}
          <div className="movie-container">
            <FilmGenre />
          </div>

        </div>

      </div>
    </>
  );
};

export default UserHome;