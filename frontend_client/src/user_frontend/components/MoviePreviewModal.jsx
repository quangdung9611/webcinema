import React, {
    useState,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef
} from "react";

import {
    X,
    ChevronLeft,
    ChevronRight,
    Star,
    Clock,
    Calendar,
    Play,
    Info
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import Modal from "./Modal";
import "../styles/MoviePreviewModal.css";
import "../styles/Modal.css";

const IMAGE_BASE_URL = "https://api.quangdungcinema.id.vn/uploads";

const decodeHtmlEntities = (text) => {
    if (!text) return '';
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
};

const MoviePreviewModal = ({
    open,
    onClose,
    movies = [],
    selectedMovie: defaultMovie
}) => {

    const navigate = useNavigate();

    const [selectedMovie, setSelectedMovie] = useState(defaultMovie);
    const [incomingMovie, setIncomingMovie] = useState(null);
    const [isHeroSliding, setIsHeroSliding] = useState(false);
    const [isCinematicTransition, setIsCinematicTransition] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showTrailer, setShowTrailer] = useState(false);

    const scrollRef = useRef(null);
    const sliderRef = useRef(null);
    const trackRef = useRef(null);
    const animationRef = useRef(null);

    // === LỌC CÁC PHIM KHÁC (KHÔNG BAO GỒM PHIM ĐANG CHỌN) ===
    const otherMovies = useMemo(() => {
        return movies.filter(movie => movie.movie_id !== selectedMovie?.movie_id);
    }, [movies, selectedMovie]);

    // Cuộn lên đầu modal
    useLayoutEffect(() => {
        if (open && scrollRef.current) {
            const timer = setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = 0;
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [open]);

    // Đồng bộ defaultMovie
    useEffect(() => {
        if (defaultMovie) {
            setSelectedMovie(defaultMovie);
            setIncomingMovie(null);
            setIsHeroSliding(false);
        }
    }, [defaultMovie]);

    useEffect(() => {
        if (open && defaultMovie) {
            setIsCinematicTransition(true);
            setTimeout(() => {
                setIsCinematicTransition(false);
            }, 1500);
        }
    }, [open, defaultMovie]);

    // Khi selectedMovie thay đổi, cuộn đến card tương ứng trong danh sách otherMovies
    useEffect(() => {
        if (!selectedMovie || !sliderRef.current || otherMovies.length === 0) return;
        
        const index = otherMovies.findIndex(
            movie => movie.movie_id === selectedMovie.movie_id
        );
        if (index === -1) return;
        setCurrentIndex(index);

        const container = sliderRef.current;
        requestAnimationFrame(() => {
            const cardWidth = container.querySelector('.preview-strip-card')?.offsetWidth || 0;
            const gap = window.innerWidth <= 768 ? 12 : 16;
            const cardsPerView = window.innerWidth <= 768 ? 2 : 4;
            const scrollAmount = Math.floor(index / cardsPerView) * (cardWidth + gap) * cardsPerView;
            container.scrollTo({ left: scrollAmount, behavior: 'smooth' });
        });
    }, [selectedMovie, otherMovies]);

    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    useEffect(() => {
        return () => {
            if (animationRef.current) {
                clearTimeout(animationRef.current);
            }
        };
    }, []);

    const changeHeroMovie = (movie) => {
        if (!movie) return;
        if (isHeroSliding) return;
        if (selectedMovie && selectedMovie.movie_id === movie.movie_id) {
            return;
        }

        setIsCinematicTransition(true);

        setIncomingMovie(movie);
        setIsHeroSliding(true);

        if (animationRef.current) {
            clearTimeout(animationRef.current);
        }
        animationRef.current = setTimeout(() => {
            setSelectedMovie(movie);
            setIncomingMovie(null);
            setIsHeroSliding(false);
            setTimeout(() => {
                setIsCinematicTransition(false);
            }, 300);
        }, 650);
    };

    const handleBooking = (movie) => {
        navigate(
            `/booking/${movie.slug || movie.movie_slug}`,
            {
                state: {
                    movie: {
                        movie_id: movie.movie_id,
                        title: movie.title,
                        poster_url: movie.poster_url,
                        age_rating: movie.age_rating,
                        slug: movie.slug || movie.movie_slug
                    }
                }
            }
        );
    };

    const getCardsPerView = () => {
        if (window.innerWidth <= 768) return 2;
        return 4;
    };

    // === NÚT ĐIỀU HƯỚNG VÔ HẠN (LOOP) ===
    const scrollLeft = () => {
        const container = sliderRef.current;
        if (!container) return;
        
        const firstCard = container.querySelector('.preview-strip-card');
        if (!firstCard) return;
        
        const cardWidth = firstCard.offsetWidth;
        const gap = window.innerWidth <= 768 ? 12 : 16;
        const cardsPerView = getCardsPerView();
        const scrollAmount = (cardWidth + gap) * cardsPerView;
        
        const currentScroll = container.scrollLeft;
        const maxScroll = container.scrollWidth - container.clientWidth;

        // Nếu không có đủ card để cuộn (1 hoặc 0), thì không làm gì
        if (maxScroll === 0) return;

        if (currentScroll <= 0) {
            container.scrollTo({ left: maxScroll, behavior: 'smooth' });
        } else {
            const newScroll = Math.max(0, currentScroll - scrollAmount);
            container.scrollTo({ left: newScroll, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        const container = sliderRef.current;
        if (!container) return;
        
        const firstCard = container.querySelector('.preview-strip-card');
        if (!firstCard) return;
        
        const cardWidth = firstCard.offsetWidth;
        const gap = window.innerWidth <= 768 ? 12 : 16;
        const cardsPerView = getCardsPerView();
        const scrollAmount = (cardWidth + gap) * cardsPerView;
        
        const currentScroll = container.scrollLeft;
        const maxScroll = container.scrollWidth - container.clientWidth;

        if (maxScroll === 0) return;

        if (currentScroll >= maxScroll) {
            container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            const newScroll = Math.min(maxScroll, currentScroll + scrollAmount);
            container.scrollTo({ left: newScroll, behavior: 'smooth' });
        }
    };

    const getYoutubeID = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu\.be\/|v\/|embed\/|watch\?v=|\&v=)([^#&?]{11}).*/;
        const match = url.match(regExp);
        return match ? match[2] : null;
    };

    const videoId = useMemo(() => {
        return getYoutubeID(selectedMovie?.trailer_url);
    }, [selectedMovie]);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric'
        });
    };

    const formatRuntime = (minutes) => {
        if (!minutes) return '';
        return `${minutes} phút`;
    };

    const cleanText = (text) => {
        if (!text) return 'Đang cập nhật';
        return decodeHtmlEntities(text);
    };

    const getDescriptionText = () => {
        if (!selectedMovie?.description) return 'Đang cập nhật...';
        return decodeHtmlEntities(selectedMovie.description);
    };

    if (!selectedMovie && !open) return null;

    return (
        <>
            <Modal
                open={open}
                onClose={onClose}
                size="xl"
                type="default"
                title=""
            >
                <div className="preview-scroll-wrapper" ref={scrollRef}>
                    
                    <button className="preview-close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>

                    {/* BANNER HERO */}
                    <div className="preview-hero-stage">
                        <div
                            className={`preview-hero-layer current ${
                                isHeroSliding ? "hero-slide-out" : ""
                            } ${
                                isCinematicTransition ? "cinematic-transition" : ""
                            }`}
                        >
                            <div className="cinema-hero-banner">
                                <img
                                    src={`${IMAGE_BASE_URL}/backdrops/${selectedMovie?.backdrop_url || selectedMovie?.poster_url}`}
                                    alt={selectedMovie?.title}
                                    className="banner-horizontal-img"
                                />
                            </div>
                        </div>

                        {incomingMovie && (
                            <div
                                className={`preview-hero-layer next ${
                                    isHeroSliding ? "hero-slide-in" : ""
                                }`}
                            >
                                <div className="cinema-hero-banner">
                                    <img
                                        src={`${IMAGE_BASE_URL}/backdrops/${incomingMovie.backdrop_url || incomingMovie.poster_url}`}
                                        alt={incomingMovie.title}
                                        className="banner-horizontal-img"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* INFO SECTION */}
                    <div className="preview-info-section">
                        <div className="preview-info-content">
                            <div className="preview-info-row">
                                <div className="preview-poster-wrapper">
                                    <img
                                        src={`${IMAGE_BASE_URL}/posters/${selectedMovie?.poster_url}`}
                                        alt={selectedMovie?.title}
                                        className="preview-poster-img"
                                    />
                                </div>

                                <div className="preview-info-details">
                                    <h2>
                                        {selectedMovie?.title}
                                        {selectedMovie?.age_rating && (
                                            <span className="age-badge">
                                                {selectedMovie.age_rating}
                                            </span>
                                        )}
                                    </h2>

                                    <div className="preview-meta-row">
                                        {selectedMovie?.rating && (
                                            <span className="preview-rating">
                                                <Star size={14} />
                                                {selectedMovie.rating}
                                            </span>
                                        )}
                                        <span className="preview-meta-item">
                                            <Clock size={16} className="icon" />
                                            {formatRuntime(selectedMovie?.runtime)}
                                        </span>
                                        <span className="preview-meta-divider" />
                                        <span className="preview-meta-item">
                                            <Calendar size={16} className="icon" />
                                            {formatDate(selectedMovie?.release_date)}
                                        </span>
                                        <span className="preview-meta-divider" />
                                        <span className="preview-meta-item">
                                            {cleanText(selectedMovie?.genre)}
                                        </span>
                                    </div>

                                    <div className="preview-description-wrapper">
                                        <div 
                                            className="preview-description-scroll"
                                            dangerouslySetInnerHTML={{ __html: getDescriptionText() }}
                                        />
                                    </div>

                                    <div className="preview-details">
                                        <div className="preview-detail">
                                            <span className="preview-detail-label">Đạo diễn</span>
                                            <span className="preview-detail-value">
                                                {cleanText(selectedMovie?.director)}
                                            </span>
                                        </div>
                                        <div className="preview-detail">
                                            <span className="preview-detail-label">Diễn viên</span>
                                            <span className="preview-detail-value">
                                                {cleanText(selectedMovie?.cast)}
                                            </span>
                                        </div>
                                        <div className="preview-detail">
                                            <span className="preview-detail-label">Thể loại</span>
                                            <span className="preview-detail-value">
                                                {cleanText(selectedMovie?.genre)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="preview-actions">
                                        <button
                                            className="preview-btn-primary"
                                            onClick={() => handleBooking(selectedMovie)}
                                        >
                                            <Play size={18} />
                                            Đặt vé ngay
                                        </button>
                                        <button
                                            className="preview-btn-secondary"
                                            onClick={() => navigate(`/movies/detail/${selectedMovie?.slug}`)}
                                        >
                                            <Info size={18} />
                                            Xem chi tiết
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MOVIE STRIP - SLIDER (chỉ hiển thị các phim khác) */}
                    <div className="preview-movie-strip">
                        <div className="preview-strip-header">
                            <h2 className="preview-strip-title">
                                PHIM ĐANG CHIẾU
                            </h2>
                            <p className="preview-strip-subtitle">
                                Chọn phim để xem nhanh thông tin
                            </p>
                        </div>

                        <div className="preview-strip-wrapper">
                            <button
                                className="preview-slider-btn preview-slider-left"
                                onClick={scrollLeft}
                            >
                                <ChevronLeft size={26} />
                            </button>

                            <div className="preview-strip-slider" ref={sliderRef}>
                                <div className="preview-strip-track" ref={trackRef}>
                                    {otherMovies.map((movie) => {
                                        const active = selectedMovie && selectedMovie.movie_id === movie.movie_id;
                                        const posterSrc = `${IMAGE_BASE_URL}/posters/${movie.poster_url}`;
                                        return (
                                            <div
                                                key={movie.movie_id}
                                                className={`preview-strip-card ${
                                                    active ? "active" : ""
                                                }`}
                                                onClick={() => changeHeroMovie(movie)}
                                            >
                                                <img
                                                    src={posterSrc}
                                                    alt={movie.title}
                                                    className="preview-strip-image"
                                                />
                                                <div className="preview-strip-gradient" />
                                                <div className="preview-strip-info">
                                                    <span className="preview-strip-name">
                                                        {movie.title}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                className="preview-slider-btn preview-slider-right"
                                onClick={scrollRight}
                            >
                                <ChevronRight size={26} />
                            </button>
                        </div>
                    </div>

                </div>
            </Modal>

            {/* Trailer Modal */}
            {showTrailer && videoId && (
                <div
                    className="preview-trailer-overlay"
                    onClick={() => setShowTrailer(false)}
                >
                    <div
                        className="preview-trailer-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="preview-trailer-close"
                            onClick={() => setShowTrailer(false)}
                        >
                            <X size={22} />
                        </button>
                        <iframe
                            title="Movie Trailer"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}
        </>
    );
};

export default MoviePreviewModal;