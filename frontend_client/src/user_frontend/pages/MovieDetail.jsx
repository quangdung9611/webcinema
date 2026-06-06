import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
    Star, 
    Calendar, 
    Clock, 
    Film, 
    Globe, 
    MessageSquare, 
    ChevronLeft, 
    ChevronRight, 
    User,
    Ticket,
    Play,
    Heart,
    Share2 
} from 'lucide-react';
import Modal from '../../admin_frontend/components/Modal';
import MovieSlider from '../components/MovieSlider';
import { useAuth } from '../../context/AuthContext';
import "../styles/MovieDetail.css";

const MovieDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    const [movie, setMovie] = useState(null);
    const [relatedMovies, setRelatedMovies] = useState([]);
    const [actors, setActors] = useState([]); 
    const [loading, setLoading] = useState(true);
    
    // Logic Đánh giá & Bình luận
    const [userRating, setUserRating] = useState(0); 
    const [hover, setHover] = useState(0); 
    const [reviewComment, setReviewComment] = useState(""); 
    const [reviews, setReviews] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false); 
    
    // Trạng thái điều khiển Modal chung (Thông báo, Form Đánh giá, Xem Trailer)
    const [modalConfig, setModalConfig] = useState({
        show: false, 
        type: '', 
        title: '', 
        message: null, 
        onConfirm: null 
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
                const [resMovie, resRelated, resActors] = await Promise.all([
                    axios.get(`${API_BASE_URL}/movies/${slug}`),
                    axios.get(`${API_BASE_URL}/movies`),
                    axios.get(`${API_BASE_URL}/actors`)
                ]);

                const movieData = resMovie.data;
                setMovie(movieData);
                
                if (movieData?.movie_id) {
                    fetchReviews(movieData.movie_id);
                }

                const filtered = resRelated.data.filter(m => m.slug !== slug);
                setRelatedMovies(filtered);

                // ĐÃ SỬA: Lấy thẳng toàn bộ danh sách diễn viên từ DB, không filter bóp nghẹt data nữa
                setActors(resActors.data || []);

            } catch (error) {
                console.error("Lỗi gọi API tổng hợp dữ liệu:", error);
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
                ...prev, 
                show: true, 
                type: 'error', 
                title: 'Thông báo', 
                message: 'Bạn ơi, chọn số sao đã nhé!' 
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
                show: true, 
                type: 'success', 
                title: 'Gửi thành công!',
                message: 'Cảm ơn bạn đã dành thời gian đánh giá phim nhé!',
                onConfirm: closeModal 
            });
        } catch (error) {
            setModalConfig({
                show: true, 
                type: 'error', 
                title: 'Opps! Có lỗi rồi',
                message: 'Gửi đánh giá thất bại, thử lại sau nhé!',
                onConfirm: closeModal
            });
        }
    };

    const openRatingModal = () => {
        if (!user) {
            setModalConfig({
                show: true, 
                type: 'confirm', 
                title: 'Yêu cầu đăng nhập',
                message: 'Bạn cần đăng nhập để thực hiện đánh giá.',
                onConfirm: () => {
                    closeModal();
                    navigate('/login', { state: { from: location.pathname } });
                }
            });
            return;
        }
        setModalConfig({
            show: true, 
            type: 'confirm', 
            title: `Đánh giá phim: ${movie.title}`,
            message: 'rating_mode', 
            onConfirm: handleSendReview
        });
    };

    const openTrailerModal = () => {
        const videoId = getYoutubeID(movie.trailer_url);
        if (!videoId) return;

        setModalConfig({
            show: true,
            type: 'confirm',
            title: `Trailer: ${movie.title}`,
            message: 'trailer_mode',
            onConfirm: closeModal
        });
    };

    const renderTrailerVideo = () => {
        const videoId = getYoutubeID(movie.trailer_url);
        return (
            <div className="modal-trailer-iframe-container">
                <iframe
                    title="Movie Trailer"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                >
                </iframe>
            </div>
        );
    };

    const renderStarRating = () => (
        <div className="star-rating-modal-content">
            <div className="star-rating-hint">Chia sẻ cảm nghĩ của bạn về phim này:</div>
            <div className="star-list-interactive">
                {[...Array(10)].map((_, index) => {
                    const starValue = index + 1;
                    const isActive = starValue <= (hover || userRating);
                    return (
                        <Star
                            key={starValue}
                            size={24}
                            className={`interactive-star ${isActive ? 'active' : ''}`}
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
                className="modal-review-textarea"
                value={reviewComment} 
                onChange={(e) => setReviewComment(e.target.value)}
            />
        </div>
    );

    const getStarPercentages = () => {
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        if (reviews.length === 0) return distribution;
        
        reviews.forEach(r => {
            const mappedStar = Math.ceil(r.rating / 2);
            if (distribution[mappedStar] !== undefined) {
                distribution[mappedStar]++;
            }
        });

        Object.keys(distribution).forEach(key => {
            distribution[key] = Math.round((distribution[key] / reviews.length) * 100);
        });
        return distribution;
    };

    const starPercentages = getStarPercentages();

    if (loading) return <div className="movie-loading-wrapper"><span>Đang tải thông tin phim...</span></div>;
    if (!movie) return <div className="movie-error-wrapper">Không tìm thấy dữ liệu bộ phim yêu cầu.</div>;

    const getModalMessage = () => {
        if (modalConfig.message === 'rating_mode') return renderStarRating();
        if (modalConfig.message === 'trailer_mode') return renderTrailerVideo();
        return modalConfig.message;
    };

    return (
        <div className="cinema-movie-detail-page">
            <Modal 
                show={modalConfig.show} 
                type={modalConfig.type} 
                title={modalConfig.title}
                message={getModalMessage()}
                onConfirm={modalConfig.message === 'rating_mode' ? handleSendReview : (modalConfig.onConfirm || closeModal)}
                onCancel={closeModal}
            />

            {/* SECTION 1: HERO BANNER NGANG (BACKDROP) */}
            <div className="cinema-hero-banner">
                <img 
                    src={`${IMAGE_BASE_URL}/backdrops/${movie.backdrop_url || movie.poster_url}`} 
                    alt="Movie Backdrop Banner" 
                    className="banner-horizontal-img"
                />
                
                <div className="banner-gradient-overlay"></div>

                {/* Nút Play nằm chính giữa Banner ngang để kích hoạt Popup Trailer */}
                <button 
                    type="button"
                    className="play-trailer-center-btn"
                    onClick={openTrailerModal}
                >
                    <div className="play-icon-shape"></div>
                </button>

                <div className="banner-info-holder">
                    <div className="banner-top-cast-names">
                        {actors.length > 0 ? actors.slice(0, 4).map(a => a.name).join('   •   ') : (movie.cast && movie.cast.split(',').slice(0, 4).join('   •   '))}
                    </div>
                </div>
            </div>

            {/* SECTION 2: MAIN INFO AREA */}
            <div className="cinema-main-content-container">
                <div className="info-grid-row">
                    
                    <div className="info-left-poster-block">
                        <img 
                            src={`${IMAGE_BASE_URL}/posters/${movie.poster_url}`} 
                            alt={movie.title} 
                            className="floating-poster-img" 
                        />
                    </div>

                    <div className="info-right-details-block">
                        <div className="movie-primary-header">
                            <h2 className="primary-title-text">
                                {movie.title}
                            </h2>
                            <span className="age-badge-t16">
                                T16
                            </span>
                        </div>

                        <div className="movie-quick-meta-row">
                            <div className="meta-pill">
                                <Star className="icon-gold" size={16} fill="#f5b50a"/> 
                                <span>{movie.avg_rating || "0.0"} ({reviews.length} votes)</span>
                            </div>
                            <div className="meta-pill">
                                <Clock size={16}/> 
                                <span>{movie.duration} phút</span>
                            </div>
                            <div className="meta-pill">
                                <Calendar size={16}/> 
                                <span>{new Date(movie.release_date).toLocaleDateString('vi-VN')}</span>
                            </div>
                        </div>

                        <div className="specs-table-grid">
                            <div className="spec-item-row">
                                <span className="spec-label"><Film size={16}/> Đạo diễn</span>
                                <span className="spec-value-content highlight-text">{movie.director || 'Đang cập nhật'}</span>
                            </div>
                            <div className="spec-item-row">
                                <span className="spec-label"><Star size={16}/> Thể loại</span>
                                <span className="spec-value-content">{movie.genres?.map(g => g.genre_name).join(', ') || 'Kinh dị, Tâm lý'}</span>
                            </div>
                            <div className="spec-item-row">
                                <span className="spec-label"><User size={16}/> Diễn viên</span>
                                <span className="spec-value-content">{movie.cast || 'Đang cập nhật'}</span>
                            </div>
                            <div className="spec-item-row">
                                <span className="spec-label"><Film size={16}/> Nhà sản xuất</span>
                                <span className="spec-value-content">Galaxy Studio, HK Film</span>
                            </div>
                            <div className="spec-item-row">
                                <span className="spec-label"><Globe size={16}/> Quốc gia</span>
                                <span className="spec-value-content">{movie.country || 'Việt Nam'}</span>
                            </div>
                            <div className="spec-item-row">
                                <span className="spec-label"><Film size={16}/> Định dạng</span>
                                <span className="spec-value-content">2D, Dolby Atmos</span>
                            </div>
                            <div className="spec-item-row">
                                <span className="spec-label"><MessageSquare size={16}/> Ngôn ngữ</span>
                                <span className="spec-value-content">Tiếng Việt với phụ đề</span>
                            </div>
                            <div className="spec-item-row">
                                <span className="spec-label"><Calendar size={16}/> Khởi chiếu chính thức</span>
                                <span className="spec-value-content">{new Date(movie.release_date).toLocaleDateString('vi-VN')}</span>
                            </div>
                        </div>

                        <div className="action-buttons-group">
                            <button
                                className="btn-action-red-submit"
                                onClick={() =>
                                    navigate(`/booking/${movie.slug || movie.movie_slug}`)
                                }
                            >
                                <Ticket size={16} />
                                <span>ĐẶT VÉ NGAY</span>
                            </button>
                            <button 
                                className="btn-action-outline"
                                onClick={openTrailerModal}
                            >
                                <Play size={16} />
                                <span>Xem Trailer</span>
                            </button>
                            <button className="btn-action-outline">
                                <Heart size={16} />
                                <span>Yêu thích</span>
                            </button>
                            <button className="btn-action-outline">
                                <Share2 size={16} />
                                <span>Chia sẻ</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: DIỄN VIÊN CAROUSEL */}
                <div className="cinema-section-block">
                    <div className="section-header-row">
                        <h3 className="section-title-label">DIỄN VIÊN</h3>
                        <span 
                            className="view-all-link-red" 
                            onClick={() => navigate('/actors')} 
                            style={{ cursor: 'pointer' }}
                        >
                            Xem tất cả ❯
                        </span>
                    </div>
                    <div className="cast-avatars-horizontal-list">
                        {actors && actors.length > 0 ? (
                            actors.map((actor, idx) => (
                                <div 
                                    className="actor-circle-card" 
                                    key={actor.actor_id || idx}
                                    onClick={() => actor.slug && navigate(`/actor/${actor.slug}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="actor-avatar-frame">
                                        {actor.avatar ? (
                                            <img 
                                                src={`${IMAGE_BASE_URL}/actors/${actor.avatar}`} 
                                                alt={actor.name} 
                                                className="actor-real-img" 
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = 'https://api.quangdungcinema.id.vn/uploads/actors/default-avatar.png';
                                                }}
                                            />
                                        ) : (
                                            <div className="placeholder-avatar-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333', width: '100%', height: '100%', borderRadius: '50%' }}>
                                                <User size={24} color="#aaa" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="actor-real-name">{actor.name}</span>
                                    <span className="actor-character-name">Diễn viên</span>
                                </div>
                            ))
                        ) : movie && movie.cast && movie.cast.trim() !== "" && movie.cast.toLowerCase() !== "đang cập nhật" ? (
                            movie.cast.split(',').map((item, idx) => {
                                const rawName = item.trim();
                                if (!rawName) return null;
                                return (
                                    <div className="actor-circle-card" key={`raw-${idx}`}>
                                        <div className="actor-avatar-frame">
                                            <div className="placeholder-avatar-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2a2a2a', width: '100%', height: '100%', borderRadius: '50%' }}>
                                                <User size={24} color="#888" />
                                            </div>
                                        </div>
                                        <span className="actor-real-name">{rawName}</span>
                                        <span className="actor-character-name">Diễn viên</span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="empty-reviews-placeholder" style={{ gridColumn: '1 / -1', padding: '20px 0', textAlign: 'left', opacity: 0.6 }}>
                                Thông tin về dàn diễn viên của bộ phim đang được cập nhật...
                            </div>
                        )}
                    </div>
                </div>

                {/* SECTION 4: NỘI DUNG PHIM & ĐÁNH GIÁ */}
                <div className="two-columns-split-layout">
                    <div className="split-left-column-box">
                        <h3 className="section-title-label">NỘI DUNG PHIM</h3>
                        <div className={`movie-synopsis-text-wrapper ${isExpanded ? 'expanded' : ''}`}>
                            <p>
                                {movie.description?.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ') || 
                                'Câu chuyện xoay quanh một gia đình tưởng chừng như hoàn hảo, nhưng ẩn sau đó là những bí mật, tham vọng và tội lỗi bị chôn giấu suốt nhiều năm...'}
                            </p>
                        </div>
                        <button 
                            className="toggle-expand-description-btn" 
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? 'Thu gọn ▴' : 'Xem thêm ▾'}
                        </button>
                    </div>

                    <div className="split-right-column-box">
                        <div className="section-header-row">
                            <h3 className="section-title-label">ĐÁNH GIÁ TỪ KHÁN GIẢ</h3>
                            <button className="btn-write-review-small" onClick={openRatingModal}>+ Viết đánh giá</button>
                        </div>
                        
                        <div className="rating-statistics-dashboard">
                            <div className="dashboard-big-score-left">
                                <div className="huge-number">{movie.avg_rating || "0.0"}</div>
                                <div className="slash-ten">/10</div>
                                <div className="stars-row-display">
                                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#f5b50a" color="#f5b50a"/>)}
                                </div>
                                <div className="total-votes-count-txt">{reviews.length} đánh giá</div>
                            </div>

                            <div className="dashboard-progress-bars-right">
                                {[5, 4, 3, 2, 1].map((stars) => (
                                    <div className="progress-bar-line-row" key={stars}>
                                        <span className="star-line-label">{stars} ★</span>
                                        <div className="progress-track-bg">
                                            <div 
                                                className="progress-fill-active" 
                                                style={{ width: `${starPercentages[stars] || 0}%` }}
                                            >
                                            </div>
                                        </div>
                                        <span className="progress-percent-text">{starPercentages[stars] || 0}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mini-comments-list-viewport">
                            {reviews.length === 0 ? (
                                <div className="empty-reviews-placeholder">Chưa có bình luận nào. Hãy là người đầu tiên đánh giá!</div>
                            ) : (
                                reviews.slice(0, 3).map((rev, index) => (
                                    <div className="mini-comment-card" key={index}>
                                        <div className="comment-user-meta-header">
                                            <div className="user-avatar-placeholder-small"></div>
                                            <div className="user-name-title-box">
                                                <span className="comment-username">{rev.username || 'Khán giả'}</span>
                                                <div className="user-stars-small-row">
                                                    {[...Array(Math.ceil((rev.rating || 10) / 2))].map((_, i) => (
                                                        <Star key={i} size={10} fill="#f5b50a" color="#f5b50a" />
                                                    ))}
                                                </div>
                                            </div>
                                            <span className="comment-time-ago">Mới đây</span>
                                        </div>
                                        <p className="comment-content-body-text">{rev.comment}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* SECTION 5: PHIM LIÊN QUAN - TÁI SỬ DỤNG COMPONENT */}
                <MovieSlider 
                    title="PHIM LIÊN QUAN" 
                    movies={relatedMovies} 
                    baseUrl={`${IMAGE_BASE_URL}/posters/`} 
                    onClickMovie={(movie) => navigate(`/movies/detail/${movie.slug || movie.movie_slug}`)}
                />

            </div>
        </div>
    );
};

export default MovieDetail;