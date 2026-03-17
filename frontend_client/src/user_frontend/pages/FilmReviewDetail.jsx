import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ThumbsUp, Eye, Calendar, ChevronLeft, User } from 'lucide-react';
import '../styles/FilmReviewDetail.css'; // Nhớ đổi tên file CSS tương ứng nếu cần

const FilmReviewDetail = () => {
    const { slug } = useParams();
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNewsDetail = async () => {
            try {
                setLoading(true);
                // Gọi API lấy chi tiết bài viết dựa trên slug từ URL
                const res = await axios.get(`https://webcinema-zb8z.onrender.com/api/news/${slug}`);
                setItem(res.data);
                setLoading(false);
            } catch (error) {
                console.error("Lỗi lấy chi tiết review:", error);
                setLoading(false);
            }
        };

        fetchNewsDetail();
        window.scrollTo(0, 0); // Luôn cuộn lên đầu trang khi vào xem bài mới
    }, [slug]);

    if (loading) return <div className="loading">Đang tải nội dung review...</div>;
    if (!item) return <div className="error">Không tìm thấy bài viết này.</div>;

    return (
        <div className="review-detail-container">
            <div className="review-detail-content">
                {/* Nút quay lại trang danh sách */}
                <Link to="/film-review" className="back-to-list">
                    <ChevronLeft size={18} />
                    <span>Quay lại mục Bình luận phim</span>
                </Link>

                <header className="review-header">
                    <h1 className="review-main-title">{item.title}</h1>
                    
                    <div className="review-meta-info">
                        <div className="meta-left">
                            <span className="meta-item">
                                <Calendar size={14} />
                                {new Date(item.created_at).toLocaleDateString('vi-VN')}
                            </span>
                            <span className="meta-item">
                                <Eye size={14} />
                                {item.views} lượt xem
                            </span>
                            <span className="meta-item">
                                <User size={14} />
                                Cinema Star
                            </span>
                        </div>
                        <button className="btn-fb-like">
                            <ThumbsUp size={12} fill="white" />
                            <span>Thích</span>
                        </button>
                    </div>
                </header>

                {/* Ảnh đại diện bài viết */}
                <div className="review-banner">
                    <img 
                        src={`https://webcinema-zb8z.onrender.com/uploads/news/${item.image_url}`} 
                        alt={item.title} 
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/800x450?text=Cinema+Star+Review'; }}
                    />
                </div>

                {/* Nội dung chính của bài Review - Render HTML từ CKEditor/Database */}
                <div 
                    className="review-body-text"
                    dangerouslySetInnerHTML={{ __html: item.content }}
                />

                <footer className="review-footer">
                    <div className="review-tags">
                        <strong>Tags:</strong>
                        <span className="tag-label">Review Phim</span>
                        <span className="tag-label">Tin Điện Ảnh</span>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default FilmReviewDetail;