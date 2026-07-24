import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    Star,
    Calendar,
    Clock,
    Film,
    User,
    Ticket,
    Play,
    X
} from 'lucide-react';
import Modal from '../components/Modal';
import MovieCard from "../components/MovieCard";
import MoviePreviewModal from "../components/MoviePreviewModal";
import MovieHeroBanner from '../components/MovieHeroBanner';
import { useAuth } from '../../context/AuthContext';
import "../styles/MovieDetail.css";

const DEFAULT_POSTER =
    "https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-poster.jpg";
const DEFAULT_BACKDROP =
    "https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-backdrop.jpg";

const MovieDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const [movie, setMovie] = useState(null);
    const [relatedMovies, setRelatedMovies] = useState([]);
    const [trailerMovies, setTrailerMovies] = useState([]);
    const [actors, setActors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [trailerModal, setTrailerModal] = useState({ isOpen: false, url: '' });
    const [userRating, setUserRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [reviewComment, setReviewComment] = useState("");
    const [reviews, setReviews] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState(null);

    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: '',
        title: '',
        message: null,
        onConfirm: null
    });

    const API_BASE_URL = "https://api.quangdungcinema.id.vn/api";

    const getYoutubeID = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleMovieClick = (movie) => {
        setSelectedMovie(movie);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setSelectedMovie(null);
        }, 850);
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

                const filtered = resRelated.data.filter(
                    m => m.slug !== slug
                );

                setRelatedMovies(filtered);

                const trailerFiltered = filtered
                    .filter(
                        item =>
                            item.trailer_url &&
                            item.trailer_url.trim() !== ""
                    )
                    .slice(0, 6);

                setTrailerMovies(trailerFiltered);

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
    const closeTrailerModal = () => setTrailerModal({ isOpen: false, url: '' });
    const closeReviewModal = () => {
        setShowReviewModal(false);
        setUserRating(0);
        setReviewComment("");
        setHover(0);
    };

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
            closeReviewModal();
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
        setShowReviewModal(true);
    };

    const openTrailerModal = () => {
        const videoId = getYoutubeID(movie.trailer_url);
        if (!videoId) return;
        setTrailerModal({ isOpen: true, url: movie.trailer_url });
    };

    const openTrailerByMovie = (movieItem) => {
        if (!movieItem?.trailer_url) return;
        setTrailerModal({ isOpen: true, url: movieItem.trailer_url });
    };

    const renderTrailerVideo = (url) => {
        const videoId = getYoutubeID(url);
        if (!videoId) return <div>Không thể tải trailer</div>;
        return (
            <div className="modal-trailer-iframe-container">
                <iframe
                    title="Movie Trailer"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
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
        return modalConfig.message;
    };

    return (
        <div className="cinema-movie-detail-page">
            {/* Modal chung */}
            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={getModalMessage()}
                onConfirm={modalConfig.message === 'rating_mode' ? handleSendReview : (modalConfig.onConfirm || closeModal)}
                onCancel={closeModal}
            />

            {/* TRAILER MODAL */}
            {trailerModal.isOpen && (
                <div className="trailer-modal-overlay" onClick={closeTrailerModal}>
                    <div className="trailer-modal-container" onClick={(e) => e.stopPropagation()}>
                        <button className="trailer-close-btn" onClick={closeTrailerModal}>
                            <X size={24} />
                        </button>
                        {renderTrailerVideo(trailerModal.url)}
                    </div>
                </div>
            )}

            {/* REVIEW MODAL */}
            {showReviewModal && (
                <div className="review-modal-overlay" onClick={closeReviewModal}>
                    <div className="review-modal-container" onClick={(e) => e.stopPropagation()}>
                        <button className="review-close-btn" onClick={closeReviewModal}>
                            <X size={24} />
                        </button>
                        <div className="review-modal-header">
                            <h3>Đánh giá phim: {movie.title}</h3>
                        </div>
                        <div className="review-modal-body">
                            {renderStarRating()}
                        </div>
                        <div className="review-modal-footer">
                            <button className="btn-cancel-review" onClick={closeReviewModal}>
                                Hủy
                            </button>
                            <button className="btn-submit-review" onClick={handleSendReview}>
                                Gửi đánh giá
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 1: HERO BANNER NGANG */}
            <MovieHeroBanner
                movie={movie}
                onTrailer={openTrailerModal}
            />

            {/* CONTAINER CHÍNH */}
            <div className="cinema-main-content-container">
                {/* SECTION 1.5: THÔNG TIN PHIM CHI TIẾT */}
                <div className="movie-info-section">
                    <div className="movie-info-container">
                        <div className="movie-poster-col">
                            <img
                                src={movie.poster_url || movie.movie_poster || DEFAULT_POSTER}
                                alt={movie.title}
                                className="movie-poster-img"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = DEFAULT_POSTER;
                                }}
                            />
                        </div>

                        <div className="movie-info-content">
                            <div className="info-header-row">
                                <h1 className="movie-detail-title">{movie.title}</h1>
                                <div className="info-rating-compact">
                                    <span className="rating-big-number">{movie.avg_rating || "0.0"}</span>
                                    <div className="rating-stars-compact">
                                        <div className="stars-row">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    size={16}
                                                    fill={i < Math.round((movie.avg_rating || 0) / 2) ? "#f5b50a" : "none"}
                                                    color="#f5b50a"
                                                />
                                            ))}
                                        </div>
                                        <span className="rating-count-text">({reviews.length} đánh giá)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="info-meta-row">
                                <span className="meta-tag">
                                    <Film size={16} />
                                    {movie.genre || "Đang cập nhật"}
                                </span>
                                <span className="meta-tag">
                                    <Calendar size={16} />
                                    {movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A"}
                                </span>
                                <span className="meta-tag">
                                    <Clock size={16} />
                                    {movie.duration || "--"} phút
                                </span>
                                <span className="meta-tag age-tag">
                                    <span className="age-badge">{movie.age_rating ? `T${movie.age_rating}` : "P"}</span>
                                </span>
                            </div>

                            <div className="info-detail-row">
                                <div className="info-description-col">
                                    <div
                                        className={`desc-text ${isExpanded ? 'expanded' : 'collapsed'}`}
                                        dangerouslySetInnerHTML={{
                                            __html: movie.description || "Nội dung phim đang được cập nhật..."
                                        }}
                                    />
                                    {movie.description && movie.description.length > 150 && (
                                        <button className="desc-toggle-btn" onClick={() => setIsExpanded(!isExpanded)}>
                                            {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                                            <span className="toggle-icon">{isExpanded ? '▲' : '▼'}</span>
                                        </button>
                                    )}
                                </div>
                                <div className="info-meta-col">
                                    <div className="meta-item">
                                        <span className="meta-label">Đạo diễn</span>
                                        <span className="meta-value">{movie.director || "Đang cập nhật"}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">Diễn viên</span>
                                        <span className="meta-value">{movie.cast || "Đang cập nhật"}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">Ngôn ngữ</span>
                                        <span className="meta-value">{movie.language || "Đang cập nhật"}</span>
                                    </div>
                                    <div className="meta-item">
                                        <span className="meta-label">Quốc gia</span>
                                        <span className="meta-value">{movie.country || "Đang cập nhật"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="info-actions-row">
                                <button className="btn-book-now" onClick={() => navigate(`/booking/${movie.slug || movie.movie_slug}`)}>
                                    <Ticket size={20} />
                                    Đặt vé ngay
                                </button>
                                <button className="btn-watch-trailer" onClick={openTrailerModal}>
                                    <Play size={20} />
                                    Xem trailer
                                </button>
                                <button className="btn-review" onClick={openRatingModal}>
                                    <Star size={20} fill="none" />
                                    Đánh giá
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: PHIM LIÊN QUAN */}
                <div className="filmgenre-container">
                    <div className="filmgenre-section-header">
                        <h2>PHIM LIÊN QUAN</h2>
                        <div className="filmgenre-line" />
                    </div>
                    <div className="genre-movies-grid">
                        {relatedMovies.map(movie => (
                            <MovieCard
                                key={movie.movie_id}
                                movie={movie}
                                onClick={handleMovieClick}
                            />
                        ))}
                    </div>
                </div>

                {/* SECTION 3: DIỄN VIÊN */}
                <div className="cinema-section-block">
                    <div className="section-header-row">
                        <h3 className="section-title-label">DIỄN VIÊN</h3>
                        <div className="filmgenre-line" />
                        <span className="view-all-link-gold" onClick={() => navigate('/actors')}>
                            Xem tất cả ❯
                        </span>
                    </div>

                    <div className="cast-avatars-horizontal-list">
                        {actors?.length > 0 ? (
                            actors.map((actor, index) => (
                                <div
                                    key={actor.actor_id || index}
                                    className="actor-circle-card"
                                    onClick={() => actor.slug && navigate(`/actor/${actor.slug}`)}
                                >
                                    <div className="actor-avatar-frame">
                                        {actor.actor_avatar ? (
                                            <img
                                                src={actor.actor_avatar}
                                                alt={actor.name}
                                                className="actor-real-img"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = DEFAULT_POSTER;
                                                }}
                                            />
                                        ) : (
                                            <div className="placeholder-avatar-bg">
                                                <User size={28} color="#888" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="actor-real-name">{actor.name}</span>
                                </div>
                            ))
                        ) : (
                            movie?.cast && movie.cast.trim() !== '' && movie.cast.toLowerCase() !== 'đang cập nhật'
                        ) ? (
                            movie.cast.split(',').map((item, index) => {
                                const actorName = item.trim();
                                if (!actorName) return null;
                                return (
                                    <div key={`cast-${index}`} className="actor-circle-card">
                                        <div className="actor-avatar-frame">
                                            <div className="placeholder-avatar-bg">
                                                <User size={28} color="#888" />
                                            </div>
                                        </div>
                                        <span className="actor-real-name">{actorName}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="empty-reviews-placeholder">
                                Thông tin về dàn diễn viên của bộ phim đang được cập nhật...
                            </div>
                        )}
                    </div>
                </div>

                {/* SECTION 4: TRAILER KHÁC */}
                <div className="cinema-section-block">
                    <div className="section-header-row">
                        <h3 className="section-title-label">TRAILER KHÁC</h3>
                        <div className="filmgenre-line" />
                    </div>
                    <div className="other-trailers-grid">
                        {trailerMovies.map(item => (
                            <div
                                key={item.movie_id}
                                className="other-trailer-card"
                                onClick={() => openTrailerByMovie(item)}
                            >
                                <div className="other-trailer-thumb">
                                    <img
                                        src={getYoutubeID(item.trailer_url)
                                            ? `https://img.youtube.com/vi/${getYoutubeID(item.trailer_url)}/maxresdefault.jpg`
                                            : (item.poster_url || item.movie_poster || DEFAULT_POSTER)}
                                        alt={item.title}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = DEFAULT_POSTER;
                                        }}
                                    />
                                    <div className="other-trailer-overlay">
                                        <Play size={42} strokeWidth={2.5} />
                                    </div>
                                </div>
                                <h4 className="other-trailer-title">{item.title}</h4>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SECTION 5: ĐÁNH GIÁ TỪ KHÁN GIẢ */}
                <div className="reviews-section-fullwidth">
                    <div className="section-header-row">
                        <h3 className="section-title-label">ĐÁNH GIÁ TỪ KHÁN GIẢ</h3>
                        <div className="filmgenre-line" />
                        <button className="btn-write-review-small" onClick={openRatingModal}>
                            Viết đánh giá
                        </button>
                    </div>

                    <div className="split-right-column-box">
                        <div className="rating-statistics-dashboard">
                            <div className="dashboard-big-score-left">
                                <div className="huge-number">{movie.avg_rating || "0.0"}</div>
                                <div className="slash-ten">/10</div>
                                <div className="stars-row-display">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={14} fill="#f5b50a" color="#f5b50a" />
                                    ))}
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
                                            />
                                        </div>
                                        <span className="progress-percent-text">{starPercentages[stars] || 0}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mini-comments-list-viewport">
                            {reviews.length === 0 ? (
                                <div className="empty-reviews-placeholder">
                                    Chưa có bình luận nào. Hãy là người đầu tiên đánh giá!
                                </div>
                            ) : (
                                reviews.slice(0, 3).map((rev, index) => (
                                    <div className="mini-comment-card" key={index}>
                                        <div className="comment-user-meta-header">
                                            <div className="user-avatar-placeholder-small" />
                                            <div className="user-name-title-box">
                                                <span className="comment-username">{rev.username || "Khán giả"}</span>
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
            </div>

            {/* MoviePreviewModal */}
            <MoviePreviewModal
                open={isModalOpen}
                onClose={handleCloseModal}
                movies={relatedMovies}
                selectedMovie={selectedMovie}
            />
        </div>
    );
};

export default MovieDetail;