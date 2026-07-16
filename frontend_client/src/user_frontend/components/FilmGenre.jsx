import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

// SWIPER
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';

import MovieSlider from "../components/MovieSlider";
import MoviePreviewModal from "../components/MoviePreviewModal";
import "../styles/FilmGenre.css";

const API_URL = "https://api.quangdungcinema.id.vn/api";
const BASE_URL = "https://api.quangdungcinema.id.vn/uploads/posters/";

// ✅ Mảng ảnh banner cho FilmGenre (giống UserHome)
const genreBannerImages = [
  "review1.png",
  "review2.png",
  "review3.png",
  "review4.png"
];
const genreBannerBaseUrl = "https://api.quangdungcinema.id.vn/uploads/genre_banners/";

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
     FETCH MOVIES
  ========================== */
  const fetchMovies = useCallback(async (genreSlug = "") => {
    try {
      setLoading(true);
      const url = genreSlug
        ? `${API_URL}/movies/with-genre?genre=${genreSlug}`
        : `${API_URL}/movies`;
      const { data } = await axios.get(url);
      setMovies(data || []);
    } catch (error) {
      console.error("Lỗi tải phim:", error);
      setMovies([]);
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
        const { data } = await axios.get(`${API_URL}/genres`);
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
          BANNER SLIDER (giống UserHome & CinemaDetail)
      ============================================= */}
      {/* <div className="film-genre-hero">
        <div className="genre-overlay"></div>
        <div className="genre-light"></div>
        <div className="genre-particles"></div>

        <Swiper
          modules={[Autoplay, EffectFade]}
          effect="fade"
          speed={1200}
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          loop={true}
          className="genre-swiper"
        >
          {genreBannerImages.map((img, idx) => (
            <SwiperSlide key={idx}>
              <img
                src={`${genreBannerBaseUrl}${img}`}
                alt={`Genre Banner ${idx + 1}`}
                className="genre-banner-img"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div> */}

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
                    baseUrl={BASE_URL}
                    onClickMovie={handlePreview}
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
                    baseUrl={BASE_URL}
                    onClickMovie={handlePreview}
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
        imageBaseUrl="https://api.quangdungcinema.id.vn/uploads"
      />
    </div>
  );
};

export default FilmGenre;