import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Info } from "lucide-react";
import "../styles/MovieCard.css";

const MovieCard = React.memo(({ movie, onClick, index = 0 }) => {
    const navigate = useNavigate();
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
        slug: movie?.slug || movie?.movie_slug,
        movie_id: movie?.movie_id || movie?.id,
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

    // ==========================================================
    // HANDLE NAVIGATION
    // ==========================================================
    const handleDetailClick = useCallback((e) => {
        e.stopPropagation();
        if (onClick) {
            onClick(movie);
            return;
        }
        const slug = movieData.slug;
        if (slug) {
            navigate(`/movies/detail/${slug}`);
        }
    }, [movie, movieData.slug, navigate, onClick]);

    const handleBookingClick = useCallback((e) => {
        e.stopPropagation();
        const slug = movieData.slug;
        if (slug) {
            navigate(`/booking/${slug}`);
        }
    }, [movieData.slug, navigate]);

    const handleCardClick = useCallback((e) => {
        if (isOpening) return;
        setIsOpening(true);
        if (onClick) {
            onClick(movie);
        } else {
            const slug = movieData.slug;
            if (slug) {
                navigate(`/movies/detail/${slug}`);
            }
        }
        setTimeout(() => setIsOpening(false), 900);
    }, [isOpening, movie, movieData.slug, navigate, onClick]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick(e);
        }
    }, [handleCardClick]);

    // Format ngày chiếu
    const formattedDate = useMemo(() => {
        if (!movieData.releaseDate) return null;
        const date = new Date(movieData.releaseDate);
        return isNaN(date) ? null : date.toLocaleDateString("vi-VN");
    }, [movieData.releaseDate]);

    // Phụ đề
    const subtitleParts = [];
    if (formattedDate) subtitleParts.push(formattedDate);
    if (movieData.language) subtitleParts.push(movieData.language);
    if (movieData.ageRating) subtitleParts.push(movieData.ageRating);

    const subtitle = subtitleParts.join(" • ");

    // Lấy movie_id cho booking
    const movieId = movieData.movie_id;

    return (
        <div
            className={`film-card ${isHover ? "film-card--hover" : ""} ${isOpening ? "film-card--opening" : ""} ${isVisible ? "film-card--visible" : ""}`}
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleCardClick}
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

                    <div className="film-card__depth-overlay" />

                    <div className="film-card__age">{movieData.ageRating}</div>

                    {movieData.isHot && (
                        <div className="film-card__badge hot">🔥 Hot</div>
                    )}
                    {movieData.isNew && !movieData.isHot && (
                        <div className="film-card__badge new">✨ Mới</div>
                    )}

                    {/* ==========================================================
                        ACTION BUTTONS OVERLAY - XUẤT HIỆN KHI HOVER
                    ========================================================== */}
                    <div className="film-card__actions-overlay">
                        <div className="film-card__actions-wrapper">
                            <button
                                className="film-card__action-btn btn-detail"
                                onClick={handleDetailClick}
                                aria-label="Xem chi tiết"
                            >
                                <Info size={18} />
                                <span>Xem chi tiết</span>
                            </button>
                            <button
                                className="film-card__action-btn btn-booking"
                                onClick={handleBookingClick}
                                aria-label="Đặt vé"
                            >
                                <Ticket size={18} />
                                <span>Đặt vé</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="film-card__info">
                    <h3 className="film-card__title">{movieData.title}</h3>
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