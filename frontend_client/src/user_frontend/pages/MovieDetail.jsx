import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
// Dọn dẹp lại các icon thực sự có dùng
import { Star, User, Play } from 'lucide-react'; 
import Modal from '../../admin_frontend/components/Modal';
import { useAuth } from '../../context/AuthContext';
import '../styles/MovieDetail.css';

const MovieDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    const [movie, setMovie] = useState(null);
    const [relatedMovies, setRelatedMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Logic Tabs
    const [activeTab, setActiveTab] = useState('overview');

    // Logic Review & Modal
    const [userRating, setUserRating] = useState(0); 
    const [hover, setHover] = useState(0); 
    const [reviewComment, setReviewComment] = useState(""); 
    const [reviews, setReviews] = useState([]);
    const [modalConfig, setModalConfig] = useState({
        show: false, type: '', title: '', message: null, onConfirm: null 
    });

    const API_BASE_URL = "https://api.quangdungcinema.id.vn/api";
    const IMAGE_BASE_URL = "https://api.quangdungcinema.id.vn/uploads";

    const getYoutubeID = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const fetchReviews = useCallback(async (movieId) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/reviews/${movieId}`);
            const sortedReviews = res.data.sort((a, b) => 
                new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
            );
            setReviews(sortedReviews);
        } catch (error) {
            console.error("Lỗi lấy danh sách review:", error);
        }
    }, [API_BASE_URL]);

    useEffect(() => {
        const fetchMovieData = async () => {
            if (!slug || slug === 'undefined') return;
            try {
                setLoading(true);
                const [resMovie, resRelated] = await Promise.all([
                    axios.get(`${API_BASE_URL}/movies/${slug}`),
                    axios.get(`${API_BASE_URL}/movies`)
                ]);

                const movieData = resMovie.data;
                setMovie(movieData);
                
                if (movieData?.movie_id) {
                    fetchReviews(movieData.movie_id);
                }

                const filtered = resRelated.data.filter(m => m.slug !== slug);
                setRelatedMovies(filtered.slice(0, 4));

            } catch (error) {
                console.error("Lỗi gọi API:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMovieData();
        window.scrollTo(0, 0);
    }, [slug, fetchReviews, API_BASE_URL]);

    const closeModal = () => setModalConfig(prev => ({ ...prev, show: false }));

    const handleSendReview = async () => {
        if (userRating === 0) {
            setModalConfig(prev => ({ 
                ...prev, show: true, type: 'error', title: 'Thông báo', message: 'Bạn ơi, chọn số sao đã nhé!' 
            }));
            return;
        }
        try {
            await axios.post(`${API_BASE_URL}/reviews`, {
                movie_id: movie.movie_id,
                user_id: user.user_id,
                rating: userRating,
                comment: reviewComment 
            });
            setUserRating(0);
            setReviewComment("");
            const response = await axios.get(`${API_BASE_URL}/movies/${slug}`);
            setMovie(response.data);
            fetchReviews(movie.movie_id);
            setModalConfig({
                show: true, type: 'success', title: 'Gửi thành công!',
                message: 'Cảm ơn bạn đã dành thời gian đánh giá phim nhé!',
                onConfirm: closeModal 
            });
        } catch (error) {
            setModalConfig({
                show: true, type: 'error', title: 'Opps! Có lỗi rồi',
                message: 'Gửi đánh giá thất bại, thử lại sau nhé!',
                onConfirm: closeModal
            });
        }
    };

    const openRatingModal = () => {
        if (!user) {
            setModalConfig({
                show: true, type: 'confirm', title: 'Yêu cầu đăng nhập',
                message: 'Bạn cần đăng nhập để thực hiện đánh giá.',
                onConfirm: () => {
                    closeModal();
                    navigate('/login', { state: { from: location.pathname } });
                }
            });
            return;
        }
        setModalConfig({
            show: true, type: 'confirm', title: `Đánh giá phim: ${movie.title}`,
            message: 'rating_mode', onConfirm: handleSendReview
        });
    };

    const renderStarRating = () => (
        <div className="star-rating-container">
            <div className="star-rating-hint">Chia sẻ cảm nghĩ của bạn về phim này:</div>
            <div className="star-list">
                {[...Array(10)].map((_, index) => {
                    const starValue = index + 1;
                    const isActive = starValue <= (hover || userRating);
                    return (
                        <Star
                            key={starValue}
                            size={28}
                            className={`star-icon ${isActive ? 'active' : ''}`}
                            color={isActive ? "#f5b50a" : "#444"}
                            fill={isActive ? "#f5b50a" : "none"}
                            onMouseEnter={() => setHover(starValue)}
                            onMouseLeave={() => setHover(0)}
                            onClick={() => setUserRating(starValue)}
                        />
                    );
                })}
            </div>
            <textarea
                placeholder="Phim hay không? Nhập đánh giá ở đây nha..."
                className="review-textarea"
                value={reviewComment} 
                onChange={(e) => setReviewComment(e.target.value)}
            />
        </div>
    );

    const videoId = movie ? getYoutubeID(movie.trailer_url) : null;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview':
                return (
                    <div className="tab-pane fade-in">
                        <p className="movie-desc">
                            {movie.description?.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ')}
                        </p>
                        <div className="movie-specs">
                            <p><span>Starring:</span> {movie.cast || 'Updating...'}</p>
                            <p><span>Director:</span> {movie.director || 'Updating...'}</p>
                            <p><span>Genre:</span> {movie.genres?.map(g => g.genre_name).join(', ')}</p>
                        </div>
                    </div>
                );
            case 'trailers':
                return (
                    <div className="tab-pane fade-in">
                        <div className="trailer-embed">
                            <iframe 
                                src={`https://www.youtube.com/embed/${videoId}`} 
                                title="Trailer"
                                allowFullScreen
                            ></iframe>
                        </div>
                    </div>
                );
            case 'reviews':
                return (
                    <div className="tab-pane fade-in">
                    {/* Đổi thành tab-content-area để kích hoạt thanh cuộn dọc mỏng */}
                    <div className="tab-content-area reviews-container">
                        
                        {/* Đưa nút lên đầu để người dùng dễ thấy, hoặc giữ ở dưới tùy bạn */}
                        <button className="add-review-btn" onClick={openRatingModal}>
                            + Viết đánh giá
                        </button>

                        {reviews.map((r, i) => (
                            /* Đổi thành review-card để có hiệu ứng kính mờ và hover */
                            <div key={i} className="review-card">
                                <div className="review-user-info">
                                    {/* Icon và Username chuyên nghiệp hơn */}
                                    <div className="user-icon-circle">
                                        <User size={14} />
                                    </div>
                                    <span className="user-name-text">{r.username}</span>
                                </div>
                                <p className="review-comment">{r.comment}</p>
                            </div>
                        ))}
                        
                    </div>
                </div>
                );
            default: return null;
        }
    };

    if (loading) return <div className="loading-screen"><span>Đang tải phim...</span></div>;
    if (!movie) return <div className="error">Không tìm thấy phim.</div>;

    return (
    <div className="netflix-detail-container">
        <Modal 
            show={modalConfig.show} 
            type={modalConfig.type} 
            title={modalConfig.title}
            message={modalConfig.message === 'rating_mode' ? renderStarRating() : modalConfig.message}
            onConfirm={modalConfig.message === 'rating_mode' ? handleSendReview : (modalConfig.onConfirm || closeModal)}
            onCancel={closeModal}
        />

        <div className="netflix-content-layout">
            {/* CỘT TRÁI: POSTER */}
            <div className="left-column">
                <div className="main-poster-wrapper">
                    <img src={`${IMAGE_BASE_URL}/posters/${movie.poster_url}`} alt={movie.title} />
                </div>
            </div>

            {/* CỘT PHẢI: THÔNG TIN - Sẽ tự động cao bằng cột trái */}
            <div className="right-column">
                {/* Nhóm trên: Tiêu đề và Tabs */}
                <div className="upper-info">
                    <div className="header-row">
                        <h1 className="movie-title">{movie.title}</h1>
                        <div className="score-badge">
                            <span>{movie.avg_rating || "0.0"}</span>
                            <Star size={20} fill="#f5b50a" color="#f5b50a" />
                        </div>
                    </div>

                    <div className="meta-row">
                        <span>{new Date(movie.release_date).getFullYear()}</span>
                        <span className="age-limit">16+</span>
                        <span>{movie.duration}m</span>
                    </div>

                    <div className="netflix-tabs">
                        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
                        <button className={activeTab === 'trailers' ? 'active' : ''} onClick={() => setActiveTab('trailers')}>Trailers & More</button>
                        <button className={activeTab === 'reviews' ? 'active' : ''} onClick={() => setActiveTab('reviews')}>Reviews</button>
                        <button 
                            className="booking-btn" 
                            onClick={() => navigate('/booking', { 
                                state: { movie: movie } // Truyền nguyên object movie sang
                            })}
                        >
                            Booking
                        </button>
                    </div>
                </div>

                {/* Nhóm giữa: Nội dung Tab - Sẽ tự nở ra để chiếm diện tích */}
                <div className="tab-content-area">
                    {renderTabContent()}
                </div>

                {/* Nhóm dưới: Phim liên quan - Luôn nằm sát đáy poster */}
                <div className="related-fixed-bottom">
                    <h3 className="related-title">Related Movies</h3>
                    <div className="related-grid">
                        {relatedMovies.slice(0, 3).map((m, i) => (
                            <div key={i} className="related-item" onClick={() => navigate(`/movie/${m.slug}`)}>
                                <div className="img-holder">
                                    <img src={`${IMAGE_BASE_URL}/posters/${m.poster_url}`} alt={m.title} />
                                </div>
                                <p>{m.title}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);
};

export default MovieDetail;