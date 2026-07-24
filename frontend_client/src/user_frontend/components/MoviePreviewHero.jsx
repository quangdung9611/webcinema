import {
    Star,
    Clock,
    Calendar,
    Globe,
    Ticket,
    ArrowRight,
    Play,
    Heart
} from "lucide-react";

import "../styles/MoviePreviewHero.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const DEFAULT_BACKDROP =
    "https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-backdrop.jpg";

const MoviePreviewHero = ({
    movie,
    onBook,
    onTrailer
}) => {

    const navigate = useNavigate();
    const [isLiked, setIsLiked] = useState(false);

    if (!movie) return null;

    const handleViewDetail = () => {
        navigate(`/movies/detail/${movie.slug || movie.movie_slug}`);
    };

    const handleBooking = () => {
        navigate(`/booking/${movie.slug || movie.movie_slug}`);
    };

    // ✅ Dùng trực tiếp URL Cloudinary từ database (không ghép URL)
    const backdropSrc = movie.backdrop_url || movie.movie_backdrop || movie.poster_url || DEFAULT_BACKDROP;

    return (
        <section className="preview-hero">

            {/* BACKDROP */}
            <img
                className="preview-hero-backdrop"
                src={backdropSrc}
                alt={movie.title}
                onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_BACKDROP;
                }}
            />

            {/* LỚP PHỦ */}
            <div className="preview-hero-overlay"></div>
            <div className="preview-hero-shadow"></div>
            <div className="preview-hero-glow"></div>

            {/* BADGE NỔI BẬT */}
            <div className="preview-hero-badge-wrapper">
                <span className="preview-hero-badge">
                    <span className="badge-dot"></span>
                    ĐANG CHIẾU
                </span>
                <span className="preview-hero-badge premium-badge">
                    <Star size={12} fill="#ffd700" color="#ffd700" />
                    {movie.avg_rating || "0.0"}
                </span>
            </div>

            <div className="preview-hero-container">
                <div className="preview-hero-content">

                    <div className="preview-title-row">
                        <h1 className="preview-title">{movie.title}</h1>
                        <span className="preview-age">
                            {movie.age_rating ? `T${movie.age_rating}` : "P"}
                        </span>
                    </div>

                    <div className="preview-meta">
                        <div className="preview-meta-item">
                            <Star size={16} fill="#FFC107" color="#FFC107" />
                            <span>{movie.avg_rating || "0.0"}</span>
                        </div>

                        <div className="preview-meta-item">
                            <Clock size={16} />
                            <span>{movie.duration || "120"} phút</span>
                        </div>

                        <div className="preview-meta-item">
                            <Calendar size={16} />
                            <span>
                                {movie.release_date
                                    ? new Date(movie.release_date).toLocaleDateString("vi-VN")
                                    : "Đang cập nhật"}
                            </span>
                        </div>

                        <div className="preview-meta-item">
                            <Globe size={16} />
                            <span>{movie.country || "Việt Nam"}</span>
                        </div>
                    </div>

                    <p className="preview-description">
                        {movie.description
                            ?.replace(/<[^>]*>?/gm, "")
                            ?.replace(/&nbsp;/g, " ") || "Đang cập nhật thông tin..."}
                    </p>

                    <div className="preview-extra-info">

                        <div className="preview-info-row">
                            <span className="preview-info-label">Thể loại</span>
                            <div className="preview-genre-list">
                                {movie.genres?.length ? (
                                    movie.genres.map((genre) => (
                                        <span
                                            key={genre.genre_id || genre.genre_name}
                                            className="preview-genre-chip"
                                        >
                                            {genre.genre_name}
                                        </span>
                                    ))
                                ) : (
                                    <span className="preview-info-value">
                                        Đang cập nhật
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="preview-info-row">
                            <span className="preview-info-label">Đạo diễn</span>
                            <span className="preview-info-value">
                                {movie.director || "Đang cập nhật"}
                            </span>
                        </div>

                        <div className="preview-info-row">
                            <span className="preview-info-label">Diễn viên</span>
                            <span className="preview-info-value">
                                {movie.cast || "Đang cập nhật"}
                            </span>
                        </div>

                    </div>

                    <div className="preview-action-group">

                        <button
                            className="preview-book-btn"
                            onClick={handleBooking}
                        >
                            <Ticket size={18} />
                            <span>ĐẶT VÉ NGAY</span>
                        </button>

                        <button
                            className="preview-trailer-btn"
                            onClick={handleViewDetail}
                        >
                            <Play size={18} />
                            <span>XEM CHI TIẾT</span>
                        </button>

                        <button
                            className={`preview-like-btn ${isLiked ? "liked" : ""}`}
                            onClick={() => setIsLiked(!isLiked)}
                            aria-label="Yêu thích"
                        >
                            <Heart size={20} />
                        </button>

                    </div>

                </div>
            </div>
        </section>
    );
};

export default MoviePreviewHero;