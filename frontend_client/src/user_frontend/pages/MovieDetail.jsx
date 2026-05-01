import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Clock, Calendar, MapPin, Star, User, Play, Info, Ticket, Monitor, ChevronRight, AlertCircle } from 'lucide-react'; 
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
    
    // --- Logic đặt vé 4 bước ---
    const [cinemas, setCinemas] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [showtimes, setShowtimes] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE')); 
    const [selectedCinema, setSelectedCinema] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [hasChecked, setHasChecked] = useState(false);

    // --- Logic Review & Modal ---
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
    }, []);

    // 1. Khởi tạo dữ liệu phim & rạp
    useEffect(() => {
        const fetchMovieData = async () => {
            if (!slug || slug === 'undefined') return;
            try {
                setLoading(true);
                const [resMovie, resCinemas, resRelated] = await Promise.all([
                    axios.get(`${API_BASE_URL}/movies/${slug}`),
                    axios.get(`${API_BASE_URL}/cinemas`),
                    axios.get(`${API_BASE_URL}/movies`)
                ]);

                const movieData = resMovie.data;
                setMovie(movieData);
                setCinemas(resCinemas.data);
                
                if (movieData?.movie_id) {
                    fetchReviews(movieData.movie_id);
                }

                const filtered = resRelated.data.filter(m => m.slug !== slug);
                setRelatedMovies(filtered.slice(0, 4)); // Đồng bộ với layout 4 phim/hàng

            } catch (error) {
                console.error("Lỗi gọi API:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMovieData();
        window.scrollTo(0, 0);
    }, [slug, fetchReviews]);

    // 2. Load phòng khi chọn rạp
    useEffect(() => {
        if (!selectedCinema) return;
        const fetchRooms = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/rooms/cinema/${selectedCinema.cinema_id}`);
                setRooms(res.data);
                setSelectedRoom(null);
                setShowtimes([]);
                setHasChecked(false);
            } catch (error) {
                console.error("Lỗi tải phòng:", error);
            }
        };
        fetchRooms();
    }, [selectedCinema]);

    // 3. Check suất chiếu khi đủ điều kiện (Phòng + Ngày)
    useEffect(() => {
        if (!selectedRoom || !selectedDate || !movie) return;
        const checkSlots = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/showtimes/filter`, {
                    params: {
                        movie_id: movie.movie_id,
                        room_id: selectedRoom.room_id,
                        date: selectedDate
                    }
                });
                setShowtimes(res.data);
                setHasChecked(true);

                if (res.data.length === 0) {
                    setModalConfig({
                        show: true, type: 'error', title: 'Thông báo',
                        message: `Hết suất chiếu cho phim này tại phòng ${selectedRoom.room_name} vào ngày ${selectedDate} rồi Dũng ơi!`,
                        onConfirm: () => setModalConfig({show: false})
                    });
                }
            } catch (error) {
                console.error("Lỗi check suất chiếu:", error);
            }
        };
        checkSlots();
    }, [selectedRoom, selectedDate, movie]);

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

    const handleBooking = (slot) => {
        if (!user) {
            setModalConfig({
                show: true, type: 'confirm', title: 'Đăng nhập', message: 'Bạn đăng nhập để đặt vé nhé!',
                onConfirm: () => {
                    closeModal();
                    navigate('/login', { state: { from: location.pathname } });
                }
            });
            return;
        }
        navigate('/booking', { 
            state: { 
                movie, 
                cinema: selectedCinema, 
                room: selectedRoom, 
                showtime: slot, 
                date: selectedDate 
            } 
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

    if (loading) return <div className="loading-screen"><span>Đang tải phim...</span></div>;
    if (!movie) return <div className="error">Không tìm thấy phim.</div>;

    const videoId = getYoutubeID(movie.trailer_url);

    const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return {
            dayName: i === 0 ? 'Hôm nay' : ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()],
            displayDate: date.getDate() < 10 ? `0${date.getDate()}` : date.getDate(),
            dateString: date.toLocaleDateString('sv-SE'),
            month: date.getMonth() + 1
        };
    });

    return (
        <div className="movie-detail-container">
            <Modal
                show={modalConfig.show}
                type={modalConfig.type}
                title={modalConfig.title}
                message={modalConfig.message === 'rating_mode' ? renderStarRating() : modalConfig.message}
                onConfirm={modalConfig.message === 'rating_mode' ? handleSendReview : (modalConfig.onConfirm || closeModal)}
                onCancel={closeModal}
            />

            {/* SECTION 1: HERO HEADER */}
            <header className="movie-hero">
                <div className="hero-backdrop">
                    <img src={`${IMAGE_BASE_URL}/backdrops/${movie.backdrop_url}`} alt={movie.title} />
                    <div className="hero-gradient-overlay"></div>
                </div>
                <div className="hero-info-wrapper">
                    <h1 className="movie-title-large">{movie.title}</h1>
                    <div className="movie-tags-row">
                        <span className="tag-fill">T</span>
                        <span className="info-item"><Clock size={16}/> {movie.duration} phút</span>
                        <span className="info-item"><Calendar size={16}/> {new Date(movie.release_date).getFullYear()}</span>
                    </div>
                    <div className="movie-genres-row">
                        {movie.genres?.map((g, i) => (
                            <span key={i} className="genre-label">{g.genre_name}</span>
                        ))}
                    </div>
                    <p className="movie-summary-short">
                        {movie.description?.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').slice(0, 250)}...
                    </p>
                    <div className="hero-action-btns">
                        <button className="btn-primary-purple" onClick={() => videoId && window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')}>
                            <Play size={20} fill="currentColor"/> Xem Trailer
                        </button>
                    </div>
                </div>
            </header>

            <main className="movie-main-content">
                {/* STEP BOOKING SECTION */}
                    <section id="booking-section" className="booking-stepper-container">
                    {/* 1. THANH 7 NGÀY CỐ ĐỊNH PHÍA TRÊN */}
                    <div className="calendar-horizontal-wrapper">
                        <div className="calendar-grid-7days">
                            {dates.slice(0, 7).map((d, i) => (
                                <div 
                                    key={i} 
                                    className={`day-item-horizontal ${selectedDate === d.dateString ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedDate(d.dateString);
                                        setHasChecked(false);
                                        setShowtimes([]);
                                    }}
                                >
                                    <div className="day-name">{d.dayName}</div>
                                    <div className="day-number">{d.displayDate}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. KHU VỰC CHỌN RẠP - PHÒNG - SUẤT CHIẾU (CÓ SCROLL) */}
                    <div className="booking-body-layout">
                        {/* CỘT RẠP */}
                        <div className="booking-col">
                            <div className="col-header">CHỌN RẠP</div>
                            <div className="scroll-content-y">
                                {cinemas.map((c, i) => (
                                    <div 
                                        key={i} 
                                        className={`cinema-item-card ${selectedCinema?.cinema_id === c.cinema_id ? 'selected' : ''}`}
                                        onClick={() => setSelectedCinema(c)}
                                    >
                                        <div className="cinema-info">
                                            <div className="cinema-brand">{c.cinema_name}</div>
                                            <div className="cinema-location">TP. Hồ Chí Minh</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CỘT PHÒNG */}
                        <div className="booking-col">
                            <div className="col-header">CHỌN PHÒNG</div>
                            <div className="scroll-content-y">
                                {selectedCinema ? (
                                    rooms.length > 0 ? rooms.map((r, i) => (
                                        <div 
                                            key={i} 
                                            className={`room-type-card ${selectedRoom?.room_id === r.room_id ? 'active' : ''}`}
                                            onClick={() => setSelectedRoom(r)}
                                        >
                                            <span className="room-name">{r.room_type}</span>
                                          
                                        </div>
                                    )) : <p className="no-data-text">Hết phòng tại rạp này</p>
                                ) : <p className="no-data-text">Vui lòng chọn rạp trước</p>}
                            </div>
                        </div>

                        {/* CỘT SUẤT CHIẾU */}
                    <div className="booking-col">
                        <div className="col-header">SUẤT CHIẾU</div>
                        <div className="scroll-content-y">
                            {!selectedRoom ? (
                                <p className="no-data-text">Vui lòng chọn phòng trước</p>
                            ) : showtimes.length > 0 ? (
                                <div className="time-grid-inner">
                                    {showtimes.map((s, i) => (
                                        <button key={i} className="slot-btn" onClick={() => handleBooking(s)}>
                                            {/* Fix lỗi hiển thị giờ nếu start_time là định dạng string khác */}
                                            {new Date(s.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </button>
                                    ))}
                                </div>
                            ) : hasChecked ? (
                                <p className="no-data-text">Hết suất chiếu rồi Dũng ơi!</p>
                            ) : (
                                <p className="no-data-text">Đang tìm suất chiếu...</p>
                            )}
                        </div>
                    </div>
                    </div>
                </section>

                {/* INFO DETAILS GRID */}
                <div className="info-details-grid">
                    <section className="movie-synopsis">
                        <h3 className="section-label">NỘI DUNG PHIM</h3>
                        {/* Thêm class movie-description-content ở đây */}
                        <div className="movie-description-content" dangerouslySetInnerHTML={{ __html: movie.description }} />
                    </section>

                    <section className="movie-trailer-box">
                        <h3 className="section-label">TRAILER</h3>
                        <div className="video-container">
                            <iframe src={`https://www.youtube.com/embed/${videoId}`} title="Trailer" frameBorder="0" allowFullScreen></iframe>
                        </div>
                    </section>

                    <section className="rating-summary-box" onClick={openRatingModal}>
                        <h3 className="section-label">ĐÁNH GIÁ</h3>
                        <div className="big-rating">
                            <Star fill="#f5b50a" color="#f5b50a" size={32}/>
                            <span className="score">{movie.avg_rating || "0.0"}</span>
                            <span className="total">/10</span>
                        </div>
                        <p className="count">({movie.total_reviews || 0} đánh giá)</p>
                    </section>
                </div>

                {/* PHIM ĐỀ XUẤT */}
                <section className="related-movies-section">
                    <h3 className="section-label">PHIM ĐỀ XUẤT</h3>
                    <div className="related-grid">
                        {relatedMovies.map((m, index) => (
                            <div key={index} className="related-card" onClick={() => { navigate(`/movie/${m.slug}`); window.scrollTo(0, 0); }}>
                                <div className="card-poster">
                                    <img src={`${IMAGE_BASE_URL}/posters/${m.poster_url}`} alt={m.title} />
                                </div>
                                <div className="card-info">
                                    <h4 className="related-title">{m.title}</h4>
                                    <p className="related-meta">{m.duration} phút</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* REVIEWS SECTION */}
                <section className="community-reviews">
                    <h3 className="section-label">BÌNH LUẬN TỪ CỘNG ĐỒNG</h3>
                    <div className="reviews-horizontal">
                        {reviews.slice(0, 3).map((rev, i) => (
                            <div key={i} className="review-card-modern">
                                <div className="rev-user">
                                    <div className="rev-avatar"><User/></div>
                                    <div>
                                        <div className="rev-name">{rev.username}</div>
                                        <div className="rev-stars">{'★'.repeat(rev.rating_score)}</div>
                                    </div>
                                </div>
                                <p className="rev-comment">{rev.comment}</p>
                            </div>
                        ))}
                    </div>
                    <button className="btn-write-rev" onClick={openRatingModal}>Viết bình luận</button>
                </section>
            </main>
        </div>
    );
};

export default MovieDetail;