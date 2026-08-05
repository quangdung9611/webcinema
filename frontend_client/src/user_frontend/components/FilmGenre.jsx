import React, { useEffect, useState, useCallback } from "react";
import api from "../../api/api"; // ✅ import api
import { motion, AnimatePresence } from "framer-motion";

import MovieSlider from "../components/MovieSlider";
import MoviePreviewModal from "../components/MoviePreviewModal";
import "../styles/FilmGenre.css";

// ❌ Xóa API_URL

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
      // Lấy dữ liệu gốc từ API
      const rawData = response.data;

      // 🔥 BƯỚC QUAN TRỌNG: Debug xem API trả về cái gì
      console.log("API Response Data:", rawData);

      // Xác định mảng phim nằm ở đâu trong rawData
      // Thông thường là nằm trong rawData.data, rawData.movies, hoặc chính rawData
      let moviesArray = [];
      if (Array.isArray(rawData)) {
        moviesArray = rawData; // Trường hợp API trả về mảng luôn
      } else if (rawData && Array.isArray(rawData.data)) {
        moviesArray = rawData.data; // Trường hợp API trả về { data: [...] }
      } else if (rawData && Array.isArray(rawData.movies)) {
        moviesArray = rawData.movies; // Trường hợp API trả về { movies: [...] }
      } else if (rawData && Array.isArray(rawData.content)) {
        moviesArray = rawData.content; // Trường hợp API dùng Pagination (Spring Boot thường hay làm vậy)
      }
      
      setMovies(moviesArray);
      
    } catch (error) {
      console.error("Lỗi tải phim:", error);
      setMovies([]); // Nếu lỗi, set về mảng rỗng để không crash
    } finally {
      setLoading(false);
    }
  }, []);

  /* ==========================
     FETCH GENRES
  ========================== */
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const { data } = await api.get("/api/genres");
        setGenres(data || []);
      } catch (error) {
        console.error("Lỗi tải thể loại:", error);
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