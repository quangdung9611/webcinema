import React from "react";
import { Star, Clock, Calendar, Ticket, Play } from "lucide-react";
import AutoFitTitle from "../components/AutoFitTitle";
import "../styles/MovieHeroBanner.css";

const MovieHeroBanner = ({ movie, imageBaseUrl, onBook, onTrailer }) => {
    if (!movie) return null;

    const releaseDate = movie.release_date
        ? new Date(movie.release_date).toLocaleDateString("vi-VN")
        : "Đang cập nhật";

    const ageRating = movie.age_rating ? `T${movie.age_rating}` : "P";
    const rating = movie.avg_rating || "0.0";
    const duration = movie.duration || "--";
    const backdrop = movie.backdrop_url || movie.poster_url;

    return (
        <section className="cinema-hero-banner">
            <img
                className="banner-horizontal-img"
                src={`${imageBaseUrl}/backdrops/${backdrop}`}
                alt={movie.title}
                loading="eager"
            />

            {/* Chỉ giữ 1 lớp overlay mờ bên trái */}
            <div className="hero-overlay-dark"></div>

            <div className="hero-content-wrapper">
                <div className="hero-info-side">
                    <div className="hero-title-box">
                        <AutoFitTitle
                            text={movie.title}
                            maxLines={2}
                            letterSpacing={2}
                        />
                    </div>

                    <div className="hero-rating-row">
                        <div className="hero-age-badge">{ageRating}</div>
                        <div className="hero-rating-item">
                            <Star size={18} fill="#F5C542" color="#F5C542" />
                            <span>{rating} / 10</span>
                        </div>
                        <div className="hero-rating-item">
                            <Clock size={18} />
                            <span>{duration} phút</span>
                        </div>
                        <div className="hero-rating-item">
                            <Calendar size={18} />
                            <span>{releaseDate}</span>
                        </div>
                    </div>

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
        </section>
    );
};

export default MovieHeroBanner;