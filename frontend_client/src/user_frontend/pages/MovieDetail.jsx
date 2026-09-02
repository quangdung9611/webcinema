import React, {
    useState,
    useEffect,
    useCallback
} from 'react';

import {
    useParams,
    useNavigate,
    useLocation
} from 'react-router-dom';

import api from '../../api/api';

import {
    Star,
    Calendar,
    Clock,
    Film,
    Ticket,
    Play,
    X,
    MapPin,
    CalendarDays,
    Theater,
    Clapperboard,
    Users,
    Globe,
    Languages,
    User,
    Eye,
    ThumbsUp,
    MessageSquare,
    ChevronRight,
    ChevronLeft,
    Popcorn,
    Coffee,
    UtensilsCrossed,
    Building2,
    Sparkles,
    Heart,
    Share2,
    AlertCircle,
    CheckCircle,
    Loader2
} from 'lucide-react';

import Modal from '../components/Modal';
import MovieCard from "../components/MovieCard";
import CinemaCard from '../components/CinemaCard';

import "../styles/MovieDetail.css";


const MovieDetail = () => {

    const { slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // =========================================================
    // STATES
    // =========================================================

    const [movie, setMovie] = useState(null);
    const [relatedMovies, setRelatedMovies] = useState([]);
    const [trailerMovies, setTrailerMovies] = useState([]);
    const [actors, setActors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [trailerModal, setTrailerModal] = useState({
        isOpen: false,
        url: ''
    });
    const [userRating, setUserRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [reviewComment, setReviewComment] = useState("");
    const [reviews, setReviews] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        show: false,
        type: '',
        title: '',
        message: null,
        onConfirm: null
    });

    // =========================================================
    // NEW STATES FOR SHOWTIMES
    // =========================================================
    const [cinemas, setCinemas] = useState([]);
    const [showtimesData, setShowtimesData] = useState({});
    const [selectedCinema, setSelectedCinema] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [availableDates, setAvailableDates] = useState([]);
    const [dateIndex, setDateIndex] = useState(0);
    const VISIBLE_DAYS = 5;

    // =========================================================
    // SHOWTIME PAGINATION STATES
    // =========================================================
    const [showtimeIndexes, setShowtimeIndexes] = useState({});
    const VISIBLE_SHOWTIMES = 5;

    // =========================================================
    // YOUTUBE ID
    // =========================================================

    const getYoutubeID = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    // =========================================================
    // AVATAR URL
    // =========================================================

    const getAvatarUrl = (avatar) => {
        if (!avatar) return null;
        if (avatar.startsWith('http')) return avatar;
        return `https://api.quangdungcinema.id.vn/uploads/avatars/${avatar}`;
    };

    // =========================================================
    // FETCH REVIEWS
    // =========================================================

    const fetchReviews = useCallback(async (movieId) => {
        try {
            const res = await api.get(`/api/reviews/${movieId}`);
            const reviewData = res.data?.success === true ? res.data?.data : [];
            const reviewList = Array.isArray(reviewData) ? reviewData : [];
            const sortedReviews = [...reviewList].sort(
                (a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
            );
            setReviews(sortedReviews);
        } catch (error) {
            console.error("Lỗi lấy danh sách review:", error);
            setReviews([]);
        }
    }, []);

    // =========================================================
    // HANDLE DATE NAVIGATION
    // =========================================================

    const handlePrevDates = () => {
        setDateIndex(prev => Math.max(0, prev - 1));
    };

    const handleNextDates = () => {
        const maxIndex = Math.max(0, availableDates.length - VISIBLE_DAYS);
        setDateIndex(prev => Math.min(maxIndex, prev + 1));
    };

    const getVisibleDates = () => {
        const start = dateIndex;
        const end = Math.min(start + VISIBLE_DAYS, availableDates.length);
        return availableDates.slice(start, end);
    };

    // =========================================================
    // HANDLE SHOWTIME NAVIGATION
    // =========================================================

    const handlePrevShowtimes = (roomType) => {
        setShowtimeIndexes(prev => ({
            ...prev,
            [roomType]: Math.max(0, (prev[roomType] || 0) - 1)
        }));
    };

    const handleNextShowtimes = (roomType, totalItems) => {
        setShowtimeIndexes(prev => {
            const currentIndex = prev[roomType] || 0;
            const maxIndex = Math.max(0, totalItems - VISIBLE_SHOWTIMES);
            return {
                ...prev,
                [roomType]: Math.min(maxIndex, currentIndex + 1)
            };
        });
    };

    const getVisibleShowtimes = (roomType, items) => {
        const start = showtimeIndexes[roomType] || 0;
        const end = Math.min(start + VISIBLE_SHOWTIMES, items.length);
        return items.slice(start, end);
    };

    // =========================================================
    // FETCH MOVIE DATA, CINEMAS, SHOWTIMES
    // =========================================================

    useEffect(() => {

        const fetchMovieData = async () => {
            if (!slug || slug === 'undefined') {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                const [resMovie, resRelated, resActors, resCinemas] = await Promise.all([
                    api.get(`/api/movies/detail/${slug}`),
                    api.get('/api/movies'),
                    api.get('/api/actors'),
                    api.get('/api/cinemas')
                ]);

                const movieData = resMovie.data?.success === true ? resMovie.data?.data : null;
                setMovie(movieData);

                if (movieData?.movie_id) {
                    await fetchReviews(movieData.movie_id);
                } else {
                    setReviews([]);
                }

                const movieListData = resRelated.data?.success === true ? resRelated.data?.data : [];
                const movieList = Array.isArray(movieListData) ? movieListData : [];
                const filtered = movieList.filter(item => item.slug !== slug);
                setRelatedMovies(filtered);

                const trailerFiltered = filtered
                    .filter(item => item.trailer_url && item.trailer_url.trim() !== "" && item.movie_backdrop)
                    .slice(0, 6);
                setTrailerMovies(trailerFiltered);

                const actorData = resActors.data?.success === true ? resActors.data?.data : [];
                setActors(Array.isArray(actorData) ? actorData : []);

                const cinemaList = resCinemas.data?.data || [];
                setCinemas(cinemaList);
                if (cinemaList.length > 0) {
                    setSelectedCinema(cinemaList[0]);
                }

                const dates = [];
                for (let i = 0; i < 10; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    dates.push(d.toISOString().split('T')[0]);
                }
                setAvailableDates(dates);
                setSelectedDate(dates[0]);
                setDateIndex(0);

            } catch (error) {
                console.error("Lỗi gọi API tổng hợp dữ liệu:", error);
                setMovie(null);
                setRelatedMovies([]);
                setTrailerMovies([]);
                setActors([]);
                setReviews([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMovieData();
        window.scrollTo({ top: 0, behavior: 'smooth' });

    }, [slug, fetchReviews]);

    // =========================================================
    // FETCH SHOWTIMES WHEN CINEMA OR DATE CHANGES
    // =========================================================
    useEffect(() => {
        const fetchShowtimes = async () => {
            if (!movie?.movie_id || !selectedCinema || !selectedDate) {
                setShowtimesData({});
                return;
            }

            try {
                const res = await api.get('/api/showtimes/movie-detail', {
                    params: {
                        movie_id: movie.movie_id,
                        cinema_id: selectedCinema.cinema_id,
                        date: selectedDate
                    }
                });
                setShowtimesData(res.data?.data || {});
                setShowtimeIndexes({});
            } catch (err) {
                console.error("Lỗi tải lịch chiếu:", err);
                setShowtimesData({});
            }
        };

        fetchShowtimes();
    }, [movie, selectedCinema, selectedDate]);

    // =========================================================
    // MODAL HANDLERS
    // =========================================================

    const closeModal = () => setModalConfig(prev => ({ ...prev, show: false }));
    const closeTrailerModal = () => setTrailerModal({ isOpen: false, url: '' });
    const closeReviewModal = () => {
        setShowReviewModal(false);
        setUserRating(0);
        setReviewComment("");
        setHover(0);
    };

    // =========================================================
    // SEND REVIEW
    // =========================================================

    const handleSendReview = async () => {
        if (userRating === 0) {
            setModalConfig({
                show: true,
                type: 'error',
                title: 'Thông báo',
                message: 'Bạn ơi, chọn số sao đã nhé!'
            });
            return;
        }

        try {
            const authResponse = await api.get('/api/auth/me');
            const user = authResponse.data?.user || authResponse.data?.data?.user || null;

            if (!user) {
                closeReviewModal();
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

            await api.post('/api/reviews', {
                movie_id: movie.movie_id,
                user_id: user.user_id,
                rating: userRating,
                comment: reviewComment
            });

            setUserRating(0);
            setReviewComment("");

            const response = await api.get(`/api/movies/detail/${slug}`);
            const updatedMovie = response.data?.success === true ? response.data?.data : null;
            if (updatedMovie) setMovie(updatedMovie);

            await fetchReviews(movie.movie_id);
            closeReviewModal();

            setModalConfig({
                show: true,
                type: 'success',
                title: 'Gửi thành công!',
                message: 'Cảm ơn bạn đã dành thời gian đánh giá phim nhé!',
                onConfirm: closeModal
            });

        } catch (error) {
            if (error.response?.status === 401) {
                closeReviewModal();
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
            console.error("Lỗi gửi đánh giá:", error);
            setModalConfig({
                show: true,
                type: 'error',
                title: 'Opps! Có lỗi rồi',
                message: error.response?.data?.message || 'Gửi đánh giá thất bại, thử lại sau nhé!',
                onConfirm: closeModal
            });
        }
    };

    // =========================================================
    // OPEN RATING MODAL
    // =========================================================

    const openRatingModal = async () => {
        try {
            const response = await api.get('/api/auth/me');
            const user = response.data?.user || response.data?.data?.user || null;
            if (!user) throw { response: { status: 401 } };
            setShowReviewModal(true);
        } catch (error) {
            if (error.response?.status === 401) {
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
            console.error("Lỗi kiểm tra đăng nhập:", error);
            setModalConfig({
                show: true,
                type: 'error',
                title: 'Thông báo',
                message: 'Không thể kiểm tra trạng thái đăng nhập.',
                onConfirm: closeModal
            });
        }
    };

    // =========================================================
    // TRAILER
    // =========================================================

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

    // =========================================================
    // STAR RATING
    // =========================================================

    const renderStarRating = () => (
        <div className="star-rating-modal-content">
            <div className="star-rating-hint">
                Chia sẻ cảm nghĩ của bạn về phim này:
            </div>
            <div className="star-list-interactive">
                {[...Array(10)].map((_, index) => {
                    const starValue = index + 1;
                    const isActive = starValue <= (hover || userRating);
                    return (
                        <Star
                            key={starValue}
                            size={28}
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

    // =========================================================
    // STAR STATISTICS
    // =========================================================

    const getStarPercentages = () => {
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        if (reviews.length === 0) return distribution;
        reviews.forEach(r => {
            const mappedStar = Math.ceil(r.rating / 2);
            if (distribution[mappedStar] !== undefined) distribution[mappedStar]++;
        });
        Object.keys(distribution).forEach(key => {
            distribution[key] = Math.round((distribution[key] / reviews.length) * 100);
        });
        return distribution;
    };

    const starPercentages = getStarPercentages();

    // =========================================================
    // LOADING / ERROR
    // =========================================================

    if (loading) {
        return (
            <div className="movie-loading-wrapper">
                <Loader2 size={32} className="spinner" />
                <span>Đang tải thông tin phim...</span>
            </div>
        );
    }

    if (!movie) {
        return (
            <div className="movie-error-wrapper">
                <AlertCircle size={24} />
                Không tìm thấy dữ liệu bộ phim yêu cầu.
            </div>
        );
    }

    // =========================================================
    // RENDER
    // =========================================================

    return (
        <div className="cinema-movie-detail-page">

          {/* ==================================================
                HERO BANNER
            ================================================== */}
            <section className="cinema-hero-banner">
                {movie.movie_backdrop ? (
                    <img
                        className="banner-image"
                        src={movie.movie_backdrop}
                        alt={movie.title}
                        loading="eager"
                    />
                ) : (
                    <div className="banner-placeholder" />
                )}
                <button
                    className="hero-play-btn"
                    onClick={openTrailerModal}
                    aria-label="Xem trailer"
                >
                    <Play size={48} fill="white" stroke="white" />
                </button>
            </section>

            {/* MODALS */}
            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={() => {
                    if (modalConfig.onConfirm) modalConfig.onConfirm();
                    else closeModal();
                }}
            />

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
                            <button className="btn-cancel-review" onClick={closeReviewModal}>Hủy</button>
                            <button className="btn-submit-review" onClick={handleSendReview}>Gửi đánh giá</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT */}
            <div className="cinema-main-content-container">

                {/* INFO SECTION */}
                <div className="movie-info-section">
                    <div className="movie-info-container">
                        <div className="movie-poster-col">
                            {movie.movie_poster ? (
                                <img src={movie.movie_poster} alt={movie.title} className="movie-poster-img" />
                            ) : (
                                <div className="movie-poster-placeholder" />
                            )}
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
                                    <span className="age-badge">
                                        {movie.age_rating ? `T${movie.age_rating}` : "P"}
                                    </span>
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
                                    <Ticket size={20} /> Đặt vé ngay
                                </button>
                                <button className="btn-watch-trailer" onClick={openTrailerModal}>
                                    <Play size={20} /> Xem trailer
                                </button>
                                <button className="btn-review" onClick={openRatingModal}>
                                    <Star size={20} /> Đánh giá
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ============================================== */}
                {/* SHOWTIME SECTION - LỊCH CHIẾU & SUẤT CHIẾU */}
                {/* ============================================== */}
                <div className="showtimes-section-wrapper">
                    <div className="section-header-row">
                        <h2 className="section-title-label">LỊCH CHIẾU & SUẤT CHIẾU</h2>
                        <div className="filmgenre-line" />
                    </div>

                    <div className="showtimes-filter-bar">
                        {/* HÀNG 1: Chọn rạp + Chọn ngày */}
                        <div className="showtimes-filter-row">
                            <div className="filter-cinema-wrapper">
                                <label className="filter-label-cinema">
                                    <Theater size={16} /> CHỌN RẠP
                                </label>
                                <select
                                    className="cinema-select-box"
                                    value={selectedCinema?.cinema_id || ''}
                                    onChange={(e) => {
                                        const cinema = cinemas.find(c => c.cinema_id == e.target.value);
                                        setSelectedCinema(cinema);
                                        setDateIndex(0);
                                        setShowtimeIndexes({});
                                    }}
                                >
                                    {cinemas.map(c => (
                                        <option key={c.cinema_id} value={c.cinema_id}>
                                            {c.cinema_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-date-wrapper">
                                <label className="filter-label-date">
                                    <CalendarDays size={16} /> CHỌN NGÀY
                                </label>
                                <div className="date-navigation-wrapper">
                                    <button 
                                        className="date-nav-btn"
                                        onClick={handlePrevDates}
                                        disabled={dateIndex === 0}
                                        aria-label="Ngày trước"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    
                                    <div className="date-slider-horizontal">
                                        {getVisibleDates().map(d => {
                                            const dateObj = new Date(d);
                                            const isToday = new Date().toISOString().split('T')[0] === d;
                                            return (
                                                <button
                                                    key={d}
                                                    className={`date-btn ${selectedDate === d ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setSelectedDate(d);
                                                        setShowtimeIndexes({});
                                                    }}
                                                >
                                                    <span className="day-text">
                                                        {isToday ? 'Hôm nay' : dateObj.toLocaleDateString('vi-VN', { weekday: 'short' })}
                                                    </span>
                                                    <span className="num-text">
                                                        {dateObj.getDate()}/{dateObj.getMonth() + 1}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button 
                                        className="date-nav-btn"
                                        onClick={handleNextDates}
                                        disabled={dateIndex >= availableDates.length - VISIBLE_DAYS}
                                        aria-label="Ngày tiếp theo"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* HÀNG 2: Thông tin bổ sung */}
                        {selectedCinema && Object.keys(showtimesData).length > 0 && (
                            <div className="filter-info-row">
                                <div className="showtime-stats">
                                    <span className="stat-item">
                                        <Clapperboard size={16} />
                                        <span className="stat-text">
                                            {Object.values(showtimesData).reduce((acc, items) => acc + items.length, 0)} suất chiếu
                                        </span>
                                    </span>
                                    <span className="stat-item">
                                        <Building2 size={16} />
                                        <span className="stat-text">
                                            {Object.keys(showtimesData).length} phòng chiếu
                                        </span>
                                    </span>
                                </div>
                                <div className="selected-info">
                                    <span className="info-badge">
                                        <MapPin size={14} /> {selectedCinema?.cinema_name}
                                    </span>
                                    <span className="info-badge">
                                        <CalendarDays size={14} /> {new Date(selectedDate).toLocaleDateString('vi-VN', { 
                                            weekday: 'long', 
                                            day: 'numeric', 
                                            month: 'long', 
                                            year: 'numeric' 
                                        })}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="showtimes-result-list">
                        {!selectedCinema ? (
                            <div className="empty-showtimes-msg">
                                <Theater size={48} className="empty-icon" />
                                <p>Vui lòng chọn rạp chiếu để xem lịch chiếu</p>
                            </div>
                        ) : Object.keys(showtimesData).length === 0 ? (
                            <div className="empty-showtimes-msg">
                                <CalendarDays size={48} className="empty-icon" />
                                <p>Không có suất chiếu nào cho ngày này</p>
                                <span className="empty-sub">Vui lòng chọn ngày khác</span>
                            </div>
                        ) : (
                            Object.entries(showtimesData).map(([roomType, items]) => {
                                const visibleItems = getVisibleShowtimes(roomType, items);
                                const currentIndex = showtimeIndexes[roomType] || 0;
                                const maxIndex = Math.max(0, items.length - VISIBLE_SHOWTIMES);
                                
                                return (
                                    <div key={roomType} className="room-type-block">
                                        <div className="room-type-header">
                                            <div className="room-type-info">
                                                <Film size={20} className="room-icon" />
                                                <h4 className="room-type-title">{roomType}</h4>
                                                <span className="room-count">{items.length} suất</span>
                                            </div>
                                        </div>
                                        
                                        <div className="showtimes-grid-wrapper">
                                            <button 
                                                className="showtime-nav-btn prev-btn"
                                                onClick={() => handlePrevShowtimes(roomType)}
                                                disabled={currentIndex === 0}
                                                aria-label="Suất chiếu trước"
                                            >
                                                <ChevronLeft size={20} />
                                            </button>
                                            
                                            <div className="showtimes-grid-items">
                                                {visibleItems.map(st => (
                                                    <button
                                                        key={st.showtime_id}
                                                        className="showtime-btn"
                                                        onClick={() => navigate(`/booking/${movie.slug}`, {
                                                            state: {
                                                                movie: movie,
                                                                cinema: selectedCinema,
                                                                date: selectedDate,
                                                                showtime: st
                                                            }
                                                        })}
                                                    >
                                                        <span className="st-time">{st.start_time}</span>
                                                        <span className="st-room">{st.room_name}</span>
                                                        <span className="st-price">{st.priceDisplay}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            
                                            <button 
                                                className="showtime-nav-btn next-btn"
                                                onClick={() => handleNextShowtimes(roomType, items.length)}
                                                disabled={currentIndex >= maxIndex}
                                                aria-label="Suất chiếu tiếp theo"
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
                {/* ============================================== */}

                {/* RELATED MOVIES */}
                <div className="filmgenre-container">
                    <div className="filmgenre-section-header">
                        <h2>PHIM LIÊN QUAN</h2>
                        <div className="filmgenre-line" />
                    </div>
                    <div className="genre-movies-grid">
                        {relatedMovies.map(movieItem => (
                            <MovieCard key={movieItem.movie_id} movie={movieItem} />
                        ))}
                    </div>
                </div>

                {/* ACTORS */}
                <div className="cinema-section-block">
                    <div className="section-header-row">
                        <h2 className="section-title-label">DIỄN VIÊN</h2>
                        <div className="filmgenre-line" />
                        <span className="view-all-link-gold" onClick={() => navigate('/actors')}>
                            Xem tất cả <ChevronRight size={16} />
                        </span>
                    </div>

                    <div className="cast-avatars-horizontal-list">
                        {actors?.length > 0 ? (
                            actors.map((actor, index) => (
                                <div key={actor.actor_id || index} className="actor-card-wrapper">
                                    <CinemaCard
                                        type="cinema"
                                        image={actor.actor_avatar || null}
                                        title={actor.name}
                                        link={`/actor/detail/${actor.slug}`}
                                        buttonText={null}
                                    />
                                </div>
                            ))
                        ) : (movie?.cast && movie.cast.trim() !== '' && movie.cast.toLowerCase() !== 'đang cập nhật') ? (
                            movie.cast.split(',').map((item, index) => {
                                const actorName = item.trim();
                                if (!actorName) return null;
                                return (
                                    <div key={`cast-${index}`} className="actor-card-wrapper">
                                        <CinemaCard
                                            type="cinema"
                                            image={null}
                                            title={actorName}
                                            link={null}
                                            buttonText={null}
                                        />
                                    </div>
                                );
                            })
                        ) : (
                            <div className="empty-reviews-placeholder">
                                <Users size={24} />
                                Thông tin về dàn diễn viên của bộ phim đang được cập nhật...
                            </div>
                        )}
                    </div>
                </div>

                {/* OTHER TRAILERS */}
                <div className="cinema-section-block">
                    <div className="section-header-row">
                        <h2 className="section-title-label">TRAILER KHÁC</h2>
                        <div className="filmgenre-line" />
                    </div>

                    <div className="other-trailers-grid">
                        {trailerMovies.length > 0 ? (
                            trailerMovies.map((item) => (
                                <div
                                    key={item.movie_id}
                                    className="trailer-card-wrapper"
                                    onClick={() => openTrailerByMovie(item)}
                                >
                                    <CinemaCard
                                        type="cinema"
                                        image={item.movie_backdrop || null}
                                        title={item.title}
                                        link={null}
                                        buttonText={null}
                                    />
                                    <div className="trailer-play-overlay">
                                        <Play size={42} strokeWidth={2.5} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-reviews-placeholder">
                                <Film size={24} />
                                Chưa có trailer khác.
                            </div>
                        )}
                    </div>
                </div>

                {/* REVIEWS */}
                <div className="reviews-section-fullwidth">
                    <div className="section-header-row">
                        <h2 className="section-title-label">ĐÁNH GIÁ TỪ KHÁN GIẢ</h2>
                        <div className="filmgenre-line" />
                        <button className="btn-write-review-small" onClick={openRatingModal}>
                            <MessageSquare size={16} /> Viết đánh giá
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
                                {[5, 4, 3, 2, 1].map(stars => (
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
                                    <MessageSquare size={24} />
                                    Chưa có bình luận nào. Hãy là người đầu tiên đánh giá!
                                </div>
                            ) : (
                                reviews.slice(0, 20).map((rev, index) => {
                                    const avatarUrl = rev.user_avatar ? getAvatarUrl(rev.user_avatar) : null;
                                    return (
                                        <div className="mini-comment-card" key={rev.review_id || index}>
                                            <div className="comment-user-meta-header">
                                                {avatarUrl ? (
                                                    <img src={avatarUrl} alt={rev.username || "Khán giả"} className="comment-avatar" loading="lazy" />
                                                ) : (
                                                    <div className="user-avatar-placeholder-small">
                                                        <User size={20} />
                                                    </div>
                                                )}
                                                <div className="user-name-title-box">
                                                    <span className="comment-username">{rev.username || "Khán giả"}</span>
                                                    <div className="user-stars-small-row">
                                                        {[...Array(Math.ceil((rev.rating || 10) / 2))].map((_, i) => (
                                                            <Star key={i} size={10} fill="#f5b50a" color="#f5b50a" />
                                                        ))}
                                                    </div>
                                                </div>
                                                <span className="comment-time-ago">
                                                    {rev.formatted_date 
                                                        ? rev.formatted_date.replace(' ', ' | ') 
                                                        : "Mới đây"
                                                    }
                                                </span>
                                            </div>
                                            <p className="comment-content-body-text">{rev.comment}</p>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default MovieDetail;