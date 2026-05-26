import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

import {
    MapPin,
    Phone,
    Film,
    Building2,
    ExternalLink,
    Loader2,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

import '../styles/CinemaDetail.css';

const ITEMS_PER_PAGE = 6;

const CinemaDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const fetchCinemaData = async () => {
            try {
                setLoading(true);
                const res = await axios.get(
                    `https://api.quangdungcinema.id.vn/api/cinemas/${slug}`
                );
                setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchCinemaData();
        window.scrollTo(0, 0);
    }, [slug]);

    if (loading) {
        return (
            <div className="cinema-loading">
                <Loader2 size={40} className="spin" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="cinema-error">
                <Film size={50} />
                <h2>Không tìm thấy rạp</h2>
            </div>
        );
    }

    const { cinema, movies } = data;

    /* ================= PAGINATION ================= */
    const totalPages = Math.ceil(movies.length / ITEMS_PER_PAGE);

    const paginatedMovies = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return movies.slice(start, start + ITEMS_PER_PAGE);
    }, [movies, currentPage]);

    const nextPage = () => {
        if (currentPage < totalPages) setCurrentPage(p => p + 1);
    };

    const prevPage = () => {
        if (currentPage > 1) setCurrentPage(p => p - 1);
    };

    return (
        <div className="cinema-detail">

            {/* ================= HERO ================= */}
            <div className="cinema-hero">
                <div className="cinema-hero-content">

                    <div>
                        <div className="badge">
                            <Building2 size={16} />
                            HỆ THỐNG RẠP
                        </div>

                        <h1>{cinema.cinema_name}</h1>

                        <p>
                            <MapPin size={16} />
                            {cinema.address}, {cinema.city}
                        </p>

                        <p>
                            <Phone size={16} />
                            {cinema.hotline || '1900 2224'}
                        </p>

                        {cinema.map_link && (
                            <a
                                href={cinema.map_link}
                                target="_blank"
                                rel="noreferrer"
                                className="map-link"
                            >
                                <MapPin size={16} />
                                Xem Google Maps
                                <ExternalLink size={14} />
                            </a>
                        )}
                    </div>

                </div>
            </div>

            {/* ================= MOVIES ================= */}
            <div className="movie-section">
                <h2>
                    <Film size={20} />
                    Phim đang chiếu
                </h2>

                <div className="movie-grid">
                    {paginatedMovies.map(movie => (
                        <div
                            key={movie.movie_id}
                            className="movie-card"
                            onClick={() =>
                                navigate(`/movie/${movie.movie_id}`)
                            }
                        >
                            <img
                                src={`https://api.quangdungcinema.id.vn/uploads/posters/${movie.poster_url}`}
                                alt={movie.title}
                            />
                            <p>{movie.title}</p>
                        </div>
                    ))}
                </div>

                {/* PAGINATION */}
                {movies.length > ITEMS_PER_PAGE && (
                    <div className="pagination">
                        <button onClick={prevPage} disabled={currentPage === 1}>
                            <ChevronLeft size={18} />
                            Prev
                        </button>

                        <span>
                            {currentPage} / {totalPages}
                        </span>

                        <button onClick={nextPage} disabled={currentPage === totalPages}>
                            Next
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </div>

            {/* ================= MAP (CUỐI CÙNG) ================= */}
            {cinema.map_link && (
                <div className="map-section">
                    <h2>
                        <MapPin size={20} />
                        Vị trí rạp
                    </h2>

                    <iframe
                        src={cinema.map_link}
                        width="100%"
                        height="400"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Cinema Map"
                    />
                </div>
            )}

        </div>
    );
};

export default CinemaDetail;