
import React, {
    useEffect,
    useState,
    useCallback
} from "react";

import axios from "axios";

import {
    Star,
    Ticket
} from "lucide-react";

import {
    useNavigate
} from "react-router-dom";

import "../styles/FilmGenre.css";

const FilmGenre = () => {

    const [movies, setMovies] = useState([]);
    const [genres, setGenres] = useState([]);
    const [loading, setLoading] =
        useState(true);

    const [activeGenre, setActiveGenre] =
        useState("");

    const navigate = useNavigate();

    const baseUrl =
        "https://api.quangdungcinema.id.vn/uploads/posters/";

    /* =====================================================
        FETCH MOVIES
    ===================================================== */

    const fetchMovies =
        useCallback(async (genreSlug) => {

            try {

                setLoading(true);

                let url = "";

                if (!genreSlug) {

                    url =
                        "https://api.quangdungcinema.id.vn/api/movies";

                } else {

                    url =
                        `https://api.quangdungcinema.id.vn/api/movies/with-genre?genre=${genreSlug}`;
                }

                const res =
                    await axios.get(url);

                setMovies(
                    res.data || []
                );

            } catch (error) {

                console.error(
                    "Lỗi load phim:",
                    error
                );

                setMovies([]);

            } finally {

                setLoading(false);
            }

        }, []);

    /* =====================================================
        LOAD GENRES
    ===================================================== */

    useEffect(() => {

        const fetchGenres =
            async () => {

                try {

                    const res =
                        await axios.get(
                            "https://api.quangdungcinema.id.vn/api/genres"
                        );

                    setGenres(
                        res.data
                    );

                } catch (error) {

                    console.error(
                        "Lỗi load genres:",
                        error
                    );
                }
            };

        fetchGenres();

    }, []);

    /* =====================================================
        AUTO LOAD MOVIES
    ===================================================== */

    useEffect(() => {

        fetchMovies(
            activeGenre
        );

    }, [
        activeGenre,
        fetchMovies
    ]);

    /* =====================================================
        HANDLE CLICK GENRE
    ===================================================== */

    const handleGenreClick =
        (genreSlug) => {

            setActiveGenre(
                genreSlug
            );
        };

    return (

        <div className="film-genre-page">

            {/* =====================================================
                GENRE TABS
            ===================================================== */}

            <div className="genre-tabs-wrapper">

                <div className="genre-tabs">

                    <button
                        className={
                            activeGenre === ""
                                ? "genre-tab active"
                                : "genre-tab"
                        }

                        onClick={() =>
                            handleGenreClick("")
                        }
                    >
                        Tất cả
                    </button>

                    {genres.map(
                        (genre) => (

                            <button
                                key={
                                    genre.genre_id
                                }

                                className={
                                    activeGenre ===
                                    genre.slug
                                        ? "genre-tab active"
                                        : "genre-tab"
                                }

                                onClick={() =>
                                    handleGenreClick(
                                        genre.slug
                                    )
                                }
                            >
                                {
                                    genre.genre_name
                                }
                            </button>
                        )
                    )}

                </div>

            </div>

            {/* =====================================================
                MOVIES GRID
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
                        Không có phim nào
                    </div>

                ) : (

                    <div className="genre-movies-grid">

                        {movies.map(
                            (movie) => (

                                <div
                                    key={
                                        movie.movie_id
                                    }

                                    className="genre-movie-card"
                                >

                                    {/* =====================================================
                                        CARD WRAPPER
                                    ===================================================== */}

                                    <div className="genre-movie-inner">

                                        {/* =====================================================
                                            POSTER
                                        ===================================================== */}

                                        <div className="genre-poster">

                                            <img
                                                src={`${baseUrl}${movie.poster_url}`}
                                                alt={
                                                    movie.title
                                                }
                                            />

                                            {/* OVERLAY */}

                                            <div className="genre-overlay">

                                                {/* CHI TIẾT */}

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

                                                {/* ĐẶT VÉ */}

                                                <button
                                                    className="genre-book-btn"

                                                    onClick={() =>
                                                        navigate(
                                                            `/booking/${movie.slug || movie.movie_slug}`,
                                                            {
                                                                state: {
                                                                    movie: {
                                                                        movie_id:
                                                                            movie.movie_id,

                                                                        title:
                                                                            movie.title,

                                                                        poster_url:
                                                                            movie.poster_url,

                                                                        age_rating:
                                                                            movie.age_rating,

                                                                        slug:
                                                                            movie.slug ||
                                                                            movie.movie_slug
                                                                    }
                                                                }
                                                            }
                                                        )
                                                    }
                                                >
                                                    <Ticket
                                                        size={
                                                            16
                                                        }

                                                        style={{
                                                            marginRight:
                                                                "5px"
                                                        }}
                                                    />

                                                    ĐẶT VÉ
                                                </button>

                                            </div>

                                            {/* AGE */}

                                            <div className="movie-age-badge">

                                                {
                                                    movie.age_rating ||
                                                    "T18"
                                                }

                                            </div>

                                        </div>

                                        {/* =====================================================
                                            INFO
                                        ===================================================== */}

                                        <div
                                            className="genre-info"

                                            style={{
                                                cursor:
                                                    "pointer"
                                            }}

                                            onClick={() =>
                                                navigate(
                                                    `/movies/detail/${movie.slug || movie.movie_slug}`
                                                )
                                            }
                                        >

                                            <h3>
                                                {
                                                    movie.title
                                                }
                                            </h3>

                                            <div className="genre-meta">

                                                <span className="genre-rating">

                                                    <Star
                                                        size={
                                                            16
                                                        }

                                                        fill="#ffad27"

                                                        color="#ffad27"

                                                        style={{
                                                            marginRight:
                                                                "4px"
                                                        }}
                                                    />

                                                    {
                                                        movie.rating ||
                                                        "9.0"
                                                    }

                                                </span>

                                                <span className="genre-type">

                                                    {
                                                        movie.language ||
                                                        "2D Phụ Đề"
                                                    }

                                                </span>

                                            </div>

                                        </div>

                                    </div>

                                </div>
                            )
                        )}

                    </div>
                )}

            </div>

        </div>
    );
};

export default FilmGenre;

