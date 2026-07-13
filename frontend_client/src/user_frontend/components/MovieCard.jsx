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
        CLICK HANDLER
    ============================== */

    const handleOpen = () => {

        if (isOpening) return;

        setIsOpening(true);

        onClick?.(movie);

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
            className={`film-card ${isOpening ? "film-card--opening" : ""}`}
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
                className="film-card__inner"
                onClick={handleOpen}
                data-movie-id={movie?.id}
            >

                {/* GLOW - TẮT */}
                <span className="film-card__glow" />

                {/* POSTER */}
                <div
                    className="film-card__poster"
                    onClick={handlePreview}
                >

                    <img
                        src={movieData.poster}
                        alt={movieData.title}
                        draggable={false}
                        loading="lazy"
                    />

                    <span className="film-card__shine" />
                    <span className="film-card__sweep" />

                    {/* AGE */}
                    <div className="film-card__age">
                        {movieData.ageRating}
                    </div>

                </div>

                {/* INFO */}
                <div
                    className="film-card__info"
                    onClick={handlePreview}
                >

                    <h3 className="film-card__title">
                        {movieData.title}
                    </h3>

                    {/* STARS */}
                    <div className="film-card__stars">

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
                    <div className="film-card__meta">

                        <span className="film-card__score">
                            {movieData.rating.toFixed(1)}
                        </span>

                        <span className="film-card__dot">•</span>

                        <span className="film-card__reviews">
                            {movieData.reviewCount} đánh giá
                        </span>

                    </div>

                    {/* EXTRA */}
                    <div className="film-card__extra">

                        <span>{movieData.ageRating}</span>

                        <span className="film-card__dot">•</span>

                        <span>{movieData.language}</span>

                    </div>

                </div>

            </div>

        </Tilt>

    );

};

export default MovieCard;