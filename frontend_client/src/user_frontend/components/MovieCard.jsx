import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import "../styles/MovieCard.css";

const MovieCard = React.memo(({ movie, onClick, index = 0 }) => {
    const [isOpening, setIsOpening] = useState(false);
    const [isHover, setIsHover] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    // Dữ liệu rút gọn – chỉ lấy những gì cần hiển thị
    const movieData = useMemo(() => ({
        title: movie?.title || "Đang cập nhật",
        poster: movie?.movie_poster,
        ageRating: movie?.age_rating || "T18",
        language: movie?.language || "Phụ đề",
        releaseDate: movie?.release_date || null,
        isHot: movie?.is_hot || false,
        isNew: movie?.is_new || false,
    }), [movie]);

    // Intersection Observer
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
        if (cardRef.current) observer.observe(cardRef.current);
        return () => observer.disconnect();
    }, []);

    // Tilt hiệu ứng 3D
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

    // Format ngày chiếu (nếu có)
    const formattedDate = useMemo(() => {
        if (!movieData.releaseDate) return null;
        const date = new Date(movieData.releaseDate);
        return isNaN(date) ? null : date.toLocaleDateString("vi-VN");
    }, [movieData.releaseDate]);

    // Phụ đề: ngày chiếu + ngôn ngữ + độ tuổi
    const subtitleParts = [];
    if (formattedDate) subtitleParts.push(formattedDate);
    if (movieData.language) subtitleParts.push(movieData.language);
    if (movieData.ageRating) subtitleParts.push(movieData.ageRating);

    const subtitle = subtitleParts.join(" • ");

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
                           0 ${tilt.x * 0.8}px ${tilt.y * 0.8}px 0px rgba(232,232,232,0.15),
                           0 0 60px rgba(232,232,232,0.05)`
                        : "var(--glass-shadow)",
                }}
            >
                {/* Border glow chạy */}
                <div className="film-card__border-glow" />

                {/* Sparkle particles (giữ lại trang trí) */}
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

                    <div className="film-card__depth-overlay" />

                    <div className="film-card__age">{movieData.ageRating}</div>

                    {movieData.isHot && (
                        <div className="film-card__badge hot">🔥 Hot</div>
                    )}
                    {movieData.isNew && !movieData.isHot && (
                        <div className="film-card__badge new">✨ Mới</div>
                    )}
                </div>

                <div className="film-card__info">
                    {/* Tên phim – dùng thẻ h3 */}
                    <h3 className="film-card__title">{movieData.title}</h3>

                    {/* Phụ đề (ngày chiếu • ngôn ngữ • độ tuổi) */}
                    {subtitle && (
                        <div className="film-card__subtitle">
                            <span>{subtitle}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

MovieCard.displayName = "MovieCard";

export default MovieCard;