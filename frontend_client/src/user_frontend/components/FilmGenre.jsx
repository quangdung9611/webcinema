import React, { useEffect, useState, useCallback } from "react";
import api from "../../api/api";
import { motion, AnimatePresence } from "framer-motion";

import MovieSlider from "../components/MovieSlider";
import "../styles/FilmGenre.css";

// Helper unwrap mảng
const unwrapArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.movies && Array.isArray(data.movies)) return data.movies;
  if (data?.result && Array.isArray(data.result)) return data.result;
  if (data?.content && Array.isArray(data.content)) return data.content;
  return [];
};

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 }
  }
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 80,
    scale: 0.9,
    filter: "blur(10px)"
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
  }
};

const FilmGenre = () => {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState("");

  // Fetch movies
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

  return (
    <div className="film-genre-page">
      {/* Tabs */}
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

      {/* Movies */}
      <div className="filmgenre-container">
        {loading ? (
          <div className="loading-movies">Đang tải phim...</div>
        ) : movies.length === 0 ? (
          <div className="empty-movies">Không có phim nào</div>
        ) : (
          <motion.div
            className="filmgenre-content"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence>
              <motion.div
                key="slider"
                variants={cardVariants}
                layout
                className="filmgenre-slider-wrapper"
              >
                {/* 👇 Chỉ gọi MovieSlider với toàn bộ movies */}
                <MovieSlider movies={movies} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FilmGenre;