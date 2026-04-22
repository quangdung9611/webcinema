import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import axios from 'axios';

// Import CSS đã được tinh chỉnh màu tím đen và hiệu ứng mượt
import '../styles/user_home.css';

const UserHome = () => {
  const navigate = useNavigate();
  
  // 1. DỮ LIỆU BANNER & LOGIC CHUYỂN SLIDE (Giữ nguyên của ông)
  const banners = ['banner1.jpg', 'banner2.jpg', 'banner3.jpg', 'banner4.jpg'];
  
  const bannerBaseUrl = "https://api.quangdungcinema.id.vn/uploads/banners/";
  const bannerDocUrl = "https://api.quangdungcinema.id.vn/uploads/banner_doc/";
  
  const [currentBanner, setCurrentBanner] = useState(0);

  // Tự động chuyển banner mỗi 3 giây (Giữ nguyên của ông)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // 2. QUẢN LÝ DỮ LIỆU PHIM TỪ API (Giữ nguyên của ông)
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
      {/* 1. PHẦN BANNER - CẬP NHẬT KIỂU CENTERED HIỆN ĐẠI */}
      <div className="carousel-wrapper-modern">
        <div className="carousel-track">
          {banners.map((imgName, index) => {
            // Tính toán vị trí để hiển thị 3 slide cùng lúc
          // SỬA THÀNH:
          let position = "hidden-slide"; 
          if (index === currentBanner) {
            position = "active-slide";
          } else if (index === (currentBanner - 1 + banners.length) % banners.length) {
            position = "prev-slide";
          } else if (index === (currentBanner + 1) % banners.length) {
            position = "next-slide";
          }
            return (
              <div 
                key={index} 
                className={`banner-item-modern ${position}`}
                onClick={() => setCurrentBanner(index)}
              >
                <picture>
                  {/* Mobile: Folder banner_doc */}
                  <source 
                    media="(max-width: 767px)" 
                    srcSet={`${bannerDocUrl}${imgName}`} 
                  />
                  {/* PC: Folder banners gốc */}
                  <img 
                    src={`${bannerBaseUrl}${imgName}`} 
                    alt={`Promotion ${index + 1}`} 
                    className="banner-img"
                  />
                </picture>
                
                {/* Lớp phủ để làm mờ 2 bên và tạo độ sâu */}
                <div className="banner-overlay-modern"></div>
              </div>
            );
          })}
        </div>

        {/* THUMBNAILS NHỎ PHÍA DƯỚI (Giữ nguyên tính năng cũ của ông) */}
        <div className="banner-thumbnails">
          {banners.map((imgName, index) => (
            <div 
              key={index} 
              className={`thumb-box ${index === currentBanner ? 'active' : ''}`}
              onClick={() => setCurrentBanner(index)}
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
          <div className="loading-state">
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
              <div className="empty-results">
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