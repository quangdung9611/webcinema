import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ThumbsUp, Eye, Calendar, ChevronLeft, User } from 'lucide-react';
import MovieSidebar from '../components/MovieSidebar'; 
import '../styles/FilmReviewDetail.css';

const FilmReviewDetail = () => {
    const { slug } = useParams();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const IMAGE_BASE_URL = 'https://api.quangdungcinema.id.vn/uploads';

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`https://api.quangdungcinema.id.vn/api/news/${slug}`);
                setItem(res.data);
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
            await axios.post(`https://api.quangdungcinema.id.vn/api/news/like/${item.news_id}`);
            setItem(prev => ({ ...prev, likes: (prev.likes || 0) + 1 }));
        } catch (error) {
            console.error("Lỗi khi thích bài viết:", error);
        }
    };

    if (loading) return <div className="loading">Đang tải nội dung...</div>;
    if (!item) return <div className="error-state">Không tìm thấy bài viết này.</div>;

    return (
        <div className="review-detail-page">
            <div className="review-detail-container-flex">
                
                {/* CỘT TRÁI (7.5) */}
                <div className="main-review-col">
                    <div className="review-glass-card">
                        <Link to="/film-review" className="back-to-list-btn">
                            <ChevronLeft size={18} />
                            <span>Quay lại danh sách</span>
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
                                src={`${IMAGE_BASE_URL}/news/${item.image_url}`} 
                                alt={item.title} 
                            />
                        </div>

                        <div 
                            className="review-article-body"
                            dangerouslySetInnerHTML={{ __html: item.content }}
                        />
                    </div>
                </div>

                {/* CỘT PHẢI (2.5) */}
                <div className="sidebar-review-col">
                    <MovieSidebar 
                        IMAGE_BASE_URL={IMAGE_BASE_URL}
                        title="Phim Đang Chiếu"
                    />
                </div>

            </div>
        </div>
    );
};

export default FilmReviewDetail;