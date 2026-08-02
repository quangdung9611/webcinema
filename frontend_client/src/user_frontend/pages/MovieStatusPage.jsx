import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from '../../api/api'; // ✅ Import api
import { Film } from "lucide-react";

import MovieCard from "../components/MovieCard";
import MoviePreviewModal from "../components/MoviePreviewModal";

import "../styles/MovieStatusPage.css";

// ❌ Xóa API_URL

const statusMap = {
    "phim-dang-chieu": "Đang chiếu",
    "phim-sap-chieu": "Sắp chiếu",
};

const MovieStatusPage = () => {
    const { statusSlug } = useParams();
    const navigate = useNavigate();

    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState(null);

    const activeStatus = useMemo(() => {
        return statusMap[statusSlug] || "Đang chiếu";
    }, [statusSlug]);

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await api.get('/api/movies');
                setMovies(res.data || []);
            } catch (err) {
                console.error("Lỗi lấy danh sách phim:", err);
                setError("Không thể tải danh sách phim. Vui lòng thử lại sau.");
                setMovies([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMovies();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [statusSlug]);

    const filteredMovies = useMemo(() => {
        return movies.filter((movie) => movie.status === activeStatus);
    }, [movies, activeStatus]);

    const handleMovieClick = (movie) => {
        setSelectedMovie(movie);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setSelectedMovie(null);
        }, 850);
    };

    if (loading) {
        return (
            <div className="loading-state">
                <div className="loading-spinner" />
                <p>Đang tải phim...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="empty-results error-state">
                <Film size={48} />
                <p>{error}</p>
                <button
                    className="retry-btn"
                    onClick={() => window.location.reload()}
                >
                    Thử lại
                </button>
            </div>
        );
    }

    const currentTabLabel =
        statusSlug === "phim-sap-chieu"
            ? "PHIM SẮP CHIẾU"
            : "PHIM ĐANG CHIẾU";

    return (
        <main className="movie-status-page">
            {/* ===== HEADER ===== */}
            <div className="status-header">
                <div className="status-header-left">
                    <h2 className="status-title">{currentTabLabel}</h2>
                    <div className="title-underline" />
                </div>

                <div className="status-tabs">
                    <button
                        className={`status-tab ${
                            statusSlug === "phim-dang-chieu" ? "active" : ""
                        }`}
                        onClick={() => navigate("/movies/status/phim-dang-chieu")}
                    >
                        Đang chiếu
                    </button>
                    <button
                        className={`status-tab ${
                            statusSlug === "phim-sap-chieu" ? "active" : ""
                        }`}
                        onClick={() => navigate("/movies/status/phim-sap-chieu")}
                    >
                        Sắp chiếu
                    </button>
                </div>
            </div>

            {/* ===== MOVIE GRID ===== */}
            <section className="movie-list">
                {filteredMovies.length > 0 ? (
                    filteredMovies.map((movie) => (
                        <MovieCard
                            key={movie.movie_id}
                            movie={movie}
                            onClick={handleMovieClick}
                        />
                    ))
                ) : (
                    <div className="empty-results">
                        <Film size={40} />
                        <p>Hiện chưa có phim ở danh mục này...</p>
                    </div>
                )}
            </section>

            {/* ===== MODAL ===== */}
            <MoviePreviewModal
                open={isModalOpen}
                onClose={handleCloseModal}
                movies={filteredMovies}
                selectedMovie={selectedMovie}
            />
        </main>
    );
};

export default MovieStatusPage;