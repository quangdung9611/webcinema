import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Film } from "lucide-react";
import api from "../../api/api";
import MovieCard from "./MovieCard";
import "../styles/MovieSlider.css";

// Helper unwrap mảng
const unwrapArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.movies && Array.isArray(data.movies)) return data.movies;
  if (data?.result && Array.isArray(data.result)) return data.result;
  if (data?.content && Array.isArray(data.content)) return data.content;
  return [];
};

const MovieSlider = () => {
  const navigate = useNavigate();

  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState("");

  // Fetch movies theo genre
  const fetchMovies = useCallback(async (genreSlug = "") => {
    try {
      setLoading(true);
      const url = genreSlug
        ? `/api/movies/with-genre?genre=${genreSlug}`
        : `/api/movies`;
      const response = await api.get(url);
      const rawData = response.data;
      const moviesArray = unwrapArray(rawData);
      setMovies(moviesArray);
    } catch (error) {
      console.error("Lỗi tải phim:", error);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await api.get("/api/genres");
        const rawData = response.data;
        const genresArray = unwrapArray(rawData);
        setGenres(genresArray);
      } catch (error) {
        console.error("Lỗi tải thể loại:", error);
        setGenres([]);
      }
    };
    fetchGenres();
  }, []);

  // Load movies khi activeGenre thay đổi
  useEffect(() => {
    fetchMovies(activeGenre);
  }, [activeGenre, fetchMovies]);

  // Phân loại phim theo status
  const showingMovies = movies.filter((m) => m.status === "Đang chiếu");
  const comingMovies = movies.filter((m) => m.status === "Sắp chiếu");

  // Component con để render một slider với title, movies và link xem tất cả
  const renderSlider = (title, movieList, statusSlug) => {
    if (movieList.length === 0) return null;

    const displayMovies = movieList.slice(0, 4);
    const viewAllLink = `/movies/status/${statusSlug}`;

    return (
      <div className="movie-slider-group">
        <div className="movie-slider-header">
          <div className="section-header-left">
            <h2 className="section-title">
              <Film size={32} className="section-icon" />
              {title}
            </h2>
          </div>
          <button className="btn-view-all" onClick={() => navigate(viewAllLink)}>
            Xem tất cả
          </button>
        </div>
        <div className="movie-grid">
          {displayMovies.map((movie) => (
            <MovieCard
              key={movie.movie_id}
              movie={movie}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="movie-slider-page">
      {/* Tabs thể loại */}
      <div className="genre-tabs">
        <button
          className={`genre-tab ${activeGenre === "" ? "active" : ""}`}
          onClick={() => setActiveGenre("")}
        >
          Tất cả
        </button>
        {genres.map((genre) => (
          <button
            key={genre.genre_id}
            className={`genre-tab ${activeGenre === genre.slug ? "active" : ""}`}
            onClick={() => setActiveGenre(genre.slug)}
          >
            {genre.genre_name}
          </button>
        ))}
      </div>

      {/* Nội dung phim */}
      <div className="movie-slider-content">
        {loading ? (
          <div className="loading-movies">Đang tải phim...</div>
        ) : movies.length === 0 ? (
          <div className="empty-movies">Không có phim nào</div>
        ) : (
          <>
            {renderSlider("PHIM ĐANG CHIẾU", showingMovies, "phim-dang-chieu")}
            {renderSlider("PHIM SẮP CHIẾU", comingMovies, "phim-sap-chieu")}
          </>
        )}
      </div>
    </div>
  );
};

export default MovieSlider;