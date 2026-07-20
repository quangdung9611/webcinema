import React from "react";
import { Play } from "lucide-react";
import "../styles/MovieHeroBanner.css";

const MovieHeroBanner = ({ movie, imageBaseUrl, onTrailer }) => {
    if (!movie) return null;

    const backdrop = movie.backdrop_url || movie.poster_url;

    return (
        <section className="cinema-hero-banner">
            {/* Ảnh nền */}
            <img
                className="banner-image"
                src={`${imageBaseUrl}/backdrops/${backdrop}`}
                alt={movie.title}
                loading="eager"
            />

            {/* Nút play ở giữa */}
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