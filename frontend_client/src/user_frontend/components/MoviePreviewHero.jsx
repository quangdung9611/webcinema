import {
    Star,
    Clock,
    Calendar,
    Globe,
    Ticket,
    ArrowRight
} from "lucide-react";

import "../styles/MoviePreviewHero.css";
import { useNavigate } from "react-router-dom";

const MoviePreviewHero = ({
    movie,
    imageBaseUrl,
    onBook,
    onTrailer
}) => {

    const navigate = useNavigate(); // ✅ phải nằm trong component

    if (!movie) return null;

    const handleViewDetail = () => {
        navigate(`/movies/detail/${movie.slug || movie.movie_slug}`);
    };

    const handleBooking = () => {
        navigate(`/booking/${movie.slug || movie.movie_slug}`);
    };

    return (
        <section className="preview-hero">

            {/* BACKDROP */}
            <img
                className="preview-hero-backdrop"
                src={`${imageBaseUrl}/backdrops/${movie.backdrop_url || movie.poster_url}`}
                alt={movie.title}
            />

            <div className="preview-hero-overlay"></div>
            <div className="preview-hero-shadow"></div>

            <div className="preview-hero-container">
                <div className="preview-hero-content">

                    <div className="preview-hero-badge">
                        ĐANG CHIẾU
                    </div>

                    <div className="preview-title-row">
                        <h1 className="preview-title">{movie.title}</h1>

                      
                    </div>

                    <div className="preview-meta">
                          <span className="preview-age">
                            {movie.age_rating ? `T${movie.age_rating}` : "P"}
                        </span>
                        <div className="preview-meta-item">
                            <Star size={17} fill="#FFC107" color="#FFC107" />
                            <span>{movie.avg_rating || "0.0"}</span>
                        </div>

                        <div className="preview-meta-item">
                            <Clock size={17} />
                            <span>{movie.duration} phút</span>
                        </div>

                        <div className="preview-meta-item">
                            <Calendar size={17} />
                            <span>
                                {movie.release_date
                                    ? new Date(movie.release_date).toLocaleDateString("vi-VN")
                                    : "Đang cập nhật"}
                            </span>
                        </div>

                        <div className="preview-meta-item">
                            <Globe size={17} />
                            <span>{movie.country || "Việt Nam"}</span>
                        </div>
                    </div>

                    <p className="preview-description">
                        {movie.description
                            ?.replace(/<[^>]*>?/gm, "")
                            ?.replace(/&nbsp;/g, " ")}
                    </p>

                    <div className="preview-extra-info">

                        <div className="preview-info-row">
                            <span className="preview-info-label">Thể loại</span>

                            <div className="preview-genre-list">
                                {movie.genres?.length ? (
                                    movie.genres.map((genre) => (
                                        <span
                                            key={genre.genre_id || genre.genre_name}
                                            className="preview-genre-chip"
                                        >
                                            {genre.genre_name}
                                        </span>
                                    ))
                                ) : (
                                    <span className="preview-info-value">
                                        Đang cập nhật
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="preview-info-row">
                            <span className="preview-info-label">Đạo diễn</span>
                            <span className="preview-info-value">
                                {movie.director || "Đang cập nhật"}
                            </span>
                        </div>

                        <div className="preview-info-row">
                            <span className="preview-info-label">Diễn viên</span>
                            <span className="preview-info-value">
                                {movie.cast || "Đang cập nhật"}
                            </span>
                        </div>

                    </div>

                    <div className="preview-action-group">

                        <button
                            className="preview-book-btn"
                            onClick={handleBooking}
                        >
                            <Ticket size={18} />
                            <span>ĐẶT VÉ NGAY</span>
                        </button>

                        <button
                            className="preview-trailer-btn"
                            onClick={handleViewDetail}
                        >
                            <ArrowRight size={18} />
                            <span>XEM CHI TIẾT</span>
                        </button>

                    </div>

                </div>
            </div>
        </section>
    );
};

export default MoviePreviewHero;