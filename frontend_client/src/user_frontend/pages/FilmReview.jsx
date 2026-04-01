import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { ThumbsUp, Eye, ChevronRight } from 'lucide-react';
import '../styles/FilmReview.css'; 

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
                    // Sử dụng endpoint /all để lấy đầy đủ data tin tức
                    axios.get('https://webcinema-zb8z.onrender.com/api/news/all'),
                    axios.get('https://webcinema-zb8z.onrender.com/api/movies')
                ]);

                setNews(resNews.data);
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

    // Hàm xử lý tăng lượt thích trực tiếp trên trang danh sách
    const handleLike = async (e, newsId) => {
        e.preventDefault(); // Ngăn chặn việc chuyển trang khi bấm vào nút Like
        try {
            await axios.post(`https://webcinema-zb8z.onrender.com/api/news/like/${newsId}`);
            
            // Cập nhật state cục bộ để con số nhảy ngay lập tức
            setNews(prevNews => 
                prevNews.map(item => 
                    item.news_id === newsId 
                    ? { ...item, likes: (item.likes || 0) + 1 } 
                    : item
                )
            );
        } catch (error) {
            console.error("Lỗi khi thích bài viết:", error);
        }
    };

    const renderExcerpt = (item) => {
        const rawText = item.content || item.short_content || "";
        const cleanText = rawText.replace(/<[^>]*>/g, '');
        return cleanText.length > 150 ? cleanText.substring(0, 150) + "..." : cleanText;
    };

    if (loading) return <div className="loading-state">Đang tải dữ liệu...</div>;

    return (
        <div className="genre-page-bg">
            <div className="genre-content-flex">
                
                {/* CỘT TRÁI: DANH SÁCH BÌNH LUẬN */}
                <div className="main-genre-col">
                    <div className="section-header-galaxy">
                        <span className="blue-line"></span>
                        <h2 className="section-title">BÌNH LUẬN PHIM</h2>
                    </div>
                    
                    <div className="genre-filters-bar">
                        <select className="filter-select-custom">
                            <option value="">Tất cả bài viết</option>
                            <option value="new">Mới nhất</option>
                            <option value="hot">Xem nhiều nhất</option>
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
                                        {/* Nút Thích lấy dữ liệu động từ database */}
                                        <button 
                                            className="btn-fb-like" 
                                            onClick={(e) => handleLike(e, item.news_id)}
                                        >
                                            <ThumbsUp size={12} fill="currentColor" /> 
                                            <span>Thích ({item.likes || 0})</span>
                                        </button>
                                        
                                        {/* Lượt xem hiển thị con số thật từ database */}
                                        <span className="view-count">
                                            <Eye size={14} /> 
                                            <span>{item.views || 0} lượt xem</span>
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

                {/* CỘT PHẢI: SIDEBAR PHIM ĐANG CHIẾU */}
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
                    <button className="view-more-sidebar-btn" onClick={() => navigate('/movies')}>
                        <span>Xem thêm</span>
                        <ChevronRight size={18} />
                    </button>
                </div>

            </div>
        </div>
    );
};

export default FilmReview;