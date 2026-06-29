import React, {
    useEffect,
    useState,
    useCallback
} from "react";

import axios from "axios";

import {
    motion,
    AnimatePresence
} from "framer-motion";

import MovieCard from "../components/MovieCard";
import MoviePreviewModal from "../components/MoviePreviewModal";
import "../styles/FilmGenre.css";

const API_URL =
    "https://api.quangdungcinema.id.vn/api";

const BASE_URL =
    "https://api.quangdungcinema.id.vn/uploads/posters/";

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

const FilmGenre = () => {

    const [movies, setMovies] =
        useState([]);

    const [genres, setGenres] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [activeGenre, setActiveGenre] =
        useState("");
    const [previewOpen, setPreviewOpen] = useState(false);

const [selectedMovie, setSelectedMovie] = useState(null);

        const handlePreview = (movie) => {

            setSelectedMovie(movie);

            setPreviewOpen(true);

        };
    /* ==========================
       FETCH MOVIES
    ========================== */

    const fetchMovies = useCallback(
        async (genreSlug = "") => {

            try {

                setLoading(true);

                const url = genreSlug
                    ? `${API_URL}/movies/with-genre?genre=${genreSlug}`
                    : `${API_URL}/movies`;

                const { data } =
                    await axios.get(url);

                setMovies(data || []);

            } catch (error) {

                console.error(
                    "Lỗi tải phim:",
                    error
                );

                setMovies([]);

            } finally {

                setLoading(false);

            }

        },
        []
    );

    /* ==========================
       FETCH GENRES
    ========================== */

    useEffect(() => {

        const fetchGenres = async () => {

            try {

                const { data } =
                    await axios.get(
                        `${API_URL}/genres`
                    );

                setGenres(data || []);

            } catch (error) {

                console.error(
                    "Lỗi tải thể loại:",
                    error
                );

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

    return (

        <div className="film-genre-page">

            {/* TABS */}
            <div className="genre-tabs">

                <button
                    className={`genre-tab ${
                        activeGenre === ""
                            ? "active"
                            : ""
                    }`}
                    onClick={() =>
                        setActiveGenre("")
                    }
                >
                    Tất cả
                </button>

                {genres.map((genre) => (

                    <button
                        key={genre.genre_id}
                        className={`genre-tab ${
                            activeGenre ===
                            genre.slug
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            setActiveGenre(
                                genre.slug
                            )
                        }
                    >
                        {genre.genre_name}
                    </button>

                ))}

            </div>

            {/* MOVIES */}
            <div className="filmgenre-container">

                <div className="filmgenre-section-header">

                    <h2>
                        DANH SÁCH PHIM
                    </h2>

                    <div className="filmgenre-line" />

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

                            {movies.map(
                                (movie) => (

                                    <motion.div
                                        key={
                                            movie.movie_id
                                        }
                                        variants={
                                            cardVariants
                                        }
                                        layout
                                    >

                                        <MovieCard
                                            movie={movie}
                                            baseUrl={BASE_URL}
                                            onPreview={handlePreview}
                                        />

                                    </motion.div>

                                )
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