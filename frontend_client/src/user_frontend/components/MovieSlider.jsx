import { useState, useEffect } from "react";
import "../styles/MovieSlider.css";

const MovieSlider = ({ title, movies, baseUrl, onClickMovie }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // ✅ AUTO SLIDE
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % movies.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [movies.length]);

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
            const diff = index - activeIndex;

            let position = "far";
            if (diff === 0) position = "active";
            else if (diff === -1 || diff === movies.length - 1) position = "left";
            else if (diff === 1 || diff === -movies.length + 1) position = "right";

            return (
              <div
                key={movie.movie_id}
                className={`card ${position}`}
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

      {/* DOT */}
      <div className="dots">
        {movies.map((_, i) => (
          <span
            key={i}
            className={i === activeIndex ? "dot active" : "dot"}
            onClick={() => setActiveIndex(i)}
          />
        ))}
      </div>
    </div>
  );
};

export default MovieSlider;