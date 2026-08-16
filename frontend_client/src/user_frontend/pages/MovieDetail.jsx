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
    X
} from 'lucide-react';

import Modal from '../components/Modal';
import MovieCard from "../components/MovieCard";
import MoviePreviewModal from "../components/MoviePreviewModal";
import MovieHeroBanner from '../components/MovieHeroBanner';
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState(null);
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
    // MOVIE PREVIEW
    // =========================================================

    const handleMovieClick = (movieItem) => {
        setSelectedMovie(movieItem);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedMovie(null), 850);
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

                // 1. Fetch Movie, Related Movies, Actors
                const [resMovie, resRelated, resActors, resCinemas] = await Promise.all([
                    api.get(`/api/movies/detail/${slug}`),
                    api.get('/api/movies'),
                    api.get('/api/actors'),
                    api.get('/api/cinemas')
                ]);

                // Movie detail
                const movieData = resMovie.data?.success === true ? resMovie.data?.data : null;
                setMovie(movieData);

                // Reviews
                if (movieData?.movie_id) {
                    await fetchReviews(movieData.movie_id);
                } else {
                    setReviews([]);
                }

                // Related movies
                const movieListData = resRelated.data?.success === true ? resRelated.data?.data : [];
                const movieList = Array.isArray(movieListData) ? movieListData : [];
                const filtered = movieList.filter(item => item.slug !== slug);
                setRelatedMovies(filtered);

                // Trailers
                const trailerFiltered = filtered
                    .filter(item => item.trailer_url && item.trailer_url.trim() !== "")
                    .slice(0, 6);
                setTrailerMovies(trailerFiltered);

                // Actors
                const actorData = resActors.data?.success === true ? resActors.data?.data : [];
                setActors(Array.isArray(actorData) ? actorData : []);

                // 2. Load Cinemas
                const cinemaList = resCinemas.data?.data || [];
                setCinemas(cinemaList);
                if (cinemaList.length > 0) {
                    setSelectedCinema(cinemaList[0]);
                }

                // 3. Generate Available Dates (Next 7 days)
                const dates = [];
                for (let i = 0; i < 7; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    dates.push(d.toISOString().split('T')[0]);
                }
                setAvailableDates(dates);
                setSelectedDate(dates[0]);

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
                <span>Đang tải thông tin phim...</span>
            </div>
        );
    }

    if (!movie) {
        return (
            <div className="movie-error-wrapper">
                Không tìm thấy dữ liệu bộ phim yêu cầu.
            </div>
        );
    }

    const movieForBanner = {
        ...movie,
        poster_url: movie.movie_poster || null,
        backdrop_url: movie.movie_backdrop || null
    };


    // =========================================================
    // RENDER
    // =========================================================

    return (
        <div className="cinema-movie-detail-page">

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

            {/* HERO BANNER */}
            <MovieHeroBanner movie={movieForBanner} onTrailer={openTrailerModal} />

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
                                    <Star size={20} fill="none" /> Đánh giá
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ============================================== */}
                {/* 🆕 SHOWTIME SECTION - LỊCH CHIẾU & SUẤT CHIẾU */}
                {/* ============================================== */}
                <div className="showtimes-section-wrapper">
                    <div className="section-header-row">
                        <h2 className="section-title-label">LỊCH CHIẾU & SUẤT CHIẾU</h2>
                        <div className="filmgenre-line" />
                    </div>

                    <div className="showtimes-filter-bar">
                        <div className="filter-group-cinema">
                            <label className="filter-label">CHỌN RẠP</label>
                            <select
                                className="cinema-select-box"
                                value={selectedCinema?.cinema_id || ''}
                                onChange={(e) => {
                                    const cinema = cinemas.find(c => c.cinema_id == e.target.value);
                                    setSelectedCinema(cinema);
                                }}
                            >
                                {cinemas.map(c => (
                                    <option key={c.cinema_id} value={c.cinema_id}>
                                        {c.cinema_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group-date">
                            <label className="filter-label">CHỌN NGÀY</label>
                            <div className="date-slider-horizontal">
                                {availableDates.map(d => (
                                    <button
                                        key={d}
                                        className={`date-btn ${selectedDate === d ? 'active' : ''}`}
                                        onClick={() => setSelectedDate(d)}
                                    >
                                        <span className="day-text">
                                            {new Date(d).toLocaleDateString('vi-VN', { weekday: 'short' })}
                                        </span>
                                        <span className="num-text">
                                            {new Date(d).getDate()}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="showtimes-result-list">
                        {!selectedCinema ? (
                            <div className="empty-showtimes-msg">Vui lòng chọn rạp chiếu</div>
                        ) : Object.keys(showtimesData).length === 0 ? (
                            <div className="empty-showtimes-msg">
                                Không có suất chiếu nào cho ngày này. Vui lòng chọn ngày khác.
                            </div>
                        ) : (
                            Object.entries(showtimesData).map(([roomType, items]) => (
                                <div key={roomType} className="room-type-block">
                                    <div className="room-type-header">
                                        <h4 className="room-type-title">{roomType}</h4>
                                    </div>
                                    <div className="showtimes-grid-items">
                                        {items.map(st => (
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
                                </div>
                            ))
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
                            <MovieCard key={movieItem.movie_id} movie={movieItem} onClick={handleMovieClick} />
                        ))}
                    </div>
                </div>

                {/* ACTORS */}
                <div className="cinema-section-block">
                    <div className="section-header-row">
                        <h2 className="section-title-label">DIỄN VIÊN</h2>
                        <div className="filmgenre-line" />
                        <span className="view-all-link-gold" onClick={() => navigate('/actors')}>
                            Xem tất cả ❯
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
                        {trailerMovies.map(item => (
                            <div
                                key={item.movie_id}
                                className="trailer-card-wrapper"
                                onClick={() => openTrailerByMovie(item)}
                            >
                                <CinemaCard
                                    type="cinema"
                                    image={item.movie_poster || null}
                                    title={item.title}
                                    link={null}
                                    buttonText={null}
                                />
                                <div className="trailer-play-overlay">
                                    <Play size={42} strokeWidth={2.5} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* REVIEWS */}
                <div className="reviews-section-fullwidth">
                    <div className="section-header-row">
                        <h2 className="section-title-label">ĐÁNH GIÁ TỪ KHÁN GIẢ</h2>
                        <div className="filmgenre-line" />
                        <button className="btn-write-review-small" onClick={openRatingModal}>Viết đánh giá</button>
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
                                    Chưa có bình luận nào. Hãy là người đầu tiên đánh giá!
                                </div>
                            ) : (
                                reviews.slice(0, 3).map((rev, index) => {
                                    const avatarUrl = rev.user_avatar ? getAvatarUrl(rev.user_avatar) : null;
                                    return (
                                        <div className="mini-comment-card" key={rev.review_id || index}>
                                            <div className="comment-user-meta-header">
                                                {avatarUrl ? (
                                                    <img src={avatarUrl} alt={rev.username || "Khán giả"} className="comment-avatar" loading="lazy" />
                                                ) : (
                                                    <div className="user-avatar-placeholder-small" />
                                                )}
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
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* MOVIE PREVIEW MODAL */}
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