import React, { useMemo, useState, useCallback } from "react";
import { Star } from "lucide-react";
import "../styles/MovieCard.css";

const MovieCard = React.memo(({ movie, onClick }) => {
    const [isOpening, setIsOpening] = useState(false);

    const movieData = useMemo(() => ({
        rating: Number(movie?.average_rating) || 0,
        totalStars: 10,
        filledStars: Math.floor(Number(movie?.average_rating) || 0),
        reviewCount: movie?.total_reviews || 0,
        ageRating: movie?.age_rating || "T18",
        title: movie?.title || "Đang cập nhật",
        poster: movie?.movie_poster, // 👈 Lấy đúng link CSDL, không xử lý
        language: movie?.language || "Phụ đề"
    }), [movie]);

    const handleOpen = useCallback(() => {
        if (isOpening) return;
        setIsOpening(true);
        onClick?.(movie);
        setTimeout(() => setIsOpening(false), 900);
    }, [isOpening, movie, onClick]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpen();
        }
    }, [handleOpen]);

    return (
        <div className={`film-card ${isOpening ? "film-card--opening" : ""}`}>
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
                    {/* ✅ Chỉ hiển thị ảnh nếu có poster, không fallback */}
                    {movieData.poster ? (
                        <img
                            src={movieData.poster}
                            alt={movieData.title}
                            loading="lazy"
                            draggable={false}
                        />
                    ) : (
                        // Nếu không có ảnh, có thể để trống hoặc hiển thị placeholder tùy ý
                        // Bạn có thể render một div trống hoặc không render gì
                        // Tôi để một div trống để giữ layout
                        <div className="film-card__no-poster" />
                    )}

                    <span className="film-card__shine" />
                    <span className="film-card__sweep" />
                    <div className="film-card__age">{movieData.ageRating}</div>
                </div>

                <div className="film-card__info">
                    <h3 className="film-card__title">{movieData.title}</h3>
                    <div className="film-card__stars">
                        {[...Array(movieData.totalStars)].map((_, index) => (
                            <Star
                                key={index}
                                size={12}
                                strokeWidth={1.8}
                                fill={index < movieData.filledStars ? "#E5C46B" : "transparent"}
                                color="#E5C46B"
                            />
                        ))}
                    </div>
                    <div className="film-card__meta">
                        <span className="film-card__score">{movieData.rating.toFixed(1)}</span>
                        <span className="film-card__dot">•</span>
                        <span className="film-card__reviews">{movieData.reviewCount} đánh giá</span>
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

MovieCard.displayName = "MovieCard";

export default MovieCard;