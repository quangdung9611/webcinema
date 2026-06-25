import { Star, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Tilt from "react-parallax-tilt";

import "../styles/MovieCard.css";

const MovieCard = ({ movie, baseUrl }) => {
    const navigate = useNavigate();

    const goDetail = () => {
        navigate(
            `/movies/detail/${movie.slug || movie.movie_slug}`
        );
    };

    const goBooking = (e) => {
        e.stopPropagation();

        navigate(
            `/booking/${movie.slug || movie.movie_slug}`,
            {
                state: {
                    movie: {
                        movie_id: movie.movie_id,
                        title: movie.title,
                        poster_url: movie.poster_url,
                        age_rating: movie.age_rating,
                        slug:
                            movie.slug ||
                            movie.movie_slug,
                    },
                },
            }
        );
    };

    return (
        <Tilt
            tiltMaxAngleX={8}
            tiltMaxAngleY={8}
            perspective={1400}
            transitionSpeed={1200}
            scale={1.04}
            glareEnable
            glareMaxOpacity={0.12}
            glareColor="#ff1e1e"
            className="movie-card"
        >
            <div className="movie-inner">

                {/* EFFECTS */}
                <span className="movie-card-edge"></span>
                <span className="movie-card-projector"></span>
                <span className="movie-card-dust"></span>
                <span className="movie-card-spotlight"></span>

                {/* GLOW */}
                <span className="card-glow"></span>

                <div className="movie-poster">

                    <img
                        src={`${baseUrl}${movie.poster_url}`}
                        alt={movie.title}
                        loading="lazy"
                    />

                    <span className="shine-effect"></span>

                    <div className="movie-overlay">

                        <button
                            className="movie-detail-btn"
                            onClick={goDetail}
                        >
                            CHI TIẾT
                        </button>

                        <button
                            className="movie-book-btn"
                            onClick={goBooking}
                        >
                            <Ticket size={16} />
                            ĐẶT VÉ
                        </button>

                    </div>

                    <div className="movie-age-badge">
                        {movie.age_rating || "T18"}
                    </div>

                </div>

                <div
                    className="movie-info"
                    onClick={goDetail}
                >
                    <h3 className="movie-name">
                        {movie.title}
                    </h3>

                    <div className="movie-meta">

                        <span className="movie-rating">
                            <Star
                                size={15}
                                fill="#ffad27"
                                color="#ffad27"
                            />
                            {movie.rating || "9.0"}
                        </span>

                        <span className="movie-type">
                            {movie.language || "2D Phụ Đề"}
                        </span>

                    </div>
                </div>
                <span className="movie-light-sweep"></span>

            </div>
        </Tilt>
    );
};

export default MovieCard;