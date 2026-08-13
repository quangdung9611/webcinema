import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef
} from "react";

import {
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  Calendar,
  Play,
  Info
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import FilmModal from "./FilmModal";
import "../styles/MoviePreviewModal.css";
import "../styles/Modal.css";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const scrollRef = useRef(null);
  const sliderRef = useRef(null);

  // Lọc phim khác (không bao gồm phim đang chọn)
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
    }
  }, [defaultMovie]);

  // Khi selectedMovie thay đổi, cuộn đến card tương ứng
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

  // Lock scroll
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleBooking = (movie) => {
    navigate(
      `/booking/${movie.slug || movie.movie_slug}`,
      {
        state: {
          movie: {
            movie_id: movie.movie_id,
            title: movie.title,
            poster_url: movie.movie_poster,
            age_rating: movie.age_rating,
            slug: movie.slug || movie.movie_slug
          }
        }
      }
    );
  };

  const handleCardClick = (movie) => {
    if (movie.movie_id === selectedMovie?.movie_id) return;
    setSelectedMovie(movie);
  };

  const scrollLeft = () => {
    const container = sliderRef.current;
    if (!container) return;
    const cardWidth = container.querySelector('.preview-strip-card')?.offsetWidth || 0;
    const gap = window.innerWidth <= 768 ? 12 : 16;
    const cardsPerView = window.innerWidth <= 768 ? 2 : 4;
    const scrollAmount = (cardWidth + gap) * cardsPerView;
    container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  };

  const scrollRight = () => {
    const container = sliderRef.current;
    if (!container) return;
    const cardWidth = container.querySelector('.preview-strip-card')?.offsetWidth || 0;
    const gap = window.innerWidth <= 768 ? 12 : 16;
    const cardsPerView = window.innerWidth <= 768 ? 2 : 4;
    const scrollAmount = (cardWidth + gap) * cardsPerView;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
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
      <FilmModal
        open={open}
        onClose={onClose}
        size="xl"
        type="default"
        title=""
      >
        <div className="preview-scroll-wrapper" ref={scrollRef}>
          {/* === MAIN CONTENT: Poster + Info === */}
          <div className="preview-main-container">
            <div className="preview-main-content">
              {/* Poster - 30% */}
              <div className="preview-poster-wrapper">
                {selectedMovie?.movie_poster ? (
                  <img
                    src={selectedMovie.movie_poster}
                    alt={selectedMovie.title}
                    className="preview-poster-img"
                  />
                ) : (
                  <div className="poster-placeholder" />
                )}
              </div>

              {/* Info - 70% */}
              <div className="preview-info-wrapper">
                <h2 className="preview-movie-title">
                  {selectedMovie?.title}
                  {selectedMovie?.age_rating && (
                    <span className="age-badge">
                      {selectedMovie.age_rating}+
                    </span>
                  )}
                </h2>

                <div className="preview-meta-row">
                  {selectedMovie?.rating && (
                    <span className="preview-rating">
                      <Star size={16} />
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

          {/* === MOVIE STRIP === */}
          {otherMovies.length > 0 && (
            <div className="preview-movie-strip">
              <div className="preview-strip-header">
                <h2 className="preview-strip-title">CÓ THỂ BẠN CŨNG THÍCH</h2>
              </div>

              <div className="preview-strip-wrapper">
                <button
                  className="preview-slider-btn preview-slider-left"
                  onClick={scrollLeft}
                >
                  <ChevronLeft size={26} />
                </button>

                <div className="preview-strip-slider" ref={sliderRef}>
                  <div className="preview-strip-track">
                    {otherMovies.map((movie) => {
                      const active = selectedMovie?.movie_id === movie.movie_id;
                      return (
                        <div
                          key={movie.movie_id}
                          className={`preview-strip-card ${active ? "active" : ""}`}
                          onClick={() => handleCardClick(movie)}
                        >
                          {movie.movie_poster ? (
                            <img
                              src={movie.movie_poster}
                              alt={movie.title}
                              className="preview-strip-image"
                            />
                          ) : (
                            <div className="strip-poster-placeholder" />
                          )}
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
          )}
        </div>
      </FilmModal>

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
              <span className="close-icon">×</span>
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