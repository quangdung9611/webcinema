import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

import "../styles/FilmGenre.css";

const FilmGenre = () => {

    const { slug } = useParams();
    const navigate = useNavigate();

    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeGenre, setActiveGenre] = useState("");

    const baseUrl =
        "https://api.quangdungcinema.id.vn/uploads/posters/";

    /* =====================================================
       LOAD ALL GENRES
    ===================================================== */
    useEffect(() => {

        const fetchGenres = async () => {

            try {

                const res = await axios.get(
                    "https://api.quangdungcinema.id.vn/api/genres"
                );

                setGenres(res.data);

            } catch (error) {

                console.error("Lỗi load genres:", error);

            }
        };

        fetchGenres();

    }, []);

    /* =====================================================
       LOAD MOVIES BY SLUG
    ===================================================== */
    useEffect(() => {

        // tránh lỗi replace undefined
        if (!slug) return;

        setActiveGenre(slug);

        const fetchMoviesByGenre = async () => {

            try {

                setLoading(true);

                const res = await axios.get(
                    `https://api.quangdungcinema.id.vn/api/movie-genres/${slug}`
                );

                // fix tránh undefined
                setMovies(Array.isArray(res.data) ? res.data : []);

            } catch (error) {

                console.error(
                    "Lỗi load phim theo thể loại:",
                    error
                );

                setMovies([]);

            } finally {

                setLoading(false);

            }
        };

        fetchMoviesByGenre();

    }, [slug]);

    /* =====================================================
       HANDLE NAVIGATE GENRE
    ===================================================== */
    const handleGenreClick = (genreSlug) => {

        setActiveGenre(genreSlug);

        navigate(`/film-genre/${genreSlug}`);
    };

    return (

        <div className="film-genre-page">

            {/* =====================================================
               HERO SECTION
            ===================================================== */}
            <div className="filmgenre-hero">

                <div className="filmgenre-overlay"></div>

                <div className="filmgenre-content">

                    <span className="filmgenre-subtitle">
                        QUANG DŨNG CINEMA
                    </span>

                    <h1>
                        {slug
                            ? slug.replace(/-/g, " ")
                            : "Thể loại phim"}
                    </h1>

                    <p>
                        Khám phá những bộ phim hot nhất
                        thuộc thể loại bạn yêu thích
                        với chất lượng điện ảnh đỉnh cao.
                    </p>

                    <div className="filmgenre-buttons">

                        <button
                            className="filmgenre-watch-btn"
                        >
                            XEM NGAY
                        </button>

                        <button
                            className="filmgenre-list-btn"
                        >
                            DANH SÁCH
                        </button>

                    </div>

                </div>

            </div>

            {/* =====================================================
               GENRE TABS
            ===================================================== */}
            <div className="genre-tabs-wrapper">

                <div className="genre-tabs">

                    {genres.map((genre) => (

                        <button
                            key={genre.genre_id}
                            className={
                                activeGenre === genre.slug
                                    ? "genre-tab active"
                                    : "genre-tab"
                            }
                            onClick={() =>
                                handleGenreClick(
                                    genre.slug
                                )
                            }
                        >
                            {genre.genre_name}
                        </button>

                    ))}

                </div>

            </div>

            {/* =====================================================
               MOVIES SECTION
            ===================================================== */}
            <div className="filmgenre-container">

                <div className="filmgenre-section-header">

                    <h2>
                        DANH SÁCH PHIM
                    </h2>

                    <div className="filmgenre-line"></div>

                </div>

                {loading ? (

                    <div className="loading-movies">
                        Đang tải phim...
                    </div>

                ) : movies.length === 0 ? (

                    <div className="empty-movies">
                        Không có phim nào thuộc
                        thể loại này
                    </div>

                ) : (

                    <div className="genre-movies-grid">

                        {movies.map((movie) => (

                            <div
                                key={movie.movie_id}
                                className="genre-movie-card"
                            >

                                {/* =========================
                                   POSTER
                                ========================= */}
                                <div className="genre-poster">

                                    <img
                                        src={`${baseUrl}${movie.poster_url}`}
                                        alt={movie.title}
                                    />

                                    {/* OVERLAY */}
                                    <div className="genre-overlay">

                                        <button
                                            className="genre-detail-btn"
                                            onClick={() =>
                                                navigate(
                                                    `/movies/detail/${movie.slug || movie.movie_slug}`
                                                )
                                            }
                                        >
                                            CHI TIẾT
                                        </button>

                                        <button
                                            className="genre-book-btn"
                                            onClick={() =>
                                                navigate(
                                                    "/booking",
                                                    {
                                                        state: {
                                                            movie:
                                                                movie
                                                        }
                                                    }
                                                )
                                            }
                                        >
                                            ĐẶT VÉ
                                        </button>

                                    </div>

                                    {/* AGE */}
                                    <div className="movie-age-badge">
                                        {movie.age_rating ||
                                            "T18"}
                                    </div>

                                </div>

                                {/* =========================
                                   INFO
                                ========================= */}
                                <div className="genre-info">

                                    <h3>
                                        {movie.title}
                                    </h3>

                                    <div className="genre-meta">

                                        <span className="genre-rating">
                                            ⭐{" "}
                                            {movie.rating ||
                                                "9.0"}
                                        </span>

                                        <span className="genre-type">
                                            {movie.language ||
                                                "2D Phụ Đề"}
                                        </span>

                                    </div>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

            </div>

        </div>
    );
};

export default FilmGenre;