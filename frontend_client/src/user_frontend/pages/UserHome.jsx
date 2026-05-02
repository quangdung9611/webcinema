import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import axios from 'axios';
import MovieSlider from '../components/MovieSlider';
// 1. IMPORT SWIPER COMPONENTS & MODULES
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules';
// Thêm dòng này nè Dũng:
import { Ticket, Star, CreditCard, Monitor } from 'lucide-react';
// 2. IMPORT SWIPER STYLES
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import '../styles/user_home.css';

const UserHome = () => {
  const navigate = useNavigate();
  
  // --- DỮ LIỆU BANNER (Giữ nguyên) ---
  const banners = ['banner1.png', 'banner2.png', 'banner3.png', 'banner4.png'];
  const bannerBaseUrl = "https://api.quangdungcinema.id.vn/uploads/banners/";
  const bannerDocUrl = "https://api.quangdungcinema.id.vn/uploads/banner_doc/";
  
  const [swiperInstance, setSwiperInstance] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // --- QUẢN LÝ DỮ LIỆU PHIM & QUICK BOOKING ---
  const [groupedMovies, setGroupedMovies] = useState({ "Đang chiếu": [], "Sắp chiếu": [] });
  const [loading, setLoading] = useState(true);
  const movieBaseUrl = "https://api.quangdungcinema.id.vn/uploads/posters/"; 

  // State cho Đặt vé nhanh
  const [quickData, setQuickData] = useState({ movies: [], cinemas: [] });
  const [selectedQuick, setSelectedQuick] = useState({ movie: '', cinema: '', date: '', showtime: '' });
  const [availableShowtimes, setAvailableShowtimes] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);

  // 1. Fetch dữ liệu ban đầu (Phim Slider + List Phim/Rạp cho Quick Booking)
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [statusRes, movieRes, cinemaRes] = await Promise.all([
          axios.get('https://api.quangdungcinema.id.vn/api/movies/status-group'),
          axios.get('https://api.quangdungcinema.id.vn/api/movies'),
          axios.get('https://api.quangdungcinema.id.vn/api/cinemas')
        ]);
        
        setGroupedMovies(statusRes.data);
        setQuickData({
          movies: movieRes.data,
          cinemas: cinemaRes.data
        });
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // 2. Fetch Suất chiếu khi chọn xong Phim + Rạp
  useEffect(() => {
    const fetchQuickShowtimes = async () => {
      if (selectedQuick.movie && selectedQuick.cinema) {
        try {
          const res = await axios.get(`https://api.quangdungcinema.id.vn/api/showtimes`, {
            params: {
              movie_id: selectedQuick.movie,
              cinema_id: selectedQuick.cinema
            }
          });
          setAvailableShowtimes(res.data);
          // Lọc ra danh sách các ngày duy nhất
          const dates = [...new Set(res.data.map(item => item.show_date))];
          setAvailableDates(dates);
        } catch (error) {
          console.error("Lỗi fetch suất chiếu nhanh:", error);
        }
      }
    };
    fetchQuickShowtimes();
  }, [selectedQuick.movie, selectedQuick.cinema]);

  // 3. Xử lý nút Đặt vé nhanh
  const handleQuickBook = () => {
    if (!selectedQuick.showtime) {
      alert("Dũng ơi, chọn đầy đủ thông tin suất chiếu đã nhé!");
      return;
    }
    // Lưu vào sessionStorage để trang Booking lấy ra dùng[cite: 1]
    sessionStorage.setItem('quickBooking', JSON.stringify(selectedQuick));
    navigate('/booking');
  };

  return (
    <div className="user-home">
      {/* 1. PHẦN BANNER SỬ DỤNG SWIPER JS */}
      <div className="carousel-full-wrapper">
        <Swiper
          modules={[Autoplay, EffectFade, Navigation, Pagination]}
          effect={'fade'}
          speed={1500}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          loop={true}
          onSwiper={setSwiperInstance}
          onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
          className="mySwiper"
        >
          {banners.map((imgName, index) => (
            <SwiperSlide key={index} className="banner-full-item">
              <picture>
                <source media="(max-width: 767px)" srcSet={`${bannerDocUrl}${imgName}`} />
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

        {/* THUMBNAIL NAV */}
        <div className="mini-thumbnail-nav">
          {banners.map((imgName, index) => (
            <div 
              key={index} 
              className={`mini-nav-item ${index === activeIndex ? 'active' : ''}`}
              onClick={() => swiperInstance?.slideToLoop(index)}
            >
              <img src={`${bannerBaseUrl}${imgName}`} alt={`Thumb ${index}`} />
            </div>
          ))}
        </div>
      </div>

      {/* 2. THANH ĐẶT VÉ NHANH (MỚI TÍCH HỢP) */}
      <section className="quick-booking-container">
        <div className="quick-booking-content">
          <div className="quick-booking-selects">
            {/* Chọn Phim */}
            <select 
              value={selectedQuick.movie}
              onChange={(e) => setSelectedQuick({...selectedQuick, movie: e.target.value, date: '', showtime: ''})}
            >
              <option value="">Chọn phim</option>
              {quickData.movies.map(m => (
                <option key={m.movie_id} value={m.movie_id}>{m.title}</option>
              ))}
            </select>

            {/* Chọn Rạp */}
            <select 
              value={selectedQuick.cinema}
              onChange={(e) => setSelectedQuick({...selectedQuick, cinema: e.target.value, date: '', showtime: ''})}
            >
              <option value="">Chọn rạp</option>
              {quickData.cinemas.map(c => (
                <option key={c.cinema_id} value={c.cinema_id}>{c.cinema_name}</option>
              ))}
            </select>

            {/* Chọn Ngày */}
            <select 
              disabled={!availableDates.length}
              value={selectedQuick.date}
              onChange={(e) => setSelectedQuick({...selectedQuick, date: e.target.value, showtime: ''})}
            >
              <option value="">Chọn ngày</option>
              {availableDates.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>

            {/* Chọn Suất */}
            <select 
              disabled={!selectedQuick.date}
              value={selectedQuick.showtime}
              onChange={(e) => setSelectedQuick({...selectedQuick, showtime: e.target.value})}
            >
              <option value="">Chọn suất</option>
              {availableShowtimes
                .filter(s => s.show_date === selectedQuick.date)
                .map(s => (
                  <option key={s.showtime_id} value={s.showtime_id}>
                    {s.start_time} - {s.room_name}
                  </option>
                ))}
            </select>
          </div>
          <button className="btn-quick-booking" onClick={handleQuickBook}>ĐẶT VÉ NGAY</button>
        </div>
      </section>
      {/* 4 ICON TIỆN ÍCH DƯỚI QUICK BOOKING */}
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
      {/* 3. DANH SÁCH PHIM SLIDER */}
      <div className="movie-container">
        {loading ? (
          <div className="loading-state">Đang tải phim...</div>
        ) : (
          <>
            <MovieSlider
              title="PHIM ĐANG CHIẾU"
              movies={groupedMovies["Đang chiếu"] || []}
              baseUrl={movieBaseUrl}
              onClickMovie={(movie) => navigate(`/movies/detail/${movie.slug || movie.movie_slug}`)}
            />

            <MovieSlider
              title="PHIM SẮP CHIẾU"
              movies={groupedMovies["Sắp chiếu"] || []}
              baseUrl={movieBaseUrl}
              onClickMovie={(movie) => navigate(`/movies/detail/${movie.slug || movie.movie_slug}`)}
            />
          </>
        )}
      </div>
      {/* SECTION ƯU ĐÃI HẤP DẪN */}
    <section className="promotions-section">
        <div className="section-header">
            <h2 className="section-title">ƯU ĐÃI HẤP DẪN</h2>
            <div className="title-underline"></div>
        </div>

        <div className="promotions-grid">
            <div className="promo-card">
                <div className="promo-image">
                    <img src="https://api.quangdungcinema.id.vn/uploads/banners/banner1.png" alt="Ưu đãi 1" />
                    <div className="promo-tag">Hot</div>
                </div>
                <div className="promo-info">
                    <h3>Thứ Hai Vui Vẻ - Đồng Giá 45K</h3>
                    <p>Áp dụng cho mọi suất chiếu vào ngày Thứ Hai đầu tuần tại Cinema Star.</p>
                    <button className="btn-detail">Xem chi tiết</button>
                </div>
            </div>

            <div className="promo-card">
                <div className="promo-image">
                    <img src="https://api.quangdungcinema.id.vn/uploads/banners/banner2.png" alt="Ưu đãi 2" />
                    <div className="promo-tag">New</div>
                </div>
                <div className="promo-info">
                    <h3>Combo Bắp Nước Ưu Đãi 20%</h3>
                    <p>Tặng ngay voucher giảm giá khi mua vé trực tuyến qua usertoken.</p>
                    <button className="btn-detail">Xem chi tiết</button>
                </div>
            </div>

            <div className="promo-card">
                <div className="promo-image">
                    <img src="https://api.quangdungcinema.id.vn/uploads/banners/banner3.png" alt="Ưu đãi 3" />
                </div>
                <div className="promo-info">
                    <h3>Thành Viên Mới - Nhận Quà Khủng</h3>
                    <p>Đăng ký tài khoản Cinema Star ngay hôm nay để nhận 1 vé miễn phí.</p>
                    <button className="btn-detail">Xem chi tiết</button>
                </div>
            </div>
        </div>
    </section>
    {/* SECTION GÓC ĐIỆN ẢNH */}
  <section className="cinema-corner-section">
      <div className="section-header">
          <h2 className="section-title">GÓC ĐIỆN ẢNH</h2>
          <div className="title-underline"></div>
      </div>

      <div className="cinema-corner-content">
          {/* Tin chính bên trái */}
          <div className="news-main">
              <div className="news-card big">
                  <div className="news-img">
                      <img src="https://api.quangdungcinema.id.vn/uploads/banners/banner4.png" alt="News" />
                  </div>
                  <div className="news-info">
                      <span className="news-category">Review</span>
                      <h3>[Review] Kẻ Ăn Hồn: Hành trình kinh dị đậm chất dân gian Việt Nam</h3>
                      <p>Bộ phim gây ấn tượng mạnh với bối cảnh làng quê u ám và những hủ tục ghê rợn...</p>
                  </div>
              </div>
          </div>

          {/* Danh sách tin phụ bên phải */}
          <div className="news-list-side">
              <div className="news-side-item">
                  <div className="side-img">
                      <img src="https://api.quangdungcinema.id.vn/uploads/banners/banner1.png" alt="News" />
                  </div>
                  <div className="side-info">
                      <h4>Top 5 phim bom tấn không thể bỏ lỡ tháng này</h4>
                      <span>15/05/2026</span>
                  </div>
              </div>

              <div className="news-side-item">
                  <div className="side-img">
                      <img src="https://api.quangdungcinema.id.vn/uploads/banners/banner2.png" alt="News" />
                  </div>
                  <div className="side-info">
                      <h4>Cinema Star khai trương cụm rạp mới tại Quận 6</h4>
                      <span>12/05/2026</span>
                  </div>
              </div>

              <div className="news-side-item">
                  <div className="side-img">
                      <img src="https://api.quangdungcinema.id.vn/uploads/banners/banner3.png" alt="News" />
                  </div>
                  <div className="side-info">
                      <h4>Bí mật hậu trường của siêu phẩm hành động năm 2026</h4>
                      <span>10/05/2026</span>
                  </div>
              </div>
          </div>
      </div>
  </section>
    </div>
  );
};

export default UserHome;