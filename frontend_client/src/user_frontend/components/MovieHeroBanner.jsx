import React from "react";
import { Play } from "lucide-react";
import "../styles/MovieHeroBanner.css";

const DEFAULT_BACKDROP =
    "https://res.cloudinary.com/mlznpd9x/image/upload/v1/default-backdrop.jpg";

const MovieHeroBanner = ({ movie, onTrailer }) => {
    if (!movie) return null;

    // ✅ Dùng trực tiếp URL Cloudinary từ database (không ghép URL)
    const backdropUrl = movie.backdrop_url || movie.movie_backdrop || movie.poster_url || DEFAULT_BACKDROP;

    return (
        <section className="cinema-hero-banner">
            <img
                className="banner-image"
                src={backdropUrl}
                alt={movie.title}
                loading="eager"
                onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_BACKDROP;
                }}
            />
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