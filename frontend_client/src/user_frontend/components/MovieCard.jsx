import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Star } from "lucide-react";
import "../styles/MovieCard.css";

const MovieCard = React.memo(({ movie, onClick, index = 0 }) => {
    const [isOpening, setIsOpening] = useState(false);
    const [isHover, setIsHover] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    const movieData = useMemo(() => ({
        rating: Number(movie?.average_rating) || 0,
        totalStars: 10,
        filledStars: Math.floor(Number(movie?.average_rating) || 0),
        reviewCount: movie?.total_reviews || 0,
        ageRating: movie?.age_rating || "T18",
        title: movie?.title || "Đang cập nhật",
        poster: movie?.movie_poster,
        language: movie?.language || "Phụ đề",
        isHot: movie?.is_hot || false,
        isNew: movie?.is_new || false,
    }), [movie]);

    // Intersection Observer cho animation xuất hiện
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setTilt({ x: -x * 15, y: y * 15 });
    }, []);

    const handleMouseEnter = () => setIsHover(true);
    const handleMouseLeave = () => {
        setIsHover(false);
        setTilt({ x: 0, y: 0 });
    };

    const handleClick = useCallback((e) => {
        if (isOpening) return;
        setIsOpening(true);
        onClick?.(movie);
        setTimeout(() => setIsOpening(false), 900);
    }, [isOpening, movie, onClick]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick(e);
        }
    }, [handleClick]);

    // Tính toán shadow động theo hướng tilt
    const shadowX = tilt.x * 0.8;
    const shadowY = tilt.y * 0.8;

    return (
        <div
            className={`film-card ${isHover ? "film-card--hover" : ""} ${isOpening ? "film-card--opening" : ""} ${isVisible ? "film-card--visible" : ""}`}
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={movieData.title}
            style={{
                transform: `perspective(1200px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
                transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: `${index * 50}ms`,
            }}
        >
            <div 
                className="film-card__inner"
                style={{
                    boxShadow: isHover 
                        ? `0 30px 70px rgba(0,0,0,0.8), 
                           0 ${shadowX}px ${shadowY}px 0px rgba(232,232,232,0.15),
                           0 0 60px rgba(232,232,232,0.05)`
                        : "var(--cinema-card-shadow)"
                }}
            >
                {/* Border glow chạy */}
                <div className="film-card__border-glow" />

                {/* Sparkle particles */}
                <div className="film-card__sparkles">
                    <span className="sparkle s1" />
                    <span className="sparkle s2" />
                    <span className="sparkle s3" />
                    <span className="sparkle s4" />
                    <span className="sparkle s5" />
                </div>

                <div className="film-card__poster">
                    {movieData.poster ? (
                        <img
                            src={movieData.poster}
                            alt={movieData.title}
                            loading="lazy"
                            draggable={false}
                        />
                    ) : (
                        <div className="film-card__no-poster" />
                    )}

                    {/* 3D depth overlay */}
                    <div className="film-card__depth-overlay" />

                    <div className="film-card__age">{movieData.ageRating}</div>

                    {/* Badge Hot / New */}
                    {movieData.isHot && (
                        <div className="film-card__badge hot">🔥 Hot</div>
                    )}
                    {movieData.isNew && !movieData.isHot && (
                        <div className="film-card__badge new">✨ Mới</div>
                    )}
                </div>

                <div className="film-card__info">
                    <h3 className="film-card__title">{movieData.title}</h3>
                    <div className="film-card__stars">
                        {[...Array(movieData.totalStars)].map((_, idx) => (
                            <Star
                                key={idx}
                                size={14}
                                strokeWidth={1.8}
                                fill={idx < movieData.filledStars ? "#E5C46B" : "transparent"}
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
                    <div className="film-card__progress">
                        <div 
                            className="film-card__progress-bar" 
                            style={{ width: `${Math.min(100, (movieData.rating / 10) * 100)}%` }} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});

MovieCard.displayName = "MovieCard";

export default MovieCard;