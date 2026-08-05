import React, { useEffect, useState, useCallback } from "react";
import api from "../../api/api"; // ✅ import api
import { motion, AnimatePresence } from "framer-motion";

import MovieSlider from "../components/MovieSlider";
import MoviePreviewModal from "../components/MoviePreviewModal";
import "../styles/FilmGenre.css";

// Helper unwrap mảng từ object wrap của API (Tránh crash)
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);

  const handlePreview = (movie) => {
    setSelectedMovie(movie);
    setPreviewOpen(true);
  };

  /* ==========================
     FETCH MOVIES (ĐÃ SỬA LỖI)
  ========================== */
  const fetchMovies = useCallback(async (genreSlug = "") => {
    try {
      setLoading(true);
      const url = genreSlug
        ? `/api/movies/with-genre?genre=${genreSlug}`
        : `/api/movies`;
      
      const response = await api.get(url);
      const rawData = response.data;
      let moviesArray = unwrapArray(rawData);
      setMovies(moviesArray);
    } catch (error) {
      console.error("Lỗi tải phim:", error);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ==========================
     FETCH GENRES (🔥 Đã sửa lỗi unwrapArray)
  ========================== */
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await api.get("/api/genres");
        const rawData = response.data;
        // Sử dụng helper unwrapArray để lấy đúng mảng
        const genresArray = unwrapArray(rawData);
        setGenres(genresArray);
      } catch (error) {
        console.error("Lỗi tải thể loại:", error);
        setGenres([]); // Quan trọng: Set mảng rỗng nếu lỗi để tránh crash
      }
    };
    fetchGenres();
  }, []);

  /* ==========================
     LOAD MOVIES
  ========================== */
  useEffect(() => {
    fetchMovies(activeGenre);
  }, [activeGenre, fetchMovies]);

  /* ==========================
     CHIA PHIM THEO TRẠNG THÁI
  ========================== */
  const showingMovies = movies.filter(movie => movie.status === "Đang chiếu");
  const comingMovies = movies.filter(movie => movie.status === "Sắp chiếu");

  return (
    <div className="film-genre-page">

      {/* =============================================
          TABS
      ============================================= */}
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

      {/* =============================================
          MOVIES
      ============================================= */}
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
              {/* PHIM ĐANG CHIẾU */}
              {showingMovies.length > 0 && (
                <motion.div
                  key="showing"
                  variants={cardVariants}
                  layout
                  className="filmgenre-slider-wrapper"
                >
                  <MovieSlider
                    title="PHIM ĐANG CHIẾU"
                    movies={showingMovies}
                  />
                </motion.div>
              )}

              {/* PHIM SẮP CHIẾU */}
              {comingMovies.length > 0 && (
                <motion.div
                  key="coming"
                  variants={cardVariants}
                  layout
                  className="filmgenre-slider-wrapper"
                >
                  <MovieSlider
                    title="PHIM SẮP CHIẾU"
                    movies={comingMovies}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <MoviePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        movies={movies}
        selectedMovie={selectedMovie}
      />
    </div>
  );
};

export default FilmGenre;