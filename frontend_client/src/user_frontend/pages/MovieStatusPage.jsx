import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

    const slugMap = {
        "phim-dang-chieu":
            "PHIM ĐANG CHIẾU",

        "phim-sap-chieu":
            "PHIM SẮP CHIẾU"
    };

    useEffect(() => {

        const fetchMovies =
            async () => {

                setLoading(true);

                try {

                    const res =
                        await axios.get(
                            `https://api.quangdungcinema.id.vn/api/movies/category/${statusSlug}`
                        );

                    setMovies(
                        res.data
                    );

                } catch (err) {

                    console.error(
                        "Lỗi lấy danh sách phim:",
                        err
                    );

                    setMovies([]);

                } finally {

                    setLoading(
                        false
                    );
                }
            };

        fetchMovies();

        window.scrollTo(
            0,
            0
        );

    }, [statusSlug]);

    if (loading) {
        return (
            <div className="loading-state">
                Đang tải phim...
            </div>
        );
    }

    return (
        <main className="movie-client-page">

            {/* HEADER */}
            <div className="status-header-simple">
                <h1>
                    {slugMap[
                        statusSlug
                    ] ||
                        "DANH SÁCH PHIM"}
                </h1>
            </div>

            {/* GRID */}
            <section className="movie-grid">

                {movies.length >
                0 ? (

                    movies.map(
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

                                {/* POSTER */}
                                <div className="movie-item__poster-container">

                                    {/* STAR RATING */}
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
                                        <Film
                                            size={
                                                40
                                            }
                                        />
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
                                                    state: {
                                                        movie: {
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
                                    {/* AGE */}
                                    <span className="movie-item__age-tag">
                                        T
                                        {
                                            age_rating
                                        }
                                    </span>

                                </div>

                                {/* INFO */}
                                <div className="movie-item__info">

                                    <h3 className="movie-item__title">
                                        {
                                            title
                                        }
                                    </h3>

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
                            Hiện tại
                            chưa có
                            phim ở mục
                            này...
                        </p>

                    </div>

                )}

            </section>

        </main>
    );
};

export default MovieStatusPage;