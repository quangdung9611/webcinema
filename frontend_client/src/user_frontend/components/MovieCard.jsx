import React, { useMemo, useState } from "react";
import { Star } from "lucide-react";
import Tilt from "react-parallax-tilt";

import "../styles/MovieCard.css";

const MovieCard = ({ movie, baseUrl, onPreview, onClick }) => {

    /* ==============================
        STATE CINEMATIC
    ============================== */

    const [isOpening, setIsOpening] = useState(false);

    /* ==============================
        MOVIE DATA
    ============================== */

    const movieData = useMemo(() => ({
        rating: Number(movie?.average_rating) || 0,
        totalStars: 10,
        filledStars: Math.floor(Number(movie?.average_rating) || 0),
        reviewCount: movie?.total_reviews || 0,
        ageRating: movie?.age_rating || "T18",
        title: movie?.title || "Đang cập nhật",
        poster: `${baseUrl}${movie?.poster_url}`,
        language: movie?.language || "Phụ đề"
    }), [movie, baseUrl]);

    /* ==============================
        CLICK HANDLER (CINEMATIC CORE)
    ============================== */

    const handleOpen = () => {

        if (isOpening) return;

        setIsOpening(true);

        // trigger parent modal open
        onClick?.(movie);

        // reset state after animation (sync modal timing)
        setTimeout(() => {
            setIsOpening(false);
        }, 900);
    };

    const handlePreview = (e) => {
        e.stopPropagation();
        onPreview?.(movie);
    };

    /* ==============================
        RENDER
    ============================== */

    return (

        <Tilt
            className={`movie-card ${isOpening ? "is-opening" : ""}`}
            tiltMaxAngleX={8}
            tiltMaxAngleY={8}
            perspective={1200}
            transitionSpeed={600}
            scale={1.02}
            glareEnable={true}
            glareMaxOpacity={0.08}
            glareBorderRadius="20px"
            gyroscope={false}
        >

            <div
                className="movie-inner"
                onClick={handleOpen}
                data-movie-id={movie?.id}
            >

                {/* GLOW */}
                <span className="card-glow" />

                {/* POSTER */}
                <div
                    className="movie-poster"
                    onClick={handlePreview}
                >

                    <img
                        src={movieData.poster}
                        alt={movieData.title}
                        draggable={false}
                        loading="lazy"
                    />

                    <span className="shine-effect" />
                    <span className="movie-light-sweep" />

                    {/* AGE */}
                    <div className="movie-age-badge">
                        {movieData.ageRating}
                    </div>

                </div>

                {/* INFO */}
                <div
                    className="movie-info"
                    onClick={handlePreview}
                >

                    <h3 className="movie-name">
                        {movieData.title}
                    </h3>

                    {/* STARS */}
                    <div className="movie-stars">

                        {[...Array(movieData.totalStars)].map((_, i) => (

                            <Star
                                key={i}
                                size={12}
                                strokeWidth={1.8}
                                fill={
                                    i < movieData.filledStars
                                        ? "#E5C46B"
                                        : "transparent"
                                }
                                color="#E5C46B"
                            />

                        ))}

                    </div>

                    {/* META */}
                    <div className="movie-meta">

                        <span className="movie-score">
                            {movieData.rating.toFixed(1)}
                        </span>

                        <span className="movie-dot">•</span>

                        <span className="movie-review-count">
                            {movieData.reviewCount} đánh giá
                        </span>

                    </div>

                    {/* EXTRA */}
                    <div className="movie-extra">

                        <span>{movieData.ageRating}</span>

                        <span className="movie-dot">•</span>

                        <span>{movieData.language}</span>

                    </div>

                </div>

            </div>

        </Tilt>

    );

};

export default MovieCard;