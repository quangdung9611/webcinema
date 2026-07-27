import React from "react";
import { Play } from "lucide-react";
import "../styles/MovieHeroBanner.css";

const MovieHeroBanner = ({ movie, onTrailer }) => {
    if (!movie) return null;

    // ✅ Chỉ lấy movie_backdrop, không fallback, không helper
    const backdropUrl = movie.movie_backdrop || null;

    return (
        <section className="cinema-hero-banner">
            {backdropUrl ? (
                <img
                    className="banner-image"
                    src={backdropUrl}
                    alt={movie.title}
                    loading="eager"
                />
            ) : (
                <div className="banner-placeholder" />
            )}
            <button
                className="hero-play-btn"
                onClick={() => onTrailer?.(movie)}
                aria-label="Xem trailer"
            >
                <Play size={48} fill="white" stroke="white" />
            </button>
        </section>
    );
};

export default MovieHeroBanner;