import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Star } from "lucide-react"; // Import icon ngôi sao

import "../styles/FilmGenre.css";

const FilmGenre = () => {
    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeGenre, setActiveGenre] = useState("");

    const baseUrl = "https://api.quangdungcinema.id.vn/uploads/posters/";

    /* =====================================================
        FETCH MOVIES (Sử dụng API with-genre mới)
    ===================================================== */
    const fetchMovies = useCallback(async (genreSlug) => {
        try {
            setLoading(true);
            let url = "";

            if (!genreSlug) {
                // Lấy tất cả phim
                url = "https://api.quangdungcinema.id.vn/api/movies";
            } else {
                // Lấy phim theo thể loại (API không phân trang mới viết)
                url = `https://api.quangdungcinema.id.vn/api/movies/with-genre?genre=${genreSlug}`;
            }

            const res = await axios.get(url);
            
            // Backend mới trả về mảng trực tiếp nên set thẳng luôn
            setMovies(res.data || []);

        } catch (error) {
            console.error("Lỗi load phim:", error);
            setMovies([]);
        } finally {
            setLoading(false);
        }
    }, []);

    /* =====================================================
        LOAD GENRES (Chạy 1 lần khi load trang)
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
        AUTO LOAD MOVIES WHEN GENRE CHANGES
    ===================================================== */
    useEffect(() => {
        fetchMovies(activeGenre);
    }, [activeGenre, fetchMovies]);

    /* =====================================================
        HANDLE CLICK GENRE
    ===================================================== */
    const handleGenreClick = (genreSlug) => {
        setActiveGenre(genreSlug);
    };

    return (
        <div className="film-genre-page">

            {/* HERO */}
            <div className="filmgenre-hero">
                <div className="filmgenre-overlay"></div>
                <div className="filmgenre-content">
                    <span className="filmgenre-subtitle">
                        QUANG DŨNG CINEMA
                    </span>
                    <h1>THỂ LOẠI PHIM</h1>
                    <p>
                        Khám phá những bộ phim hot nhất theo thể loại bạn yêu thích
                    </p>
                </div>
            </div>

            {/* GENRE TABS */}
            <div className="genre-tabs-wrapper">
                <div className="genre-tabs">
                    {/* TAB ALL */}
                    <button
                        className={activeGenre === "" ? "genre-tab active" : "genre-tab"}
                        onClick={() => handleGenreClick("")}
                    >
                        Tất cả
                    </button>

                    {genres.map((genre) => (
                        <button
                            key={genre.genre_id}
                            className={activeGenre === genre.slug ? "genre-tab active" : "genre-tab"}
                            onClick={() => handleGenreClick(genre.slug)}
                        >
                            {genre.genre_name}
                        </button>
                    ))}
                </div>
            </div>

            {/* MOVIES GRID */}
            <div className="filmgenre-container">
                <div className="filmgenre-section-header">
                    <h2>DANH SÁCH PHIM</h2>
                    <div className="filmgenre-line"></div>
                </div>

                {loading ? (
                    <div className="loading-movies">Đang tải phim...</div>
                ) : movies.length === 0 ? (
                    <div className="empty-movies">Không có phim nào</div>
                ) : (
                    <div className="genre-movies-grid">
                        {movies.map((movie) => (
                            <div key={movie.movie_id} className="genre-movie-card">
                                
                                {/* POSTER */}
                                <div className="genre-poster">
                                    <img
                                        src={`${baseUrl}${movie.poster_url}`}
                                        alt={movie.title}
                                    />
                                    <div className="genre-overlay">
                                        <button
                                            className="genre-detail-btn"
                                            onClick={() => window.location.href = `/movies/detail/${movie.slug}`}
                                        >
                                            CHI TIẾT
                                        </button>
                                        <button
                                            className="genre-book-btn"
                                            onClick={() => window.location.href = "/booking"}
                                        >
                                            ĐẶT VÉ
                                        </button>
                                    </div>
                                    <div className="movie-age-badge">
                                        {movie.age_rating || "T18"}
                                    </div>
                                </div>

                                {/* INFO */}
                                <div className="genre-info">
                                    <h3>{movie.title}</h3>
                                    <div className="genre-meta">
                                        <span className="genre-rating">
                                            <Star size={16} fill="#ffad27" color="#ffad27" style={{ marginRight: '4px' }} />
                                            {movie.rating || "9.0"}
                                        </span>
                                        <span className="genre-type">
                                            {movie.language || "2D Phụ Đề"}
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