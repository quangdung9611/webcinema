import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { ThumbsUp, Eye } from 'lucide-react'; 
import MovieSidebar from '../components/MovieSidebar'; // Kế thừa Sidebar chung
import '../styles/FilmReview.css'; 

const FilmReview = () => {
    const navigate = useNavigate();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    const IMAGE_BASE_URL = 'https://api.quangdungcinema.id.vn/uploads';

    useEffect(() => {
        const fetchReviewData = async () => {
            try {
                setLoading(true);
                // Chỉ cần lấy tin tức, MovieSidebar sẽ tự lo phần phim
                const resNews = await axios.get('https://api.quangdungcinema.id.vn/api/news/all');
                setNews(resNews.data);
                setLoading(false);
            } catch (error) {
                console.error("Lỗi kết nối API:", error);
                setLoading(false);
            }
        };

        fetchReviewData();
        window.scrollTo(0, 0);
    }, []);

    const handleLike = async (e, newsId) => {
        e.preventDefault();
        try {
            await axios.post(`https://api.quangdungcinema.id.vn/api/news/like/${newsId}`);
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
        const cleanText = rawText.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
        return cleanText.length > 150 ? cleanText.substring(0, 150) + "..." : cleanText;
    };

    if (loading) return <div className="loading">Đang tải dữ liệu...</div>;

    return (
        <div className="genre-page-bg">
            <div className="genre-content-flex">
                
                {/* CỘT TRÁI (7.5): DANH SÁCH BÌNH LUẬN */}
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
                                <Link to={`/film-review/${item.slug}`} className="movie-image-container">
                                    <img 
                                        className="movie-img-main"
                                        src={`${IMAGE_BASE_URL}/news/${item.image_url}`} 
                                        alt={item.title} 
                                    />
                                </Link>
                                
                                <div className="movie-content-info">
                                    <Link to={`/film-review/${item.slug}`} className="movie-name-link">
                                        <h3>{item.title}</h3>
                                    </Link>
                                    
                                    <div className="movie-meta-row">
                                        <button 
                                            className="btn-fb-like" 
                                            onClick={(e) => handleLike(e, item.news_id)}
                                        >
                                            <ThumbsUp size={14} strokeWidth={2.5} fill="currentColor" /> 
                                            <span>Thích {item.likes > 0 ? item.likes : ""}</span>
                                        </button>
                                        
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

                {/* CỘT PHẢI (2.5): SIDEBAR DÙNG CHUNG */}
                <div className="sidebar-col">
                    <MovieSidebar 
                        IMAGE_BASE_URL={IMAGE_BASE_URL}
                        title="Phim Đang Chiếu"
                    />
                </div>

            </div>
        </div>
    );
};

export default FilmReview;