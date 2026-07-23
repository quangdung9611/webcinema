import React, { useMemo, useState, useCallback } from "react";
import { Star } from "lucide-react";

import "../styles/MovieCard.css";

const MovieCard = React.memo(({
    movie,
    baseUrl,
    onPreview,
    onClick
}) => {

    const [isOpening, setIsOpening] = useState(false);

    const movieData = useMemo(() => ({
        rating: Number(movie?.average_rating) || 0,
        totalStars: 10,
        filledStars: Math.floor(Number(movie?.average_rating) || 0),
        reviewCount: movie?.total_reviews || 0,
        ageRating: movie?.age_rating || "T18",
        title: movie?.title || "Đang cập nhật",
        // ✅ SỬA: hỗ trợ cả URL Cloudinary và tên file local
        poster: movie?.poster_url
            ? (movie.poster_url.startsWith('http') 
                ? movie.poster_url 
                : `${baseUrl}${movie.poster_url}`)
            : `${baseUrl}default-poster.jpg`,
        language: movie?.language || "Phụ đề"
    }), [movie, baseUrl]);

    const handleOpen = useCallback(() => {
        console.log("CLICK CARD", movie);

        if (isOpening) return;

        setIsOpening(true);

        onClick?.(movie);

        setTimeout(() => {
            setIsOpening(false);
        }, 900);
    }, [isOpening, movie, onClick]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpen();
        }
    }, [handleOpen]);

    return (
        <div
            className={`film-card ${
                isOpening ? "film-card--opening" : ""
            }`}
        >
            <div
                className="film-card__inner"
                onClick={handleOpen}
                onKeyDown={handleKeyDown}
                data-movie-id={movie?.movie_id}
                role="button"
                tabIndex={0}
                aria-label={movieData.title}
            >
                <div className="film-card__poster">
                    <img
                        src={movieData.poster}
                        alt={movieData.title}
                        draggable={false}
                        loading="lazy"
                        onError={(e) => {
                            // Fallback nếu ảnh lỗi
                            e.target.src = `${baseUrl}default-poster.jpg`;
                        }}
                    />

                    <span className="film-card__shine" />
                    <span className="film-card__sweep" />

                    <div className="film-card__age">
                        {movieData.ageRating}
                    </div>
                </div>

                <div className="film-card__info">
                    <h3 className="film-card__title">
                        {movieData.title}
                    </h3>

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

                    <div className="film-card__meta">
                        <span className="film-card__score">
                            {movieData.rating.toFixed(1)}
                        </span>

                        <span className="film-card__dot">•</span>

                        <span className="film-card__reviews">
                            {movieData.reviewCount} đánh giá
                        </span>
                    </div>

                    <div className="film-card__extra">
                        <span>{movieData.ageRating}</span>

                        <span className="film-card__dot">•</span>

                        <span>{movieData.language}</span>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default MovieCard;