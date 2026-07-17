import React from "react";
import { Star, Clock, Calendar, Ticket, Play, Sparkles } from "lucide-react";
import "../styles/MovieHeroBanner.css";

const MovieHeroBanner = ({ movie, imageBaseUrl, onBook, onTrailer }) => {
    if (!movie) return null;

    const getTitleSize = (title) => {
        const len = title.trim().length;
        if (len <= 12) return 80;
        if (len <= 25) return 60;
        if (len <= 40) return 45;
        return 30;
    };

    return (
        <div className="cinema-hero-banner">
            {/* Backdrop Image */}
            <img
                src={`${imageBaseUrl}/backdrops/${movie.backdrop_url || movie.poster_url}`}
                alt={movie.title}
                className="banner-horizontal-img"
            />

            {/* Gradient Overlays */}
            <div className="hero-overlay-dark"></div>
            <div className="hero-overlay-gold"></div>

            {/* Content */}
            <div className="hero-content-wrapper">
                <div className="hero-info-side">
                    {/* Tag */}
                    <div className="hero-tag">
                        <Sparkles size={14} />
                        <span>Phim chiếu rạp</span>
                    </div>

                    {/* Title */}
                    <div className="hero-title-row">
                        <h1
                            className="hero-movie-title"
                            style={{ fontSize: `${getTitleSize(movie.title)}px` }}
                        >
                            {movie.title}
                        </h1>
                        <div className="hero-age-badge">
                            {movie.age_rating ? `T${movie.age_rating}` : "P"}
                        </div>
                    </div>

                    {/* Rating & Meta */}
                    <div className="hero-rating-row">
                        <div className="hero-rating-item">
                            <Star size={18} fill="#f5b50a" color="#f5b50a" />
                            <span>{movie.avg_rating || "0.0"} / 10</span>
                        </div>
                        <div className="hero-rating-item">
                            <Clock size={18} />
                            <span>{movie.duration} phút</span>
                        </div>
                        <div className="hero-rating-item">
                            <Calendar size={18} />
                            <span>
                                {movie.release_date
                                    ? new Date(movie.release_date).toLocaleDateString("vi-VN")
                                    : "Đang cập nhật"}
                            </span>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="hero-description">
                        {movie.description
                            ?.replace(/<[^>]*>?/gm, "")
                            ?.replace(/&nbsp;/g, " ")}
                    </p>

                    {/* Info List */}
                    <div className="hero-info-list">
                        <div className="hero-info-line">
                            <strong>Đạo diễn</strong>
                            <span>{movie.director || "Đang cập nhật"}</span>
                        </div>
                        <div className="hero-info-line">
                            <strong>Thể loại</strong>
                            <span>
                                {movie.genres?.map(g => g.genre_name).join(", ") || "Đang cập nhật"}
                            </span>
                        </div>
                        <div className="hero-info-line">
                            <strong>Diễn viên</strong>
                            <span>{movie.cast || "Đang cập nhật"}</span>
                        </div>
                        <div className="hero-info-line">
                            <strong>Quốc gia</strong>
                            <span>{movie.country || "Việt Nam"}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="hero-action-group">
                        <button className="hero-book-btn" onClick={() => onBook?.(movie)}>
                            <Ticket size={20} />
                            <span>Đặt vé ngay</span>
                        </button>
                        <button className="hero-trailer-btn" onClick={() => onTrailer?.(movie)}>
                            <Play size={20} />
                            <span>Xem trailer</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MovieHeroBanner;