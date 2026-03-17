import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectCoverflow } from 'swiper/modules';
import { useNavigate } from 'react-router-dom'; 
import axios from 'axios';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';
import '../styles/user_home.css';

const UserHome = () => {
  const navigate = useNavigate();
  
  // 1. DỮ LIỆU BANNER
  const banners = ['banner1.jpg', 'banner2.jpg', 'banner3.jpg', 'banner4.jpg'];
  const bannerBaseUrl = "https://webcinema-zb8z.onrender.com/uploads/banners/";

  // 2. QUẢN LÝ DỮ LIỆU PHIM TỪ API
  const [groupedMovies, setGroupedMovies] = useState({ "Đang chiếu": [], "Sắp chiếu": [] });
  const [filterStatus, setFilterStatus] = useState('Đang chiếu');
  const [loading, setLoading] = useState(true);
  const movieBaseUrl = "https://webcinema-zb8z.onrender.com/uploads/posters/"; 

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const response = await axios.get('https://webcinema-zb8z.onrender.com/api/movies/status-group');
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
      {/* 1. PHẦN CAROUSEL - GIỮ NGUYÊN HIỆU ỨNG GỐC */}
      <div className="carousel-wrapper">
        <Swiper
          modules={[Navigation, Pagination, Autoplay, EffectCoverflow]}
          effect={'coverflow'}
          grabCursor={true}
          centeredSlides={true}
          slidesPerView={'auto'}
          coverflowEffect={{
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: true,
          }}
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          navigation={true}
          loop={true}
          className="banner-swiper"
        >
          {banners.map((imgName, index) => (
            <SwiperSlide key={index} className="banner-slide">
              <img 
                src={`${bannerBaseUrl}${imgName}`} 
                alt={`Promotion ${index + 1}`} 
                className="banner-img"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* 2. DANH SÁCH PHIM */}
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
          <div className="loading-state" style={{color: '#fff', textAlign: 'center', padding: '50px'}}>
             Đang tải phim...
          </div>
        ) : (
          <div className="movie-grid">
            {filteredMovies.length > 0 ? (
              filteredMovies.map((movie) => (
                <div key={movie.movie_id} className="movie-item">
                  <div className="poster-wrapper">
                    <img 
                        src={`${movieBaseUrl}${movie.poster_url}`} 
                        alt={movie.title}
                    />
                    
                    {/* HIỂN THỊ ĐỘ TUỔI (T13, T16, T18...) */}
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
              <div className="empty-results" style={{color: '#888', gridColumn: '1/-1', textAlign: 'center', padding: '50px'}}>
                Hiện chưa có phim nào ở mục này...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserHome;