import React, {
    useMemo,
    useState,
    useCallback,
    useRef,
    useEffect
} from "react";

import { useNavigate } from "react-router-dom";
import { Ticket, Info } from "lucide-react";

import { optimizeCloudinary, IMAGE_SIZES } from "../../utils/imageHelper";
import TiltCard from "./TiltCard";
import MovieRevealTransition from "./MovieRevealTransition";

import "../styles/MovieCard.css";

const MovieCard = React.memo(({ movie, onClick, index = 0 }) => {
    const navigate = useNavigate();

    const [isOpening, setIsOpening] = useState(false);
    const [isHover, setIsHover] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [showReveal, setShowReveal] = useState(false);

    const cardRef = useRef(null);

    // ============================================================
    // MOVIE DATA
    // ============================================================

    const movieData = useMemo(() => ({
        title: movie?.title || "Đang cập nhật",

        poster: movie?.movie_poster || null,

        backdrop: movie?.movie_backdrop || null,

        ageRating: movie?.age_rating || "T18",

        language: movie?.language || "Phụ đề",

        releaseDate: movie?.release_date || null,

        isHot: movie?.is_hot || false,

        isNew: movie?.is_new || false,

        slug: movie?.slug || movie?.movie_slug,

        movie_id: movie?.movie_id || movie?.id
    }), [movie]);

    // ============================================================
    // INTERSECTION OBSERVER
    // ============================================================

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            {
                threshold: 0.1,
                rootMargin: "0px 0px -50px 0px"
            }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, []);

    // ============================================================
    // HOVER
    // ============================================================

    const handleMouseEnter = useCallback(() => {
        if (!isOpening) {
            setIsHover(true);
        }
    }, [isOpening]);

    const handleMouseLeave = useCallback(() => {
        setIsHover(false);
    }, []);

    // ============================================================
    // START MOVIE REVEAL
    // ============================================================

    const startMovieReveal = useCallback((e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (isOpening || showReveal) {
            return;
        }

        if (!movieData.slug && !onClick) {
            return;
        }

        // Khóa card ngay lập tức
        setIsOpening(true);
        setIsHover(false);

        // Mở cinematic transition
        setShowReveal(true);
    }, [
        isOpening,
        showReveal,
        movieData.slug,
        onClick
    ]);

    // ============================================================
    // DETAIL BUTTON
    // ============================================================

    const handleDetailClick = useCallback((e) => {
        startMovieReveal(e);
    }, [startMovieReveal]);

    // ============================================================
    // BOOKING
    // ============================================================

    const handleBookingClick = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isOpening || showReveal) {
            return;
        }

        const slug = movieData.slug;

        if (slug) {
            navigate(`/booking/${slug}`);
        }
    }, [
        isOpening,
        showReveal,
        movieData.slug,
        navigate
    ]);

    // ============================================================
    // CARD CLICK
    // ============================================================

    const handleCardClick = useCallback((e) => {
        startMovieReveal(e);
    }, [startMovieReveal]);

    // ============================================================
    // KEYBOARD
    // ============================================================

    const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            startMovieReveal(e);
        }
    }, [startMovieReveal]);

    // ============================================================
    // TRANSITION COMPLETE
    // ============================================================

    const handleRevealComplete = useCallback(() => {
        const slug = movieData.slug;

        /*
         * Nếu MovieCard được truyền onClick từ component cha,
         * giữ nguyên behavior cũ.
         *
         * Nếu không có onClick thì tự navigate.
         */
        if (onClick) {
            onClick(movie);
            return;
        }

        if (slug) {
            navigate(`/movies/detail/${slug}`);
        }
    }, [
        movie,
        movieData.slug,
        navigate,
        onClick
    ]);

    // ============================================================
    // CLOSE TRANSITION
    // ============================================================

    const handleRevealCancel = useCallback(() => {
        setShowReveal(false);

        /*
         * Cho phép card hoạt động lại nếu transition bị hủy.
         */
        window.setTimeout(() => {
            setIsOpening(false);
        }, 100);
    }, []);

    // ============================================================
    // DATE
    // ============================================================

    const formattedDate = useMemo(() => {
        if (!movieData.releaseDate) {
            return null;
        }

        const date = new Date(movieData.releaseDate);

        return isNaN(date)
            ? null
            : date.toLocaleDateString("vi-VN");
    }, [movieData.releaseDate]);

    // ============================================================
    // SUBTITLE
    // ============================================================

    const subtitleParts = [];

    if (formattedDate) {
        subtitleParts.push(formattedDate);
    }

    if (movieData.language) {
        subtitleParts.push(movieData.language);
    }

    const subtitle = subtitleParts.join(" • ");

    // ============================================================
    // POSTER URL
    // ============================================================

    const posterUrl = useMemo(() => {
        if (!movieData.poster) {
            return null;
        }

        return optimizeCloudinary(
            movieData.poster,
            IMAGE_SIZES.MOVIE_POSTER_CARD
        );
    }, [movieData.poster]);

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <>
            <TiltCard
                maxTilt={12}
                scale={1.04}
                perspective={1200}
                glare={true}
                shadow={true}
                edgeHighlight={true}
            >
                <div
                    ref={cardRef}
                    className={[
                        "film-card",
                        isHover ? "film-card--hover" : "",
                        isOpening ? "film-card--opening" : "",
                        isVisible ? "film-card--visible" : ""
                    ]
                        .filter(Boolean)
                        .join(" ")}

                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onKeyDown={handleKeyDown}

                    role="button"
                    tabIndex={0}

                    aria-label={`Xem chi tiết ${movieData.title}`}
                >
                    <div className="film-card__inner">

                        {/* ==================================================
                            BORDER GLOW
                        ================================================== */}

                        <div className="film-card__border-glow" />

                        {/* ==================================================
                            SPARKLES
                        ================================================== */}

                        <div className="film-card__sparkles">
                            <span className="sparkle s1" />
                            <span className="sparkle s2" />
                            <span className="sparkle s3" />
                            <span className="sparkle s4" />
                            <span className="sparkle s5" />
                        </div>

                        {/* ==================================================
                            POSTER
                        ================================================== */}

                        <div
                            className="film-card__poster"
                            onClick={handleCardClick}
                        >
                            {movieData.poster ? (
                                <img
                                    src={posterUrl}
                                    alt={movieData.title}
                                    loading="lazy"
                                    decoding="async"
                                    width="300"
                                    height="450"
                                    draggable={false}
                                />
                            ) : (
                                <div className="film-card__no-poster" />
                            )}

                            <div className="film-card__depth-overlay" />

                            <div className="film-card__age">
                                {movieData.ageRating}
                            </div>

                            {movieData.isHot && (
                                <div className="film-card__badge hot">
                                    🔥 Hot
                                </div>
                            )}

                            {movieData.isNew && !movieData.isHot && (
                                <div className="film-card__badge new">
                                    ✨ Mới
                                </div>
                            )}
                        </div>

                        {/* ==================================================
                            INFO
                        ================================================== */}

                        <div className="film-card__info">

                            <h3
                                className="film-card__title"
                                onClick={handleCardClick}
                            >
                                {movieData.title}
                            </h3>

                            {subtitle && (
                                <div className="film-card__subtitle">
                                    <span>{subtitle}</span>
                                </div>
                            )}

                            {/* ==================================================
                                ACTIONS
                            ================================================== */}

                            <div className="film-card__actions">

                                <button
                                    type="button"
                                    className="film-card__action-btn btn-detail"
                                    onClick={handleDetailClick}
                                    disabled={isOpening}
                                    aria-label={`Xem chi tiết ${movieData.title}`}
                                >
                                    <Info size={16} />
                                    <span>Xem chi tiết</span>
                                </button>

                                <button
                                    type="button"
                                    className="film-card__action-btn btn-booking"
                                    onClick={handleBookingClick}
                                    disabled={isOpening}
                                    aria-label={`Đặt vé ${movieData.title}`}
                                >
                                    <Ticket size={16} />
                                    <span>Đặt vé</span>
                                </button>

                            </div>

                        </div>

                    </div>
                </div>
            </TiltCard>

            {/* ============================================================
                CINEMATIC MOVIE REVEAL
            ============================================================ */}

            {showReveal && (
                <MovieRevealTransition
                    movie={movie}
                    posterUrl={posterUrl}
                    backdropUrl={movieData.backdrop}
                    title={movieData.title}
                    ageRating={movieData.ageRating}
                    onComplete={handleRevealComplete}
                    onCancel={handleRevealCancel}
                />
            )}
        </>
    );
});

MovieCard.displayName = "MovieCard";

export default MovieCard;