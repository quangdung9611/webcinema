import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { ThumbsUp, Eye, ChevronRight } from 'lucide-react';
// Dùng chung file CSS với CinemaGenre để đồng bộ layout
import '../styles/CinemaGenre.css'; 

const FilmReview = () => {
    const navigate = useNavigate();
    
    const [news, setNews] = useState([]);
    const [sidebarMovies, setSidebarMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviewData = async () => {
            try {
                setLoading(true);
                const [resNews, resMovies] = await Promise.all([
                    axios.get('https://webcinema-zb8z.onrender.com/api/news'),
                    axios.get('https://webcinema-zb8z.onrender.com/api/movies')
                ]);

                setNews(resNews.data);
                
                // Lấy 3 phim đang chiếu cho Sidebar
                const active = resMovies.data.filter(m => m.status === 'Đang chiếu');
                setSidebarMovies(active.slice(0, 3)); 
                
                setLoading(false);
            } catch (error) {
                console.error("Lỗi kết nối API:", error);
                setLoading(false);
            }
        };

        fetchReviewData();
        window.scrollTo(0, 0);
    }, []);

    // Hàm xử lý cắt chuỗi và loại bỏ HTML tags
    const renderExcerpt = (item) => {
        const rawText = item.content || item.short_content || "";
        const cleanText = rawText.replace(/<[^>]*>/g, '');
        return cleanText.length > 160 ? cleanText.substring(0, 160) + "..." : cleanText;
    };

    if (loading) return <div className="loading">Đang tải dữ liệu...</div>;

    return (
        <div className="genre-page-bg">
            <div className="genre-content-flex">
                
                {/* CỘT TRÁI: DANH SÁCH BÌNH LUẬN PHIM */}
                <div className="main-genre-col">
                    <div className="section-header-galaxy">
                        <span className="blue-line"></span>
                        <h2 className="section-title">BÌNH LUẬN PHIM</h2>
                    </div>
                    
                    <div className="genre-filters-bar">
                        <select className="filter-select">
                            <option value="">Tất cả bài viết</option>
                            <option value="">Mới nhất</option>
                            <option value="">Xem nhiều nhất</option>
                        </select>
                    </div>

                    <div className="movie-genre-list">
                        {news.map(item => (
                            <div key={item.news_id} className="movie-card-horizontal">
                                <Link to={`/film-review/${item.slug}`} className="movie-img-box">
                                    <img 
                                        src={`https://webcinema-zb8z.onrender.com/uploads/news/${item.image_url}`} 
                                        alt={item.title} 
                                    />
                                </Link>
                                <div className="movie-content-info">
                                    <Link to={`/film-review/${item.slug}`} className="movie-name-link">
                                        <h3>{item.title}</h3>
                                    </Link>
                                    <div className="movie-meta-row">
                                        <button className="btn-fb-like">
                                            <ThumbsUp size={14} strokeWidth={2.5} fill="currentColor" /> 
                                            <span>Thích</span>
                                        </button>
                                        <span className="view-count">
                                            <Eye size={14} strokeWidth={2} /> 
                                            <span>{item.views} lượt xem</span>
                                        </span>
                                    </div>
                                    <p className="movie-summary-text">
                                        {renderExcerpt(item)}
                                    </p>
                                    <div className="movie-release-date">
                                        Ngày đăng: {new Date(item.created_at).toLocaleDateString('vi-VN')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CỘT PHẢI: SIDEBAR */}
                <div className="sidebar-col">
                    <div className="sidebar-title">Phim Đang Chiếu</div>
                    <div className="sidebar-movie-list">
                        {sidebarMovies.map((m) => (
                            <div key={m.movie_id} className="simple-movie-item" onClick={() => navigate(`/movies/detail/${m.slug}`)}>
                                <div className="simple-poster">
                                    <img 
                                        src={`https://webcinema-zb8z.onrender.com/uploads/posters/${m.poster_url}`} 
                                        alt={m.title} 
                                    />
                                    <div className="age-badge">C{m.age_rating}</div>
                                </div>
                                <div className="simple-title">{m.title}</div>
                            </div>
                        ))}
                    </div>
                    <button className="view-more-btn" onClick={() => navigate('/movies')}>
                        <span>Xem thêm</span>
                        <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                </div>

            </div>
        </div>
    );
};

export default FilmReview;