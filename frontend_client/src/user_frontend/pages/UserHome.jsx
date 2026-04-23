import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import axios from 'axios';

// 1. IMPORT SWIPER COMPONENTS & MODULES
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules';

// 2. IMPORT SWIPER STYLES
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import '../styles/user_home.css';

const UserHome = () => {
  const navigate = useNavigate();
  
  // DỮ LIỆU BANNER (Giữ nguyên của ông)
  const banners = ['banner1.png', 'banner2.png', 'banner3.png', 'banner4.png'];
  const bannerBaseUrl = "https://api.quangdungcinema.id.vn/uploads/banners/";
  const bannerDocUrl = "https://api.quangdungcinema.id.vn/uploads/banner_doc/";
  
  // Biến để Swiper điều khiển thumbnail bên ngoài
  const [swiperInstance, setSwiperInstance] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // QUẢN LÝ DỮ LIỆU PHIM (Giữ nguyên của ông)
  const [groupedMovies, setGroupedMovies] = useState({ "Đang chiếu": [], "Sắp chiếu": [] });
  const [filterStatus, setFilterStatus] = useState('Đang chiếu');
  const [loading, setLoading] = useState(true);
  const movieBaseUrl = "https://api.quangdungcinema.id.vn/uploads/posters/"; 

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const response = await axios.get('https://api.quangdungcinema.id.vn/api/movies/status-group');
        setGroupedMovies(response.data);
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu status-group:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  const filteredMovies = groupedMovies[filterStatus] || [];

  return (
    <div className="user-home">
      {/* 1. PHẦN BANNER SỬ DỤNG SWIPER JS */}
      <div className="carousel-full-wrapper">
        <Swiper
          modules={[Autoplay, EffectFade, Navigation, Pagination]}
          effect={'fade'} // Hiệu ứng làm mờ
          speed={1500} // Tốc độ chuyển cảnh mượt mà
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
          }}
          loop={true}
          onSwiper={setSwiperInstance}
          onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
          className="mySwiper"
        >
          {banners.map((imgName, index) => (
            <SwiperSlide key={index} className="banner-full-item">
              <picture>
                <source 
                  media="(max-width: 767px)" 
                  srcSet={`${bannerDocUrl}${imgName}`} 
                />
                <img 
                  src={`${bannerBaseUrl}${imgName}`} 
                  alt={`Promotion ${index + 1}`} 
                  className="banner-img-fade-zoom" // Class mới cho CSS zoom
                />
              </picture>
              <div className="banner-full-overlay"></div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* CỤM THUMBNAIL ĐIỀU KHIỂN SWIPER */}
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

      {/* 2. DANH SÁCH PHIM (Giữ nguyên cấu trúc logic của ông) */}
      <div className="movie-container">
        <div className="movie-tabs">
          <div className="tab-left">
             <button 
               className={`tab-btn ${filterStatus === 'Đang chiếu' ? 'active' : ''}`}
               onClick={() => setFilterStatus('Đang chiếu')}
             >
               Đang chiếu
             </button>
             <button 
               className={`tab-btn ${filterStatus === 'Sắp chiếu' ? 'active' : ''}`}
               onClick={() => setFilterStatus('Sắp chiếu')}
             >
               Sắp chiếu
             </button>
          </div>
          <div className="tab-right">
            <span 
              style={{ cursor: 'pointer' }} 
              onClick={() => navigate(filterStatus === 'Đang chiếu' ? '/movies/phim-dang-chieu' : '/movies/phim-sap-chieu')}
            >
              Xem tất cả <i className="fa-solid fa-angles-right"></i>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Đang tải phim...</div>
        ) : (
          <div className="movie-grid">
            {filteredMovies.length > 0 ? (
              filteredMovies.map((movie) => (
                <div key={movie.movie_id} className="movie-item">
                  <div className="poster-wrapper">
                    <img 
                        src={`${movieBaseUrl}${movie.poster_url}`} 
                        alt={movie.title}
                        className="poster-img"
                    />
                    <div className={`age-badge age-${movie.age_rating}`}>
                      T{movie.age_rating}
                    </div>
                    <div className="poster-hover">
                      <button 
                        className="btn-book" 
                        onClick={() => navigate(`/movies/detail/${movie.slug || movie.movie_slug}`)}
                      >
                        XEM CHI TIẾT
                      </button>
                    </div>
                  </div>
                  <h3 className="movie-name">{movie.title}</h3>
                </div>
              ))
            ) : (
              <div className="empty-results">Hiện chưa có phim nào ở mục này...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserHome;