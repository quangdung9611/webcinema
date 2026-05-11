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
    const [activeGenre, setActiveGenre] = useState(slug);

    const baseUrl = "https://api.quangdungcinema.id.vn/uploads/posters/";

    /* =========================
       LOAD ALL GENRES
    ========================= */
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

    /* =========================
       LOAD MOVIES BY GENRE
    ========================= */
    useEffect(() => {

        setActiveGenre(slug);

        const fetchMoviesByGenre = async () => {

            try {

                setLoading(true);

                const res = await axios.get(
                    `https://api.quangdungcinema.id.vn/api/movie-genres/${slug}`
                );

                setMovies(res.data);

            } catch (error) {

                console.error("Lỗi load phim theo thể loại:", error);

            } finally {

                setLoading(false);

            }
        };

        fetchMoviesByGenre();

    }, [slug]);

    return (

        <div className="film-genre-page">

            {/* =========================
               HEADER
            ========================= */}
            <div className="genre-header">

                <h1>
                    {slug.replace(/-/g, " ")}
                </h1>

                <p>
                    Khám phá những bộ phim hấp dẫn thuộc thể loại bạn yêu thích
                </p>

            </div>

            {/* =========================
               GENRE TABS
            ========================= */}
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
                            navigate(`/film-genre/${genre.slug}`)
                        }
                    >
                        {genre.genre_name}
                    </button>

                ))}

            </div>

            {/* =========================
               LOADING
            ========================= */}
            {loading ? (

                <div className="loading">
                    Đang tải phim...
                </div>

            ) : (

                <>
                    {/* =========================
                       EMPTY
                    ========================= */}
                    {movies.length === 0 ? (

                        <div className="empty-movie">
                            Không có phim nào thuộc thể loại này
                        </div>

                    ) : (

                        /* =========================
                           MOVIES GRID
                        ========================= */
                        <div className="genre-movies-grid">

                            {movies.map((movie) => (

                                <div
                                    key={movie.movie_id}
                                    className="genre-movie-card"
                                >

                                    {/* POSTER */}
                                    <div className="genre-poster">

                                        <img
                                            src={`${baseUrl}${movie.poster_url}`}
                                            alt={movie.title}
                                        />

                                        {/* OVERLAY */}
                                        <div className="genre-overlay">

                                            {/* DETAIL BUTTON */}
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

                                            {/* BOOK BUTTON */}
                                            <button
                                                className="genre-book-btn"
                                                onClick={() =>
                                                    navigate("/booking", {
                                                        state: {
                                                            movie: movie
                                                        }
                                                    })
                                                }
                                            >
                                                ĐẶT VÉ
                                            </button>

                                        </div>

                                    </div>

                                    {/* INFO */}
                                    <div className="genre-info">

                                        <h3>
                                            {movie.title}
                                        </h3>

                                        <div className="genre-meta">

                                            <span className="genre-rating">
                                                ⭐ 9.0
                                            </span>

                                            <span className="genre-type">
                                                2D Phụ Đề
                                            </span>

                                        </div>

                                    </div>

                                </div>

                            ))}

                        </div>

                    )}
                </>

            )}

        </div>
    );
};

export default FilmGenre;