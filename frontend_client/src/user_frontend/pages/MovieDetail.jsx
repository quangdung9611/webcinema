import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Clock, Calendar, MapPin, Star, ChevronRight, User } from 'lucide-react'; 
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
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [userRating, setUserRating] = useState(0); 
    const [hover, setHover] = useState(0); 
    const [reviewComment, setReviewComment] = useState(""); 
    const [reviews, setReviews] = useState([]);

    const [modalConfig, setModalConfig] = useState({
        show: false, type: '', title: '', message: null, onConfirm: null 
    });

    const getYoutubeID = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    // Dùng useCallback để tránh re-render không cần thiết
    const fetchReviews = useCallback(async (movieId) => {
        try {
            const res = await axios.get(`https://webcinema-zb8z.onrender.com/api/reviews/${movieId}`);
            const sortedReviews = res.data.sort((a, b) => 
                new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
            );
            setReviews(sortedReviews);
        } catch (error) {
            console.error("Lỗi lấy danh sách review:", error);
        }
    }, []);

    useEffect(() => {
        const fetchMovieData = async () => {
            if (!slug || slug === 'undefined') return;
            try {
                setLoading(true);
                const resMovie = await axios.get(`https://webcinema-zb8z.onrender.com/api/movies/${slug}`);
                const movieData = resMovie.data;
                setMovie(movieData);
                
                if (movieData?.movie_id) {
                    fetchReviews(movieData.movie_id);
                }

                const resRelated = await axios.get(`https://webcinema-zb8z.onrender.com/api/movies`);
                // Lọc bỏ phim hiện tại và giới hạn 5 phim
                setRelatedMovies(resRelated.data.filter(m => m.slug !== slug).slice(0, 5));
            } catch (error) {
                console.error("Lỗi gọi API:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMovieData();
        window.scrollTo(0, 0);
    }, [slug, fetchReviews]);

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, show: false }));
    };

    const handleSendReview = async () => {
        if (userRating === 0) {
            setModalConfig(prev => ({ 
                ...prev, show: true, type: 'error', title: 'Thông báo', message: 'Bạn ơi, chọn số sao đã nhé!' 
            }));
            return;
        }
        try {
            await axios.post(`https://webcinema-zb8z.onrender.com/api/reviews`, {
                movie_id: movie.movie_id,
                user_id: user.user_id,
                rating: userRating,
                comment: reviewComment 
            });

            // Reset form
            setUserRating(0);
            setReviewComment("");

            // Cập nhật lại thông tin phim và bình luận mới nhất
            const response = await axios.get(`https://webcinema-zb8z.onrender.com/api/movies/${slug}`);
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

    const handleSelectShowtime = (cinemaName, slot) => {
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
        navigate('/booking', { state: { movie, cinemaName, slot, selectedDate } });
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

    if (loading) return <div className="loading">Đang tải phim...</div>;
    if (!movie) return <div className="error">Không tìm thấy phim.</div>;

    const videoId = getYoutubeID(movie.trailer_url);

    const groupedShowtimes = movie.showtimes ? movie.showtimes.reduce((acc, current) => {
        const showDateStr = new Date(current.start_time).toISOString().split('T')[0];
        // Lọc theo ngày đã chọn và chỉ hiện suất chưa diễn ra
        if (showDateStr !== selectedDate || new Date(current.start_time) <= new Date()) return acc;
        if (!acc[current.cinema_name]) acc[current.cinema_name] = [];
        acc[current.cinema_name].push(current);
        return acc;
    }, {}) : {};

    const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return {
            dayName: i === 0 ? 'Hôm nay' : ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][date.getDay()],
            displayDate: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
            dateString: date.toISOString().split('T')[0]
        };
    });

    return (
        <div className="movie-detail-page">
            <Modal 
                show={modalConfig.show} type={modalConfig.type} title={modalConfig.title}
                message={modalConfig.message === 'rating_mode' ? renderStarRating() : modalConfig.message}
                onConfirm={modalConfig.message === 'rating_mode' ? handleSendReview : (modalConfig.onConfirm || closeModal)} 
                onCancel={closeModal} 
            />

            {videoId && (
                <div className="trailer-header-section">
                    <div className="trailer-aspect-ratio">
                        <iframe 
                            className="trailer-iframe"
                            src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                            title={`${movie.title} Trailer`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>
            )}

            <div className="detail-content-flex">
                <div className="main-detail-col">
                    <div className="movie-top-info">
                        <div className="poster-frame">
                            <img src={`https://webcinema-zb8z.onrender.com/uploads/posters/${movie.poster_url}`} alt={movie.title} />
                        </div>
                        <div className="text-frame">
                            <div className="movie-main-title">{movie.title}</div>
                            <div className="meta-row">
                                <span><Clock size={16} strokeWidth={2.5} /> {movie.duration} Phút</span>
                                <span><Calendar size={16} strokeWidth={2.5} /> {new Date(movie.release_date).toLocaleDateString('vi-VN')}</span>
                            </div>
                            
                            <div className="rating-row" onClick={openRatingModal}>
                                <Star size={22} fill="#f5b50a" color="#f5b50a" />
                                <strong className="rating-score">
                                    {movie.avg_rating ? Number(movie.avg_rating).toFixed(1) : "0.0"}
                                </strong> 
                                <span className="rating-count">
                                    ({movie.total_reviews || 0} đánh giá) - <span className="rating-link">Đánh giá ngay</span>
                                </span>
                            </div>

                            <div className="details-list">
                                <div style={{ marginBottom: '10px' }}>
                                        <strong>Quốc Gia:</strong> 
                                        <div className="genre-list" style={{ display: 'inline-flex', marginLeft: '8px', gap: '5px', flexWrap: 'wrap' }}>
                                            {/* Kiểm tra nếu có mảng genres và trong đó có chứa thông tin nation */}
                                            {movie.genres?.some(g => g.nation) ? (
                                                // Dùng Set để lọc các tên quốc gia trùng lặp nếu phim có nhiều thể loại cùng 1 quốc gia
                                                [...new Set(movie.genres.map(g => g.nation))].filter(Boolean).map((nation, i) => (
                                                    <span key={i} className="tag-btn">{nation}</span>
                                                ))
                                            ) : (
                                                // Nếu không có trong mảng genres thì hiển thị field nation trực tiếp hoặc báo "Chưa xác định"
                                                <span className="tag-btn">{movie.nation || "Chưa xác định"}</span>
                                            )}
                                        </div>
                                    </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <strong>Thể loại:</strong> 
                                    <div className="genre-list" style={{ display: 'inline-flex', marginLeft: '8px', gap: '5px', flexWrap: 'wrap' }}>
                                        {movie.genres?.length > 0 ? (
                                            movie.genres.map((g, i) => (
                                                <span key={i} className="tag-btn">{g.genre_name}</span>
                                            ))
                                        ) : (
                                            <span className="tag-btn">{movie.genre_name || "Chưa xác định"}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="actor-section">
                                    <strong>Diễn viên:</strong>
                                    <div className="genre-list" style={{ display: 'inline-flex', marginLeft: '8px', gap: '5px', flexWrap: 'wrap' }}>
                                        {movie.actors?.length > 0 ? (
                                            movie.actors.map((actor, i) => (
                                                <span 
                                                    key={i} 
                                                    className="tag-btn" 
                                                    style={{ cursor: 'pointer' }} 
                                                    onClick={() => navigate(`/actor/${actor.slug || actor.actor_id}`)}
                                                >
                                                    {actor.name}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="tag-btn">Đang cập nhật...</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="section-divider"><h3>Nội Dung Phim</h3></div>
                    <p className="description-text">{movie.description || "Đang cập nhật nội dung..."}</p>

                    <div className="section-divider"><h3>Lịch Chiêu</h3></div>
                    <div className="date-picker-tabs">
                        {dates.map((d, index) => (
                            <button key={index} className={selectedDate === d.dateString ? 'active' : ''} onClick={() => setSelectedDate(d.dateString)}>
                                <strong>{d.dayName}</strong><span>{d.displayDate}</span>
                            </button>
                        ))}
                    </div>

                    <div className="showtime-wrapper">
                        {Object.keys(groupedShowtimes).length > 0 ? (
                            Object.entries(groupedShowtimes).map(([cinemaName, slots], idx) => (
                                <div key={idx} className="cinema-group">
                                    <div className="cinema-name">
                                        <MapPin size={18} color="#03599d" strokeWidth={2.5} /> 
                                        {cinemaName}
                                    </div>
                                    <div className="format-row">
                                        <span className="format-label">2D Phụ Đề</span>
                                        <div className="time-grid">
                                            {slots.map((s, i) => (
                                                <button key={i} className="time-item" onClick={() => handleSelectShowtime(cinemaName, s)}>
                                                    {new Date(s.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (<div className="no-data">Hiện tại không còn suất chiếu nào khả dụng.</div>)}
                    </div>

                    <div className="section-divider"><h3>Bình luận từ cộng đồng</h3></div>
                    <div className="reviews-list-container">
                        {reviews.length > 0 ? (
                            reviews.map((rev, index) => {
                                const isEdited = rev.updated_at && (new Date(rev.updated_at).getTime() - new Date(rev.created_at).getTime() > 1000);
                                return (
                                    <div key={index} className="review-card">
                                        <div className="review-user-info">
                                            <div className="user-avatar"><User size={20} /></div>
                                            <div className="user-details">
                                                <span className="user-name">@{rev.username}</span>
                                                <div className="user-rating-stars">
                                                    {[...Array(10)].map((_, i) => (
                                                        <Star 
                                                            key={i} size={12} 
                                                            fill={i < rev.rating_score ? "#f5b50a" : "none"} 
                                                            color={i < rev.rating_score ? "#f5b50a" : "#444"} 
                                                        />
                                                    ))}
                                                    <span className="time-ago">
                                                        {new Date(rev.updated_at || rev.created_at).toLocaleDateString('vi-VN')}
                                                        {isEdited && <span style={{fontSize: '11px', color: '#888', fontStyle: 'italic', marginLeft: '5px'}}>(Đã chỉnh sửa)</span>}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="review-text">{rev.comment}</p>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="no-data">Chưa có bình luận nào cho phim này.</div>
                        )}
                    </div>
                </div>

                <div className="movie-sidebar-area">
                    <div className="sidebar-heading">Phim Đang Chiếu</div>
                    <div className="sidebar-movie-list">
                        {relatedMovies.map((m, index) => (
                            <div 
                                key={index} 
                                className="simple-movie-item" 
                                onClick={() => navigate(`/movies/detail/${m.slug}`)}
                            >
                                <div className="simple-poster">
                                    <img 
                                        src={`https://webcinema-zb8z.onrender.com/uploads/posters/${m.poster_url}`} 
                                        alt={m.title} 
                                    />
                                    <div className="age-badge">C{m.age_rating}</div>
                                </div>
                                <div className="simple-title">{m.title}</div>
                            </div>
                        ))}
                    </div>
                    <button className="view-more-sidebar-btn" onClick={() => navigate('/movies')}>
                        <span>Xem thêm</span>
                        <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MovieDetail;