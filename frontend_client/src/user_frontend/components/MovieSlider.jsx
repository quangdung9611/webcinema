import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MoviePreviewModal from "./MoviePreviewModal";
import "../styles/MovieSlider.css";

const IMAGE_BASE_URL = "https://api.quangdungcinema.id.vn/uploads";

// =============================================
// HELPER: LẤY URL POSTER (HỖ TRỢ CLOUDINARY + LOCAL)
// =============================================
const getPosterUrl = (poster) => {
    if (!poster) return '';
    // Nếu là URL đầy đủ (http:// hoặc https://) thì dùng trực tiếp
    if (poster.startsWith('http://') || poster.startsWith('https://')) {
        return poster;
    }
    // Ngược lại, ghép với base URL (cho dữ liệu cũ)
    return `${IMAGE_BASE_URL}/posters/${poster}`;
};

const MovieSlider = ({ title, movies = [] }) => {
    const navigate = useNavigate();
    const cardRefs = useRef({});

    const [currentIndex, setCurrentIndex] = useState(0);
    const [hover, setHover] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [tiltValues, setTiltValues] = useState({});

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState(null);

    useEffect(() => {
        if (!movies.length || hover) return;
        const timer = setInterval(() => nextSlide(), 4500);
        return () => clearInterval(timer);
    }, [hover, currentIndex, movies.length]);

    const nextSlide = () => {
        if (isAnimating || !movies.length) return;
        setIsAnimating(true);
        setCurrentIndex((prev) => (prev + 1) % movies.length);
        setTimeout(() => setIsAnimating(false), 700);
    };

    const prevSlide = () => {
        if (isAnimating || !movies.length) return;
        setIsAnimating(true);
        setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
        setTimeout(() => setIsAnimating(false), 700);
    };

    const positionMap = useMemo(() => {
        const map = {};
        if (!movies.length) return map;
        movies.forEach(m => map[m.movie_id] = "hidden");
        const total = movies.length;
        const positions = [
            (currentIndex - 2 + total) % total,
            (currentIndex - 1 + total) % total,
            currentIndex,
            (currentIndex + 1) % total,
            (currentIndex + 2) % total
        ];
        const posNames = ["position--2", "position--1", "position-0", "position-1", "position-2"];
        positions.forEach((idx, i) => {
            map[movies[idx].movie_id] = posNames[i];
        });
        return map;
    }, [movies, currentIndex]);

    const handleMouseMove = (e, movieId) => {
        const card = cardRefs.current[movieId];
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setTiltValues(prev => ({
            ...prev,
            [movieId]: { rotateX: y * -12, rotateY: x * 15 }
        }));
    };

    const handleMouseLeave = (movieId) => {
        setTiltValues(prev => ({
            ...prev,
            [movieId]: { rotateX: 0, rotateY: 0 }
        }));
    };

    const getTiltStyle = (movieId, position) => {
        const tilt = tiltValues[movieId];
        if (!tilt || position !== 'position-0') return {};
        return {
            transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(1.03)`,
            transition: 'transform 0.1s ease-out',
            boxShadow: '0 40px 90px rgba(0, 0, 0, 0.7)'
        };
    };

    const handleCardClick = (movie) => {
        setSelectedMovie(movie);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setSelectedMovie(null);
        }, 850);
    };

    if (!movies.length) return null;

    return (
        <section className="movie-slider">
            <div className="movie-slider-header">
                <div className="line"></div>
                <h2>{title}</h2>
                <div className="line"></div>
            </div>

            <div className="movie-slider-wrapper" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                <button className="slider-arrow slider-prev" onClick={prevSlide} aria-label="Previous">
                    <ChevronLeft size={32} />
                </button>

                <div className="movie-stage">
                    {movies.map((movie) => {
                        const position = positionMap[movie.movie_id] || "hidden";
                        const tiltStyle = getTiltStyle(movie.movie_id, position);
                        const isCenter = position === 'position-0';
                        // ✅ Lấy URL poster với helper hỗ trợ Cloudinary
                        const posterUrl = getPosterUrl(movie.poster_url);

                        return (
                            <div key={movie.movie_id} className={`movie-item ${position}`}>
                                <div
                                    ref={el => cardRefs.current[movie.movie_id] = el}
                                    className="movie-card"
                                    onClick={() => handleCardClick(movie)}
                                    onMouseMove={(e) => { if (isCenter) handleMouseMove(e, movie.movie_id); }}
                                    onMouseLeave={() => { if (isCenter) handleMouseLeave(movie.movie_id); }}
                                    style={{
                                        ...tiltStyle,
                                        transition: isCenter ? 'transform 0.1s ease-out' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                    }}
                                >
                                    <img src={posterUrl} alt={movie.title} loading="lazy" draggable={false} />
                                    <div className="card-overlay"></div>
                                    <div className="card-info">
                                        <h3 className="card-title">{movie.title}</h3>
                                        <span className="card-year">{movie.year || "2026"}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button className="slider-arrow slider-next" onClick={nextSlide} aria-label="Next">
                    <ChevronRight size={32} />
                </button>
            </div>

            <div className="movie-slider-dots">
                {movies.map((movie, index) => (
                    <button
                        key={movie.movie_id}
                        className={`slider-dot ${index === currentIndex ? "active" : ""}`}
                        onClick={() => { if (!isAnimating) setCurrentIndex(index); }}
                    />
                ))}
            </div>

            {/* Luôn render MoviePreviewModal, không conditional */}
            <MoviePreviewModal
                open={isModalOpen}
                onClose={handleCloseModal}
                movies={movies}
                selectedMovie={selectedMovie}
            />
        </section>
    );
};

export default MovieSlider;