import React, {
    useState,
    useEffect
} from "react";

import {
    useParams,
    useNavigate
} from "react-router-dom";

import axios from "axios";

import {
    Star,
    Film,
    Eye,
    Ticket
} from "lucide-react";

import "../styles/MovieStatusPage.css";

const MovieStatusPage = () => {

    const { statusSlug } =
        useParams();

    const navigate =
        useNavigate();

    const [movies, setMovies] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    // MAP URL SLUG -> STATUS
    const statusMap = {
        "phim-dang-chieu":
            "Đang chiếu",

        "phim-sap-chieu":
            "Sắp chiếu"
    };

    const activeStatus =
        statusMap[statusSlug] ||
        "Đang chiếu";

    // FETCH MOVIES
    useEffect(() => {

        const fetchMovies =
            async () => {

                setLoading(true);

                try {

                    const res =
                        await axios.get(
                            "https://api.quangdungcinema.id.vn/api/movies"
                        );

                    setMovies(
                        res.data || []
                    );

                } catch (error) {

                    console.error(
                        "Lỗi lấy phim:",
                        error
                    );

                    setMovies([]);

                } finally {

                    setLoading(false);
                }
            };

        fetchMovies();

        window.scrollTo({
            top: 0,
            behavior:
                "smooth"
        });

    }, [statusSlug]);

    // FILTER MOVIES BY STATUS
    const filteredMovies =
        movies.filter(
            (movie) =>
                movie.status ===
                activeStatus
        );

    // LIMIT 8 MOVIES
    const displayedMovies =
        filteredMovies.slice(
            0,
            8
        );

    const handleTabChange =
        (slug) => {

            navigate(
                `/movies/status/${slug}`
            );
        };

    if (loading) {

        return (
            <div className="loading-state">
                Đang tải phim...
            </div>
        );
    }

    return (
        <main className="movie-status-page">

          {/* HERO */}
            <section className="movie-status-hero">
                <img
                    src="https://api.quangdungcinema.id.vn/uploads/status_film/banner_herro.png"
                    alt="Movie Status Banner"
                    className="movie-status-banner-img"
                />
            </section>

            {/* TABS */}
            <section className="status-tabs-wrapper">

                <div className="status-tabs">

                    <button
                        className={`status-tab ${
                            statusSlug ===
                            "phim-dang-chieu"
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            handleTabChange(
                                "phim-dang-chieu"
                            )
                        }
                    >
                         PHIM ĐANG CHIẾU
                    </button>

                    <button
                        className={`status-tab ${
                            statusSlug ===
                            "phim-sap-chieu"
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            handleTabChange(
                                "phim-sap-chieu"
                            )
                        }
                    >
                         PHIM SẮP CHIẾU
                    </button>

                </div>

            </section>

            {/* MOVIE LIST */}
            <section className="movie-grid">

                {displayedMovies.length >
                0 ? (

                    displayedMovies.map(
                        ({
                            movie_id,
                            title,
                            poster_url,
                            slug,
                            age_rating,
                            average_rating
                        }) => (

                            <article
                                key={
                                    movie_id
                                }
                                className="movie-item"
                            >
                             {/* CARD INNER */}
                            <div className="movie-item-inner">

                                {/* POSTER */}
                                <div className="movie-item__poster-container">

                                    {/* RATING */}
                                    <div className="movie-rating-badge">

                                        <Star
                                            size={
                                                14
                                            }
                                            fill="currentColor"
                                        />

                                        <span>
                                            {Number(
                                                average_rating ||
                                                    0
                                            ).toFixed(
                                                1
                                            )}
                                        </span>

                                    </div>

                                    {/* AGE */}
                                    <span className="movie-item__age-tag">
                                        T
                                        {
                                            age_rating
                                        }
                                    </span>

                                    {/* IMAGE */}
                                    {poster_url ? (
                                        <img
                                            src={`https://api.quangdungcinema.id.vn/uploads/posters/${poster_url}`}
                                            alt={
                                                title
                                            }
                                            className="movie-item__img"
                                            onError={(
                                                e
                                            ) => {
                                                e.target.style.display =
                                                    "none";

                                                e.target.nextSibling.style.display =
                                                    "flex";
                                            }}
                                        />
                                    ) : null}

                                    {/* FALLBACK */}
                                    <div
                                        className="movie-item__fallback"
                                        style={{
                                            display:
                                                poster_url
                                                    ? "none"
                                                    : "flex"
                                        }}
                                    >
                                        <Film size={40} />

                                        <span>
                                            NO
                                            POSTER
                                        </span>
                                    </div>

                                    {/* OVERLAY */}
                                    <div className="card-overlay">

                                        <button
                                            className="btn-detail"
                                            onClick={() =>
                                                navigate(
                                                    `/movies/detail/${slug}`
                                                )
                                            }
                                        >
                                            <Eye size={18} />
                                            XEM CHI TIẾT
                                        </button>

                                        <button
                                            className="btn-book"
                                            onClick={() =>
                                                navigate(
                                                    `/booking/${slug}`,
                                                    {
                                                        state:
                                                        {
                                                            movie:
                                                            {
                                                                movie_id,
                                                                title,
                                                                poster_url,
                                                                age_rating,
                                                                slug
                                                            }
                                                        }
                                                    }
                                                )
                                            }
                                        >
                                            <Ticket size={18} />
                                            ĐẶT VÉ
                                        </button>

                                    </div>

                                </div>

                                {/* INFO */}
                                <div className="movie-item__info">

                                    <h3 className="movie-item__title">
                                        {
                                            title
                                        }
                                    </h3>

                                </div>
                            </div>
                            </article>
                        )
                    )

                ) : (

                    <div className="empty-results">

                        <Film
                            size={40}
                        />

                        <p>
                            Hiện chưa
                            có phim ở
                            mục này...
                        </p>

                    </div>
                )}

            </section>

        </main>
    );
};

export default MovieStatusPage;