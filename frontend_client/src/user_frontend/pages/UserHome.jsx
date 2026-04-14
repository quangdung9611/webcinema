import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import axios from 'axios';

// Giữ nguyên CSS của bạn
import '../styles/user_home.css';

const UserHome = () => {
  const navigate = useNavigate();
  
  // 1. DỮ LIỆU BANNER & LOGIC CHUYỂN SLIDE
  const banners = ['banner1.jpg', 'banner2.jpg', 'banner3.jpg', 'banner4.jpg'];
  
  // Đường dẫn folder ảnh ngang (PC)
  const bannerBaseUrl = "https://api.quangdungcinema.id.vn/uploads/banners/";
  // Đường dẫn folder ảnh dọc (Mobile)
  const bannerDocUrl = "https://api.quangdungcinema.id.vn/uploads/banner_doc/";
  
  const [currentBanner, setCurrentBanner] = useState(0);

  // Tự động chuyển banner mỗi 3 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // 2. QUẢN LÝ DỮ LIỆU PHIM TỪ API
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
      {/* 1. PHẦN BANNER - RESPONSIVE TỰ ĐỘNG TẠI 992PX */}
      <div className="carousel-wrapper">
        <div className="banner-slide-simple">
          {banners.map((imgName, index) => (
            <picture 
              key={index} 
              style={{ display: index === currentBanner ? 'block' : 'none' }}
            >
              {/* Nếu màn hình < 992px: Lấy hình từ folder banner_doc */}
              <source 
                media="(max-width: 767px)" 
                srcSet={`${bannerDocUrl}${imgName}`} 
              />
              
              {/* Mặc định (> 768px): Lấy hình từ folder banners gốc */}
              <img 
                src={`${bannerBaseUrl}${imgName}`} 
                alt={`Promotion ${index + 1}`} 
                className={`banner-img ${index === currentBanner ? 'active' : ''}`}
              />
            </picture>
          ))}
          
          {/* Các dấu chấm chỉ số (Pagination) tự chế */}
          <div className="banner-dots">
            {banners.map((_, index) => (
              <span 
                key={index} 
                className={`dot ${index === currentBanner ? 'active' : ''}`}
                onClick={() => setCurrentBanner(index)}
              ></span>
            ))}
          </div>
        </div>
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