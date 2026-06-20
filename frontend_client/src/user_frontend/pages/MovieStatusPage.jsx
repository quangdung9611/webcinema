import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Film } from "lucide-react";

import MovieCard from "../components/MovieCard";
import "../styles/MovieStatusPage.css";

const API_URL = "https://api.quangdungcinema.id.vn/api";
const BASE_URL = "https://api.quangdungcinema.id.vn/uploads/posters/";

const MovieStatusPage = () => {
    const { statusSlug } = useParams();
    const navigate = useNavigate();

    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    const statusMap = {
        "phim-dang-chieu": "Đang chiếu",
        "phim-sap-chieu": "Sắp chiếu",
    };

    const activeStatus =
        statusMap[statusSlug] || "Đang chiếu";

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                setLoading(true);

                const res = await axios.get(
                    `${API_URL}/movies`
                );

                setMovies(res.data || []);
            } catch (error) {
                console.error("Lỗi lấy phim:", error);
                setMovies([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMovies();

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }, [statusSlug]);

    const filteredMovies = movies.filter(
        (movie) => movie.status === activeStatus
    );

    const displayedMovies = filteredMovies.slice(0, 8);

    const handleTabChange = (slug) => {
        navigate(`/movies/status/${slug}`);
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
                            statusSlug === "phim-dang-chieu"
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            handleTabChange("phim-dang-chieu")
                        }
                    >
                        PHIM ĐANG CHIẾU
                    </button>

                    <button
                        className={`status-tab ${
                            statusSlug === "phim-sap-chieu"
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            handleTabChange("phim-sap-chieu")
                        }
                    >
                        PHIM SẮP CHIẾU
                    </button>

                </div>
            </section>

            {/* MOVIES */}
            <section className="movie-grid">
                {displayedMovies.length > 0 ? (
                    displayedMovies.map((movie) => (
                        <MovieCard
                            key={movie.movie_id}
                            movie={movie}
                            baseUrl={BASE_URL}
                        />
                    ))
                ) : (
                    <div className="empty-results">
                        <Film size={40} />
                        <p>
                            Hiện chưa có phim ở mục này...
                        </p>
                    </div>
                )}
            </section>

        </main>
    );
};

export default MovieStatusPage;