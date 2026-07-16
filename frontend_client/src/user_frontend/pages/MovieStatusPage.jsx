import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Film } from "lucide-react";

import MovieCard from "../components/MovieCard";
import "../styles/MovieStatusPage.css";
import "../styles/user_home.css"; // 👈 Thêm để dùng class section-header

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

    const activeStatus = statusMap[statusSlug] || "Đang chiếu";

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${API_URL}/movies`);
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
                <div className="loading-spinner"></div>
                <p>Đang tải phim...</p>
            </div>
        );
    }

    // Lấy tên tab hiển thị
    const currentTabLabel = statusSlug === "phim-dang-chieu" ? "Phim Đang Chiếu" : "Phim Sắp Chiếu";

    return (
        <main className="movie-status-page">

            {/* ===== BANNER ===== */}
            <div className="movie-status-hero">
                <img
                    src="https://api.quangdungcinema.id.vn/uploads/banners/banner1.png"
                    alt="Movie Status Banner"
                    className="movie-status-banner-img"
                />
            </div>

            {/* ===== HEADER + TABS (giống UserHome) ===== */}
            <div className="section-header" style={{ maxWidth: '1320px', margin: '0 auto', paddingInline: 'var(--space-lg)' }}>
                <div className="section-header-left">
                    <h2 className="section-title">{currentTabLabel}</h2>
                    <div className="title-underline"></div>
                </div>

                <div className="status-tabs">
                    <button
                        className={`status-tab ${
                            statusSlug === "phim-dang-chieu" ? "active" : ""
                        }`}
                        onClick={() => handleTabChange("phim-dang-chieu")}
                    >
                        Đang chiếu
                    </button>

                    <button
                        className={`status-tab ${
                            statusSlug === "phim-sap-chieu" ? "active" : ""
                        }`}
                        onClick={() => handleTabChange("phim-sap-chieu")}
                    >
                        Sắp chiếu
                    </button>
                </div>
            </div>

            {/* ===== MOVIES ===== */}
            <section className="movie-list">
                {displayedMovies.length > 0 ? (
                    displayedMovies.map((movie) => (
                        <MovieCard
                            key={movie.movie_id}
                            movie={movie}
                            baseUrl={BASE_URL}
                            onPreview={() => {}}
                            onClick={() => {}}
                        />
                    ))
                ) : (
                    <div className="empty-results">
                        <Film size={40} />
                        <p>Hiện chưa có phim ở mục này...</p>
                    </div>
                )}
            </section>

        </main>
    );
};

export default MovieStatusPage;