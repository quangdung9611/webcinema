import { useState } from "react";
import "../styles/MovieSlider.css";

const MovieSlider = ({ title, movies, baseUrl, onClickMovie }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!Array.isArray(movies) || movies.length === 0) return null;

  const next = () => {
    setActiveIndex((prev) => (prev + 1) % movies.length);
  };

  const prev = () => {
    setActiveIndex((prev) =>
      prev === 0 ? movies.length - 1 : prev - 1
    );
  };

  return (
    <div className="slider-wrapper">
      <h2 className="slider-title">{title}</h2>

      <div className="slider">
        <button className="arrow left" onClick={prev}>‹</button>

        <div className="slider-track">
          {movies.map((movie, index) => {
            const isActive = index === activeIndex;
            const isNear =
              index === activeIndex - 1 || index === activeIndex + 1;

            return (
              <div
                key={movie.movie_id}
                className={`card ${isActive ? "active" : ""} ${isNear ? "near" : ""}`}
                onClick={() => onClickMovie(movie)}
              >
                <img
                  src={`${baseUrl}${movie.poster_url}`}
                  alt={movie.title}
                />

                <div className="overlay" />

                <div className="info">
                  <h3>{movie.title}</h3>

                  <span className="status">
                    {title === "PHIM ĐANG CHIẾU"
                      ? "ĐANG CHIẾU"
                      : "SẮP CHIẾU"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <button className="arrow right" onClick={next}>›</button>
      </div>
    </div>
  );
};

export default MovieSlider;