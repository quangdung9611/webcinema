import { useNavigate } from "react-router-dom";
import { Star, Play, Ticket } from "lucide-react";
import "../styles/MovieSlider.css";

const MovieSlider = ({ title, movies, baseUrl, onClickMovie }) => {

  const navigate = useNavigate();

  if (!Array.isArray(movies) || movies.length === 0) return null;

  return (
    <section className="movie-section">

      {/* TITLE */}
      <div className="movie-section-header">
        <div className="line"></div>

        <h2 className="movie-section-title">
          {title}
        </h2>

        <div className="line"></div>
      </div>

      {/* GRID */}
      <div className="movies-grid">

        {movies.map((movie) => (

          <div
            key={movie.movie_id}
            className="movie-card"
          >

            {/* POSTER */}
            <div className="movie-poster">

              <img
                src={`${baseUrl}${movie.poster_url}`}
                alt={movie.title}
              />

              {/* OVERLAY */}
              <div className="movie-overlay"></div>

              {/* BADGE */}
              <div className="movie-badge">
                {title === "PHIM ĐANG CHIẾU"
                  ? "ĐANG CHIẾU"
                  : "SẮP CHIẾU"}
              </div>

              {/* HOVER CONTENT */}
              <div className="movie-hover-content">

              {/* DETAIL BUTTON */}
              <button
                className="detail-btn"
                onClick={(e) => {
                  e.stopPropagation();

                  navigate(`/movies/detail/${movie.slug || movie.movie_slug}`);
                }}
              >
                CHI TIẾT
              </button>

                {/* BOOK BUTTON */}
                <button
                  className="book-btn"
                  onClick={(e) => {
                    e.stopPropagation();

                    navigate('/booking', {
                      state: {
                        movie: {
                          movie_id: movie.movie_id,
                          title: movie.title,
                          poster_url: movie.poster_url,
                          age_rating: movie.age_rating
                        }
                      }
                    });
                  }}
                >
  <Ticket size={16} />
  ĐẶT VÉ
</button>
              </div>
            </div>

            {/* INFO */}
            <div
              className="movie-info"
              onClick={() => onClickMovie(movie)}
            >
              <h3>{movie.title}</h3>

              <div className="movie-meta">

                <span className="movie-rating">
                  <Star size={14} fill="#f1c40f" />
                  9.0
                </span>

                <span className="movie-type">
                  2D Phụ Đề
                </span>

              </div>
            </div>

          </div>

        ))}

      </div>
    </section>
  );
};

export default MovieSlider;