import React from "react";
import { Star, Clock, Calendar, Ticket, Play } from "lucide-react";
import "../styles/MovieHeroBanner.css"
const MovieHeroBanner = ({
    movie,
    imageBaseUrl,
    onBook,
    onTrailer
}) => {
    if (!movie) return null;

    return (
        <div className="cinema-hero-banner">

            {/* BACKDROP IMAGE */}
            <img
                src={`${imageBaseUrl}/backdrops/${movie.backdrop_url || movie.poster_url}`}
                alt={movie.title}
                className="banner-horizontal-img"
            />

            {/* OVERLAY */}

            <div className="banner-gradient-overlay"></div>

            {/* CONTENT */}
            <div className="hero-content-wrapper">

                <div className="hero-info-side">

                    {/* TITLE */}
                    <div className="hero-title-row">
                        <h1 className="hero-movie-title">
                            {movie.title}
                        </h1>

                        <span className="hero-age-badge">
                            T16
                        </span>
                    </div>

                    {/* RATING / META */}
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

                    {/* DESCRIPTION */}
                    <p className="hero-description">
                        {movie.description
                            ?.replace(/<[^>]*>?/gm, "")
                            ?.replace(/&nbsp;/g, " ")}
                    </p>

                    {/* INFO LIST */}
                    <div className="hero-info-list">

                        <div className="hero-info-line">
                            <strong>Đạo diễn:</strong>
                            <span>{movie.director || "Đang cập nhật"}</span>
                        </div>

                        <div className="hero-info-line">
                            <strong>Thể loại:</strong>
                            <span>
                                {movie.genres?.map(g => g.genre_name).join(", ") || "Đang cập nhật"}
                            </span>
                        </div>

                        <div className="hero-info-line">
                            <strong>Diễn viên:</strong>
                            <span>{movie.cast || "Đang cập nhật"}</span>
                        </div>

                        <div className="hero-info-line">
                            <strong>Quốc gia:</strong>
                            <span>{movie.country || "Việt Nam"}</span>
                        </div>

                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="hero-action-group">

                        <button
                            className="hero-book-btn"
                            onClick={() => onBook?.(movie)}
                        >
                            <Ticket size={18} />
                            <span>ĐẶT VÉ NGAY</span>
                        </button>

                        <button
                            className="hero-trailer-btn"
                            onClick={() => onTrailer?.(movie)}
                        >
                            <Play size={18} />
                            <span>XEM TRAILER</span>
                        </button>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default MovieHeroBanner;