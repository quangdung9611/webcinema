import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThumbsUp, Eye, Calendar, ChevronLeft, User, ChevronRight } from 'lucide-react';
import '../styles/FilmReviewDetail.css';

const FilmReviewDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [item, setItem] = useState(null);
    const [sidebarMovies, setSidebarMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // 1. Lấy chi tiết bài viết
                const res = await axios.get(`https://webcinema-zb8z.onrender.com/api/news/${slug}`);
                setItem(res.data);

                // 2. Lấy danh sách phim đang chiếu cho Sidebar
                const resMovies = await axios.get('https://webcinema-zb8z.onrender.com/api/movies');
                const active = resMovies.data.filter(m => m.status === 'Đang chiếu');
                setSidebarMovies(active.slice(0, 3)); // Lấy 3 phim đầu cho gọn

                setLoading(false);
            } catch (error) {
                console.error("Lỗi lấy dữ liệu:", error);
                setLoading(false);
            }
        };

        fetchData();
        window.scrollTo(0, 0);
    }, [slug]);

    const handleLikeDetail = async () => {
        if (!item) return;
        try {
            await axios.post(`https://webcinema-zb8z.onrender.com/api/news/like/${item.news_id}`);
            setItem(prev => ({ ...prev, likes: (prev.likes || 0) + 1 }));
        } catch (error) {
            console.error("Lỗi khi thích bài viết:", error);
        }
    };

    if (loading) return <div className="loading-state">Đang tải nội dung...</div>;
    if (!item) return <div className="error-state">Không tìm thấy bài viết này.</div>;

    return (
        <div className="review-detail-page">
            <div className="review-detail-container">
                
                {/* CỘT TRÁI: CHI TIẾT BÀI VIẾT */}
                <div className="review-main-content">
                    <Link to="/film-review" className="back-to-list-btn">
                        <ChevronLeft size={18} />
                        <span>Quay lại</span>
                    </Link>

                    <header className="review-header">
                        <h1 className="review-title-galaxy">{item.title}</h1>
                        
                        <div className="review-meta-bar">
                            <div className="meta-left-group">
                                <span className="meta-info-item">
                                    <Calendar size={14} />
                                    {new Date(item.created_at).toLocaleDateString('vi-VN')}
                                </span>
                                <span className="meta-info-item">
                                    <Eye size={14} />
                                    {item.views} lượt xem
                                </span>
                                <span className="meta-info-item">
                                    <User size={14} />
                                    Cinema Star
                                </span>
                            </div>
                            <button className="like-action-btn" onClick={handleLikeDetail}>
                                <ThumbsUp size={14} fill="white" />
                                <span>Thích ({item.likes || 0})</span>
                            </button>
                        </div>
                    </header>

                    <div className="review-featured-img">
                        <img 
                            src={`https://webcinema-zb8z.onrender.com/uploads/news/${item.image_url}`} 
                            alt={item.title} 
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/800x450'; }}
                        />
                    </div>

                    {/* <div 
                        className="review-article-body"
                        dangerouslySetInnerHTML={{ __html: item.content }}
                    /> */}

                    {/* <footer className="review-article-footer">
                        <div className="footer-like-section">
                             <button className="big-like-btn" onClick={handleLikeDetail}>
                                <ThumbsUp size={20} /> 
                                <span>Thích bài viết này</span>
                            </button>
                        </div>
                        <div className="tags-container">
                            <span className="tag-node">Review Phim</span>
                            <span className="tag-node">Tin Điện Ảnh</span>
                            <span className="tag-node">Cinema Star</span>
                        </div>
                    </footer> */}
                </div>

                {/* CỘT PHẢI: SIDEBAR PHIM ĐANG CHIẾU (BÊ NGUYÊN TỪ FILM REVIEW) */}
                <aside className="review-sidebar">
                    <div className="sidebar-sticky">
                        <div className="sidebar-heading">
                            PHIM ĐANG CHIẾU
                        </div>

                        <div className="sidebar-movie-list">
                            {sidebarMovies.map((m) => (
                                <div 
                                    key={m.movie_id} 
                                    className="sidebar-movie-item"
                                    onClick={() => navigate(`/movies/detail/${m.slug}`)}
                                >
                                    <div className="sidebar-movie-poster">
                                        <img 
                                            src={`https://webcinema-zb8z.onrender.com/uploads/posters/${m.poster_url}`} 
                                            alt={m.title} 
                                        />
                                        <span className="age-tag">C{m.age_rating}</span>
                                    </div>
                                    <h4 className="sidebar-movie-title">{m.title}</h4>
                                  
                                </div>
                            ))}
                        </div>

                        <button className="sidebar-more-btn" onClick={() => navigate('/movies')}>
                            XEM THÊM <ChevronRight size={16} />
                        </button>
                    </div>
                </aside>

            </div>
        </div>
    );
};

export default FilmReviewDetail;