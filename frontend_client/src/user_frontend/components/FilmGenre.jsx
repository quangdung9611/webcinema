
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

import {
    motion,
    AnimatePresence
} from "framer-motion";

import Tilt from "react-parallax-tilt";

import "../styles/FilmGenre.css";

const FilmGenre = () => {

    const [movies, setMovies] =
        useState([]);

    const [genres, setGenres] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [activeGenre, setActiveGenre] =
        useState("");

    const navigate =
        useNavigate();

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
                        res.data || []
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

    /* =====================================================
        MOTION
    ===================================================== */

    const containerVariants = {

        hidden: {},

        show: {

            transition: {
                staggerChildren: 0.08
            }
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

            transition: {
                duration: 0.9,
                ease: [0.16, 1, 0.3, 1]
            }
        }
    };
    return (

        <div className="film-genre-page">

            {/* GENRE TABS */}
            <motion.div
                className="genre-tabs-wrapper"

                initial={{
                    opacity: 0,
                    y: -20
                }}

                animate={{
                    opacity: 1,
                    y: 0
                }}

                transition={{
                    duration: 0.5
                }}
            >

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

            </motion.div>

            {/* MOVIES */}
            <div className="filmgenre-container">

                <div className="filmgenre-section-header">

                    <motion.h2
                        initial={{
                            opacity: 0,
                            x: -30
                        }}

                        whileInView={{
                            opacity: 1,
                            x: 0
                        }}
                    >
                        DANH SÁCH PHIM
                    </motion.h2>

                    <motion.div
                        className="filmgenre-line"

                        initial={{
                            width: 0
                        }}

                        whileInView={{
                            width: "100px"
                        }}

                        transition={{
                            duration: 0.8
                        }}
                    />

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

                    <motion.div
                        className="genre-movies-grid"

                        variants={
                            containerVariants
                        }

                        initial="hidden"

                        animate="show"
                    >

                        <AnimatePresence>

                            {movies.map((movie) => (

                                <motion.div
                                    key={
                                        movie.movie_id
                                    }

                                    variants={
                                        cardVariants
                                    }

                                    layout
                                >

                                    <Tilt
                                        tiltMaxAngleX={6}
                                        tiltMaxAngleY={6}
                                        perspective={1200}
                                        transitionSpeed={1200}
                                        scale={1.03}
                                        glareEnable={true}
                                        glareMaxOpacity={0.18}
                                        glareColor="#ffffff"
                                        glarePosition="all"
                                        className="genre-movie-card"
                                    >

                                        <motion.div
                                            className="genre-movie-inner"

                                            whileHover={{
                                                y: -8
                                            }}

                                            transition={{
                                                type: "spring",
                                                stiffness: 220
                                            }}
                                        >

                                            {/* POSTER */}
                                            <div className="genre-poster">

                                                <motion.img
                                                    src={`${baseUrl}${movie.poster_url}`}
                                                    alt={
                                                        movie.title
                                                    }

                                                    whileHover={{
                                                        scale: 1.08
                                                    }}

                                                    transition={{
                                                        duration: 0.35
                                                    }}
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
                                                            size={16}
                                                            style={{
                                                                marginRight:
                                                                    "5px"
                                                            }}
                                                        />

                                                        ĐẶT VÉ
                                                    </button>

                                                </div>

                                                {/* AGE */}
                                                <motion.div
                                                    className="movie-age-badge"

                                                    animate={{
                                                        y: [0, -2, 0]
                                                    }}

                                                    transition={{
                                                        duration: 2,
                                                        repeat:
                                                            Infinity
                                                    }}
                                                >
                                                    {
                                                        movie.age_rating ||
                                                        "T18"
                                                    }
                                                </motion.div>

                                            </div>

                                            {/* INFO */}
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
                                                            size={16}
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

                                        </motion.div>

                                    </Tilt>

                                </motion.div>
                            ))}

                        </AnimatePresence>

                    </motion.div>
                )}

            </div>

        </div>
    );
};

export default FilmGenre;

