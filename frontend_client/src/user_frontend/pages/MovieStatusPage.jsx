import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/MovieStatusPage.css';

const MovieStatusPage = () => {
    const { statusSlug } = useParams(); 
    const navigate = useNavigate();
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    const slugMap = {
        "phim-dang-chieu": "PHIM ĐANG CHIẾU",
        "phim-sap-chieu": "PHIM SẮP CHIẾU"
    };

    useEffect(() => {
        const fetchMovies = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`https://webcinema-zb8z.onrender.com/api/movies/category/${statusSlug}`);
                setMovies(res.data);
            } catch (err) {
                console.error("Lỗi lấy danh sách phim:", err);
                setMovies([]);
            } finally {
                setLoading(false);
            }
        };
        fetchMovies();
        window.scrollTo(0, 0);
    }, [statusSlug]);

    if (loading) return <div className="loading-state">Đang tải phim...</div>;

    return (
        <main className="movie-client-page">

            <div className="status-header-simple">
                <h1>{slugMap[statusSlug] || "DANH SÁCH PHIM"}</h1>
            </div>

            <section className="movie-grid">
                {movies.length > 0 ? (
                    movies.map(({ movie_id, title, poster_url, slug, age_rating, duration, release_date }) => (
                        <article key={movie_id} className="movie-item">
                            
                            <div className="movie-item__poster-container">
                                {poster_url ? (
                                    <img 
                                        src={`https://webcinema-zb8z.onrender.com/uploads/posters/${poster_url}`} 
                                        alt={title} 
                                        className="movie-item__img"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                
                                <div 
                                    className="movie-item__fallback" 
                                    style={{ display: poster_url ? 'none' : 'flex' }}
                                >
                                    <span className="fallback-icon">🎬</span>
                                    <span>NO POSTER</span>
                                </div>

                                {/* ✅ CHỈ CÒN NÚT XEM CHI TIẾT */}
                                <div className="card-overlay">
                                    <button 
                                        className="btn-detail"
                                        onClick={() => navigate(`/movies/detail/${slug}`)}
                                    >
                                        XEM CHI TIẾT
                                    </button>
                                </div>

                                <span className="movie-item__age-tag">
                                    T{age_rating}
                                </span>
                            </div>
                            
                            <div className="movie-item__info">
                                <h3 className="movie-item__title">{title}</h3>
                                {/* <p className="movie-item__meta">
                                    {duration} phút | {release_date?.split('-').reverse().join('/') || 'N/A'}
                                </p> */}
                            </div>

                        </article>
                    ))
                ) : (
                    <div className="empty-results">
                        <p>Hiện tại chưa có phim ở mục này...</p>
                    </div>
                )}
            </section>
        </main>
    );
};

export default MovieStatusPage;